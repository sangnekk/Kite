package postgres

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

// likePattern turns a user supplied search into an ILIKE pattern that matches
// it literally (anywhere in the value). An empty search matches everything.
func likePattern(search string) string {
	search = strings.TrimSpace(search)
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + r.Replace(search) + "%"
}

func tsOf(t pgtype.Timestamp) time.Time { return t.Time }

func tsPtr(t pgtype.Timestamp) *time.Time {
	if !t.Valid {
		return nil
	}
	v := t.Time
	return &v
}

func tsParam(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: t.UTC(), Valid: true}
}

func tsParamPtr(t *time.Time) pgtype.Timestamp {
	if t == nil {
		return pgtype.Timestamp{}
	}
	return tsParam(*t)
}

func textPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	v := t.String
	return &v
}

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return store.ErrNotFound
	}
	return err
}

func rowsAffectedOrNotFound(n int64, err error) error {
	if err != nil {
		return err
	}
	if n == 0 {
		return store.ErrNotFound
	}
	return nil
}

// ---------------------------------------------------------------- users

func (c *Client) AdminListUsers(ctx context.Context, search string, page store.Page) ([]store.AdminUserSummary, int, error) {
	pattern := likePattern(search)
	total, err := c.Q.AdminCountUsers(ctx, pattern)
	if err != nil {
		return nil, 0, err
	}

	rows, err := c.Q.AdminListUsers(ctx, pgmodel.AdminListUsersParams{
		Pattern: pattern, PageOffset: int32(page.Offset()), PageSize: int32(page.Size),
	})
	if err != nil {
		return nil, 0, err
	}

	users := make([]store.AdminUserSummary, len(rows))
	for i, r := range rows {
		users[i] = store.AdminUserSummary{
			ID: r.ID, Email: r.Email, DisplayName: r.DisplayName, DiscordID: r.DiscordID,
			DiscordUsername: r.DiscordUsername, DiscordAvatar: textPtr(r.DiscordAvatar),
			Plan: r.Plan, AppsCount: int(r.AppsCount), CreatedAt: tsOf(r.CreatedAt), UpdatedAt: tsOf(r.UpdatedAt),
		}
	}
	return users, int(total), nil
}

func (c *Client) AdminUserByID(ctx context.Context, id string) (*store.AdminUserDetail, error) {
	r, err := c.Q.AdminGetUser(ctx, id)
	if err != nil {
		return nil, notFound(err)
	}

	detail := &store.AdminUserDetail{AdminUserSummary: store.AdminUserSummary{
		ID: r.ID, Email: r.Email, DisplayName: r.DisplayName, DiscordID: r.DiscordID,
		DiscordUsername: r.DiscordUsername, DiscordAvatar: textPtr(r.DiscordAvatar),
		Plan: r.Plan, AppsCount: int(r.AppsCount), CreatedAt: tsOf(r.CreatedAt), UpdatedAt: tsOf(r.UpdatedAt),
	}}

	apps, err := c.Q.AdminAppsOfUser(ctx, id)
	if err != nil {
		return nil, err
	}
	detail.Apps = make([]store.AdminUserApp, len(apps))
	for i, a := range apps {
		detail.Apps[i] = store.AdminUserApp{ID: a.ID, Name: a.Name, Enabled: a.Enabled, CreatedAt: tsOf(a.CreatedAt)}
	}

	sub, err := c.Q.AdminActiveSubscriptionOfUser(ctx, id)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		detail.Subscription = &store.AdminSubscriptionBrief{
			ID: sub.ID, Status: sub.Status, DisplayName: sub.DisplayName,
			RenewsAt: tsPtr(sub.RenewsAt), EndsAt: tsPtr(sub.EndsAt),
		}
	}
	return detail, nil
}

func (c *Client) AdminDeleteUserSessions(ctx context.Context, userID string) (int64, error) {
	return c.Q.AdminDeleteUserSessions(ctx, userID)
}

// ---------------------------------------------------------------- apps

func (c *Client) AdminListApps(ctx context.Context, search string, page store.Page) ([]store.AdminAppSummary, int, error) {
	pattern := likePattern(search)
	total, err := c.Q.AdminCountApps(ctx, pattern)
	if err != nil {
		return nil, 0, err
	}

	rows, err := c.Q.AdminListApps(ctx, pgmodel.AdminListAppsParams{
		Pattern: pattern, PageOffset: int32(page.Offset()), PageSize: int32(page.Size),
	})
	if err != nil {
		return nil, 0, err
	}

	apps := make([]store.AdminAppSummary, len(rows))
	for i, r := range rows {
		apps[i] = store.AdminAppSummary{
			ID: r.ID, Name: r.Name, OwnerID: r.OwnerUserID, OwnerEmail: textPtr(r.OwnerEmail),
			Enabled: r.Enabled, DiscordStatus: r.DiscordStatus, DisabledReason: textPtr(r.DisabledReason),
			CreditsUsed: r.CreditsUsed, CollaboratorsCount: int(r.CollaboratorsCount), CreatedAt: tsOf(r.CreatedAt),
		}
	}
	return apps, int(total), nil
}

func (c *Client) AdminApp(ctx context.Context, id string) (*store.AdminAppDetail, error) {
	r, err := c.Q.AdminGetApp(ctx, id)
	if err != nil {
		return nil, notFound(err)
	}

	collaborators, err := c.Q.AdminCollaboratorsOfApp(ctx, id)
	if err != nil {
		return nil, err
	}

	detail := &store.AdminAppDetail{
		ID: r.ID, Name: r.Name, Description: textPtr(r.Description), OwnerID: r.OwnerUserID,
		OwnerEmail: textPtr(r.OwnerEmail), CreatorUserID: r.CreatorUserID, Enabled: r.Enabled,
		DiscordID: r.DiscordID, DiscordStatus: r.DiscordStatus, DisabledReason: textPtr(r.DisabledReason),
		CreditsUsed: r.CreditsUsed, ResumePointsCount: int(r.ResumePointsCount),
		CreatedAt: tsOf(r.CreatedAt), UpdatedAt: tsOf(r.UpdatedAt),
		Collaborators: make([]store.AdminCollaborator, len(collaborators)),
	}
	for i, col := range collaborators {
		detail.Collaborators[i] = store.AdminCollaborator{UserID: col.UserID, Role: col.Role}
	}
	return detail, nil
}

// AdminSetAppEnabled bumps updated_at, which is what makes every cluster's
// gateway manager pick the change up.
func (c *Client) AdminSetAppEnabled(ctx context.Context, id string, enabled bool, disabledReason *string, now time.Time) error {
	reason := pgtype.Text{}
	if disabledReason != nil && *disabledReason != "" {
		reason = pgtype.Text{String: *disabledReason, Valid: true}
	}
	return rowsAffectedOrNotFound(c.Q.AdminSetAppEnabled(ctx, pgmodel.AdminSetAppEnabledParams{
		ID: id, Enabled: enabled, DisabledReason: reason, UpdatedAt: tsParam(now),
	}))
}

func (c *Client) AdminDeleteResumePoints(ctx context.Context, appID string) (int64, error) {
	return c.Q.AdminDeleteResumePointsOfApp(ctx, appID)
}

// ---------------------------------------------------------------- billing

func (c *Client) AdminListSubscriptions(ctx context.Context, search string, status string, page store.Page) ([]store.AdminSubscription, int, error) {
	pattern := likePattern(search)
	total, err := c.Q.AdminCountSubscriptions(ctx, pgmodel.AdminCountSubscriptionsParams{Status: status, Pattern: pattern})
	if err != nil {
		return nil, 0, err
	}

	rows, err := c.Q.AdminListSubscriptions(ctx, pgmodel.AdminListSubscriptionsParams{
		Status: status, Pattern: pattern, PageOffset: int32(page.Offset()), PageSize: int32(page.Size),
	})
	if err != nil {
		return nil, 0, err
	}

	subs := make([]store.AdminSubscription, len(rows))
	for i, r := range rows {
		subs[i] = store.AdminSubscription{
			ID: r.ID, UserID: r.UserID, UserEmail: textPtr(r.UserEmail), DisplayName: r.DisplayName,
			Source: r.Source, Status: r.Status, RenewsAt: tsPtr(r.RenewsAt), TrialEndsAt: tsPtr(r.TrialEndsAt),
			EndsAt: tsPtr(r.EndsAt), CreatedAt: tsOf(r.CreatedAt),
		}
	}
	return subs, int(total), nil
}

func (c *Client) AdminSetSubscriptionStatus(ctx context.Context, id string, status string, now time.Time) error {
	tx, err := c.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck -- safe after Commit

	q := c.Q.WithTx(tx)

	var endsAt pgtype.Timestamp
	if status == "cancelled" {
		endsAt = tsParam(now)
	}
	if err := rowsAffectedOrNotFound(q.AdminSetSubscriptionStatus(ctx, pgmodel.AdminSetSubscriptionStatusParams{
		ID: id, Status: status, StatusFormatted: titleCase(status), EndsAt: endsAt, UpdatedAt: tsParam(now),
	})); err != nil {
		return err
	}

	if status == "cancelled" {
		if err := q.AdminEndEntitlementsOfSubscription(ctx, pgmodel.AdminEndEntitlementsOfSubscriptionParams{
			SubscriptionID: pgtype.Text{String: id, Valid: true}, EndsAt: tsParam(now),
		}); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func titleCase(s string) string {
	s = strings.ReplaceAll(s, "_", " ")
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func (c *Client) AdminListEntitlements(ctx context.Context, page store.Page) ([]store.AdminEntitlement, int, error) {
	total, err := c.Q.AdminCountEntitlements(ctx)
	if err != nil {
		return nil, 0, err
	}

	rows, err := c.Q.AdminListEntitlements(ctx, pgmodel.AdminListEntitlementsParams{
		PageOffset: int32(page.Offset()), PageSize: int32(page.Size),
	})
	if err != nil {
		return nil, 0, err
	}

	ents := make([]store.AdminEntitlement, len(rows))
	for i, r := range rows {
		ents[i] = store.AdminEntitlement{
			ID: r.ID, Type: r.Type, AppID: r.AppID, AppName: textPtr(r.AppName),
			SubscriptionID: textPtr(r.SubscriptionID), PlanID: r.PlanID,
			EndsAt: tsPtr(r.EndsAt), CreatedAt: tsOf(r.CreatedAt),
		}
	}
	return ents, int(total), nil
}

func (c *Client) AdminCreateManualEntitlement(ctx context.Context, id string, appID string, planID string, now time.Time, endsAt *time.Time) error {
	return c.Q.AdminCreateManualEntitlement(ctx, pgmodel.AdminCreateManualEntitlementParams{
		ID: id, AppID: appID, PlanID: planID, CreatedAt: tsParam(now), EndsAt: tsParamPtr(endsAt),
	})
}

func (c *Client) AdminDeleteEntitlement(ctx context.Context, id string) error {
	return rowsAffectedOrNotFound(c.Q.AdminDeleteEntitlement(ctx, id))
}

func (c *Client) AdminListPaymentSessions(ctx context.Context, status string, page store.Page) ([]store.AdminPaymentSession, int, error) {
	total, err := c.Q.AdminCountPaymentSessions(ctx, status)
	if err != nil {
		return nil, 0, err
	}

	rows, err := c.Q.AdminListPaymentSessions(ctx, pgmodel.AdminListPaymentSessionsParams{
		Status: status, PageOffset: int32(page.Offset()), PageSize: int32(page.Size),
	})
	if err != nil {
		return nil, 0, err
	}

	sessions := make([]store.AdminPaymentSession, len(rows))
	for i, r := range rows {
		sessions[i] = store.AdminPaymentSession{
			ID: r.ID, PaymentID: r.PaymentID, AppID: r.AppID, AppName: textPtr(r.AppName), PlanID: r.PlanID,
			Provider: r.Provider, Amount: int(r.Amount), Status: r.Status,
			PaidAt: tsPtr(r.PaidAt), CreatedAt: tsOf(r.CreatedAt),
		}
	}
	return sessions, int(total), nil
}

func (c *Client) AdminPaymentSessionPaymentID(ctx context.Context, id string) (string, error) {
	paymentID, err := c.Q.AdminPaymentSessionPaymentID(ctx, id)
	return paymentID, notFound(err)
}

func (c *Client) AdminCancelPendingPaymentSession(ctx context.Context, id string, status string, now time.Time) error {
	return rowsAffectedOrNotFound(c.Q.AdminCancelPendingPaymentSession(ctx, pgmodel.AdminCancelPendingPaymentSessionParams{
		ID: id, Status: status, UpdatedAt: tsParam(now),
	}))
}

// ---------------------------------------------------------------- logs

func (c *Client) AdminListLogs(ctx context.Context, filter store.AdminLogFilter, page store.Page) ([]store.AdminLogEntry, int, error) {
	pattern := likePattern(filter.Search)
	total, err := c.Q.AdminCountLogs(ctx, pgmodel.AdminCountLogsParams{Level: filter.Level, AppID: filter.AppID, Pattern: pattern})
	if err != nil {
		return nil, 0, err
	}

	rows, err := c.Q.AdminListLogs(ctx, pgmodel.AdminListLogsParams{
		Level: filter.Level, AppID: filter.AppID, Pattern: pattern,
		PageOffset: int32(page.Offset()), PageSize: int32(page.Size),
	})
	if err != nil {
		return nil, 0, err
	}

	logs := make([]store.AdminLogEntry, len(rows))
	for i, r := range rows {
		logs[i] = store.AdminLogEntry{
			ID: r.ID, AppID: r.AppID, AppName: textPtr(r.AppName), Message: r.Message, Level: r.Level,
			CommandID: textPtr(r.CommandID), EventListenerID: textPtr(r.EventListenerID),
			MessageID: textPtr(r.MessageID), CreatedAt: tsOf(r.CreatedAt),
		}
	}
	return logs, int(total), nil
}

func (c *Client) AdminLogApps(ctx context.Context) ([]store.AdminAppOption, error) {
	rows, err := c.Q.AdminLogApps(ctx)
	if err != nil {
		return nil, err
	}
	apps := make([]store.AdminAppOption, len(rows))
	for i, r := range rows {
		apps[i] = store.AdminAppOption{ID: r.ID, Name: r.Name}
	}
	return apps, nil
}

// ---------------------------------------------------------------- dashboard & revenue

func (c *Client) AdminDashboard(ctx context.Context, now time.Time) (*store.AdminDashboard, error) {
	now = now.UTC()
	stats, err := c.Q.AdminDashboardStats(ctx, pgmodel.AdminDashboardStatsParams{
		Since24h: tsParam(now.Add(-24 * time.Hour)), Since48h: tsParam(now.Add(-48 * time.Hour)),
	})
	if err != nil {
		return nil, err
	}

	// Seven calendar days ending today, zero-filled.
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	since := today.AddDate(0, 0, -6)

	usage, err := c.Q.AdminUsageByDay(ctx, tsParam(since))
	if err != nil {
		return nil, err
	}
	errs, err := c.Q.AdminErrorsByDay(ctx, tsParam(since))
	if err != nil {
		return nil, err
	}

	days := make([]store.AdminDayPoint, 7)
	index := map[time.Time]int{}
	for i := range days {
		d := since.AddDate(0, 0, i)
		days[i] = store.AdminDayPoint{Day: d}
		index[d] = i
	}
	for _, u := range usage {
		if i, ok := index[tsOf(u.Day)]; ok {
			days[i].Credits = u.Credits
		}
	}
	for _, e := range errs {
		if i, ok := index[tsOf(e.Day)]; ok {
			days[i].Errors = e.Errors
		}
	}

	recent, err := c.Q.AdminRecentLogs(ctx)
	if err != nil {
		return nil, err
	}
	logs := make([]store.AdminRecentLog, len(recent))
	for i, r := range recent {
		logs[i] = store.AdminRecentLog{
			ID: r.ID, AppID: r.AppID, AppName: textPtr(r.AppName), Message: r.Message,
			Level: r.Level, CreatedAt: tsOf(r.CreatedAt),
		}
	}

	return &store.AdminDashboard{
		Stats: store.AdminDashboardStats{
			TotalUsers: stats.TotalUsers, TotalApps: stats.TotalApps, ActiveApps: stats.ActiveApps,
			Errors24h: stats.Errors24h, ErrorsPrev24h: stats.ErrorsPrev24h,
			TotalCredits: stats.TotalCredits, ActiveSubscriptions: stats.ActiveSubscriptions,
		},
		Days:       days,
		RecentLogs: logs,
	}, nil
}

func (c *Client) AdminRevenueTotals(ctx context.Context, start, end time.Time) (store.AdminRevenueTotals, error) {
	r, err := c.Q.AdminRevenueTotals(ctx, pgmodel.AdminRevenueTotalsParams{RangeStart: tsParam(start), RangeEnd: tsParam(end)})
	if err != nil {
		return store.AdminRevenueTotals{}, err
	}
	return store.AdminRevenueTotals{Total: r.Total, Count: r.Count}, nil
}

func (c *Client) AdminRevenueChart(ctx context.Context, unit string, start time.Time) ([]store.AdminRevenuePoint, error) {
	rows, err := c.Q.AdminRevenueChart(ctx, pgmodel.AdminRevenueChartParams{Unit: unit, RangeStart: tsParam(start)})
	if err != nil {
		return nil, err
	}
	points := make([]store.AdminRevenuePoint, len(rows))
	for i, r := range rows {
		points[i] = store.AdminRevenuePoint{Bucket: tsOf(r.Bucket), Total: r.Total, Count: r.Count}
	}
	return points, nil
}

func (c *Client) AdminSubscriptionCounts(ctx context.Context) (map[string]int64, error) {
	rows, err := c.Q.AdminSubscriptionStatusCounts(ctx)
	if err != nil {
		return nil, err
	}
	counts := make(map[string]int64, len(rows))
	for _, r := range rows {
		counts[r.Status] = r.Count
	}
	return counts, nil
}
