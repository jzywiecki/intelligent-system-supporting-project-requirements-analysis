package auth

import (
	"auth-service/models"
	"auth-service/pkg/database"
	"auth-service/pkg/utils"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/dgrijalva/jwt-go"
	"go.mongodb.org/mongo-driver/bson"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte(os.Getenv("JWT_SECRET"))
var refreshJwtKey = []byte(os.Getenv("REFRESH_JWT_SECRET"))

type Claims struct {
	Email string `json:"email"`
	jwt.StandardClaims
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var registerRequest models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&registerRequest); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if err := registerRequest.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	user := models.User{
		Username:  registerRequest.Username,
		Email:     registerRequest.Email,
		Password:  registerRequest.Password,
		Friends:   []models.Friend{},
		Projects:  []string{},
		AvatarURL: utils.GetAvatarURL(registerRequest.Username),
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}
	user.Password = string(hashedPassword)

	client := database.GetDatabaseConnection()

	collection := database.GetCollection(client, "Projects", "users")

	var existingUser models.User
	err = collection.FindOne(context.Background(), bson.M{"email": user.Email}).Decode(&existingUser)
	if err == nil {
		http.Error(w, "User already exists", http.StatusConflict)
		return
	}

	_, err = collection.InsertOne(context.Background(), user)
	if err != nil {
		http.Error(w, "Error registering user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var loginReq models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if err := loginReq.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	client := database.GetDatabaseConnection()

	var user models.User
	collection := database.GetCollection(client, "Projects", "users")
	err := collection.FindOne(context.Background(), bson.M{"email": loginReq.Email}).Decode(&user)
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password))
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	accessExpirationTime := time.Now().Add(1 * time.Hour)
	accessClaims := &Claims{
		Email: loginReq.Email,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: accessExpirationTime.Unix(),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	refreshExpirationTime := time.Now().Add(24 * time.Hour)
	refreshClaims := &Claims{
		Email: loginReq.Email,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: refreshExpirationTime.Unix(),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(refreshJwtKey)
	if err != nil {
		http.Error(w, "Error generating refresh token", http.StatusInternalServerError)
		return
	}

	// Update user tokens in the database
	_, err = collection.UpdateOne(context.Background(), bson.M{"email": loginReq.Email}, bson.M{"$set": bson.M{"token": accessTokenString, "refresh_token": refreshTokenString}})
	if err != nil {
		http.Error(w, "Error updating tokens", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"id":            user.ID.Hex(),
		"access_token":  accessTokenString,
		"refresh_token": refreshTokenString,
		"username":      user.Username,
		"email":         user.Email,
		"avatarurl":     user.AvatarURL,
	})
}

func Authenticate(r *http.Request) (bool, error) {
	// tokenStr := r.Header.Get("Authorization")
	// if tokenStr == "" {
	// 	return false, errors.New("did not provide any token")
	// }

	// claims := &Claims{}
	// tkn, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
	// 	return jwtKey, nil
	// })

	// if err != nil || !tkn.Valid {
	// 	return false, fmt.Errorf("token is invalid %s", err.Error())
	// }

	// client := database.GetDatabaseConnection()

	// var user models.User
	// collection := database.GetCollection(client, "Projects", "users")
	// err = collection.FindOne(context.Background(), bson.M{"email": claims.Email, "token": tokenStr}).Decode(&user)

	// return err == nil, fmt.Errorf("got token: %s and errored with: %w", tokenStr, err)
	return true, nil; //err == nil, fmt.Errorf("got token: %s and errored with: %w", tokenStr, err)
}

func IsUserInProject(r *http.Request, projectId string) (bool, error) {
	tokenStr := r.Header.Get("Authorization")
	if tokenStr == "" {
		return false, errors.New("did not provide any token")
	}

	claims := &Claims{}
	tkn, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !tkn.Valid {
		return false, fmt.Errorf("token is invalid %s", err.Error())
	}

	client := database.GetDatabaseConnection()

	var user models.User
	collection := database.GetCollection(client, "Projects", "users")
	err = collection.FindOne(context.Background(), bson.M{"email": claims.Email, "token": tokenStr}).Decode(&user)

	if err != nil {
		return false, err
	}

	// for _, value := range user.Projects {
	// 	if value == projectId {
	// 		return true, nil
	// 	}
	// }

	return true, nil
}

func IsSenderRealUser(r *http.Request, senderId string) (bool, error) {
	tokenStr := r.Header.Get("Authorization")
	if tokenStr == "" {
		return false, errors.New("did not provide any token")
	}

	claims := &Claims{}
	tkn, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !tkn.Valid {
		return false, fmt.Errorf("token is invalid %s", err.Error())
	}

	client := database.GetDatabaseConnection()

	var user models.User
	collection := database.GetCollection(client, "Projects", "users")
	err = collection.FindOne(context.Background(), bson.M{"email": claims.Email, "token": tokenStr}).Decode(&user)

	if err != nil {
		return false, err
	}

	return user.ID.Hex() == senderId, nil
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	tokenStr := r.Header.Get("Authorization")
	if tokenStr == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	claims := &Claims{}
	tkn, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !tkn.Valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	client := database.GetDatabaseConnection()

	collection := database.GetCollection(client, "Projects", "users")
	_, err = collection.UpdateOne(context.Background(), bson.M{"email": claims.Email}, bson.M{"$set": bson.M{"token": ""}})
	if err != nil {
		http.Error(w, "Error logging out", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func RefreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	var request struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	refreshClaims := &Claims{}
	refreshToken, err := jwt.ParseWithClaims(request.RefreshToken, refreshClaims, func(token *jwt.Token) (interface{}, error) {
		return refreshJwtKey, nil
	})

	if err != nil || !refreshToken.Valid {
		http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		return
	}

	client := database.GetDatabaseConnection()

	var user models.User
	collection := database.GetCollection(client, "Projects", "users")
	err = collection.FindOne(context.Background(), bson.M{"email": refreshClaims.Email, "refresh_token": request.RefreshToken}).Decode(&user)
	if err != nil {
		http.Error(w, "Invalid refresh token", http.StatusUnauthorized)
		return
	}

	accessExpirationTime := time.Now().Add(1 * time.Hour)
	accessClaims := &Claims{
		Email: refreshClaims.Email,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: accessExpirationTime.Unix(),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	// Update user access token in the database
	_, err = collection.UpdateOne(context.Background(), bson.M{"email": refreshClaims.Email}, bson.M{"$set": bson.M{"token": accessTokenString}})
	if err != nil {
		http.Error(w, "Error updating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"access_token": accessTokenString,
	})
}
