package admin

import (
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

type LogItem struct {
	ID              int64     `json:"id"`
	AppID           string    `json:"app_id"`
	AppName         *string   `json:"app_name"`
	Message         string    `json:"message"`
	Level           string    `json:"level"`
	CommandID       *string   `json:"command_id"`
	EventListenerID *string   `json:"event_listener_id"`
	MessageID       *string   `json:"message_id"`
	CreatedAt       time.Time `json:"created_at"`
}

type AppOption struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func validLogLevel(level string) bool {
	switch model.LogLevel(level) {
	case "", model.LogLevelDebug, model.LogLevelInfo, model.LogLevelWarn, model.LogLevelError:
		return true
	}
	return false
}

func (h *Handler) HandleLogList(c *handler.Context) (*ListResponse[LogItem], error) {
	query, err := search(c, 200)
	if err != nil {
		return nil, err
	}
	page, err := pageFrom(c, 50, 200)
	if err != nil {
		return nil, err
	}

	level := c.Query("level")
	if !validLogLevel(level) {
		return nil, handler.ErrBadRequest("invalid_level", "level must be debug, info, warn or error")
	}

	logs, total, err := h.console.AdminListLogs(c.Context(), store.AdminLogFilter{
		Level: level, AppID: c.Query("app_id"), Search: query,
	}, page)
	if err != nil {
		return nil, err
	}

	items := make([]LogItem, len(logs))
	for i, l := range logs {
		items[i] = LogItem(l)
	}
	return listResponse(items, total, page), nil
}

func (h *Handler) HandleLogApps(c *handler.Context) (*[]AppOption, error) {
	apps, err := h.console.AdminLogApps(c.Context())
	if err != nil {
		return nil, err
	}

	options := make([]AppOption, len(apps))
	for i, a := range apps {
		options[i] = AppOption(a)
	}
	return &options, nil
}
