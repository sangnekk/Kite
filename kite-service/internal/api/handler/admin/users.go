package admin

import (
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

type UserItem struct {
	ID              string    `json:"id"`
	Email           string    `json:"email"`
	DisplayName     string    `json:"display_name"`
	DiscordID       string    `json:"discord_id"`
	DiscordUsername string    `json:"discord_username"`
	DiscordAvatar   *string   `json:"discord_avatar"`
	Plan            string    `json:"plan"`
	AppsCount       int       `json:"apps_count"`
	CreatedAt       time.Time `json:"created_at"`
}

type UserAppItem struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
}

type SubscriptionBrief struct {
	ID          string     `json:"id"`
	Status      string     `json:"status"`
	DisplayName string     `json:"display_name"`
	RenewsAt    *time.Time `json:"renews_at"`
	EndsAt      *time.Time `json:"ends_at"`
}

type UserDetail struct {
	UserItem
	Apps         []UserAppItem      `json:"apps"`
	Subscription *SubscriptionBrief `json:"subscription"`
	UpdatedAt    time.Time          `json:"updated_at"`
}

func userItem(u store.AdminUserSummary) UserItem {
	return UserItem{
		ID: u.ID, Email: u.Email, DisplayName: u.DisplayName, DiscordID: u.DiscordID,
		DiscordUsername: u.DiscordUsername, DiscordAvatar: u.DiscordAvatar,
		Plan: u.Plan, AppsCount: u.AppsCount, CreatedAt: u.CreatedAt,
	}
}

func (h *Handler) HandleUserList(c *handler.Context) (*ListResponse[UserItem], error) {
	query, err := search(c, 100)
	if err != nil {
		return nil, err
	}
	page, err := pageFrom(c, 20, 100)
	if err != nil {
		return nil, err
	}

	users, total, err := h.console.AdminListUsers(c.Context(), query, page)
	if err != nil {
		return nil, err
	}

	items := make([]UserItem, len(users))
	for i, u := range users {
		items[i] = userItem(u)
	}
	return listResponse(items, total, page), nil
}

func (h *Handler) HandleUserGet(c *handler.Context) (*UserDetail, error) {
	user, err := h.console.AdminUserByID(c.Context(), c.Param("userID"))
	if err != nil {
		return nil, storeError(err, "User")
	}

	detail := &UserDetail{
		UserItem:  userItem(user.AdminUserSummary),
		Apps:      make([]UserAppItem, len(user.Apps)),
		UpdatedAt: user.UpdatedAt,
	}
	for i, a := range user.Apps {
		detail.Apps[i] = UserAppItem{ID: a.ID, Name: a.Name, Enabled: a.Enabled, CreatedAt: a.CreatedAt}
	}
	if user.Subscription != nil {
		detail.Subscription = &SubscriptionBrief{
			ID: user.Subscription.ID, Status: user.Subscription.Status, DisplayName: user.Subscription.DisplayName,
			RenewsAt: user.Subscription.RenewsAt, EndsAt: user.Subscription.EndsAt,
		}
	}
	return detail, nil
}

type ForceLogoutResponse struct {
	SessionsRemoved int64 `json:"sessions_removed"`
}

func (h *Handler) HandleUserForceLogout(c *handler.Context) (*ForceLogoutResponse, error) {
	userID := c.Param("userID")
	if _, err := h.console.AdminUserByID(c.Context(), userID); err != nil {
		return nil, storeError(err, "User")
	}

	removed, err := h.console.AdminDeleteUserSessions(c.Context(), userID)
	if err != nil {
		return nil, err
	}

	h.audit(c, "user.force_logout", userID, map[string]any{"sessions_removed": removed})
	return &ForceLogoutResponse{SessionsRemoved: removed}, nil
}
