package expression

import (
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExpressionCheckReturnsTheProblemsOfTheText(t *testing.T) {
	h := NewExpressionHandler()

	res, err := h.HandleExpressionCheck(nil, wire.ExpressionCheckRequest{
		Text:    "hi {{user.nme}} {{user.id}}",
		Context: "command",
	})
	require.NoError(t, err)

	require.Len(t, res.Problems, 1)
	assert.Equal(t, 10, res.Problems[0].From)
	assert.Equal(t, 13, res.Problems[0].To)
	assert.Contains(t, res.Problems[0].Message, "nme")
}

func TestExpressionCheckWithNothingWrongIsAnEmptyList(t *testing.T) {
	res, err := NewExpressionHandler().HandleExpressionCheck(nil, wire.ExpressionCheckRequest{Text: "{{user.id}}"})
	require.NoError(t, err)

	assert.NotNil(t, res.Problems, "the JSON must be [] and not null")
	assert.Empty(t, res.Problems)
}

func TestExpressionCheckRequestIsBounded(t *testing.T) {
	assert.NoError(t, wire.ExpressionCheckRequest{Text: "{{user.id}}", Context: "command"}.Validate())

	long := make([]rune, wire.MaxExpressionCheckLength+1)
	for i := range long {
		long[i] = 'a'
	}
	assert.Error(t, wire.ExpressionCheckRequest{Text: string(long)}.Validate())
	assert.Error(t, wire.ExpressionCheckRequest{Text: "x", Context: string(make([]rune, 41))}.Validate())
}
