package model

import "time"

type AIConversation struct {
	ID         string
	AppID      string
	ContextKey string
	Title      string
	Messages   []byte
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type AIConversationSummary struct {
	ID        string
	Title     string
	UpdatedAt time.Time
}
