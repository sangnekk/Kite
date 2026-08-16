package model

import "time"

// CustomEvent is an app-scoped event definition. Flows reference its stable ID
// so renaming an event cannot silently break publishers or subscribers.
type CustomEvent struct {
	ID          string
	AppID       string
	Name        string
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
