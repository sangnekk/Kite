package flow

import (
	"context"

	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

type FlowProviders struct {
	Discord         provider.DiscordProvider
	HTTP            provider.HTTPProvider
	AI              provider.AIProvider
	Log             provider.LogProvider
	Variable        provider.VariableProvider
	Economy         provider.EconomyProvider
	Cooldown        provider.CooldownProvider
	MessageTemplate provider.MessageTemplateProvider
	ResumePoint     ResumePointProvider
	InternalEvent   provider.InternalEventProvider
	CustomTable     provider.CustomTableProvider
}

type ResumePointProvider interface {
	CreateResumePoint(ctx context.Context, p ResumePoint) (ResumePoint, error)
}

type MockResumePointProvider struct{}

func (m *MockResumePointProvider) CreateResumePoint(ctx context.Context, p ResumePoint) (ResumePoint, error) {
	return ResumePoint{}, nil
}

type ResumePointType string

const (
	ResumePointTypeModal             ResumePointType = "modal"
	ResumePointTypeMessageComponents ResumePointType = "message_components"
)

type ResumePoint struct {
	ID     string
	Type   ResumePointType
	NodeID string
	State  FlowContextState
}
