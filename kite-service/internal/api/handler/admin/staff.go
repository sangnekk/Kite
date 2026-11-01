package admin

import (
	"encoding/json"
	"fmt"
	"regexp"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

var discordIDPattern = regexp.MustCompile(`^\d{15,25}$`)

type MeResponse struct {
	UserID          string  `json:"user_id"`
	DiscordID       string  `json:"discord_id"`
	Role            string  `json:"role"`
	DisplayName     string  `json:"display_name"`
	DiscordUsername string  `json:"discord_username"`
	DiscordAvatar   *string `json:"discord_avatar"`
}

// HandleMe tells the console who is signed in and what they may do.
func (h *Handler) HandleMe(c *handler.Context) (*MeResponse, error) {
	user, err := h.users.User(c.Context(), c.Session.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to load user: %w", err)
	}

	me := &MeResponse{
		UserID: user.ID, DiscordID: c.AdminDiscordID, Role: c.AdminRole,
		DisplayName: user.DisplayName, DiscordUsername: user.DiscordUsername,
	}
	if user.DiscordAvatar.Valid {
		me.DiscordAvatar = &user.DiscordAvatar.String
	}
	return me, nil
}

type StaffItem struct {
	DiscordID string `json:"discord_id"`
	Role      string `json:"role"`
	AddedBy   string `json:"added_by"`
	// Username is filled in once the person has signed in at least once.
	Username  *string   `json:"username"`
	CreatedAt time.Time `json:"created_at"`
}

type StaffListResponse struct {
	// SystemOwner is the owner configured in the config file, it is not stored
	// in the database and cannot be changed here.
	SystemOwner string      `json:"system_owner"`
	Staff       []StaffItem `json:"staff"`
}

func (h *Handler) HandleStaffList(c *handler.Context) (*StaffListResponse, error) {
	admins, err := h.admins.AdminUsers(c.Context())
	if err != nil {
		return nil, err
	}

	res := &StaffListResponse{SystemOwner: h.access.SystemOwner(), Staff: make([]StaffItem, len(admins))}
	for i, a := range admins {
		item := StaffItem{DiscordID: a.DiscordID, Role: string(a.Role), AddedBy: a.AddedBy, CreatedAt: a.CreatedAt}
		if user, err := h.users.UserByDiscordID(c.Context(), a.DiscordID); err == nil && user != nil {
			name := user.DiscordUsername
			item.Username = &name
		}
		res.Staff[i] = item
	}
	return res, nil
}

type StaffRequest struct {
	DiscordID string `json:"discord_id"`
	Role      string `json:"role"`
}

func (h *Handler) validateStaff(discordID, role string) error {
	if !discordIDPattern.MatchString(discordID) {
		return handler.ErrBadRequest("invalid_discord_id", "discord_id must be a Discord user ID")
	}
	if role != string(store.AdminRoleAdmin) && role != string(store.AdminRoleStaff) {
		return handler.ErrBadRequest("invalid_role", `role must be "admin" or "staff"`)
	}
	if discordID == h.access.SystemOwner() {
		return handler.ErrBadRequest("owner_is_implicit", "The system owner always has full access and cannot be edited here")
	}
	return nil
}

func (h *Handler) saveStaff(c *handler.Context, discordID, role, action string) (*StaffItem, error) {
	if err := h.validateStaff(discordID, role); err != nil {
		return nil, err
	}

	if err := h.admins.SaveAdminUser(c.Context(), store.AdminUser{
		DiscordID: discordID, Role: store.AdminRole(role), AddedBy: c.AdminDiscordID,
	}); err != nil {
		return nil, fmt.Errorf("failed to save admin user: %w", err)
	}

	h.audit(c, action, discordID, map[string]any{"role": role})

	saved, err := h.admins.AdminUser(c.Context(), discordID)
	if err != nil || saved == nil {
		return nil, fmt.Errorf("failed to reload admin user: %w", err)
	}
	return &StaffItem{DiscordID: saved.DiscordID, Role: string(saved.Role), AddedBy: saved.AddedBy, CreatedAt: saved.CreatedAt}, nil
}

func (h *Handler) HandleStaffCreate(c *handler.Context, req StaffRequest) (*StaffItem, error) {
	existing, err := h.admins.AdminUser(c.Context(), req.DiscordID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, handler.ErrBadRequest("staff_exists", "This person already has access: change their role instead")
	}
	return h.saveStaff(c, req.DiscordID, req.Role, "staff.add")
}

type StaffUpdateRequest struct {
	Role string `json:"role"`
}

func (h *Handler) HandleStaffUpdate(c *handler.Context, req StaffUpdateRequest) (*StaffItem, error) {
	discordID := c.Param("discordID")
	existing, err := h.admins.AdminUser(c.Context(), discordID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, handler.ErrNotFound("not_found", "Staff member not found")
	}
	return h.saveStaff(c, discordID, req.Role, "staff.update")
}

func (h *Handler) HandleStaffDelete(c *handler.Context) (*Empty, error) {
	discordID := c.Param("discordID")
	if discordID == h.access.SystemOwner() {
		return nil, handler.ErrBadRequest("owner_is_implicit", "The system owner cannot be removed")
	}

	existing, err := h.admins.AdminUser(c.Context(), discordID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, handler.ErrNotFound("not_found", "Staff member not found")
	}

	if err := h.admins.DeleteAdminUser(c.Context(), discordID); err != nil {
		return nil, err
	}

	h.audit(c, "staff.remove", discordID, map[string]any{"role": existing.Role})
	return &Empty{}, nil
}

type AuditItem struct {
	ID             int64           `json:"id"`
	ActorDiscordID string          `json:"actor_discord_id"`
	Action         string          `json:"action"`
	Target         string          `json:"target"`
	Detail         json.RawMessage `json:"detail"`
	CreatedAt      time.Time       `json:"created_at"`
}

func (h *Handler) HandleAuditLog(c *handler.Context) (*[]AuditItem, error) {
	page, err := pageFrom(c, 50, 200)
	if err != nil {
		return nil, err
	}

	entries, err := h.admins.AdminAuditLog(c.Context(), page.Size, page.Offset())
	if err != nil {
		return nil, err
	}

	items := make([]AuditItem, len(entries))
	for i, e := range entries {
		items[i] = AuditItem{
			ID: e.ID, ActorDiscordID: e.ActorDiscordID, Action: e.Action, Target: e.Target,
			Detail: e.Detail, CreatedAt: e.CreatedAt,
		}
	}
	return &items, nil
}
