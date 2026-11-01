package store

import (
	"context"
	"time"
)

type AdminRole string

const (
	// AdminRoleOwner is never stored in the database: it is derived from the
	// system_owner entry of the config file so nobody can get locked out.
	AdminRoleOwner AdminRole = "owner"
	AdminRoleAdmin AdminRole = "admin"
	AdminRoleStaff AdminRole = "staff"
)

// CanWrite reports whether the role may change data (staff is read-only).
func (r AdminRole) CanWrite() bool {
	return r == AdminRoleOwner || r == AdminRoleAdmin
}

// CanManageStaff reports whether the role may manage staff and secrets.
func (r AdminRole) CanManageStaff() bool {
	return r == AdminRoleOwner
}

type AdminUser struct {
	DiscordID string
	Role      AdminRole
	AddedBy   string
	CreatedAt time.Time
}

type AdminAuditEntry struct {
	ID             int64
	ActorDiscordID string
	Action         string
	Target         string
	Detail         []byte
	CreatedAt      time.Time
}

type AdminUserStore interface {
	AdminUsers(ctx context.Context) ([]AdminUser, error)
	// AdminUser returns nil when the Discord ID is not a stored admin/staff.
	AdminUser(ctx context.Context, discordID string) (*AdminUser, error)
	SaveAdminUser(ctx context.Context, user AdminUser) error
	DeleteAdminUser(ctx context.Context, discordID string) error
	AddAdminAudit(ctx context.Context, entry AdminAuditEntry) error
	AdminAuditLog(ctx context.Context, limit, offset int) ([]AdminAuditEntry, error)
}
