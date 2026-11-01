package admin

import (
	"encoding/json"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

const maxDisabledReasonLength = 500

type AppItem struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	OwnerID            string          `json:"owner_id"`
	OwnerEmail         *string         `json:"owner_email"`
	Enabled            bool            `json:"enabled"`
	DiscordStatus      json.RawMessage `json:"discord_status"`
	DisabledReason     *string         `json:"disabled_reason"`
	CreditsUsed        int64           `json:"credits_used"`
	CollaboratorsCount int             `json:"collaborators_count"`
	CreatedAt          time.Time       `json:"created_at"`
}

type CollaboratorItem struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type AppDetail struct {
	ID                string             `json:"id"`
	Name              string             `json:"name"`
	Description       *string            `json:"description"`
	OwnerID           string             `json:"owner_id"`
	OwnerEmail        *string            `json:"owner_email"`
	CreatorUserID     string             `json:"creator_user_id"`
	Enabled           bool               `json:"enabled"`
	DiscordID         string             `json:"discord_id"`
	DiscordStatus     json.RawMessage    `json:"discord_status"`
	DisabledReason    *string            `json:"disabled_reason"`
	Collaborators     []CollaboratorItem `json:"collaborators"`
	CreditsUsed       int64              `json:"credits_used"`
	ResumePointsCount int                `json:"resume_points_count"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
}

func appDetail(a *store.AdminAppDetail) *AppDetail {
	d := &AppDetail{
		ID: a.ID, Name: a.Name, Description: a.Description, OwnerID: a.OwnerID, OwnerEmail: a.OwnerEmail,
		CreatorUserID: a.CreatorUserID, Enabled: a.Enabled, DiscordID: a.DiscordID,
		DiscordStatus: a.DiscordStatus, DisabledReason: a.DisabledReason,
		Collaborators: make([]CollaboratorItem, len(a.Collaborators)),
		CreditsUsed:   a.CreditsUsed, ResumePointsCount: a.ResumePointsCount,
		CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
	}
	for i, col := range a.Collaborators {
		d.Collaborators[i] = CollaboratorItem{UserID: col.UserID, Role: col.Role}
	}
	return d
}

func (h *Handler) HandleAppList(c *handler.Context) (*ListResponse[AppItem], error) {
	query, err := search(c, 100)
	if err != nil {
		return nil, err
	}
	page, err := pageFrom(c, 20, 100)
	if err != nil {
		return nil, err
	}

	apps, total, err := h.console.AdminListApps(c.Context(), query, page)
	if err != nil {
		return nil, err
	}

	items := make([]AppItem, len(apps))
	for i, a := range apps {
		items[i] = AppItem{
			ID: a.ID, Name: a.Name, OwnerID: a.OwnerID, OwnerEmail: a.OwnerEmail, Enabled: a.Enabled,
			DiscordStatus: a.DiscordStatus, DisabledReason: a.DisabledReason, CreditsUsed: a.CreditsUsed,
			CollaboratorsCount: a.CollaboratorsCount, CreatedAt: a.CreatedAt,
		}
	}
	return listResponse(items, total, page), nil
}

func (h *Handler) HandleAppGet(c *handler.Context) (*AppDetail, error) {
	app, err := h.console.AdminApp(c.Context(), c.Param("appID"))
	if err != nil {
		return nil, storeError(err, "App")
	}
	return appDetail(app), nil
}

type AppUpdateRequest struct {
	Enabled        *bool   `json:"enabled"`
	DisabledReason *string `json:"disabled_reason"`
}

// HandleAppUpdate enables or disables an app. Disabling stops its bot on every
// cluster (the gateway manager follows updated_at); enabling clears the reason.
func (h *Handler) HandleAppUpdate(c *handler.Context, req AppUpdateRequest) (*AppDetail, error) {
	if req.Enabled == nil && req.DisabledReason == nil {
		return nil, handler.ErrBadRequest("no_changes", "No fields to update")
	}

	appID := c.Param("appID")
	app, err := h.console.AdminApp(c.Context(), appID)
	if err != nil {
		return nil, storeError(err, "App")
	}

	enabled := app.Enabled
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	reason := app.DisabledReason
	if req.DisabledReason != nil {
		trimmed := strings.TrimSpace(*req.DisabledReason)
		if utf8.RuneCountInString(trimmed) > maxDisabledReasonLength {
			return nil, handler.ErrBadRequest("invalid_reason", "disabled_reason is too long")
		}
		reason = &trimmed
		if trimmed == "" {
			reason = nil
		}
	}
	if enabled {
		reason = nil
	}

	if err := h.console.AdminSetAppEnabled(c.Context(), appID, enabled, reason, now()); err != nil {
		return nil, storeError(err, "App")
	}

	h.audit(c, "app.update", appID, map[string]any{"enabled": enabled, "disabled_reason": reason})

	updated, err := h.console.AdminApp(c.Context(), appID)
	if err != nil {
		return nil, storeError(err, "App")
	}
	return appDetail(updated), nil
}

type KillFlowsResponse struct {
	Deleted int64 `json:"deleted"`
}

// HandleAppKillFlows drops the paused flows (resume points) of an app, so
// buttons and menus on old messages stop working.
func (h *Handler) HandleAppKillFlows(c *handler.Context) (*KillFlowsResponse, error) {
	appID := c.Param("appID")
	if _, err := h.console.AdminApp(c.Context(), appID); err != nil {
		return nil, storeError(err, "App")
	}

	deleted, err := h.console.AdminDeleteResumePoints(c.Context(), appID)
	if err != nil {
		return nil, err
	}

	h.audit(c, "app.kill_flows", appID, map[string]any{"deleted": deleted})
	return &KillFlowsResponse{Deleted: deleted}, nil
}
