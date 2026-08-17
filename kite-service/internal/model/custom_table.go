package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

type CustomTable struct {
	ID          string
	AppID       string
	Name        string
	Description string
	Scope       provider.CustomTableScope
	Schema      provider.CustomTableSchema
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CustomTableRow struct {
	ID        uuid.UUID
	TableID   string
	ScopeID   string
	Data      map[string]any
	Version   int64
	CreatedAt time.Time
	UpdatedAt time.Time
}
