package farms

import "time"

type Farm struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Location  string    `json:"location"`
	Size      float64   `json:"size"`
	OwnerID   string    `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
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
