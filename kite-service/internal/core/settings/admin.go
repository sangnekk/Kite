package settings

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"slices"
)

// ValidationError is returned by Update when the submitted values are not
// acceptable. It is safe to show to the admin.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

func invalid(format string, args ...any) error {
	return &ValidationError{Message: fmt.Sprintf(format, args...)}
}

// restartRequired lists the namespaces that are only read at startup.
var restartRequired = map[string]bool{NamespaceEngine: true, NamespaceAI: true}

// NamespaceView is a namespace as shown in the admin console: secrets are never
// included, only whether they are set.
type NamespaceView struct {
	Values          map[string]any  `json:"values"`
	SecretsSet      map[string]bool `json:"secrets_set"`
	RestartRequired bool            `json:"restart_required"`
}

// Views returns every namespace with its secrets masked.
func (m *Manager) Views() map[string]NamespaceView {
	snap := m.Snapshot()

	views := make(map[string]NamespaceView, len(namespaces))
	for _, ns := range namespaces {
		values := toMap(ns.ptr(&snap))
		view := NamespaceView{
			Values:          values,
			SecretsSet:      map[string]bool{},
			RestartRequired: restartRequired[ns.name],
		}

		for _, key := range ns.secrets {
			s, _ := values[key].(string)
			view.SecretsSet[key] = s != ""
			values[key] = ""
		}

		if ns.name == NamespaceAI {
			maskAIProviders(values)
		}
		views[ns.name] = view
	}
	return views
}

func maskAIProviders(values map[string]any) {
	providers, _ := values["providers"].([]any)
	for _, p := range providers {
		provider, ok := p.(map[string]any)
		if !ok {
			continue
		}
		key, _ := provider["api_key"].(string)
		provider["api_key_set"] = key != ""
		delete(provider, "api_key")
	}
}

func toMap(v any) map[string]any {
	raw, _ := json.Marshal(v)
	var out map[string]any
	_ = json.Unmarshal(raw, &out)
	return out
}

// Update applies a partial change to one namespace. Only the keys present in
// patch change. A secret that is submitted empty keeps its stored value, it is
// only erased when listed in clearSecrets. An AI provider submitted without an
// api_key keeps the key of the provider with the same id.
func (m *Manager) Update(ctx context.Context, name string, patch map[string]json.RawMessage, clearSecrets []string, updatedBy string) error {
	var ns *namespace
	for i := range namespaces {
		if namespaces[i].name == name {
			ns = &namespaces[i]
		}
	}
	if ns == nil {
		return invalid("unknown settings group %q", name)
	}

	snap := m.Snapshot()
	current := ns.ptr(&snap)

	raw, err := json.Marshal(current)
	if err != nil {
		return err
	}
	merged := map[string]json.RawMessage{}
	if err := json.Unmarshal(raw, &merged); err != nil {
		return err
	}

	for key, value := range patch {
		if _, ok := merged[key]; !ok {
			return invalid("unknown setting %q", key)
		}
		if ns.isSecret(key) && isEmptyString(value) {
			continue // keep the stored secret
		}
		merged[key] = value
	}

	for _, key := range clearSecrets {
		if !ns.isSecret(key) {
			return invalid("%q is not a secret setting", key)
		}
		merged[key] = json.RawMessage(`""`)
	}

	next := ns.ptr(&Snapshot{})
	body, err := json.Marshal(merged)
	if err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(next); err != nil {
		return invalid("invalid value: %v", err)
	}

	if ai, ok := next.(*AI); ok {
		keepProviderKeys(ai, snap.AI)
	}
	if err := validate(next); err != nil {
		return err
	}

	return m.Save(ctx, name, next, updatedBy)
}

func isEmptyString(raw json.RawMessage) bool {
	var s string
	return json.Unmarshal(raw, &s) == nil && s == ""
}

// keepProviderKeys restores the stored API key of providers submitted without
// one (the console never receives the keys, so it cannot send them back).
func keepProviderKeys(next *AI, current AI) {
	for i := range next.Providers {
		if next.Providers[i].APIKey != "" {
			continue
		}
		for _, old := range current.Providers {
			if old.ID == next.Providers[i].ID {
				next.Providers[i].APIKey = old.APIKey
			}
		}
	}
}

var (
	providerIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,39}$`)
	snowflakePattern  = regexp.MustCompile(`^\d{15,25}$`)
)

func validate(v any) error {
	switch s := v.(type) {
	case *Billing:
		return validateBilling(s)
	case *Limits:
		if s.MaxAppsPerUser < 0 || s.MaxAssetSize < 0 {
			return invalid("limits cannot be negative")
		}
	case *Discord:
		if s.GuildID != "" && !snowflakePattern.MatchString(s.GuildID) {
			return invalid("guild_id must be a Discord ID")
		}
	case *Engine:
		if s.MaxStackDepth < 1 || s.MaxOperations < 1 || s.MaxCredits < 1 {
			return invalid("max_stack_depth, max_operations and max_credits must be at least 1")
		}
		if s.ComponentResumePointTTLDays < 0 {
			return invalid("component_resume_point_ttl_days cannot be negative")
		}
	case *AI:
		return validateAI(s)
	}
	return nil
}

func validateBilling(b *Billing) error {
	if b.CheckoutTTLMinutes < 0 {
		return invalid("checkout_ttl_minutes cannot be negative")
	}
	return nil
}

func validateHTTPURL(field, value string) error {
	if value == "" {
		return nil
	}
	u, err := url.Parse(value)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return invalid("%s must be an http(s) URL", field)
	}
	return nil
}

func validateAI(ai *AI) error {
	providerIDs := map[string]bool{}
	modelKeys := map[string]bool{}

	for _, p := range ai.Providers {
		if !providerIDPattern.MatchString(p.ID) {
			return invalid("provider id %q must be lowercase letters, digits, - or _", p.ID)
		}
		if providerIDs[p.ID] {
			return invalid("duplicate provider id %q", p.ID)
		}
		providerIDs[p.ID] = true

		if !slices.Contains([]string{"openai", "anthropic"}, p.API) {
			return invalid("provider %q: api must be openai or anthropic", p.ID)
		}
		if err := validateHTTPURL(fmt.Sprintf("provider %q base_url", p.ID), p.BaseURL); err != nil {
			return err
		}

		for _, model := range p.Models {
			if model.Key == "" || model.Name == "" || model.Model == "" {
				return invalid("provider %q: every model needs a key, a name and a model", p.ID)
			}
			if model.Credits < 0 {
				return invalid("model %q: credits cannot be negative", model.Key)
			}
			if modelKeys[model.Key] {
				return invalid("duplicate model key %q", model.Key)
			}
			modelKeys[model.Key] = true
		}
	}

	if ai.DefaultModel != "" && !modelKeys[ai.DefaultModel] {
		return invalid("default_model %q is not one of the configured models", ai.DefaultModel)
	}
	return nil
}
