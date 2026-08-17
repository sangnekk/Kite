package store

import (
	"context"

	"github.com/kitecloud/kite/kite-service/internal/model"
)

type CustomEventStore interface {
	CustomEventsByApp(ctx context.Context, appID string) ([]*model.CustomEvent, error)
	CountCustomEventsByApp(ctx context.Context, appID string) (int, error)
	CustomEvent(ctx context.Context, id string) (*model.CustomEvent, error)
	CreateCustomEvent(ctx context.Context, event *model.CustomEvent) (*model.CustomEvent, error)
	UpdateCustomEvent(ctx context.Context, event *model.CustomEvent) (*model.CustomEvent, error)
	DeleteCustomEvent(ctx context.Context, id string) error
}
