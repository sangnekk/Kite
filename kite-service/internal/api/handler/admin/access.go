// Package admin implements the admin console API (/v1/admin/*).
//
// Access is decided per request from the signed-in Discord user: the system
// owner from the config file is always the owner, everybody else needs a row in
// admin_users (admin or staff). Staff is read-only.
package admin

import (
	"context"
	"fmt"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

// Access resolves who is an admin and what they may do.
type Access struct {
	systemOwner string
	users       store.UserStore
	admins      store.AdminUserStore
}

func NewAccess(systemOwner string, users store.UserStore, admins store.AdminUserStore) *Access {
	return &Access{systemOwner: systemOwner, users: users, admins: admins}
}

// SystemOwner returns the Discord ID of the owner (empty when not configured).
func (a *Access) SystemOwner() string { return a.systemOwner }

func rank(role store.AdminRole) int {
	switch role {
	case store.AdminRoleOwner:
		return 3
	case store.AdminRoleAdmin:
		return 2
	case store.AdminRoleStaff:
		return 1
	default:
		return 0
	}
}

// RoleOf returns the role of a Discord user, or "" when they are not an admin.
func (a *Access) RoleOf(ctx context.Context, discordID string) (store.AdminRole, error) {
	if a.systemOwner != "" && discordID == a.systemOwner {
		return store.AdminRoleOwner, nil
	}

	admin, err := a.admins.AdminUser(ctx, discordID)
	if err != nil {
		return "", fmt.Errorf("failed to look up admin user: %w", err)
	}
	if admin == nil {
		return "", nil
	}
	return admin.Role, nil
}

// Require rejects everybody below the given role. It must run after
// RequireSession.
func (a *Access) Require(min store.AdminRole) handler.MiddlewareFunc {
	return func(next handler.HandlerFunc) handler.HandlerFunc {
		return func(c *handler.Context) error {
			if c.Session == nil {
				return handler.ErrUnauthorized("unauthorized", "Session required")
			}

			// Resolve the identity once per request, later Require calls (a route
			// stricter than its group) reuse it.
			if c.AdminRole == "" {
				user, err := a.users.User(c.Context(), c.Session.UserID)
				if err != nil {
					return fmt.Errorf("failed to load session user: %w", err)
				}

				role, err := a.RoleOf(c.Context(), user.DiscordID)
				if err != nil {
					return err
				}
				if role == "" {
					return handler.ErrForbidden("not_admin", "You do not have access to the admin console")
				}

				c.AdminDiscordID = user.DiscordID
				c.AdminRole = string(role)
			}

			if rank(store.AdminRole(c.AdminRole)) < rank(min) {
				return handler.ErrForbidden("insufficient_role", fmt.Sprintf("This action requires the %s role", min))
			}
			return next(c)
		}
	}
}
