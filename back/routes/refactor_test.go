package routes

import (
	"testing"

	"simpo/internal/auth"
	"simpo/middleware"
	"simpo/seedData"
)

type seedStoreStub struct{}

func (seedStoreStub) GetUserByEmail(string) (*auth.User, error) {
	return nil, nil
}

func (seedStoreStub) CreateUser(*auth.User) error {
	return nil
}

func TestSecurityAndSeedPackagesAreAvailable(t *testing.T) {
	if len(middleware.SecurityConfig.AllowedOrigins) == 0 {
		t.Fatal("expected default CORS origins to be configured")
	}

	store := seedStoreStub{}
	if err := seedData.SeedAdminAccount(
		store.GetUserByEmail,
		store.CreateUser,
		"admin@system.internal",
		"SecureAdminPass123!",
		func() string { return "seeded-admin" },
	); err != nil {
		t.Fatalf("seed admin helper returned error: %v", err)
	}
}
