package admin

import (
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
)

type revenuePeriod string

const (
	periodDay   revenuePeriod = "day"
	periodWeek  revenuePeriod = "week"
	periodMonth revenuePeriod = "month"
)

func periodFrom(c *handler.Context) (revenuePeriod, error) {
	switch p := revenuePeriod(c.Query("period")); p {
	case "":
		return periodMonth, nil
	case periodDay, periodWeek, periodMonth:
		return p, nil
	default:
		return "", handler.ErrBadRequest("invalid_period", "period must be day, week or month")
	}
}

// periodBounds returns the start of the previous period, the start of the
// current period and now. The previous period ends where the current one starts.
func periodBounds(period revenuePeriod, now time.Time) (prevStart, curStart, curEnd time.Time) {
	now = now.UTC()
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	switch period {
	case periodDay:
		curStart = midnight
		prevStart = curStart.AddDate(0, 0, -1)
	case periodWeek:
		// Weeks start on Monday.
		curStart = midnight.AddDate(0, 0, -((int(now.Weekday()) + 6) % 7))
		prevStart = curStart.AddDate(0, 0, -7)
	default:
		curStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		prevStart = curStart.AddDate(0, -1, 0)
	}
	return prevStart, curStart, now
}

type RevenueSummary struct {
	Total     int64 `json:"total"`
	Count     int64 `json:"count"`
	PrevTotal int64 `json:"prev_total"`
	PrevCount int64 `json:"prev_count"`
}

func (h *Handler) HandleRevenueSummary(c *handler.Context) (*RevenueSummary, error) {
	period, err := periodFrom(c)
	if err != nil {
		return nil, err
	}

	prevStart, curStart, curEnd := periodBounds(period, now())
	current, err := h.console.AdminRevenueTotals(c.Context(), curStart, curEnd)
	if err != nil {
		return nil, err
	}
	previous, err := h.console.AdminRevenueTotals(c.Context(), prevStart, curStart)
	if err != nil {
		return nil, err
	}

	return &RevenueSummary{
		Total: current.Total, Count: current.Count, PrevTotal: previous.Total, PrevCount: previous.Count,
	}, nil
}

type RevenuePoint struct {
	Date  time.Time `json:"date"`
	Total int64     `json:"total"`
	Count int64     `json:"count"`
}

func (h *Handler) HandleRevenueChart(c *handler.Context) (*[]RevenuePoint, error) {
	period, err := periodFrom(c)
	if err != nil {
		return nil, err
	}

	current := now()
	unit, start := "day", current.AddDate(0, 0, -30)
	switch period {
	case periodDay:
		unit, start = "hour", current.Add(-24*time.Hour)
	case periodWeek:
		start = current.AddDate(0, 0, -7)
	}

	points, err := h.console.AdminRevenueChart(c.Context(), unit, start)
	if err != nil {
		return nil, err
	}

	res := make([]RevenuePoint, len(points))
	for i, p := range points {
		res[i] = RevenuePoint{Date: p.Bucket, Total: p.Total, Count: p.Count}
	}
	return &res, nil
}

type SubscriptionStats struct {
	Active    int64 `json:"active"`
	Cancelled int64 `json:"cancelled"`
	Trial     int64 `json:"trial"`
	Total     int64 `json:"total"`
}

func (h *Handler) HandleSubscriptionStats(c *handler.Context) (*SubscriptionStats, error) {
	counts, err := h.console.AdminSubscriptionCounts(c.Context())
	if err != nil {
		return nil, err
	}

	stats := &SubscriptionStats{
		Active: counts["active"], Cancelled: counts["cancelled"], Trial: counts["on_trial"],
	}
	for _, n := range counts {
		stats.Total += n
	}
	return stats, nil
}
