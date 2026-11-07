package auth

import (
	"context"
	"strings"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
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

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type ContextKey string

const ContextUserKey ContextKey = "current_user"

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func IsValidEmail(value string) bool {
	return strings.Contains(value, "@") && strings.Contains(value, ".")
}

func CurrentUser(ctx context.Context) *User {
	value := ctx.Value(ContextUserKey)
	user, ok := value.(*User)
	if !ok {
		return nil
	}
	return user
}

func SanitizeUser(user *User) *User {
	copyUser := *user
	copyUser.PasswordHash = ""
	return &copyUser
}

func NewToken(secret string, user *User) string {
	expiresAt := time.Now().Add(24 * time.Hour)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, AuthClaims{
		UserID: user.ID,
		Role:   string(user.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	})
	encoded, err := token.SignedString([]byte(secret))
	if err != nil {
		return ""
	}
	return encoded
}
