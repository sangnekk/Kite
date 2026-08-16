package model

import (
	"strings"
	"time"

	"github.com/diamondburned/arikawa/v3/utils/ws"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

type EventSource string

const (
	EventSourceDiscord     EventSource = "discord"
	EventSourceSePay       EventSource = "sepay"
	EventSourceThueAPIBank EventSource = "thueapibank"
	EventSourceCustom      EventSource = "custom_webhook"
	EventSourceInternal    EventSource = "internal"
)

type EventListenerType string

const (
	EventListenerTypeDiscordMessageCreate            EventListenerType = "message_create"
	EventListenerTypeDiscordMessageUpdate            EventListenerType = "message_update"
	EventListenerTypeDiscordMessageDelete            EventListenerType = "message_delete"
	EventListenerTypeDiscordMessageDeleteBulk        EventListenerType = "message_delete_bulk"
	EventListenerTypeDiscordMessageReactionAdd       EventListenerType = "message_reaction_add"
	EventListenerTypeDiscordMessageReactionRemove    EventListenerType = "message_reaction_remove"
	EventListenerTypeDiscordMessageReactionRemoveAll EventListenerType = "message_reaction_remove_all"
	EventListenerTypeDiscordGuildMemberAdd           EventListenerType = "guild_member_add"
	EventListenerTypeDiscordGuildMemberRemove        EventListenerType = "guild_member_remove"
	EventListenerTypeDiscordGuildBanAdd              EventListenerType = "guild_ban_add"
	EventListenerTypeDiscordGuildBanRemove           EventListenerType = "guild_ban_remove"
	EventListenerTypeDiscordChannelCreate            EventListenerType = "channel_create"
	EventListenerTypeDiscordChannelDelete            EventListenerType = "channel_delete"
	EventListenerTypeDiscordVoiceStateUpdate         EventListenerType = "voice_state_update"
)

func EventTypeFromDiscordEventType(eventType ws.EventType) EventListenerType {
	return EventListenerType(strings.ToLower(string(eventType)))
}

type EventListener struct {
	ID            string
	Source        EventSource
	Type          EventListenerType
	Description   string
	Enabled       bool
	AppID         string
	ModuleID      null.String
	CreatorUserID string
	CustomEventID null.String
	Filter        *EventListenerFilter
	FlowSource    flow.FlowData
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type EventListenerFilter struct{}
