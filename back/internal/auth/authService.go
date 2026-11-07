package auth

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	jwt "github.com/golang-jwt/jwt/v5"
)

func UserFromToken(secret string, r *http.Request, getUserByID func(string) (*User, error), updateUser func(*User) error) (*User, error) {
	authorization := r.Header.Get("Authorization")
	if authorization == "" {
		return nil, errors.New("missing authorization header")
	}
	parts := strings.SplitN(authorization, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return nil, errors.New("invalid authorization header")
	}

	tokenString := strings.TrimSpace(parts[1])
	token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*AuthClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	user, err := getUserByID(claims.UserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}
	if claims.Role != "" && user.Role != Role(claims.Role) {
		user.Role = Role(claims.Role)
		if err := updateUser(user); err != nil {
			return nil, err
		}
	}
	return user, nil
}
