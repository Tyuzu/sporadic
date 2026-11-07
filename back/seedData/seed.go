package seedData

import (
	"time"

	"simpo/internal/auth"
)

func SeedAdminAccount(
	getUserByEmail func(string) (*auth.User, error),
	createUser func(*auth.User) error,
	email string,
	password string,
	newID func() string,
) error {
	user, err := getUserByEmail(email)
	if err != nil {
		return err
	}
	if user != nil {
		return nil
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}

	admin := &auth.User{
		ID:           newID(),
		Name:         "Admin Master",
		Email:        email,
		PasswordHash: hash,
		Role:         auth.RoleAdmin,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	return createUser(admin)
}
