package expression

import (
	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/pkg/eval"
)

// ExpressionHandler checks the {{ expressions }} of the fields of a flow while
// they are typed, without running them.
type ExpressionHandler struct{}

func NewExpressionHandler() *ExpressionHandler {
	return &ExpressionHandler{}
}

func (h *ExpressionHandler) HandleExpressionCheck(c *handler.Context, req wire.ExpressionCheckRequest) (*wire.ExpressionCheckResponse, error) {
	problems := eval.CheckTemplate(req.Text, req.Context)

	res := &wire.ExpressionCheckResponse{Problems: make([]wire.ExpressionProblem, len(problems))}
	for i, p := range problems {
		res.Problems[i] = wire.ExpressionProblem{From: p.From, To: p.To, Message: p.Message}
	}

	return res, nil
}
