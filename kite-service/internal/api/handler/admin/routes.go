package admin

import (
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

// RegisterRoutes mounts the admin console API under /admin. requireSession is
// the regular session middleware: admins sign in through the normal Discord
// login, access is then decided by their role.
//
//	staff  - read everything operational (users, apps, billing, logs, revenue, plans)
//	admin  - also change data (apps, billing, plans) and read the audit log
//	owner  - also manage settings and staff
func (h *Handler) RegisterRoutes(v1 handler.HandlerGroup, requireSession handler.MiddlewareFunc) {
	staff := h.access.Require(store.AdminRoleStaff)
	admin := h.access.Require(store.AdminRoleAdmin)
	owner := h.access.Require(store.AdminRoleOwner)

	g := v1.Group("/admin", requireSession, staff, handler.RateLimitByUser(300, time.Minute))

	g.Get("/me", handler.Typed(h.HandleMe))
	g.Get("/dashboard", handler.Typed(h.HandleDashboard))

	g.Get("/users", handler.Typed(h.HandleUserList))
	g.Get("/users/{userID}", handler.Typed(h.HandleUserGet))
	g.Post("/users/{userID}/force-logout", handler.Typed(h.HandleUserForceLogout), admin)

	g.Get("/apps", handler.Typed(h.HandleAppList))
	g.Get("/apps/{appID}", handler.Typed(h.HandleAppGet))
	g.Patch("/apps/{appID}", handler.TypedWithBody(h.HandleAppUpdate), admin)
	g.Post("/apps/{appID}/kill-flows", handler.Typed(h.HandleAppKillFlows), admin)

	g.Get("/billing/subscriptions", handler.Typed(h.HandleSubscriptionList))
	g.Post("/billing/subscriptions/{subscriptionID}/cancel", handler.Typed(h.HandleSubscriptionCancel), admin)
	g.Get("/billing/entitlements", handler.Typed(h.HandleEntitlementList))
	g.Post("/billing/entitlements", handler.TypedWithBody(h.HandleEntitlementGrant), admin)
	g.Delete("/billing/entitlements/{entitlementID}", handler.Typed(h.HandleEntitlementDelete), admin)
	g.Get("/billing/payment-sessions", handler.Typed(h.HandlePaymentSessionList))
	g.Patch("/billing/payment-sessions/{sessionID}", handler.TypedWithBody(h.HandlePaymentSessionUpdate), admin)

	g.Get("/logs", handler.Typed(h.HandleLogList))
	g.Get("/logs/apps", handler.Typed(h.HandleLogApps))

	g.Get("/revenue/summary", handler.Typed(h.HandleRevenueSummary))
	g.Get("/revenue/chart", handler.Typed(h.HandleRevenueChart))
	g.Get("/revenue/subscriptions", handler.Typed(h.HandleSubscriptionStats))

	g.Get("/plans", handler.Typed(h.HandlePlanList))
	g.Post("/plans", handler.TypedWithBody(h.HandlePlanCreate), admin)
	g.Put("/plans/order", handler.TypedWithBody(h.HandlePlanOrder), admin)
	g.Put("/plans/{planID}", handler.TypedWithBody(h.HandlePlanUpdate), admin)
	g.Post("/plans/{planID}/archive", handler.Typed(h.HandlePlanArchive), admin)
	g.Post("/plans/{planID}/restore", handler.Typed(h.HandlePlanRestore), admin)

	g.Get("/audit-log", handler.Typed(h.HandleAuditLog), admin)

	g.Get("/settings", handler.Typed(h.HandleSettingsGet), owner)
	g.Put("/settings/{group}", handler.TypedWithBody(h.HandleSettingsUpdate), owner)

	g.Get("/staff", handler.Typed(h.HandleStaffList), owner)
	g.Post("/staff", handler.TypedWithBody(h.HandleStaffCreate), owner)
	g.Put("/staff/{discordID}", handler.TypedWithBody(h.HandleStaffUpdate), owner)
	g.Delete("/staff/{discordID}", handler.Typed(h.HandleStaffDelete), owner)
}
