package routes

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
	bbolt "go.etcd.io/bbolt"
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
	return &API{db: db}
}

func NewHandler() http.Handler {
	api := NewAPI()
	mux := http.NewServeMux()

	mux.Handle("/api/health", withCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})))
	mux.Handle("/api/register", withCORS(http.HandlerFunc(api.handleRegister)))
	mux.Handle("/api/auth/register", withCORS(http.HandlerFunc(api.handleRegister)))
	mux.Handle("/api/login", withCORS(http.HandlerFunc(api.handleLogin)))
	mux.Handle("/api/auth/login", withCORS(http.HandlerFunc(api.handleLogin)))
	mux.Handle("/api/users/me", withCORS(api.requireAuth(api.handleUserProfile)))
	mux.Handle("/api/farms", withCORS(api.requireAuth(api.handleFarms)))
	mux.Handle("/api/farms/", withCORS(api.requireAuth(api.handleFarmByID)))

	return mux
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
	if user == nil || user.PasswordHash != hashPassword(req.Password) {
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
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
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
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

func newID() string {
	buf := make([]byte, 12)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func isValidEmail(value string) bool {
	return strings.Contains(value, "@") && strings.Contains(value, ".")
}
