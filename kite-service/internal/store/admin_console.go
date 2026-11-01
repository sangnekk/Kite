package store

import (
	"context"
	"encoding/json"
	"time"
)

// Page selects one page of a list (1-based).
type Page struct {
	Number int
	Size   int
}

func (p Page) Offset() int { return (p.Number - 1) * p.Size }

type AdminUserSummary struct {
	ID              string
	Email           string
	DisplayName     string
	DiscordID       string
	DiscordUsername string
	DiscordAvatar   *string
	Plan            string
	AppsCount       int
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type AdminUserApp struct {
	ID        string
	Name      string
	Enabled   bool
	CreatedAt time.Time
}

type AdminSubscriptionBrief struct {
	ID          string
	Status      string
	DisplayName string
	RenewsAt    *time.Time
	EndsAt      *time.Time
}

type AdminUserDetail struct {
	AdminUserSummary
	Apps         []AdminUserApp
	Subscription *AdminSubscriptionBrief
}

type AdminAppSummary struct {
	ID                 string
	Name               string
	OwnerID            string
	OwnerEmail         *string
	Enabled            bool
	DiscordStatus      json.RawMessage
	DisabledReason     *string
	CreditsUsed        int64
	CollaboratorsCount int
	CreatedAt          time.Time
}

type AdminCollaborator struct {
	UserID string
	Role   string
}

type AdminAppDetail struct {
	ID                string
	Name              string
	Description       *string
	OwnerID           string
	OwnerEmail        *string
	CreatorUserID     string
	Enabled           bool
	DiscordID         string
	DiscordStatus     json.RawMessage
	DisabledReason    *string
	Collaborators     []AdminCollaborator
	CreditsUsed       int64
	ResumePointsCount int
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type AdminSubscription struct {
	ID          string
	UserID      string
	UserEmail   *string
	DisplayName string
	Source      string
	Status      string
	RenewsAt    *time.Time
	TrialEndsAt *time.Time
	EndsAt      *time.Time
	CreatedAt   time.Time
}

type AdminEntitlement struct {
	ID             string
	Type           string
	AppID          string
	AppName        *string
	SubscriptionID *string
	PlanID         string
	EndsAt         *time.Time
	CreatedAt      time.Time
}

type AdminPaymentSession struct {
	ID        string
	PaymentID string
	AppID     string
	AppName   *string
	PlanID    string
	Provider  string
	Amount    int
	Status    string
	PaidAt    *time.Time
	CreatedAt time.Time
}

type AdminLogFilter struct {
	Level  string
	AppID  string
	Search string
}

type AdminLogEntry struct {
	ID              int64
	AppID           string
	AppName         *string
	Message         string
	Level           string
	CommandID       *string
	EventListenerID *string
	MessageID       *string
	CreatedAt       time.Time
}

type AdminAppOption struct {
	ID   string
	Name string
}

type AdminDashboardStats struct {
	TotalUsers          int64
	TotalApps           int64
	ActiveApps          int64
	Errors24h           int64
	ErrorsPrev24h       int64
	TotalCredits        int64
	ActiveSubscriptions int64
}

type AdminDayPoint struct {
	Day     time.Time
	Credits int64
	Errors  int64
}

type AdminRecentLog struct {
	ID        int64
	AppID     string
	AppName   *string
	Message   string
	Level     string
	CreatedAt time.Time
}

type AdminDashboard struct {
	Stats      AdminDashboardStats
	Days       []AdminDayPoint
	RecentLogs []AdminRecentLog
}

type AdminRevenueTotals struct {
	Total int64
	Count int64
}

type AdminRevenuePoint struct {
	Bucket time.Time
	Total  int64
	Count  int64
}

// AdminConsoleStore holds the queries behind the admin console. The methods
// that look up a single row return ErrNotFound when it does not exist.
type AdminConsoleStore interface {
	AdminListUsers(ctx context.Context, search string, page Page) ([]AdminUserSummary, int, error)
	AdminUserByID(ctx context.Context, id string) (*AdminUserDetail, error)
	// AdminDeleteUserSessions logs the user out everywhere and returns how many
	// sessions were removed.
	AdminDeleteUserSessions(ctx context.Context, userID string) (int64, error)

	AdminListApps(ctx context.Context, search string, page Page) ([]AdminAppSummary, int, error)
	AdminApp(ctx context.Context, id string) (*AdminAppDetail, error)
	AdminSetAppEnabled(ctx context.Context, id string, enabled bool, disabledReason *string, now time.Time) error
	AdminDeleteResumePoints(ctx context.Context, appID string) (int64, error)

	AdminListSubscriptions(ctx context.Context, search string, status string, page Page) ([]AdminSubscription, int, error)
	// AdminSetSubscriptionStatus also ends the entitlements of the subscription
	// when it is cancelled, so cancelling really revokes the plan.
	AdminSetSubscriptionStatus(ctx context.Context, id string, status string, now time.Time) error
	AdminListEntitlements(ctx context.Context, page Page) ([]AdminEntitlement, int, error)
	AdminCreateManualEntitlement(ctx context.Context, id string, appID string, planID string, now time.Time, endsAt *time.Time) error
	AdminDeleteEntitlement(ctx context.Context, id string) error
	AdminListPaymentSessions(ctx context.Context, status string, page Page) ([]AdminPaymentSession, int, error)
	AdminPaymentSessionPaymentID(ctx context.Context, id string) (string, error)
	AdminCancelPendingPaymentSession(ctx context.Context, id string, status string, now time.Time) error

	AdminListLogs(ctx context.Context, filter AdminLogFilter, page Page) ([]AdminLogEntry, int, error)
	AdminLogApps(ctx context.Context) ([]AdminAppOption, error)

	AdminDashboard(ctx context.Context, now time.Time) (*AdminDashboard, error)
	AdminRevenueTotals(ctx context.Context, start, end time.Time) (AdminRevenueTotals, error)
	AdminRevenueChart(ctx context.Context, unit string, start time.Time) ([]AdminRevenuePoint, error)
	AdminSubscriptionCounts(ctx context.Context) (map[string]int64, error)
}
