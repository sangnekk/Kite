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

	err = c.Discord().DeleteMessage(c, e.ChannelID, e.ID, api.AuditLogReason("Spam Catcher: tin nhắn trong kênh chống spam"))
	if err != nil {
		return err
	}

	err = c.Discord().KickMember(c, e.GuildID, e.Author.ID, api.AuditLogReason("Spam Catcher: đã gửi tin nhắn trong kênh chống spam"))
	if err != nil {
		return err
	}

	_, err = c.UpdateValue(c, countKey(guildID), provider.VariableOperationIncrement, thing.NewInt(1))
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

	_, err = c.UpdateValue(c, countKey(guildID), provider.VariableOperationOverwrite, thing.NewString("0"))
	if err != nil {
		return err
	}

	_, err = c.Discord().CreateMessage(c, event.ChannelID, api.SendMessageData{
		Content: setupMessageContent(),
	})
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
