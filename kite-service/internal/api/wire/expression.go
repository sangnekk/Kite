package wire

import (
	"unicode/utf8"

	validation "github.com/go-ozzo/ozzo-validation/v4"
)

// MaxExpressionCheckLength bounds the text one request may ask to check.
const MaxExpressionCheckLength = 20000

type ExpressionCheckRequest struct {
	// Text holds the {{ expressions }} to check, as typed in a field of a node.
	Text string `json:"text"`
	// Context is the kind of flow the text is in (command, event_discord...),
	// which decides the values that exist. Empty means any.
	Context string `json:"context"`
}

func (req ExpressionCheckRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Text, validation.By(func(any) error {
			if utf8.RuneCountInString(req.Text) > MaxExpressionCheckLength {
				return validation.NewError("validation_too_long", "text is too long")
			}
			return nil
		})),
		validation.Field(&req.Context, validation.Length(0, 40)),
	)
}

type ExpressionProblem struct {
	// From and To are indexes into the text in UTF-16 code units, as a
	// JavaScript string counts them.
	From    int    `json:"from"`
	To      int    `json:"to"`
	Message string `json:"message"`
}

type ExpressionCheckResponse struct {
	Problems []ExpressionProblem `json:"problems"`
}
