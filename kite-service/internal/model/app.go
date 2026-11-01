package model

import (
	"time"

	"gopkg.in/guregu/null.v4"
)

type App struct {
	ID             string
	Name           string
	Description    null.String
	Enabled        bool
	DisabledReason null.String
	OwnerUserID    string
	CreatorUserID  string
	DiscordToken   string
	DiscordID      string
	DiscordStatus  *AppDiscordStatus
	// DiscordAvatar is the avatar hash of the bot user, filled in when the bot
	// connects to Discord.
	DiscordAvatar null.String
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// AppListEntry is an app in the list of one user.
type AppListEntry struct {
	*App
	// InvitedByUserID is who added the user as a collaborator. It is empty for
	// the apps the user owns and for collaborators added before it was recorded.
	InvitedByUserID null.String
}

type AppCredentials struct {
	DiscordID    string
	DiscordToken string
}

// AppSettings holds per-app configuration that lives outside the main apps
// table (in its own app_settings table) so it can evolve without touching the
// sqlc-generated apps queries.
type AppSettings struct {
	AppID                string
	EnablePrefixCommands bool
	CommandPrefix        string
	// LogComponentInteractions logs every button / select menu interaction.
	LogComponentInteractions bool
	UpdatedAt                time.Time
}

type AppDiscordStatus struct {
	Status          string `json:"status,omitempty"`
	ActivityType    int    `json:"activity_type,omitempty"`
	ActivityName    string `json:"activity_name,omitempty"`
	ActivityState   string `json:"activity_state,omitempty"`
	ActivityURL     string `json:"activity_url,omitempty"`
	ActivityDetails string `json:"activity_details,omitempty"`
	// Image assets. A plain http(s) URL is resolved to a Discord external asset
	// (mp:...) when the presence is built; an asset key or mp: value is used as-is.
	ActivityLargeImage string `json:"activity_large_image,omitempty"`
	ActivityLargeText  string `json:"activity_large_text,omitempty"`
	ActivitySmallImage string `json:"activity_small_image,omitempty"`
	ActivitySmallText  string `json:"activity_small_text,omitempty"`
}

func (s *AppDiscordStatus) Equals(other *AppDiscordStatus) bool {
	if s == nil && other == nil {
		return true
	}

	if s == nil || other == nil {
		return false
	}

	return s.Status == other.Status &&
		s.ActivityType == other.ActivityType &&
		s.ActivityName == other.ActivityName &&
		s.ActivityState == other.ActivityState &&
		s.ActivityURL == other.ActivityURL &&
		s.ActivityDetails == other.ActivityDetails &&
		s.ActivityLargeImage == other.ActivityLargeImage &&
		s.ActivityLargeText == other.ActivityLargeText &&
		s.ActivitySmallImage == other.ActivitySmallImage &&
		s.ActivitySmallText == other.ActivitySmallText
}

type AppCollaboratorRole string

const (
	AppCollaboratorRoleOwner AppCollaboratorRole = "owner"
	AppCollaboratorRoleAdmin AppCollaboratorRole = "admin"
)

func (r AppCollaboratorRole) CanDeleteApp() bool {
	return r == AppCollaboratorRoleOwner
}

func (r AppCollaboratorRole) CanManageCollaborators() bool {
	return r == AppCollaboratorRoleOwner
}

type AppCollaborator struct {
	AppID     string
	UserID    string
	User      *User
	Role      AppCollaboratorRole
	CreatedAt time.Time
	UpdatedAt time.Time
	// InvitedByUserID is who added the collaborator, when known.
	InvitedByUserID null.String
}

type AppEntity struct {
	ID   string
	Type AppEntityType
	Name string
}

type AppEntityType string

const (
	AppEntityTypeCommand       AppEntityType = "command"
	AppEntityTypeMessage       AppEntityType = "message"
	AppEntityTypeEventListener AppEntityType = "event_listener"
	AppEntityTypeVariable      AppEntityType = "variable"
)
