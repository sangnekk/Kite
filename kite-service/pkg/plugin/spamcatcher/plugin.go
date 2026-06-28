package spamcatcher

import (
	"context"
	"fmt"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/kitecloud/kite/kite-service/pkg/plugin"
)

type SpamCatcherPlugin struct{}

func NewSpamCatcherPlugin() *SpamCatcherPlugin {
	return &SpamCatcherPlugin{}
}

func (p *SpamCatcherPlugin) Instance(ctx context.Context, appID string, config plugin.ConfigValues) (plugin.PluginInstance, error) {
	return &SpamCatcherPluginInstance{
		appID:  appID,
		config: config,
	}, nil
}

func (p *SpamCatcherPlugin) ID() string {
	return "spamcatcher"
}

func (p *SpamCatcherPlugin) Metadata() plugin.Metadata {
	return plugin.Metadata{
		Name:        "Spam Catcher",
		Description: "Tự động kick người dùng gửi tin nhắn trong kênh đã được thiết lập. Dùng /sc-setup và /sc-destroy.",
		Icon:        "shield-off",
		Author:      "Kite",
	}
}

func (p *SpamCatcherPlugin) Config() plugin.Config {
	return plugin.Config{}
}

func (p *SpamCatcherPlugin) Events() []plugin.Event {
	return []plugin.Event{
		{
			ID:          "event_message_create",
			Source:      plugin.EventSourceDiscord,
			Type:        plugin.EventTypeMessageCreate,
			Description: "Kick người dùng gửi tin nhắn trong kênh đã setup",
		},
	}
}

func (p *SpamCatcherPlugin) Commands() []plugin.Command {
	perms := discord.PermissionAdministrator

	return []plugin.Command{
		{
			ID: "cmd_setup",
			Data: api.CreateCommandData{
				Name:                     "sc-setup",
				Description:              "Thiết lập kênh hiện tại làm kênh chống spam",
				DefaultMemberPermissions: &perms,
			},
		},
		{
			ID: "cmd_destroy",
			Data: api.CreateCommandData{
				Name:                     "sc-destroy",
				Description:              "Hủy thiết lập chống spam cho server này",
				DefaultMemberPermissions: &perms,
			},
		},
	}
}

func channelKey(guildID string) string {
	return fmt.Sprintf("spamcatcher:channel:%s", guildID)
}

func countKey(guildID string) string {
	return fmt.Sprintf("spamcatcher:count:%s", guildID)
}

func setupMessageContent() string {
	return "-# ** Kênh này có mục đích là cho các thí sinh của Mr.Least tham gia cuộc thi scamer hàng năm , những người gửi ảnh,link scam vào đây được đưa ra đảo và chính thức tham gia cuộc thi 36.000.000$ **\n\nhttps://tenor.com/view/mrbeast-mr-beast-rap-battle-mr-beast-introduction-gif-25612407\n\n> # CẤM CHAT VÀ GỬI LINK TRONG KÊNH NÀY ĐỂ TRÁNH BỊ KICK NHẦM"
}
