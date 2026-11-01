package admin

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func utc(y int, m time.Month, d, h, min int) time.Time {
	return time.Date(y, m, d, h, min, 0, 0, time.UTC)
}

func TestPeriodBounds(t *testing.T) {
	// Wednesday 2026-11-04 15:30 UTC.
	now := utc(2026, time.November, 4, 15, 30)

	prev, cur, end := periodBounds(periodDay, now)
	assert.Equal(t, utc(2026, time.November, 3, 0, 0), prev)
	assert.Equal(t, utc(2026, time.November, 4, 0, 0), cur)
	assert.Equal(t, now, end)

	// Weeks start on Monday (2026-11-02).
	prev, cur, _ = periodBounds(periodWeek, now)
	assert.Equal(t, utc(2026, time.October, 26, 0, 0), prev)
	assert.Equal(t, utc(2026, time.November, 2, 0, 0), cur)

	prev, cur, _ = periodBounds(periodMonth, now)
	assert.Equal(t, utc(2026, time.October, 1, 0, 0), prev)
	assert.Equal(t, utc(2026, time.November, 1, 0, 0), cur)
}

func TestPeriodBoundsEdges(t *testing.T) {
	// Sunday belongs to the week that started the previous Monday.
	sunday := utc(2026, time.November, 8, 23, 59)
	_, cur, _ := periodBounds(periodWeek, sunday)
	assert.Equal(t, utc(2026, time.November, 2, 0, 0), cur)

	// Monday starts a new week.
	monday := utc(2026, time.November, 9, 0, 0)
	prev, cur, _ := periodBounds(periodWeek, monday)
	assert.Equal(t, monday, cur)
	assert.Equal(t, utc(2026, time.November, 2, 0, 0), prev)

	// January looks back to December of the previous year.
	prev, cur, _ = periodBounds(periodMonth, utc(2027, time.January, 15, 12, 0))
	assert.Equal(t, utc(2026, time.December, 1, 0, 0), prev)
	assert.Equal(t, utc(2027, time.January, 1, 0, 0), cur)

	// A 31st must not overflow when the previous month is shorter.
	prev, cur, _ = periodBounds(periodMonth, utc(2026, time.December, 31, 10, 0))
	assert.Equal(t, utc(2026, time.November, 1, 0, 0), prev)
	assert.Equal(t, utc(2026, time.December, 1, 0, 0), cur)

	// A non-UTC clock is converted first.
	local := time.Date(2026, time.November, 1, 1, 0, 0, 0, time.FixedZone("UTC+7", 7*3600))
	prev, cur, _ = periodBounds(periodDay, local)
	assert.Equal(t, utc(2026, time.October, 31, 0, 0), cur, "01:00 at UTC+7 is still Oct 31 in UTC")
	assert.Equal(t, utc(2026, time.October, 30, 0, 0), prev)
}
