package wire

import (
	"sort"
	"time"

	"github.com/diamondburned/arikawa/v3/discord"
	"gopkg.in/guregu/null.v4"
)

type AppStateStatus struct {
	Online bool `json:"online"`
}

type StateStatusGetResponse = AppStateStatus

type Guild struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	IconURL     null.String `json:"icon_url"`
	CreatedAt   time.Time   `json:"created_at"`
}

type StateGuildListResponse = []*Guild

func GuildToWire(guild *discord.Guild) *Guild {
	if guild == nil {
		return nil
	}

	iconURL := guild.IconURL()

	return &Guild{
		ID:          guild.ID.String(),
		Name:        guild.Name,
		Description: guild.Description,
		IconURL:     null.NewString(iconURL, iconURL != ""),
		CreatedAt:   guild.CreatedAt(),
	}
}

type Channel struct {
	ID    string `json:"id"`
	Type  int    `json:"type"`
	Name  string `json:"name"`
	Topic string `json:"topic"`
	// ParentID is the category (or the channel of a thread), empty when there is none.
	ParentID string `json:"parent_id,omitempty"`
	Position int    `json:"position"`
}

type StateGuildChannelListResponse = []*Channel

type StateGuildLeaveResponse = Empty

func ChannelToWire(channel *discord.Channel) *Channel {
	if channel == nil {
		return nil
	}

	return &Channel{
		ID:    channel.ID.String(),
		Type:  int(channel.Type),
		Name:  channel.Name,
		Topic: channel.Topic,

		Position: channel.Position,
		ParentID: parentIDToWire(channel.ParentID),
	}
}

func parentIDToWire(id discord.ChannelID) string {
	if !id.IsValid() {
		return ""
	}
	return id.String()
}

// StateRole is a role of a guild as the flow editor lists it.
type StateRole struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Color    int    `json:"color"`
	Position int    `json:"position"`
	// Managed roles belong to a bot or an integration and can not be given by hand.
	Managed bool `json:"managed"`
}

type StateGuildRoleListResponse = []*StateRole

// RolesToWire converts the roles of a guild, the highest role first.
func RolesToWire(roles []discord.Role) []*StateRole {
	res := make([]*StateRole, 0, len(roles))
	for _, r := range roles {
		res = append(res, &StateRole{
			ID:       r.ID.String(),
			Name:     r.Name,
			Color:    int(r.Color),
			Position: r.Position,
			Managed:  r.Managed,
		})
	}

	sort.SliceStable(res, func(i, j int) bool { return res[i].Position > res[j].Position })
	return res
}
