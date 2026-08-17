package wire

type Features struct {
	MaxCollaborators     int  `json:"max_collaborators"`
	UsageCreditsPerMonth int  `json:"usage_credits_per_month"`
	MaxGuilds            int  `json:"max_guilds"`
	MaxCommands          int  `json:"max_commands"`
	MaxVariables         int  `json:"max_variables"`
	MaxCustomTables      int  `json:"max_custom_tables"`
	MaxCustomEvents      int  `json:"max_custom_events"`
	MaxMessages          int  `json:"max_messages"`
	MaxEventListeners    int  `json:"max_event_listeners"`
	MaxSchedules         int  `json:"max_schedules"`
	PrioritySupport      bool `json:"priority_support"`
	CustomBotStatus      bool `json:"custom_bot_status"`
	AIIncluded           bool `json:"ai_included"`
	AICreditPerDay       int  `json:"ai_credit_per_day"`
}

type FeaturesGetResponse = Features
