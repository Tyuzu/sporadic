package routes

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
	bbolt "go.etcd.io/bbolt"
	"golang.org/x/crypto/bcrypt"
)

const jwtSecret = "simpo-dev-secret-change-me"

var (
	usersBucket = []byte("users")
	farmsBucket = []byte("farms")
)

type Role string

const (
	RoleUser   Role = "user"
	RoleFarmer Role = "farmer"
	RoleAdmin  Role = "admin"
)

type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         Role      `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Farm struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Location  string    `json:"location"`
	Size      float64   `json:"size"`
	OwnerID   string    `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UpdateUserRequest struct {
	Name string `json:"name"`
}

type CreateFarmRequest struct {
	Name     string  `json:"name"`
	Location string  `json:"location"`
	Size     float64 `json:"size"`
}

type UpdateFarmRequest struct {
	Name     string  `json:"name,omitempty"`
	Location string  `json:"location,omitempty"`
	Size     float64 `json:"size,omitempty"`
}

type authClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type userContextKey string

const contextUserKey userContextKey = "current_user"

type API struct {
	db *bbolt.DB
}

type Middleware func(http.Handler) http.Handler

type loginRateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
}

var loginLimiter = &loginRateLimiter{attempts: make(map[string][]time.Time)}

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
					writeError(w, http.StatusInternalServerError, "internal server error")
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

func NewAPI() *API {
	db, err := bbolt.Open("./simpo.db", 0o600, nil)
	if err != nil {
		panic(err)
	}
	if err := db.Update(func(tx *bbolt.Tx) error {
		if _, err := tx.CreateBucketIfNotExists(usersBucket); err != nil {
			return err
		}
		if _, err := tx.CreateBucketIfNotExists(farmsBucket); err != nil {
			return err
		}
		return nil
	}); err != nil {
		panic(err)
	}
	api := &API{db: db}
	api.seedAdminAccount()
	return api
}

func NewHandler() http.Handler {
	api := NewAPI()
	mux := http.NewServeMux()
	globalPipeline := Chain(RecoveryMiddleware(), SecurityLimitsMiddleware(), CORSMiddleware(SecurityConfig.AllowedOrigins))

	mux.Handle("/api/health", globalPipeline(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})))
	mux.Handle("/api/register", globalPipeline(http.HandlerFunc(api.handleRegister)))
	mux.Handle("/api/auth/register", globalPipeline(http.HandlerFunc(api.handleRegister)))
	mux.Handle("/api/login", globalPipeline(http.HandlerFunc(api.handleLogin)))
	mux.Handle("/api/auth/login", globalPipeline(http.HandlerFunc(api.handleLogin)))
	mux.Handle("/api/users/me", globalPipeline(api.requireAuth(api.handleUserProfile)))
	mux.Handle("/api/farms", globalPipeline(api.requireAuth(api.handleFarms)))
	mux.Handle("/api/farms/", globalPipeline(api.requireAuth(api.handleFarmByID)))

	return mux
}

func RequireRoles(allowedRoles ...Role) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			user := currentUser(r.Context())
			if user == nil {
				writeError(w, http.StatusUnauthorized, "authentication required")
				return
			}
			match := false
			for _, role := range allowedRoles {
				if user.Role == role {
					match = true
					break
				}
			}
			if !match {
				writeError(w, http.StatusForbidden, "insufficient permissions")
				return
			}
			next(w, r)
		}
	}
}

func (api *API) seedAdminAccount() {
	email := "admin@system.internal"
	user, err := api.getUserByEmail(email)
	if err != nil {
		return
	}
	if user != nil {
		return
	}

	admin := &User{
		ID:           newID(),
		Name:         "Admin Master",
		Email:        email,
		PasswordHash: hashPassword("SecureAdminPass123!"),
		Role:         RoleAdmin,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	if err := api.createUser(admin); err != nil {
		return
	}
}

func (api *API) checkLoginRateLimit(ip string) bool {
	if ip == "" {
		return true
	}
	loginLimiter.mu.Lock()
	defer loginLimiter.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-SecurityConfig.RateLimitWindow)
	attempts := loginLimiter.attempts[ip]
	filtered := attempts[:0]
	for _, ts := range attempts {
		if ts.After(windowStart) {
			filtered = append(filtered, ts)
		}
	}
	loginLimiter.attempts[ip] = filtered
	if len(filtered) >= SecurityConfig.RateLimitRequests {
		return false
	}
	loginLimiter.attempts[ip] = append(filtered, now)
	return true
}

func (api *API) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Name) == "" || !isValidEmail(req.Email) || len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "name, valid email, and password (min 6 chars) are required")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	existing, err := api.getUserByEmail(email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if existing != nil {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}

	user := &User{
		ID:           newID(),
		Name:         strings.TrimSpace(req.Name),
		Email:        email,
		PasswordHash: hashPassword(req.Password),
		Role:         RoleUser,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	if err := api.createUser(user); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"token": api.newToken(user),
		"user":  sanitizeUser(user),
	})
}

func (api *API) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = strings.TrimSpace(r.RemoteAddr)
	}
	if !api.checkLoginRateLimit(host) {
		writeError(w, http.StatusTooManyRequests, "too many login attempts")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := api.getUserByEmail(email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if user == nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"token": api.newToken(user),
		"user":  sanitizeUser(user),
	})
}

func (api *API) handleUserProfile(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, sanitizeUser(user))
	case http.MethodPatch:
		var req UpdateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if strings.TrimSpace(req.Name) == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}
		user.Name = strings.TrimSpace(req.Name)
		user.UpdatedAt = time.Now().UTC()
		if err := api.updateUser(user); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update user")
			return
		}
		writeJSON(w, http.StatusOK, sanitizeUser(user))
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (api *API) handleFarms(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	switch r.Method {
	case http.MethodGet:
		farms, err := api.listFarms()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
		writeJSON(w, http.StatusOK, farms)
	case http.MethodPost:
		var req CreateFarmRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Location) == "" || req.Size <= 0 {
			writeError(w, http.StatusBadRequest, "farm name, location, and size are required")
			return
		}

		farm := &Farm{
			ID:        newID(),
			Name:      strings.TrimSpace(req.Name),
			Location:  strings.TrimSpace(req.Location),
			Size:      req.Size,
			OwnerID:   user.ID,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		if err := api.createFarm(farm); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create farm")
			return
		}

		user.Role = RoleFarmer
		user.UpdatedAt = time.Now().UTC()
		if err := api.updateUser(user); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update user role")
			return
		}

		writeJSON(w, http.StatusCreated, map[string]any{
			"token": api.newToken(user),
			"user":  sanitizeUser(user),
			"farm":  farm,
		})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (api *API) handleFarmByID(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/farms/")
	if path == "" {
		writeError(w, http.StatusNotFound, "farm not found")
		return
	}

	farmID := strings.TrimSuffix(path, "/dashboard")
	farmID = strings.TrimSpace(farmID)
	if farmID == "" {
		writeError(w, http.StatusNotFound, "farm not found")
		return
	}

	farm, err := api.getFarmByID(farmID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if farm == nil {
		writeError(w, http.StatusNotFound, "farm not found")
		return
	}

	if strings.HasSuffix(r.URL.Path, "/dashboard") {
		if user.Role != RoleFarmer {
			writeError(w, http.StatusForbidden, "only farmers can access farm dashboard")
			return
		}
		if farm.OwnerID != user.ID {
			writeError(w, http.StatusForbidden, "you do not own this farm")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"farm":    farm,
			"owner":   sanitizeUser(user),
			"message": fmt.Sprintf("Farm dashboard for %s", farm.Name),
			"summary": map[string]any{"size": farm.Size, "location": farm.Location},
		})
		return
	}

	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, farm)
	case http.MethodPut:
		if farm.OwnerID != user.ID {
			writeError(w, http.StatusForbidden, "you do not own this farm")
			return
		}
		var req UpdateFarmRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Name != "" {
			farm.Name = strings.TrimSpace(req.Name)
		}
		if req.Location != "" {
			farm.Location = strings.TrimSpace(req.Location)
		}
		if req.Size > 0 {
			farm.Size = req.Size
		}
		farm.UpdatedAt = time.Now().UTC()
		if err := api.updateFarm(farm); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update farm")
			return
		}
		writeJSON(w, http.StatusOK, farm)
	case http.MethodDelete:
		if farm.OwnerID != user.ID {
			writeError(w, http.StatusForbidden, "you do not own this farm")
			return
		}
		if err := api.deleteFarm(farm.ID); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to delete farm")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"message": "farm deleted"})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (api *API) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := api.userFromToken(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, err.Error())
			return
		}
		ctx := context.WithValue(r.Context(), contextUserKey, user)
		next(w, r.WithContext(ctx))
	}
}

func (api *API) userFromToken(r *http.Request) (*User, error) {
	authorization := r.Header.Get("Authorization")
	if authorization == "" {
		return nil, errors.New("missing authorization header")
	}
	parts := strings.SplitN(authorization, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return nil, errors.New("invalid authorization header")
	}

	tokenString := strings.TrimSpace(parts[1])
	token, err := jwt.ParseWithClaims(tokenString, &authClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*authClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	user, err := api.getUserByID(claims.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}
	if claims.Role != "" && user.Role != Role(claims.Role) {
		user.Role = Role(claims.Role)
		if err := api.updateUser(user); err != nil {
			return nil, err
		}
	}
	return user, nil
}

func (api *API) newToken(user *User) string {
	expiresAt := time.Now().Add(24 * time.Hour)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, authClaims{
		UserID: user.ID,
		Role:   string(user.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	})
	encoded, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return ""
	}
	return encoded
}

func (api *API) createUser(user *User) error {
	payload, err := json.Marshal(user)
	if err != nil {
		return err
	}
	return api.db.Update(func(tx *bbolt.Tx) error {
		return tx.Bucket(usersBucket).Put([]byte(user.ID), payload)
	})
}

func (api *API) getUserByID(id string) (*User, error) {
	var user *User
	err := api.db.View(func(tx *bbolt.Tx) error {
		data := tx.Bucket(usersBucket).Get([]byte(id))
		if data == nil {
			user = nil
			return nil
		}
		user = &User{}
		return json.Unmarshal(data, user)
	})
	return user, err
}

func (api *API) getUserByEmail(email string) (*User, error) {
	var found *User
	err := api.db.View(func(tx *bbolt.Tx) error {
		bucket := tx.Bucket(usersBucket)
		return bucket.ForEach(func(k, v []byte) error {
			var user User
			if err := json.Unmarshal(v, &user); err != nil {
				return err
			}
			if strings.EqualFold(user.Email, email) {
				found = &user
				return nil
			}
			return nil
		})
	})
	return found, err
}

func (api *API) updateUser(user *User) error {
	payload, err := json.Marshal(user)
	if err != nil {
		return err
	}
	return api.db.Update(func(tx *bbolt.Tx) error {
		return tx.Bucket(usersBucket).Put([]byte(user.ID), payload)
	})
}

func (api *API) createFarm(farm *Farm) error {
	payload, err := json.Marshal(farm)
	if err != nil {
		return err
	}
	return api.db.Update(func(tx *bbolt.Tx) error {
		return tx.Bucket(farmsBucket).Put([]byte(farm.ID), payload)
	})
}

func (api *API) getFarmByID(id string) (*Farm, error) {
	var farm *Farm
	err := api.db.View(func(tx *bbolt.Tx) error {
		data := tx.Bucket(farmsBucket).Get([]byte(id))
		if data == nil {
			farm = nil
			return nil
		}
		farm = &Farm{}
		return json.Unmarshal(data, farm)
	})
	return farm, err
}

func (api *API) listFarms() ([]Farm, error) {
	farms := make([]Farm, 0)
	err := api.db.View(func(tx *bbolt.Tx) error {
		bucket := tx.Bucket(farmsBucket)
		return bucket.ForEach(func(_, v []byte) error {
			var farm Farm
			if err := json.Unmarshal(v, &farm); err != nil {
				return err
			}
			farms = append(farms, farm)
			return nil
		})
	})
	return farms, err
}

func (api *API) updateFarm(farm *Farm) error {
	payload, err := json.Marshal(farm)
	if err != nil {
		return err
	}
	return api.db.Update(func(tx *bbolt.Tx) error {
		return tx.Bucket(farmsBucket).Put([]byte(farm.ID), payload)
	})
}

func (api *API) deleteFarm(id string) error {
	return api.db.Update(func(tx *bbolt.Tx) error {
		return tx.Bucket(farmsBucket).Delete([]byte(id))
	})
}

func currentUser(ctx context.Context) *User {
	value := ctx.Value(contextUserKey)
	user, ok := value.(*User)
	if !ok {
		return nil
	}
	return user
}

func sanitizeUser(user *User) *User {
	copyUser := *user
	copyUser.PasswordHash = ""
	return &copyUser
}

func withCORS(next http.Handler) http.Handler {
	return Chain(RecoveryMiddleware(), SecurityLimitsMiddleware(), CORSMiddleware(SecurityConfig.AllowedOrigins))(next)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func hashPassword(password string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	return string(hash)
}

func newID() string {
	buf := make([]byte, 12)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func isValidEmail(value string) bool {
	return strings.Contains(value, "@") && strings.Contains(value, ".")
}
