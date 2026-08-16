package scheduling

import (
	"testing"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/model"
)

func mustParse(t *testing.T, layout, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse(layout, value)
	if err != nil {
		t.Fatalf("failed to parse time %q: %v", value, err)
	}
	return parsed
}

func TestNextRunInterval(t *testing.T) {
	from := mustParse(t, time.RFC3339, "2026-07-04T10:00:00Z")

	next, err := NextRun(model.ScheduleTriggerTypeInterval, 300, "", "Asia/Ho_Chi_Minh", from)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := from.Add(5 * time.Minute)
	if !next.Equal(want) {
		t.Fatalf("next run = %s, want %s", next, want)
	}
}

func TestNextRunIntervalBelowMinimumIsClamped(t *testing.T) {
	from := mustParse(t, time.RFC3339, "2026-07-04T10:00:00Z")

	next, err := NextRun(model.ScheduleTriggerTypeInterval, 5, "", "", from)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 5s is below the 60s floor, so it should be clamped to 60s.
	want := from.Add(60 * time.Second)
	if !next.Equal(want) {
		t.Fatalf("next run = %s, want %s (clamped to minimum)", next, want)
	}
}

func TestNextRunDailyCronInTimezone(t *testing.T) {
	// 03:00 UTC on 2026-07-04 is 10:00 in Asia/Ho_Chi_Minh (UTC+7), so the next
	// 08:00 local run is later the same day at 01:00 UTC on 2026-07-05.
	from := mustParse(t, time.RFC3339, "2026-07-04T03:00:00Z")

	next, err := NextRun(model.ScheduleTriggerTypeCron, 0, "0 8 * * *", "Asia/Ho_Chi_Minh", from)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := mustParse(t, time.RFC3339, "2026-07-05T01:00:00Z")
	if !next.Equal(want) {
		t.Fatalf("next run = %s, want %s", next.UTC(), want)
	}
}

func TestNextRunInvalidCron(t *testing.T) {
	from := mustParse(t, time.RFC3339, "2026-07-04T10:00:00Z")

	if _, err := NextRun(model.ScheduleTriggerTypeCron, 0, "not a cron", "UTC", from); err == nil {
		t.Fatal("expected error for invalid cron expression, got nil")
	}
}

func TestNextRunUnknownTriggerType(t *testing.T) {
	from := mustParse(t, time.RFC3339, "2026-07-04T10:00:00Z")

	if _, err := NextRun("bogus", 0, "", "UTC", from); err == nil {
		t.Fatal("expected error for unknown trigger type, got nil")
	}
}
