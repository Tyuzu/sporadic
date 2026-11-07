package auth

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"

	"simpo/utils"

	"golang.org/x/crypto/bcrypt"
)

type UserStore interface {
	GetUserByEmail(string) (*User, error)
	CreateUser(*User) error
	UpdateUser(*User) error
	GetUserByID(string) (*User, error)
}

type AuthDeps struct {
	GetUserByEmail      func(string) (*User, error)
	CreateUser          func(*User) error
	UpdateUser          func(*User) error
	GetUserByID         func(string) (*User, error)
	NewToken            func(*User) string
	HashPassword        func(string) string
	IsValidEmail        func(string) bool
	CurrentUser         func(context.Context) *User
	SanitizeUser        func(*User) *User
	CheckLoginRateLimit func(string) bool
	NewID               func() string
}

func RegisterHandler(w http.ResponseWriter, r *http.Request, deps AuthDeps) {
	if r.Method != http.MethodPost {
		utils.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Name) == "" || !deps.IsValidEmail(req.Email) || len(req.Password) < 6 {
		utils.WriteError(w, http.StatusBadRequest, "name, valid email, and password (min 6 chars) are required")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	existing, err := deps.GetUserByEmail(email)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "database error")
		return
	}
	if existing != nil {
		utils.WriteError(w, http.StatusConflict, "email already registered")
		return
	}

	user := &User{
		ID:           deps.NewID(),
		Name:         strings.TrimSpace(req.Name),
		Email:        email,
		PasswordHash: deps.HashPassword(req.Password),
		Role:         RoleUser,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	if err := deps.CreateUser(user); err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	utils.WriteJSON(w, http.StatusCreated, map[string]any{
		"token": deps.NewToken(user),
		"user":  deps.SanitizeUser(user),
	})
}

func LoginHandler(w http.ResponseWriter, r *http.Request, deps AuthDeps) {
	if r.Method != http.MethodPost {
		utils.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = strings.TrimSpace(r.RemoteAddr)
	}
	if !deps.CheckLoginRateLimit(host) {
		utils.WriteError(w, http.StatusTooManyRequests, "too many login attempts")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, err := deps.GetUserByEmail(email)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "database error")
		return
	}
	if user == nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		utils.WriteError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]any{
		"token": deps.NewToken(user),
		"user":  deps.SanitizeUser(user),
	})
}

func ProfileHandler(w http.ResponseWriter, r *http.Request, deps AuthDeps) {
	user := deps.CurrentUser(r.Context())
	if user == nil {
		utils.WriteError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	switch r.Method {
	case http.MethodGet:
		utils.WriteJSON(w, http.StatusOK, deps.SanitizeUser(user))
	case http.MethodPatch:
		var req UpdateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if strings.TrimSpace(req.Name) == "" {
			utils.WriteError(w, http.StatusBadRequest, "name is required")
			return
		}
		user.Name = strings.TrimSpace(req.Name)
		user.UpdatedAt = time.Now().UTC()
		if err := deps.UpdateUser(user); err != nil {
			utils.WriteError(w, http.StatusInternalServerError, "failed to update user")
			return
		}
		utils.WriteJSON(w, http.StatusOK, deps.SanitizeUser(user))
	default:
		utils.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
