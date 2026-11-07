package middleware

import (
	"context"
	"net/http"
	"sync"
	"time"
)

type Middleware func(http.Handler) http.Handler

var SecurityConfig = struct {
	MaxRequestBodySize int64
	RequestTimeout     time.Duration
	AllowedOrigins     []string
	RateLimitRequests  int
	RateLimitWindow    time.Duration
}{
	MaxRequestBodySize: 10 << 20,
	RequestTimeout:     30 * time.Second,
	AllowedOrigins: []string{
		"http://localhost:3000",
		"http://localhost:5173",
		"http://localhost:8080",
		"http://127.0.0.1:3000",
		"https://yourfrontend.com",
		"*",
	},
	RateLimitRequests: 5,
	RateLimitWindow:   1 * time.Minute,
}

func Chain(middlewares ...Middleware) Middleware {
	return func(final http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}

func RecoveryMiddleware() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					http.Error(w, "internal server error", http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func SecurityLimitsMiddleware() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, SecurityConfig.MaxRequestBodySize)
			rctx, cancel := context.WithTimeout(r.Context(), SecurityConfig.RequestTimeout)
			defer cancel()
			next.ServeHTTP(w, r.WithContext(rctx))
		})
	}
}

func CORSMiddleware(allowedOrigins []string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			isAllowed := false
			for _, candidate := range allowedOrigins {
				if candidate == "*" || candidate == origin {
					isAllowed = true
					break
				}
			}
			if isAllowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
			w.Header().Set("Access-Control-Expose-Headers", "Authorization, X-Refresh-Intent")
			w.Header().Set("Vary", "Origin")

			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", "HEAD, GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Requested-With, X-Refresh-Intent, Accept, Origin")
				w.Header().Set("Access-Control-Max-Age", "300")
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

type LoginRateLimiter struct {
	mu       sync.Mutex
	Attempts map[string][]time.Time
}

var LoginLimiter = &LoginRateLimiter{Attempts: make(map[string][]time.Time)}

func CheckLoginRateLimit(ip string, maxRequests int, window time.Duration) bool {
	if ip == "" {
		return true
	}
	LoginLimiter.mu.Lock()
	defer LoginLimiter.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-window)
	attempts := LoginLimiter.Attempts[ip]
	filtered := attempts[:0]
	for _, ts := range attempts {
		if ts.After(windowStart) {
			filtered = append(filtered, ts)
		}
	}
	LoginLimiter.Attempts[ip] = filtered
	if len(filtered) >= maxRequests {
		return false
	}
	LoginLimiter.Attempts[ip] = append(filtered, now)
	return true
}
