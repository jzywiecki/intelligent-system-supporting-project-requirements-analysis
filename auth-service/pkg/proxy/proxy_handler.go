package proxy

import (
	// "auth-service/pkg/auth"
	"auth-service/pkg/config"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/patrickmn/go-cache"
)

func HandlerFactory(serviceName string, config *config.Config, cache *cache.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// isAuthenticated, err := auth.Authenticate(r)
		// if !isAuthenticated {
		// 	log.Printf("Unauthorized request from %s with error message %s", r.RemoteAddr, err)
		// 	http.Error(w, "Unauthorized", http.StatusUnauthorized)
		// 	return
		// }

		log.Printf("Proxying request to service: %s", serviceName)
		ProxyRequest(w, r, serviceName, config, cache)
	}
}

func ProxyRequest(w http.ResponseWriter, r *http.Request, serviceName string, config *config.Config, cache *cache.Cache) {
	serviceDetails, ok := config.Services[serviceName]

	if !ok {
		log.Printf("Service '%s' not found", serviceName)
		http.Error(w, fmt.Sprintf("Service '%s' not found", serviceName), http.StatusNotFound)
		return
	}

	if isRateLimited(serviceName, r.RemoteAddr, config.RateLimitTimeWindow, config.RateLimitCount, cache) {
		log.Printf("Request from %s exceeded rate limit for service: %s", r.RemoteAddr, serviceName)
		http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
		return
	}

	targetURL, err := url.Parse(serviceDetails.URL)
	if err != nil {
		panic(err)
	}

	// This line extracts the name of the service from the URL path
	r.URL.Path = extractPathWithoutService(serviceName, r.URL.Path)

	log.Printf("Proxying request to: %s", targetURL)
	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	proxy.ServeHTTP(w, r)
}

func isRateLimited(serviceName string, remoteAddr string, rateLimitWindow time.Duration, rateLimitCount int, cache *cache.Cache) bool {
	key := fmt.Sprintf("%s-%s", serviceName, remoteAddr)
	count, found := cache.Get(key)
	if !found {
		cache.Set(key, 1, rateLimitWindow)
		return false
	}

	if count.(int) >= rateLimitCount {
		return true
	}

	cache.Increment(key, 1)
	return false
}

func extractPathWithoutService(serviceName string, path string) string {
	return path[len(serviceName)+1:]
}
