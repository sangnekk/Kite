package customevent

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCustomEventLimitSemantics(t *testing.T) {
	assert.True(t, customEventLimitReached(0, 0), "0 must disable custom events")
	assert.True(t, customEventLimitReached(5, 5))
	assert.False(t, customEventLimitReached(100, -1), "-1 must be unlimited")
	assert.Equal(t, "Gói hiện tại không hỗ trợ tạo sự kiện nội bộ", customEventLimitMessage(0))
}
