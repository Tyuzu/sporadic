package routes

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"simpo/internal/auth"
	"simpo/internal/farms"
	"simpo/middleware"
	"simpo/seedData"
	"simpo/utils"

	bbolt "go.etcd.io/bbolt"
)

const jwtSecret = "simpo-dev-secret-change-me"

var (
	usersBucket = []byte("users")
	farmsBucket = []byte("farms")
)

type Role = auth.Role

const (
	RoleUser   = auth.RoleUser
	RoleFarmer = auth.RoleFarmer
	RoleAdmin  = auth.RoleAdmin
)

type User = auth.User

type Farm = farms.Farm

type RegisterRequest = auth.RegisterRequest

type LoginRequest = auth.LoginRequest

type UpdateUserRequest = auth.UpdateUserRequest

type CreateFarmRequest = farms.CreateFarmRequest

type UpdateFarmRequest = farms.UpdateFarmRequest

type authClaims = auth.AuthClaims

type userContextKey = auth.ContextKey

const contextUserKey userContextKey = auth.ContextUserKey

type API struct {
	db *bbolt.DB
}

type Middleware = middleware.Middleware

var SecurityConfig = middleware.SecurityConfig

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
	globalPipeline := middleware.Chain(
		middleware.RecoveryMiddleware(),
		middleware.SecurityLimitsMiddleware(),
		middleware.CORSMiddleware(middleware.SecurityConfig.AllowedOrigins),
	)

	mux.Handle("/api/health", globalPipeline(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		utils.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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
				utils.WriteError(w, http.StatusUnauthorized, "authentication required")
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
				utils.WriteError(w, http.StatusForbidden, "insufficient permissions")
				return
			}
			next(w, r)
		}
	}
}

func (api *API) seedAdminAccount() {
	if err := seedData.SeedAdminAccount(
		api.getUserByEmail,
		api.createUser,
		"admin@system.internal",
		"SecureAdminPass123!",
		newID,
	); err != nil {
		return
	}
}

func (api *API) checkLoginRateLimit(ip string) bool {
	return middleware.CheckLoginRateLimit(ip, SecurityConfig.RateLimitRequests, SecurityConfig.RateLimitWindow)
}

func (api *API) handleRegister(w http.ResponseWriter, r *http.Request) {
	auth.RegisterHandler(w, r, auth.AuthDeps{
		GetUserByEmail:      api.getUserByEmail,
		CreateUser:          api.createUser,
		UpdateUser:          api.updateUser,
		GetUserByID:         api.getUserByID,
		NewToken:            api.newToken,
		HashPassword:        hashPassword,
		IsValidEmail:        isValidEmail,
		CurrentUser:         currentUser,
		SanitizeUser:        sanitizeUser,
		CheckLoginRateLimit: api.checkLoginRateLimit,
		NewID:               newID,
	})
}

func (api *API) handleLogin(w http.ResponseWriter, r *http.Request) {
	auth.LoginHandler(w, r, auth.AuthDeps{
		GetUserByEmail:      api.getUserByEmail,
		CreateUser:          api.createUser,
		UpdateUser:          api.updateUser,
		GetUserByID:         api.getUserByID,
		NewToken:            api.newToken,
		HashPassword:        hashPassword,
		IsValidEmail:        isValidEmail,
		CurrentUser:         currentUser,
		SanitizeUser:        sanitizeUser,
		CheckLoginRateLimit: api.checkLoginRateLimit,
		NewID:               newID,
	})
}

func (api *API) handleUserProfile(w http.ResponseWriter, r *http.Request) {
	auth.ProfileHandler(w, r, auth.AuthDeps{
		GetUserByEmail:      api.getUserByEmail,
		CreateUser:          api.createUser,
		UpdateUser:          api.updateUser,
		GetUserByID:         api.getUserByID,
		NewToken:            api.newToken,
		HashPassword:        hashPassword,
		IsValidEmail:        isValidEmail,
		CurrentUser:         currentUser,
		SanitizeUser:        sanitizeUser,
		CheckLoginRateLimit: api.checkLoginRateLimit,
		NewID:               newID,
	})
}

func (api *API) handleFarms(w http.ResponseWriter, r *http.Request) {
	farms.ListAndCreateHandler(w, r, farms.FarmDeps{
		CurrentUser:  currentUser,
		NewID:        newID,
		NewToken:     api.newToken,
		SanitizeUser: sanitizeUser,
		CreateFarm:   api.createFarm,
		ListFarms:    api.listFarms,
		GetFarmByID:  api.getFarmByID,
		UpdateFarm:   api.updateFarm,
		DeleteFarm:   api.deleteFarm,
		UpdateUser:   api.updateUser,
	})
}

func (api *API) handleFarmByID(w http.ResponseWriter, r *http.Request) {
	farms.ByIDHandler(w, r, farms.FarmDeps{
		CurrentUser:  currentUser,
		NewID:        newID,
		NewToken:     api.newToken,
		SanitizeUser: sanitizeUser,
		CreateFarm:   api.createFarm,
		ListFarms:    api.listFarms,
		GetFarmByID:  api.getFarmByID,
		UpdateFarm:   api.updateFarm,
		DeleteFarm:   api.deleteFarm,
		UpdateUser:   api.updateUser,
	})
}

func (api *API) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := api.userFromToken(r)
		if err != nil {
			utils.WriteError(w, http.StatusUnauthorized, err.Error())
			return
		}
		ctx := context.WithValue(r.Context(), contextUserKey, user)
		next(w, r.WithContext(ctx))
	}
}

func (api *API) userFromToken(r *http.Request) (*User, error) {
	return auth.UserFromToken(jwtSecret, r, api.getUserByID, api.updateUser)
}

func (api *API) newToken(user *User) string {
	return auth.NewToken(jwtSecret, user)
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
	return auth.CurrentUser(ctx)
}

func sanitizeUser(user *User) *User {
	return auth.SanitizeUser(user)
}

func withCORS(next http.Handler) http.Handler {
	return middleware.Chain(
		middleware.RecoveryMiddleware(),
		middleware.SecurityLimitsMiddleware(),
		middleware.CORSMiddleware(middleware.SecurityConfig.AllowedOrigins),
	)(next)
}

func hashPassword(password string) string {
	hash, err := auth.HashPassword(password)
	if err != nil {
		panic(err)
	}
	return hash
}

func newID() string {
	return utils.NewID()
}

func isValidEmail(value string) bool {
	return auth.IsValidEmail(value)
}
