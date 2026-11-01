// Package internalai exposes AI configuration to other Kite microservices
// (kite-ai-service). It is authenticated with the shared internal secret and
// never returns provider API keys.
package internalai

import (
	"crypto/subtle"
	"strings"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/core/settings"
)

type ModelsResponse struct {
	DefaultModel string  `json:"default_model"`
	Models       []Model `json:"models"`
}

type Model struct {
	Key     string `json:"key"`
	Name    string `json:"name"`
	Model   string `json:"model"`
	Credits int    `json:"credits"`
}

type Handler struct {
	internalSecret string
	ai             func() settings.AI
}

func NewHandler(internalSecret string, ai func() settings.AI) *Handler {
	return &Handler{internalSecret: internalSecret, ai: ai}
}

func (h *Handler) HandleModels(c *handler.Context) (*ModelsResponse, error) {
	if !h.authorized(c.Header("X-Internal-Secret")) {
		return nil, handler.ErrUnauthorized("unauthorized", "invalid internal secret")
	}
	return h.models(), nil
}

// authorized fails closed: without a configured secret nobody can read the
// endpoint (unlike the webhook endpoint, which skips the check when unset).
func (h *Handler) authorized(given string) bool {
	given = strings.TrimSpace(given)
	return h.internalSecret != "" &&
		subtle.ConstantTimeCompare([]byte(given), []byte(h.internalSecret)) == 1
}

func (h *Handler) models() *ModelsResponse {
	ai := h.ai()
	res := &ModelsResponse{DefaultModel: ai.DefaultModel, Models: []Model{}}
	for _, p := range ai.Providers {
		for _, m := range p.Models {
			res.Models = append(res.Models, Model{Key: m.Key, Name: m.Name, Model: m.Model, Credits: m.Credits})
		}
	}
	return res
}
