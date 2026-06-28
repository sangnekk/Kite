package spamcatcher

import (
	"context"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/gateway"
	"github.com/diamondburned/arikawa/v3/utils/json/option"
	"github.com/kitecloud/kite/kite-service/pkg/plugin"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/kitecloud/kite/kite-service/pkg/thing"
)

type SpamCatcherPluginInstance struct {
	appID  string
	config plugin.ConfigValues
}

func (p *SpamCatcherPluginInstance) Update(ctx context.Context, config plugin.ConfigValues) error {
	p.config = config
	return nil
}

func (p *SpamCatcherPluginInstance) HandleEvent(c plugin.Context, event gateway.Event) error {
	e, ok := event.(*gateway.MessageCreateEvent)
	if !ok {
		return nil
	}

	if e.Author.Bot {
		return nil
	}

	guildID := e.GuildID.String()
	channelID := e.ChannelID.String()

	storedChannel, err := c.GetValue(c, channelKey(guildID))
	if err != nil {
		return err
	}
	if storedChannel == thing.Null {
		return nil
	}
	if storedChannel.String() != channelID {
		return nil
	}

	// Bỏ qua thành viên mà bot không thể kick (chủ server hoặc người có vai trò
	// cao hơn/bằng bot) để không xoá nhầm tin nhắn của admin/mod.
	canModerate, err := p.canModerate(c, e)
	if err != nil {
		return err
	}
	if !canModerate {
		return nil
	}

	err = c.Discord().DeleteMessage(c, e.ChannelID, e.ID, api.AuditLogReason("Spam Catcher: tin nhắn trong kênh chống spam"))
	if err != nil {
		return err
	}

	err = c.Discord().KickMember(c, e.GuildID, e.Author.ID, api.AuditLogReason("Spam Catcher: đã gửi tin nhắn trong kênh chống spam"))
	if err != nil {
		return err
	}

	newCount, err := c.UpdateValue(c, countKey(guildID), provider.VariableOperationIncrement, thing.NewInt(1))
	if err != nil {
		return err
	}

	// Cập nhật tin nhắn thông báo để hiển thị số người đã bị kick.
	if err := p.updateCountMessage(c, e.ChannelID, guildID, newCount.Int()); err != nil {
		return err
	}

	return nil
}

// canModerate reports whether the bot may act on the message author. The guild
// owner and members whose highest role is positioned at or above the bot's
// highest role can't be kicked by the bot, so they are skipped entirely (no
// delete, no kick attempt).
func (p *SpamCatcherPluginInstance) canModerate(c plugin.Context, e *gateway.MessageCreateEvent) (bool, error) {
	guild, err := c.Discord().Guild(c, e.GuildID)
	if err != nil {
		return false, err
	}
	if guild.OwnerID == e.Author.ID {
		return false, nil
	}

	me, err := c.Discord().Me(c)
	if err != nil {
		return false, err
	}

	botMember, err := c.Discord().Member(c, e.GuildID, me.ID)
	if err != nil {
		return false, err
	}

	authorRoleIDs, err := p.authorRoleIDs(c, e)
	if err != nil {
		return false, err
	}

	roles, err := c.Discord().GuildRoles(c, e.GuildID)
	if err != nil {
		return false, err
	}

	positions := make(map[discord.RoleID]int, len(roles))
	for _, role := range roles {
		positions[role.ID] = role.Position
	}

	botTop := highestRolePosition(botMember.RoleIDs, positions)
	authorTop := highestRolePosition(authorRoleIDs, positions)

	return botTop > authorTop, nil
}

// authorRoleIDs returns the role IDs of the message author, preferring the
// partial member attached to the event and falling back to a member lookup.
func (p *SpamCatcherPluginInstance) authorRoleIDs(c plugin.Context, e *gateway.MessageCreateEvent) ([]discord.RoleID, error) {
	if e.Member != nil {
		return e.Member.RoleIDs, nil
	}

	member, err := c.Discord().Member(c, e.GuildID, e.Author.ID)
	if err != nil {
		return nil, err
	}

	return member.RoleIDs, nil
}

// highestRolePosition returns the position of the highest role in roleIDs.
// The implicit @everyone role has position 0, so that is the floor.
func highestRolePosition(roleIDs []discord.RoleID, positions map[discord.RoleID]int) int {
	highest := 0
	for _, id := range roleIDs {
		if pos, ok := positions[id]; ok && pos > highest {
			highest = pos
		}
	}

	return highest
}

// updateCountMessage edits the setup message to reflect the latest kick count.
// It is a no-op if the setup message ID was never stored.
func (p *SpamCatcherPluginInstance) updateCountMessage(c plugin.Context, channelID discord.ChannelID, guildID string, count int64) error {
	storedMessage, err := c.GetValue(c, messageKey(guildID))
	if err != nil {
		return err
	}
	if storedMessage == thing.Null {
		return nil
	}

	messageID := discord.MessageID(storedMessage.Snowflake())
	if messageID <= 0 {
		return nil
	}

	_, err = c.Discord().EditMessage(c, channelID, messageID, api.EditMessageData{
		Content: option.NewNullableString(setupMessageContent(count)),
	})
	if err != nil {
		return err
	}

	return nil
}

func (p *SpamCatcherPluginInstance) HandleCommand(c plugin.Context, event *gateway.InteractionCreateEvent) error {
	data, ok := event.Data.(*discord.CommandInteraction)
	if !ok {
		return nil
	}

	switch data.Name {
	case "sc-setup":
		return p.handleSetup(c, event)
	case "sc-destroy":
		return p.handleDestroy(c, event)
	}

	return nil
}

func (p *SpamCatcherPluginInstance) handleSetup(c plugin.Context, event *gateway.InteractionCreateEvent) error {
	channelID := event.ChannelID.String()
	guildID := event.GuildID.String()

	_, err := c.UpdateValue(c, channelKey(guildID), provider.VariableOperationOverwrite, thing.NewString(channelID))
	if err != nil {
		return err
	}

	_, err = c.UpdateValue(c, countKey(guildID), provider.VariableOperationOverwrite, thing.NewInt(0))
	if err != nil {
		return err
	}

	msg, err := c.Discord().CreateMessage(c, event.ChannelID, api.SendMessageData{
		Content: setupMessageContent(0),
	})
	if err != nil {
		return err
	}

	// Lưu ID tin nhắn để có thể cập nhật bộ đếm sau mỗi lần kick.
	_, err = c.UpdateValue(c, messageKey(guildID), provider.VariableOperationOverwrite, thing.NewString(msg.ID.String()))
	if err != nil {
		return err
	}

	_, err = c.Discord().CreateInteractionResponse(c, event.ID, event.Token, api.InteractionResponse{
		Type: api.MessageInteractionWithSource,
		Data: &api.InteractionResponseData{
			Content: option.NewNullableString("✅ Đã thiết lập kênh chống spam thành công!"),
			Flags:   discord.EphemeralMessage,
		},
	})
	if err != nil {
		return err
	}

	return nil
}

func (p *SpamCatcherPluginInstance) handleDestroy(c plugin.Context, event *gateway.InteractionCreateEvent) error {
	guildID := event.GuildID.String()

	err := c.DeleteValue(c, channelKey(guildID))
	if err != nil {
		return err
	}

	err = c.DeleteValue(c, countKey(guildID))
	if err != nil {
		return err
	}

	err = c.DeleteValue(c, messageKey(guildID))
	if err != nil {
		return err
	}

	_, err = c.Discord().CreateInteractionResponse(c, event.ID, event.Token, api.InteractionResponse{
		Type: api.MessageInteractionWithSource,
		Data: &api.InteractionResponseData{
			Content: option.NewNullableString("✅ Đã hủy thiết lập chống spam!"),
			Flags:   discord.EphemeralMessage,
		},
	})
	if err != nil {
		return err
	}

	return nil
}

func (p *SpamCatcherPluginInstance) HandleComponent(c plugin.Context, event *gateway.InteractionCreateEvent) error {
	return nil
}

func (p *SpamCatcherPluginInstance) HandleModal(c plugin.Context, event *gateway.InteractionCreateEvent) error {
	return nil
}

func (p *SpamCatcherPluginInstance) Close() error {
	return nil
}
