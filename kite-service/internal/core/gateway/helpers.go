package gateway

import (
	"fmt"
	"strings"
	"sync"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/gateway"
	"github.com/diamondburned/arikawa/v3/state"
	"github.com/diamondburned/arikawa/v3/utils/httputil"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/util"
)

const (
	GATEWAY_GUILD_MEMBERS           = 1 << 14
	GATEWAY_GUILD_MEMBERS_LIMITED   = 1 << 15
	GATEWAY_MESSAGE_CONTENT         = 1 << 18
	GATEWAY_MESSAGE_CONTENT_LIMITED = 1 << 19
)

func getAppIntents(client *api.Client) (gateway.Intents, error) {
	app, err := client.CurrentApplication()
	if err != nil {
		return 0, fmt.Errorf("failed to get current application: %w", err)
	}

	res := gateway.IntentGuilds | gateway.IntentGuildMessages | gateway.IntentGuildMessageReactions | gateway.IntentGuildVoiceStates
	if app.Flags&GATEWAY_MESSAGE_CONTENT != 0 || app.Flags&GATEWAY_MESSAGE_CONTENT_LIMITED != 0 {
		res |= gateway.IntentMessageContent
	}
	if app.Flags&GATEWAY_GUILD_MEMBERS != 0 || app.Flags&GATEWAY_GUILD_MEMBERS_LIMITED != 0 {
		res |= gateway.IntentGuildMembers
	}

	return res, nil
}

func createSession(tokenCrypt *util.SymmetricCrypt, app *model.App, customBotStatus bool) (*state.State, error) {
	token, err := tokenCrypt.DecryptString(app.DiscordToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt token: %w", err)
	}

	identifier := gateway.DefaultIdentifier("Bot " + token)
	identifier.IdentifyCommand.Presence = presenceForApp(app, customBotStatus, token)

	// TODO: pass in custom opts instead of modifying the default
	gateway.DefaultGatewayOpts.AlwaysCloseGracefully = false

	// TODO: configure state to only cache what we need
	return state.NewWithIdentifier(identifier), nil
}

// externalAssetCache memoizes the conversion of a plain image URL to its Discord
// external-asset path so we don't hit the API on every presence build.
var externalAssetCache sync.Map // url string -> mp: string

// resolveActivityImage turns a plain http(s) image URL into a Discord external
// asset reference (mp:...) so it renders in the bot presence. Asset keys and
// existing mp: values pass through unchanged. Best-effort: returns "" on failure.
func resolveActivityImage(token, value string) string {
	if value == "" {
		return ""
	}
	if !strings.HasPrefix(value, "http://") && !strings.HasPrefix(value, "https://") {
		return value
	}
	if cached, ok := externalAssetCache.Load(value); ok {
		return cached.(string)
	}

	client := api.NewClient("Bot " + token)
	app, err := client.CurrentApplication()
	if err != nil {
		return ""
	}

	var resp []struct {
		ExternalAssetPath string `json:"external_asset_path"`
	}
	err = client.RequestJSON(
		&resp,
		"POST",
		api.EndpointApplications+app.ID.String()+"/external-assets",
		httputil.WithJSONBody(map[string][]string{"urls": {value}}),
	)
	if err != nil || len(resp) == 0 || resp[0].ExternalAssetPath == "" {
		return ""
	}

	mp := "mp:" + resp[0].ExternalAssetPath
	externalAssetCache.Store(value, mp)
	return mp
}

// presenceForApp builds the bot presence. A custom status is only applied when
// customBotStatus is true (the app's plan allows it); otherwise the default
// Vibe Bot presence is used, so downgrading a plan reverts the status.
func presenceForApp(app *model.App, customBotStatus bool, token string) *gateway.UpdatePresenceCommand {
	status := discord.OnlineStatus
	activity := discord.Activity{
		Type:  discord.CustomActivity,
		Name:  "bot.vibebost.vn",
		State: "⭐ Bot được chạy từ bot.vibehost.vn",
	}

	if customBotStatus && app.DiscordStatus != nil {
		s := app.DiscordStatus
		if s.Status != "" {
			status = discord.Status(s.Status)
		}

		activity = discord.Activity{
			Type:    discord.ActivityType(s.ActivityType),
			Name:    s.ActivityName,
			State:   s.ActivityState,
			URL:     s.ActivityURL,
			Details: s.ActivityDetails,
		}

		largeImage := resolveActivityImage(token, s.ActivityLargeImage)
		smallImage := resolveActivityImage(token, s.ActivitySmallImage)
		if largeImage != "" || smallImage != "" || s.ActivityLargeText != "" || s.ActivitySmallText != "" {
			activity.Assets = &discord.ActivityAssets{
				LargeImage: largeImage,
				LargeText:  s.ActivityLargeText,
				SmallImage: smallImage,
				SmallText:  s.ActivitySmallText,
			}
		}
	}

	return &gateway.UpdatePresenceCommand{
		Status:     status,
		Activities: []discord.Activity{activity},
	}
}
