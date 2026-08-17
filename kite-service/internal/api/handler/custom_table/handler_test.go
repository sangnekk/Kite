package custom_table

import (
	"fmt"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/stretchr/testify/assert"
)

func TestCustomTableStoreErrorMessageRemovesInternalPrefix(t *testing.T) {
	err := fmt.Errorf("%w: Không thể đổi cột dữ liệu", store.ErrInvalidData)

	assert.Equal(
		t,
		"Không thể đổi cột dữ liệu",
		customTableStoreErrorMessage(err, store.ErrInvalidData),
	)
}

func TestCustomTableLimitSemantics(t *testing.T) {
	assert.True(t, customTableLimitReached(0, 0), "0 must disable table creation")
	assert.True(t, customTableLimitReached(5, 5))
	assert.False(t, customTableLimitReached(100, -1), "-1 must be unlimited")
	assert.Equal(t, "Gói hiện tại không hỗ trợ tạo bảng dữ liệu", customTableLimitMessage(0))
}
