package provider

import (
	"context"
	"sync"
)

// AIProvider provides access to AI services.
type AIProvider interface {
	CreateResponse(ctx context.Context, opts CreateResponseOpts) (string, error)
}

type CreateResponseOpts struct {
	// Model is the registry key of the model to use (the value stored in flow
	// data), not the raw model spelling sent to the upstream API.
	Model           string
	SystemPrompt    string
	Prompt          string
	Tools           []AIToolType
	MaxOutputTokens int
}

type AIToolType string

const (
	AIToolTypeWebSearchPreview AIToolType = "web_search_preview"
)

// AIModelAPIType is the wire protocol an upstream provider speaks.
type AIModelAPIType string

const (
	AIModelAPIOpenAI    AIModelAPIType = "openai"
	AIModelAPIAnthropic AIModelAPIType = "anthropic"
)

// AIModel is a configured model that users can select in a flow. Its Key is a
// stable identifier decoupled from Model (the exact spelling sent upstream), so
// renaming a provider's model or switching providers never breaks saved flows.
type AIModel struct {
	Key        string         `json:"key"`
	Name       string         `json:"name"`
	Model      string         `json:"-"`
	Credits    int            `json:"credits"`
	ProviderID string         `json:"-"`
	API        AIModelAPIType `json:"-"`
}

// AIModelRegistry holds the available models. It is built once at startup from
// configuration (only providers with a usable API key contribute models) and is
// treated as read-only afterwards.
type AIModelRegistry struct {
	byKey      map[string]AIModel
	ordered    []AIModel
	defaultKey string
}

func NewAIModelRegistry(models []AIModel, defaultKey string) *AIModelRegistry {
	byKey := make(map[string]AIModel, len(models))
	ordered := make([]AIModel, 0, len(models))
	for _, m := range models {
		if _, ok := byKey[m.Key]; ok {
			continue // first definition wins; ignore duplicate keys
		}
		byKey[m.Key] = m
		ordered = append(ordered, m)
	}

	if _, ok := byKey[defaultKey]; !ok {
		defaultKey = ""
		if len(ordered) > 0 {
			defaultKey = ordered[0].Key
		}
	}

	return &AIModelRegistry{
		byKey:      byKey,
		ordered:    ordered,
		defaultKey: defaultKey,
	}
}

// Lookup resolves a model by its key. The empty key resolves to the default
// model when one is configured.
func (r *AIModelRegistry) Lookup(key string) (AIModel, bool) {
	if r == nil {
		return AIModel{}, false
	}
	if key == "" {
		key = r.defaultKey
	}
	m, ok := r.byKey[key]
	return m, ok
}

// Has reports whether a model key is known. The empty key is considered known
// whenever a default model exists.
func (r *AIModelRegistry) Has(key string) bool {
	_, ok := r.Lookup(key)
	return ok
}

// List returns the available models in configuration order.
func (r *AIModelRegistry) List() []AIModel {
	if r == nil {
		return nil
	}
	return r.ordered
}

func (r *AIModelRegistry) Len() int {
	if r == nil {
		return 0
	}
	return len(r.ordered)
}

// Package-level registry used by flow validation and credit calculation, which
// operate on flow data without access to a registry instance. Set once at
// startup via SetDefaultModelRegistry.
var (
	defaultModels   = NewAIModelRegistry(nil, "")
	defaultModelsMu sync.RWMutex
)

func SetDefaultModelRegistry(r *AIModelRegistry) {
	if r == nil {
		r = NewAIModelRegistry(nil, "")
	}
	defaultModelsMu.Lock()
	defaultModels = r
	defaultModelsMu.Unlock()
}

func DefaultModelRegistry() *AIModelRegistry {
	defaultModelsMu.RLock()
	defer defaultModelsMu.RUnlock()
	return defaultModels
}

type MockAIProvider struct{}

func (m *MockAIProvider) CreateResponse(ctx context.Context, opts CreateResponseOpts) (string, error) {
	return "", nil
}
