package routes

import (
	"strings"
	"testing"
)

func TestHashPasswordUsesBcrypt(t *testing.T) {
	hash := hashPassword("secret-password")
	if !strings.HasPrefix(hash, "$2") {
		t.Fatalf("expected bcrypt hash, got %q", hash)
	}
}
