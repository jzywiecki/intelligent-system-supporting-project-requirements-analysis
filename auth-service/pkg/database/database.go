package database

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

var (
	DATABASE_URL string
)

type Database interface {
	ConnectDbClient()
}

func init() {
	err := godotenv.Load()
	if err != nil {
		log.Panic("could not load env file")
	}

	DATABASE_URL = os.Getenv("DATABASE_URL")
}

func ConnectDBClient() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(DATABASE_URL))
	if err != nil {
		log.Fatal(err)
	}

	err = client.Ping(ctx, readpref.Primary())

	if err != nil {
		log.Fatal(err)
	}
	log.Default().Println("connected to database")
}
