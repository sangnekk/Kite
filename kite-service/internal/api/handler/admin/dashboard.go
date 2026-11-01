package admin

import (
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
)

type DashboardStats struct {
	TotalUsers          int64 `json:"total_users"`
	TotalApps           int64 `json:"total_apps"`
	ActiveApps          int64 `json:"active_apps"`
	DisabledApps        int64 `json:"disabled_apps"`
	Errors24h           int64 `json:"errors_24h"`
	ErrorsPrev24h       int64 `json:"errors_prev_24h"`
	TotalCredits        int64 `json:"total_credits"`
	ActiveSubscriptions int64 `json:"active_subscriptions"`
}

type DashboardDay struct {
	// Date is the UTC calendar day (YYYY-MM-DD).
	Date    string `json:"date"`
	Credits int64  `json:"credits"`
	Errors  int64  `json:"errors"`
}

type DashboardLog struct {
	ID        int64     `json:"id"`
	AppID     string    `json:"app_id"`
	AppName   *string   `json:"app_name"`
	Message   string    `json:"message"`
	Level     string    `json:"level"`
	CreatedAt time.Time `json:"created_at"`
}

type DashboardResponse struct {
	Stats      DashboardStats `json:"stats"`
	UsageChart []DashboardDay `json:"usage_chart"`
	RecentLogs []DashboardLog `json:"recent_logs"`
}

func (h *Handler) HandleDashboard(c *handler.Context) (*DashboardResponse, error) {
	d, err := h.console.AdminDashboard(c.Context(), now())
	if err != nil {
		return nil, err
	}

	res := &DashboardResponse{
		Stats: DashboardStats{
			TotalUsers: d.Stats.TotalUsers, TotalApps: d.Stats.TotalApps, ActiveApps: d.Stats.ActiveApps,
			DisabledApps: d.Stats.TotalApps - d.Stats.ActiveApps,
			Errors24h:    d.Stats.Errors24h, ErrorsPrev24h: d.Stats.ErrorsPrev24h,
			TotalCredits: d.Stats.TotalCredits, ActiveSubscriptions: d.Stats.ActiveSubscriptions,
		},
		UsageChart: make([]DashboardDay, len(d.Days)),
		RecentLogs: make([]DashboardLog, len(d.RecentLogs)),
	}
	for i, day := range d.Days {
		res.UsageChart[i] = DashboardDay{Date: day.Day.Format("2006-01-02"), Credits: day.Credits, Errors: day.Errors}
	}
	for i, l := range d.RecentLogs {
		res.RecentLogs[i] = DashboardLog(l)
	}
	return res, nil
}
