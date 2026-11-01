package admin

import (
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

var planIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,39}$`)

const maxPlanLimit = 1_000_000_000

// PlanItem is a plan as edited in the console. Archived and SortOrder are
// managed through the archive/restore/order endpoints, not through PUT.
type PlanItem struct {
	ID                  string  `json:"id"`
	Title               string  `json:"title"`
	Description         string  `json:"description"`
	Price               float32 `json:"price"`
	PaymentAmount       int     `json:"payment_amount"`
	PremiumDurationDays int     `json:"premium_duration_days"`
	Default             bool    `json:"default"`
	Popular             bool    `json:"popular"`
	Hidden              bool    `json:"hidden"`
	Archived            bool    `json:"archived"`
	SortOrder           int     `json:"sort_order"`

	LemonSqueezyProductID string `json:"lemonsqueezy_product_id"`
	LemonSqueezyVariantID string `json:"lemonsqueezy_variant_id"`
	DiscordRoleID         string `json:"discord_role_id"`

	FeatureMaxCollaborators     int  `json:"feature_max_collaborators"`
	FeatureUsageCreditsPerMonth int  `json:"feature_usage_credits_per_month"`
	FeatureMaxGuilds            int  `json:"feature_max_guilds"`
	FeatureMaxCommands          int  `json:"feature_max_commands"`
	FeatureMaxVariables         int  `json:"feature_max_variables"`
	FeatureMaxCustomTables      int  `json:"feature_max_custom_tables"`
	FeatureMaxCustomEvents      int  `json:"feature_max_custom_events"`
	FeatureMaxMessages          int  `json:"feature_max_messages"`
	FeatureMaxEventListeners    int  `json:"feature_max_event_listeners"`
	FeatureMaxSchedules         int  `json:"feature_max_schedules"`
	FeaturePrioritySupport      bool `json:"feature_priority_support"`
	FeatureCustomBotStatus      bool `json:"feature_custom_bot_status"`
	FeatureAIIncluded           bool `json:"feature_ai_included"`
	FeatureAICreditPerDay       int  `json:"feature_ai_credit_per_day"`
}

func planItem(r model.PlanRecord) PlanItem {
	p := r.Plan
	return PlanItem{
		ID: p.ID, Title: p.Title, Description: p.Description, Price: p.Price, PaymentAmount: p.PaymentAmount,
		PremiumDurationDays: p.PremiumDurationDays, Default: p.Default, Popular: p.Popular, Hidden: p.Hidden,
		Archived: r.Archived, SortOrder: r.SortOrder,
		LemonSqueezyProductID: p.LemonSqueezyProductID, LemonSqueezyVariantID: p.LemonSqueezyVariantID,
		DiscordRoleID:               p.DiscordRoleID,
		FeatureMaxCollaborators:     p.FeatureMaxCollaborators,
		FeatureUsageCreditsPerMonth: p.FeatureUsageCreditsPerMonth,
		FeatureMaxGuilds:            p.FeatureMaxGuilds,
		FeatureMaxCommands:          p.FeatureMaxCommands,
		FeatureMaxVariables:         p.FeatureMaxVariables,
		FeatureMaxCustomTables:      p.FeatureMaxCustomTables,
		FeatureMaxCustomEvents:      p.FeatureMaxCustomEvents,
		FeatureMaxMessages:          p.FeatureMaxMessages,
		FeatureMaxEventListeners:    p.FeatureMaxEventListeners,
		FeatureMaxSchedules:         p.FeatureMaxSchedules,
		FeaturePrioritySupport:      p.FeaturePrioritySupport,
		FeatureCustomBotStatus:      p.FeatureCustomBotStatus,
		FeatureAIIncluded:           p.FeatureAIIncluded,
		FeatureAICreditPerDay:       p.FeatureAICreditPerDay,
	}
}

func (p PlanItem) record() model.PlanRecord {
	return model.PlanRecord{
		Plan: model.Plan{
			ID: p.ID, Title: strings.TrimSpace(p.Title), Description: strings.TrimSpace(p.Description),
			Price: p.Price, PaymentAmount: p.PaymentAmount, PremiumDurationDays: p.PremiumDurationDays,
			Default: p.Default, Popular: p.Popular, Hidden: p.Hidden,
			LemonSqueezyProductID: p.LemonSqueezyProductID, LemonSqueezyVariantID: p.LemonSqueezyVariantID,
			DiscordRoleID:               p.DiscordRoleID,
			FeatureMaxCollaborators:     p.FeatureMaxCollaborators,
			FeatureUsageCreditsPerMonth: p.FeatureUsageCreditsPerMonth,
			FeatureMaxGuilds:            p.FeatureMaxGuilds,
			FeatureMaxCommands:          p.FeatureMaxCommands,
			FeatureMaxVariables:         p.FeatureMaxVariables,
			FeatureMaxCustomTables:      p.FeatureMaxCustomTables,
			FeatureMaxCustomEvents:      p.FeatureMaxCustomEvents,
			FeatureMaxMessages:          p.FeatureMaxMessages,
			FeatureMaxEventListeners:    p.FeatureMaxEventListeners,
			FeatureMaxSchedules:         p.FeatureMaxSchedules,
			FeaturePrioritySupport:      p.FeaturePrioritySupport,
			FeatureCustomBotStatus:      p.FeatureCustomBotStatus,
			FeatureAIIncluded:           p.FeatureAIIncluded,
			FeatureAICreditPerDay:       p.FeatureAICreditPerDay,
		},
		Archived:  p.Archived,
		SortOrder: p.SortOrder,
	}
}

func (p PlanItem) validate() error {
	bad := func(msg string, args ...any) error {
		return handler.ErrBadRequest("invalid_plan", fmt.Sprintf(msg, args...))
	}

	if strings.TrimSpace(p.Title) == "" {
		return bad("title is required")
	}
	if len(p.Title) > 100 || len(p.Description) > 500 {
		return bad("title or description is too long")
	}
	if p.Price < 0 || p.PaymentAmount < 0 {
		return bad("price and payment_amount cannot be negative")
	}
	if p.PremiumDurationDays < 0 || p.PremiumDurationDays > 3650 {
		return bad("premium_duration_days must be between 0 and 3650")
	}

	// -1 means unlimited, only where the feature supports it.
	unlimited := map[string]int{
		"feature_max_custom_tables": p.FeatureMaxCustomTables,
		"feature_max_custom_events": p.FeatureMaxCustomEvents,
		"feature_max_schedules":     p.FeatureMaxSchedules,
	}
	for field, v := range unlimited {
		if v < -1 || v > maxPlanLimit {
			return bad("%s must be -1 (unlimited) or between 0 and %d", field, maxPlanLimit)
		}
	}
	limited := map[string]int{
		"feature_max_collaborators":       p.FeatureMaxCollaborators,
		"feature_usage_credits_per_month": p.FeatureUsageCreditsPerMonth,
		"feature_max_guilds":              p.FeatureMaxGuilds,
		"feature_max_commands":            p.FeatureMaxCommands,
		"feature_max_variables":           p.FeatureMaxVariables,
		"feature_max_messages":            p.FeatureMaxMessages,
		"feature_max_event_listeners":     p.FeatureMaxEventListeners,
		"feature_ai_credit_per_day":       p.FeatureAICreditPerDay,
	}
	for field, v := range limited {
		if v < 0 || v > maxPlanLimit {
			return bad("%s must be between 0 and %d", field, maxPlanLimit)
		}
	}
	return nil
}

func (h *Handler) findPlan(id string) (model.PlanRecord, bool) {
	for _, r := range h.planManager.Records() {
		if r.ID == id {
			return r, true
		}
	}
	return model.PlanRecord{}, false
}

func (h *Handler) HandlePlanList(c *handler.Context) (*[]PlanItem, error) {
	records := h.planManager.Records()
	items := make([]PlanItem, len(records))
	for i, r := range records {
		items[i] = planItem(r)
	}
	return &items, nil
}

func (h *Handler) savePlan(c *handler.Context, record model.PlanRecord) error {
	if err := h.planStore.SavePlan(c.Context(), record); err != nil {
		return fmt.Errorf("failed to save plan: %w", err)
	}
	return h.planManager.Reload(c.Context())
}

func (h *Handler) HandlePlanCreate(c *handler.Context, req PlanItem) (*PlanItem, error) {
	req.ID = strings.TrimSpace(req.ID)
	if !planIDPattern.MatchString(req.ID) {
		return nil, handler.ErrBadRequest("invalid_plan", "id must be 2-40 characters: lowercase letters, digits, - or _")
	}
	if err := req.validate(); err != nil {
		return nil, err
	}
	if _, exists := h.findPlan(req.ID); exists {
		return nil, handler.ErrBadRequest("plan_exists", fmt.Sprintf("a plan with id %q already exists", req.ID))
	}

	// New plans go last and start active.
	req.Archived = false
	req.SortOrder = 0
	for _, r := range h.planManager.Records() {
		req.SortOrder = max(req.SortOrder, r.SortOrder+1)
	}

	if err := h.savePlan(c, req.record()); err != nil {
		return nil, err
	}

	h.audit(c, "plan.create", req.ID, req)
	created, _ := h.findPlan(req.ID)
	item := planItem(created)
	return &item, nil
}

func (h *Handler) HandlePlanUpdate(c *handler.Context, req PlanItem) (*PlanItem, error) {
	id := c.Param("planID")
	existing, ok := h.findPlan(id)
	if !ok {
		return nil, handler.ErrNotFound("not_found", "Plan not found")
	}
	if req.ID != "" && req.ID != id {
		return nil, handler.ErrBadRequest("invalid_plan", "a plan id cannot be changed")
	}
	req.ID = id
	if err := req.validate(); err != nil {
		return nil, err
	}

	// Archive state and order have their own endpoints.
	req.Archived = existing.Archived
	req.SortOrder = existing.SortOrder

	if existing.Default && !req.Default {
		return nil, handler.ErrBadRequest("default_required", "There must always be a default plan: mark another plan as the default instead")
	}
	if req.Default && req.Archived {
		return nil, handler.ErrBadRequest("invalid_plan", "An archived plan cannot be the default")
	}

	if err := h.savePlan(c, req.record()); err != nil {
		return nil, err
	}

	h.audit(c, "plan.update", id, req)
	updated, _ := h.findPlan(id)
	item := planItem(updated)
	return &item, nil
}

func (h *Handler) setArchived(c *handler.Context, archived bool) (*PlanItem, error) {
	id := c.Param("planID")
	existing, ok := h.findPlan(id)
	if !ok {
		return nil, handler.ErrNotFound("not_found", "Plan not found")
	}
	if archived && existing.Default {
		return nil, handler.ErrBadRequest("cannot_archive_default", "The default plan cannot be archived: mark another plan as the default first")
	}

	if existing.Archived != archived {
		existing.Archived = archived
		if err := h.savePlan(c, existing); err != nil {
			return nil, err
		}
		action := "plan.restore"
		if archived {
			action = "plan.archive"
		}
		h.audit(c, action, id, nil)
	}

	updated, _ := h.findPlan(id)
	item := planItem(updated)
	return &item, nil
}

func (h *Handler) HandlePlanArchive(c *handler.Context) (*PlanItem, error) {
	return h.setArchived(c, true)
}

func (h *Handler) HandlePlanRestore(c *handler.Context) (*PlanItem, error) {
	return h.setArchived(c, false)
}

type PlanOrderRequest struct {
	IDs []string `json:"ids"`
}

// HandlePlanOrder sets the display order. Plans missing from ids keep their
// relative order after the listed ones.
func (h *Handler) HandlePlanOrder(c *handler.Context, req PlanOrderRequest) (*[]PlanItem, error) {
	records := h.planManager.Records()
	byID := make(map[string]model.PlanRecord, len(records))
	for _, r := range records {
		byID[r.ID] = r
	}

	ordered := make([]string, 0, len(records))
	for _, id := range req.IDs {
		if _, ok := byID[id]; !ok {
			return nil, handler.ErrBadRequest("unknown_plan", fmt.Sprintf("unknown plan %q", id))
		}
		if slices.Contains(ordered, id) {
			return nil, handler.ErrBadRequest("duplicate_plan", fmt.Sprintf("plan %q is listed twice", id))
		}
		ordered = append(ordered, id)
	}
	for _, r := range records {
		if !slices.Contains(ordered, r.ID) {
			ordered = append(ordered, r.ID)
		}
	}

	for i, id := range ordered {
		record := byID[id]
		if record.SortOrder == i {
			continue
		}
		record.SortOrder = i
		if err := h.planStore.SavePlan(c.Context(), record); err != nil {
			return nil, fmt.Errorf("failed to save plan order: %w", err)
		}
	}
	if err := h.planManager.Reload(c.Context()); err != nil {
		return nil, err
	}

	h.audit(c, "plan.reorder", "", map[string]any{"ids": ordered})
	return h.HandlePlanList(c)
}
