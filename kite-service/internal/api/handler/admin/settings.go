package admin

import (
	"encoding/json"
	"errors"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/core/settings"
)

// HandleSettingsGet returns every settings group with its secrets masked.
func (h *Handler) HandleSettingsGet(c *handler.Context) (*map[string]settings.NamespaceView, error) {
	views := h.settings.Views()
	return &views, nil
}

type SettingsUpdateRequest struct {
	// Values holds the settings to change; omitted settings keep their value.
	Values map[string]json.RawMessage `json:"values"`
	// ClearSecrets lists secrets to erase. A secret sent empty in Values is
	// otherwise left untouched.
	ClearSecrets []string `json:"clear_secrets"`
}

func (h *Handler) HandleSettingsUpdate(c *handler.Context, req SettingsUpdateRequest) (*settings.NamespaceView, error) {
	name := c.Param("group")
	if len(req.Values) == 0 && len(req.ClearSecrets) == 0 {
		return nil, handler.ErrBadRequest("no_changes", "No settings to update")
	}

	if err := h.settings.Update(c.Context(), name, req.Values, req.ClearSecrets, c.AdminDiscordID); err != nil {
		var verr *settings.ValidationError
		if errors.As(err, &verr) {
			return nil, handler.ErrBadRequest("invalid_settings", verr.Message)
		}
		return nil, err
	}

	// Only the names of the changed settings are logged, never their values.
	changed := make([]string, 0, len(req.Values))
	for key := range req.Values {
		changed = append(changed, key)
	}
	h.audit(c, "settings.update", name, map[string]any{"changed": changed, "cleared_secrets": req.ClearSecrets})

	view := h.settings.Views()[name]
	return &view, nil
}
