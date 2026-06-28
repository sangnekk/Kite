package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/state"
	disstore "github.com/diamondburned/arikawa/v3/state/store"
	"github.com/diamondburned/arikawa/v3/utils/sendpart"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"github.com/kitecloud/kite/kite-service/pkg/message"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/kitecloud/kite/kite-service/pkg/thing"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/openai/openai-go/responses"
	"gopkg.in/guregu/null.v4"
)

type DiscordProvider struct {
	provider.MockDiscordProvider // TODO: remove this

	appID      string
	appStore   store.AppStore
	assetStore store.AssetStore
	session    *state.State

	interactionResponseMutex sync.Mutex
	interactionsWithResponse map[discord.InteractionID]struct{}
}

func NewDiscordProvider(
	appID string,
	appStore store.AppStore,
	assetStore store.AssetStore,
	session *state.State,
) *DiscordProvider {
	return &DiscordProvider{
		appID:      appID,
		appStore:   appStore,
		assetStore: assetStore,
		session:    session,

		interactionsWithResponse: make(map[discord.InteractionID]struct{}),
	}
}

// ResolveAsset returns the content and metadata of an uploaded asset.
func (p *DiscordProvider) ResolveAsset(ctx context.Context, assetID string) (*provider.AssetData, error) {
	if p.assetStore == nil {
		return nil, fmt.Errorf("asset store is not configured")
	}

	asset, err := p.assetStore.AssetWithContent(ctx, assetID)
	if err != nil {
		return nil, fmt.Errorf("failed to get asset: %w", err)
	}

	return &provider.AssetData{
		Name:        asset.Name,
		ContentType: asset.ContentType,
		Content:     asset.Content,
	}, nil
}

func (p *DiscordProvider) Me(ctx context.Context) (*discord.User, error) {
	me, err := p.session.Me()
	if err != nil {
		return nil, fmt.Errorf("failed to get bot user: %w", err)
	}

	return me, nil
}

func (p *DiscordProvider) Member(ctx context.Context, guildID discord.GuildID, userID discord.UserID) (*discord.Member, error) {
	member, err := p.session.Member(guildID, userID)
	if err != nil {
		if util.IsDiscordRestStatusCode(err, http.StatusNotFound) || errors.Is(err, disstore.ErrNotFound) {
			return nil, provider.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get member: %w", err)
	}

	return member, nil
}

func (p *DiscordProvider) User(ctx context.Context, userID discord.UserID) (*discord.User, error) {
	user, err := p.session.User(userID)
	if err != nil {
		if util.IsDiscordRestStatusCode(err, http.StatusNotFound) || errors.Is(err, disstore.ErrNotFound) {
			return nil, provider.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (p *DiscordProvider) Channel(ctx context.Context, channelID discord.ChannelID) (*discord.Channel, error) {
	channel, err := p.session.Channel(channelID)
	if err != nil {
		if util.IsDiscordRestStatusCode(err, http.StatusNotFound) || errors.Is(err, disstore.ErrNotFound) {
			return nil, provider.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get channel: %w", err)
	}

	return channel, nil
}

func (p *DiscordProvider) Role(ctx context.Context, guildID discord.GuildID, roleID discord.RoleID) (*discord.Role, error) {
	role, err := p.session.Role(guildID, roleID)
	if err != nil {
		if util.IsDiscordRestStatusCode(err, http.StatusNotFound) || errors.Is(err, disstore.ErrNotFound) {
			return nil, provider.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get role: %w", err)
	}

	return role, nil
}

func (p *DiscordProvider) Guild(ctx context.Context, guildID discord.GuildID) (*discord.Guild, error) {
	guild, err := p.session.Guild(guildID)
	if err != nil {
		if util.IsDiscordRestStatusCode(err, http.StatusNotFound) || errors.Is(err, disstore.ErrNotFound) {
			return nil, provider.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get guild: %w", err)
	}

	return guild, nil
}

func (p *DiscordProvider) Message(ctx context.Context, channelID discord.ChannelID, messageID discord.MessageID) (*discord.Message, error) {
	msg, err := p.session.Message(channelID, messageID)
	if err != nil {
		if util.IsDiscordRestStatusCode(err, http.StatusNotFound) || errors.Is(err, disstore.ErrNotFound) {
			return nil, provider.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get message: %w", err)
	}

	return msg, nil
}

func (p *DiscordProvider) GuildRoles(ctx context.Context, guildID discord.GuildID) ([]discord.Role, error) {
	roles, err := p.session.Roles(guildID)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles: %w", err)
	}

	return roles, nil
}

// BotPermissions returns the bot's effective permissions in the given channel,
// resolved from its own member, the guild roles, and the channel overwrites.
func (p *DiscordProvider) BotPermissions(ctx context.Context, guildID discord.GuildID, channelID discord.ChannelID) (discord.Permissions, error) {
	me, err := p.session.Me()
	if err != nil {
		return 0, fmt.Errorf("failed to get bot user: %w", err)
	}

	perms, err := p.session.Permissions(channelID, me.ID)
	if err != nil {
		return 0, fmt.Errorf("failed to get bot permissions: %w", err)
	}

	return perms, nil
}

func (p *DiscordProvider) CreateInteractionResponse(ctx context.Context, interactionID discord.InteractionID, interactionToken string, response api.InteractionResponse) (*provider.InteractionResponseResource, error) {
	p.interactionResponseMutex.Lock()
	defer p.interactionResponseMutex.Unlock()

	endpoint := api.EndpointInteractions + interactionID.String() + "/" + interactionToken + "/callback?with_response=true"

	var res struct {
		Resource struct {
			Type    api.InteractionResponseType `json:"type"`
			Message *discord.Message            `json:"message,omitempty"`
		} `json:"resource"`
	}
	if err := sendpart.POST(p.session.Client.Client, response, &res, endpoint); err != nil {
		return nil, fmt.Errorf("failed to respond to interaction: %w", err)
	}

	p.interactionsWithResponse[interactionID] = struct{}{}

	return &provider.InteractionResponseResource{
		Type:    res.Resource.Type,
		Message: res.Resource.Message,
	}, nil
}

func (p *DiscordProvider) EditInteractionResponse(ctx context.Context, applicationID discord.AppID, token string, response api.EditInteractionResponseData) (*discord.Message, error) {
	msg, err := p.session.EditInteractionResponse(applicationID, token, response)
	if err != nil {
		return nil, fmt.Errorf("failed to edit interaction response: %w", err)
	}

	return msg, err
}

func (p *DiscordProvider) DeleteInteractionResponse(ctx context.Context, applicationID discord.AppID, token string) error {
	err := p.session.DeleteInteractionResponse(applicationID, token)
	if err != nil {
		return fmt.Errorf("failed to delete interaction response: %w", err)
	}

	return nil
}

func (p *DiscordProvider) CreateInteractionFollowup(ctx context.Context, applicationID discord.AppID, token string, data api.InteractionResponseData) (*discord.Message, error) {
	msg, err := p.session.FollowUpInteraction(applicationID, token, data)
	if err != nil {
		return nil, fmt.Errorf("failed to create interaction followup: %w", err)
	}

	return msg, nil
}

func (p *DiscordProvider) EditInteractionFollowup(ctx context.Context, applicationID discord.AppID, token string, messageID discord.MessageID, data api.EditInteractionResponseData) (*discord.Message, error) {
	msg, err := p.session.EditInteractionFollowup(applicationID, messageID, token, data)
	if err != nil {
		return nil, fmt.Errorf("failed to edit interaction followup: %w", err)
	}

	return msg, nil
}

func (p *DiscordProvider) DeleteInteractionFollowup(ctx context.Context, applicationID discord.AppID, token string, messageID discord.MessageID) error {
	err := p.session.DeleteInteractionFollowup(applicationID, messageID, token)
	if err != nil {
		return fmt.Errorf("failed to delete interaction followup: %w", err)
	}

	return nil
}

func (p *DiscordProvider) CreateMessage(ctx context.Context, channelID discord.ChannelID, message api.SendMessageData) (*discord.Message, error) {
	msg, err := p.session.SendMessageComplex(channelID, message)
	if err != nil {
		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	return msg, nil
}

func (p *DiscordProvider) EditMessage(ctx context.Context, channelID discord.ChannelID, messageID discord.MessageID, message api.EditMessageData) (*discord.Message, error) {
	msg, err := p.session.EditMessageComplex(channelID, messageID, message)
	if err != nil {
		return nil, fmt.Errorf("failed to edit message: %w", err)
	}

	return msg, nil
}

func (p *DiscordProvider) DeleteMessage(
	ctx context.Context,
	channelID discord.ChannelID,
	messageID discord.MessageID,
	reason api.AuditLogReason,
) error {
	err := p.session.DeleteMessage(channelID, messageID, reason)
	if err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	return nil
}

func (p *DiscordProvider) CreateMessageReaction(ctx context.Context, channelID discord.ChannelID, messageID discord.MessageID, emoji discord.APIEmoji) error {
	err := p.session.React(channelID, messageID, emoji)
	if err != nil {
		return fmt.Errorf("failed to create message reaction: %w", err)
	}

	return nil
}

func (p *DiscordProvider) DeleteMessageReaction(ctx context.Context, channelID discord.ChannelID, messageID discord.MessageID, emoji discord.APIEmoji) error {
	err := p.session.Unreact(channelID, messageID, emoji)
	if err != nil {
		return fmt.Errorf("failed to delete message reaction: %w", err)
	}

	return nil
}

func (p *DiscordProvider) PinMessage(ctx context.Context, channelID discord.ChannelID, messageID discord.MessageID, reason api.AuditLogReason) error {
	if err := p.session.PinMessage(channelID, messageID, reason); err != nil {
		return fmt.Errorf("failed to pin message: %w", err)
	}

	return nil
}

func (p *DiscordProvider) UnpinMessage(ctx context.Context, channelID discord.ChannelID, messageID discord.MessageID, reason api.AuditLogReason) error {
	if err := p.session.UnpinMessage(channelID, messageID, reason); err != nil {
		return fmt.Errorf("failed to unpin message: %w", err)
	}

	return nil
}

func (p *DiscordProvider) BulkDeleteMessages(ctx context.Context, channelID discord.ChannelID, count int, reason api.AuditLogReason) (int, error) {
	if count <= 0 {
		return 0, nil
	}
	// Discord's bulk delete endpoint accepts at most 100 messages per call.
	if count > 100 {
		count = 100
	}

	messages, err := p.session.Messages(channelID, uint(count))
	if err != nil {
		return 0, fmt.Errorf("failed to fetch messages: %w", err)
	}

	ids := make([]discord.MessageID, len(messages))
	for i, m := range messages {
		ids[i] = m.ID
	}

	if err := p.session.DeleteMessages(channelID, ids, reason); err != nil {
		return 0, fmt.Errorf("failed to bulk delete messages: %w", err)
	}

	return len(ids), nil
}

func (p *DiscordProvider) BanMember(ctx context.Context, guildID discord.GuildID, userID discord.UserID, data api.BanData) error {
	err := p.session.Ban(guildID, userID, data)
	if err != nil {
		return fmt.Errorf("failed to ban member: %w", err)
	}

	return nil
}

func (p *DiscordProvider) UnbanMember(ctx context.Context, guildID discord.GuildID, userID discord.UserID, reason api.AuditLogReason) error {
	err := p.session.Unban(guildID, userID, reason)
	if err != nil {
		return fmt.Errorf("failed to unban member: %w", err)
	}

	return nil
}

func (p *DiscordProvider) KickMember(ctx context.Context, guildID discord.GuildID, userID discord.UserID, reason api.AuditLogReason) error {
	err := p.session.Kick(guildID, userID, reason)
	if err != nil {
		return fmt.Errorf("failed to kick member: %w", err)
	}

	return nil
}

func (p *DiscordProvider) EditMember(ctx context.Context, guildID discord.GuildID, userID discord.UserID, data api.ModifyMemberData) error {
	err := p.session.ModifyMember(guildID, userID, data)
	if err != nil {
		return fmt.Errorf("failed to edit member: %w", err)
	}

	return nil
}

func (p *DiscordProvider) AddMemberRole(ctx context.Context, guildID discord.GuildID, userID discord.UserID, roleID discord.RoleID, reason api.AuditLogReason) error {
	err := p.session.AddRole(guildID, userID, roleID, api.AddRoleData{
		AuditLogReason: reason,
	})
	if err != nil {
		return fmt.Errorf("failed to add role: %w", err)
	}

	return nil
}

func (p *DiscordProvider) RemoveMemberRole(ctx context.Context, guildID discord.GuildID, userID discord.UserID, roleID discord.RoleID, reason api.AuditLogReason) error {
	err := p.session.RemoveRole(guildID, userID, roleID, reason)
	if err != nil {
		return fmt.Errorf("failed to remove role: %w", err)
	}

	return nil
}

func (p *DiscordProvider) CreatePrivateChannel(ctx context.Context, userID discord.UserID) (*discord.Channel, error) {
	channel, err := p.session.CreatePrivateChannel(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to create DM channel: %w", err)
	}

	return channel, nil
}

func (p *DiscordProvider) CreateChannel(ctx context.Context, guildID discord.GuildID, data api.CreateChannelData) (*discord.Channel, error) {
	channel, err := p.session.CreateChannel(guildID, data)
	if err != nil {
		return nil, fmt.Errorf("failed to create channel: %w", err)
	}

	return channel, nil
}

func (p *DiscordProvider) EditChannel(ctx context.Context, channelID discord.ChannelID, data api.ModifyChannelData) error {
	err := p.session.ModifyChannel(channelID, data)
	if err != nil {
		return fmt.Errorf("failed to edit channel: %w", err)
	}

	return nil
}

func (p *DiscordProvider) DeleteChannel(ctx context.Context, channelID discord.ChannelID, reason api.AuditLogReason) error {
	err := p.session.DeleteChannel(channelID, reason)
	if err != nil {
		return fmt.Errorf("failed to delete channel: %w", err)
	}

	return nil
}

func (p *DiscordProvider) CreateRole(ctx context.Context, guildID discord.GuildID, data api.CreateRoleData) (*discord.Role, error) {
	role, err := p.session.CreateRole(guildID, data)
	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	return role, nil
}

func (p *DiscordProvider) EditRole(ctx context.Context, guildID discord.GuildID, roleID discord.RoleID, data api.ModifyRoleData) (*discord.Role, error) {
	role, err := p.session.ModifyRole(guildID, roleID, data)
	if err != nil {
		return nil, fmt.Errorf("failed to edit role: %w", err)
	}

	return role, nil
}

func (p *DiscordProvider) DeleteRole(ctx context.Context, guildID discord.GuildID, roleID discord.RoleID) error {
	if err := p.session.DeleteRole(guildID, roleID, ""); err != nil {
		return fmt.Errorf("failed to delete role: %w", err)
	}

	return nil
}

func (p *DiscordProvider) StartThreadWithMessage(ctx context.Context, channelID discord.ChannelID, messageID discord.MessageID, data api.StartThreadData) (*discord.Channel, error) {
	thread, err := p.session.StartThreadWithMessage(channelID, messageID, data)
	if err != nil {
		return nil, fmt.Errorf("failed to start thread with message: %w", err)
	}

	return thread, nil
}

func (p *DiscordProvider) StartThreadWithoutMessage(ctx context.Context, channelID discord.ChannelID, data api.StartThreadData) (*discord.Channel, error) {
	thread, err := p.session.StartThreadWithoutMessage(channelID, data)
	if err != nil {
		return nil, fmt.Errorf("failed to start thread without message: %w", err)
	}

	return thread, nil
}

func (p *DiscordProvider) AddThreadMember(ctx context.Context, channelID discord.ChannelID, userID discord.UserID) error {
	err := p.session.AddThreadMember(channelID, userID)
	if err != nil {
		return fmt.Errorf("failed to add thread member: %w", err)
	}

	return nil
}

func (p *DiscordProvider) RemoveThreadMember(ctx context.Context, channelID discord.ChannelID, userID discord.UserID) error {
	err := p.session.RemoveThreadMember(channelID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove thread member: %w", err)
	}

	return nil
}

func (p *DiscordProvider) HasCreatedInteractionResponse(ctx context.Context, interactionID discord.InteractionID) (bool, error) {
	p.interactionResponseMutex.Lock()
	defer p.interactionResponseMutex.Unlock()

	_, ok := p.interactionsWithResponse[interactionID]
	return ok, nil
}

func (p *DiscordProvider) AutoDeferInteraction(
	ctx context.Context,
	interactionID discord.InteractionID,
	interactionToken string,
	flags discord.MessageFlags,
) {
	select {
	case <-ctx.Done():
		return
	case <-time.After(1500 * time.Millisecond):
		hasCreatedResponse, err := p.HasCreatedInteractionResponse(ctx, interactionID)
		if err != nil {
			return
		}

		if !hasCreatedResponse {
			_, err := p.CreateInteractionResponse(ctx, interactionID, interactionToken, api.InteractionResponse{
				Type: api.DeferredMessageInteractionWithSource,
				Data: &api.InteractionResponseData{
					Flags: flags,
				},
			})
			if err != nil {
				slog.Error(
					"Failed to auto-defer interaction",
					slog.String("interaction_id", interactionID.String()),
					slog.String("error", err.Error()),
				)
			}
		}
	}
}

type LogProvider struct {
	appID    string
	logStore store.LogStore

	links entityLinks
}

func NewLogProvider(appID string, logStore store.LogStore, links entityLinks) *LogProvider {
	return &LogProvider{
		appID:    appID,
		logStore: logStore,
		links:    links,
	}
}

func (p *LogProvider) CreateLogEntry(ctx context.Context, level provider.LogLevel, message string) {
	ctx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	err := p.logStore.CreateLogEntry(ctx, model.LogEntry{
		AppID:           p.appID,
		Level:           model.LogLevel(level),
		Message:         message,
		CommandID:       p.links.CommandID,
		EventListenerID: p.links.EventListenerID,
		MessageID:       p.links.MessageID,
		CreatedAt:       time.Now().UTC(),
	})
	if err != nil {
		slog.Error(
			"Failed to create log entry",
			slog.String("app_id", p.appID),
			slog.String("error", err.Error()),
		)
	}
}

type HTTPProvider struct {
	client *http.Client
}

func NewHTTPProvider(client *http.Client) *HTTPProvider {
	return &HTTPProvider{
		client: client,
	}
}

func (p *HTTPProvider) HTTPRequest(ctx context.Context, req *http.Request) (*http.Response, error) {
	return p.client.Do(req)
}

// aiProviderClient holds the resolved upstream connection for one configured
// provider.
type aiProviderClient struct {
	apiType         provider.AIModelAPIType
	openai          *openai.Client
	useResponsesAPI bool

	// Anthropic is called via raw HTTP so no extra SDK dependency is needed and
	// any anthropic-compatible base_url works out of the box.
	httpClient *http.Client
	baseURL    string
	apiKey     string
}

// AIProviderConn describes one configured upstream AI provider.
type AIProviderConn struct {
	ID      string
	APIType provider.AIModelAPIType
	BaseURL string
	APIKey  string
}

type AIProvider struct {
	registry *provider.AIModelRegistry
	clients  map[string]*aiProviderClient
}

// NewMultiAIProvider builds an AIProvider that routes each request to the
// upstream that owns the requested model. Returns nil when no providers are
// configured, so callers fall back to the mock provider.
func NewMultiAIProvider(registry *provider.AIModelRegistry, conns []AIProviderConn, httpClient *http.Client) *AIProvider {
	if registry == nil || registry.Len() == 0 {
		return nil
	}

	clients := make(map[string]*aiProviderClient, len(conns))
	for _, conn := range conns {
		switch conn.APIType {
		case provider.AIModelAPIOpenAI:
			reqOpts := []option.RequestOption{option.WithAPIKey(conn.APIKey)}
			// Only OpenAI's own endpoint supports the Responses API; custom
			// openai-compatible gateways are driven via Chat Completions.
			useResponses := conn.BaseURL == ""
			if conn.BaseURL != "" {
				reqOpts = append(reqOpts, option.WithBaseURL(conn.BaseURL))
			}
			client := openai.NewClient(reqOpts...)
			clients[conn.ID] = &aiProviderClient{
				apiType:         provider.AIModelAPIOpenAI,
				openai:          &client,
				useResponsesAPI: useResponses,
			}
		case provider.AIModelAPIAnthropic:
			baseURL := conn.BaseURL
			if baseURL == "" {
				baseURL = "https://api.anthropic.com"
			}
			clients[conn.ID] = &aiProviderClient{
				apiType:    provider.AIModelAPIAnthropic,
				httpClient: httpClient,
				baseURL:    strings.TrimRight(baseURL, "/"),
				apiKey:     conn.APIKey,
			}
		}
	}

	return &AIProvider{registry: registry, clients: clients}
}

func (p *AIProvider) CreateResponse(ctx context.Context, opts provider.CreateResponseOpts) (string, error) {
	model, ok := p.registry.Lookup(opts.Model)
	if !ok {
		return "", fmt.Errorf("unknown ai model %q", opts.Model)
	}

	client, ok := p.clients[model.ProviderID]
	if !ok {
		return "", fmt.Errorf("no configured client for ai provider %q", model.ProviderID)
	}

	switch client.apiType {
	case provider.AIModelAPIOpenAI:
		if client.useResponsesAPI {
			return p.createOpenAIResponse(ctx, client, model.Model, opts)
		}
		return p.createOpenAIChatCompletion(ctx, client, model.Model, opts)
	case provider.AIModelAPIAnthropic:
		return p.createAnthropicMessage(ctx, client, model.Model, opts)
	default:
		return "", fmt.Errorf("unsupported ai api type %q", client.apiType)
	}
}

// resolveMaxOutputTokens honors the requested limit as-is, defaulting to 500
// when unset. Per-feature caps (e.g. the flow AI node's cost cap) are applied
// by the caller before reaching the provider.
func resolveMaxOutputTokens(opts provider.CreateResponseOpts) int {
	if opts.MaxOutputTokens > 0 {
		return opts.MaxOutputTokens
	}
	return 500
}

func (p *AIProvider) createOpenAIResponse(ctx context.Context, client *aiProviderClient, wireModel string, opts provider.CreateResponseOpts) (string, error) {
	tools := []responses.ToolUnionParam{}
	for _, tool := range opts.Tools {
		switch tool {
		case provider.AIToolTypeWebSearchPreview:
			tools = append(tools, responses.ToolUnionParam{
				OfWebSearchPreview: &responses.WebSearchToolParam{
					Type: responses.WebSearchToolTypeWebSearchPreview,
				},
			})
		}
	}

	inputs := responses.ResponseInputParam{
		{
			OfMessage: &responses.EasyInputMessageParam{
				Role: responses.EasyInputMessageRoleUser,
				Content: responses.EasyInputMessageContentUnionParam{
					OfString: openai.String(opts.Prompt),
				},
			},
		},
	}
	if opts.SystemPrompt != "" {
		inputs = append(inputs, responses.ResponseInputItemUnionParam{
			OfMessage: &responses.EasyInputMessageParam{
				Role: responses.EasyInputMessageRoleSystem,
				Content: responses.EasyInputMessageContentUnionParam{
					OfString: openai.String(opts.SystemPrompt),
				},
			},
		})
	}

	resp, err := client.openai.Responses.New(ctx, responses.ResponseNewParams{
		Model: wireModel,
		Input: responses.ResponseNewParamsInputUnion{
			OfInputItemList: inputs,
		},
		MaxOutputTokens: openai.Int(int64(resolveMaxOutputTokens(opts))),
		Tools:           tools,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create response: %w", err)
	}

	return resp.OutputText(), nil
}

func (p *AIProvider) createOpenAIChatCompletion(ctx context.Context, client *aiProviderClient, wireModel string, opts provider.CreateResponseOpts) (string, error) {
	messages := []openai.ChatCompletionMessageParamUnion{}
	if opts.SystemPrompt != "" {
		messages = append(messages, openai.SystemMessage(opts.SystemPrompt))
	}
	messages = append(messages, openai.UserMessage(opts.Prompt))

	resp, err := client.openai.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model:               wireModel,
		Messages:            messages,
		MaxCompletionTokens: openai.Int(int64(resolveMaxOutputTokens(opts))),
	})
	if err != nil {
		return "", fmt.Errorf("failed to create chat completion: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", nil
	}

	return resp.Choices[0].Message.Content, nil
}

type anthropicMessageRequest struct {
	Model     string                    `json:"model"`
	MaxTokens int                       `json:"max_tokens"`
	System    string                    `json:"system,omitempty"`
	Messages  []anthropicMessagePayload `json:"messages"`
}

type anthropicMessagePayload struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicMessageResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error"`
}

func (p *AIProvider) createAnthropicMessage(ctx context.Context, client *aiProviderClient, wireModel string, opts provider.CreateResponseOpts) (string, error) {
	body, err := json.Marshal(anthropicMessageRequest{
		Model:     wireModel,
		MaxTokens: resolveMaxOutputTokens(opts),
		System:    opts.SystemPrompt,
		Messages: []anthropicMessagePayload{
			{Role: "user", Content: opts.Prompt},
		},
	})
	if err != nil {
		return "", fmt.Errorf("failed to marshal anthropic request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, client.baseURL+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create anthropic request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Api-Key", client.apiKey)
	req.Header.Set("Anthropic-Version", "2023-06-01")

	httpClient := client.httpClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send anthropic request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read anthropic response: %w", err)
	}

	var parsed anthropicMessageResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("failed to decode anthropic response: %w", err)
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("anthropic error: %s", parsed.Error.Message)
	}
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("anthropic request failed with status %d", resp.StatusCode)
	}

	var out strings.Builder
	for _, block := range parsed.Content {
		if block.Type == "text" {
			out.WriteString(block.Text)
		}
	}

	return out.String(), nil
}

type VariableProvider struct {
	variableValueStore store.VariableValueStore
}

func NewVariableProvider(variableValueStore store.VariableValueStore) *VariableProvider {
	return &VariableProvider{
		variableValueStore: variableValueStore,
	}
}

func (p *VariableProvider) UpdateVariable(ctx context.Context, id string, scope null.String, operation provider.VariableOperation, value thing.Thing) (thing.Thing, error) {
	v := model.VariableValue{
		VariableID: id,
		Scope:      scope,
		Data:       value,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}

	newValue, err := p.variableValueStore.UpdateVariableValue(ctx, operation, v)
	if err != nil {
		return thing.Null, fmt.Errorf("failed to %s variable value: %w", operation, err)
	}

	return newValue.Data, nil
}

func (p *VariableProvider) Variable(ctx context.Context, id string, scope null.String) (thing.Thing, error) {
	row, err := p.variableValueStore.VariableValue(ctx, id, scope)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return thing.Null, provider.ErrNotFound
		}
		return thing.Null, fmt.Errorf("failed to get variable value: %w", err)
	}

	return row.Data, nil
}

func (p *VariableProvider) DeleteVariable(ctx context.Context, id string, scope null.String) error {
	err := p.variableValueStore.DeleteVariableValue(ctx, id, scope)
	if err != nil {
		return fmt.Errorf("failed to delete variable value: %w", err)
	}

	return nil
}

type EconomyProvider struct {
	variableValueStore store.VariableValueStore
}

func NewEconomyProvider(variableValueStore store.VariableValueStore) *EconomyProvider {
	return &EconomyProvider{
		variableValueStore: variableValueStore,
	}
}

func (p *EconomyProvider) GetBalance(ctx context.Context, currencyID string, scope null.String) (thing.Thing, error) {
	row, err := p.variableValueStore.VariableValue(ctx, currencyID, scope)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return thing.NewFloat(0.0), nil
		}
		return thing.Null, fmt.Errorf("failed to get balance: %w", err)
	}

	return row.Data, nil
}

func (p *EconomyProvider) AddBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing) (thing.Thing, error) {
	newValue, err := p.variableValueStore.UpdateVariableValue(ctx, provider.VariableOperationIncrement, model.VariableValue{
		VariableID: currencyID,
		Scope:      scope,
		Data:       amount,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	})
	if err != nil {
		return thing.Null, fmt.Errorf("failed to add balance: %w", err)
	}

	return newValue.Data, nil
}

func (p *EconomyProvider) SetBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing) (thing.Thing, error) {
	newValue, err := p.variableValueStore.UpdateVariableValue(ctx, provider.VariableOperationOverwrite, model.VariableValue{
		VariableID: currencyID,
		Scope:      scope,
		Data:       amount,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	})
	if err != nil {
		return thing.Null, fmt.Errorf("failed to set balance: %w", err)
	}

	return newValue.Data, nil
}

func (p *EconomyProvider) RemoveBalance(ctx context.Context, currencyID string, scope null.String, amount thing.Thing, allowNegative bool) (thing.Thing, error) {
	newValue, err := p.variableValueStore.SpendVariableValue(ctx, currencyID, scope, amount, allowNegative)
	if err != nil {
		if errors.Is(err, store.ErrInsufficientFunds) {
			return thing.Null, provider.ErrInsufficientFunds
		}
		return thing.Null, fmt.Errorf("failed to remove balance: %w", err)
	}

	return newValue.Data, nil
}

func (p *EconomyProvider) Transfer(ctx context.Context, currencyID string, fromScope, toScope null.String, amount thing.Thing, allowNegative bool) (provider.EconomyTransferResult, error) {
	from, to, err := p.variableValueStore.TransferVariableValue(ctx, currencyID, fromScope, toScope, amount, allowNegative)
	if err != nil {
		if errors.Is(err, store.ErrInsufficientFunds) {
			return provider.EconomyTransferResult{}, provider.ErrInsufficientFunds
		}
		return provider.EconomyTransferResult{}, fmt.Errorf("failed to transfer balance: %w", err)
	}

	return provider.EconomyTransferResult{
		FromBalance: from.Data,
		ToBalance:   to.Data,
	}, nil
}

func (p *EconomyProvider) Leaderboard(ctx context.Context, currencyID string, limit int) ([]provider.EconomyLeaderboardEntry, error) {
	rows, err := p.variableValueStore.VariableValuesTop(ctx, currencyID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get leaderboard: %w", err)
	}

	entries := make([]provider.EconomyLeaderboardEntry, len(rows))
	for i, row := range rows {
		entries[i] = provider.EconomyLeaderboardEntry{
			Scope:   row.Scope.String,
			Balance: row.Data,
		}
	}

	return entries, nil
}

type CooldownProvider struct {
	variableValueStore store.VariableValueStore
}

func NewCooldownProvider(variableValueStore store.VariableValueStore) *CooldownProvider {
	return &CooldownProvider{
		variableValueStore: variableValueStore,
	}
}

func (p *CooldownProvider) Check(ctx context.Context, cooldownID string, scope null.String, durationSeconds int64, consume bool) (provider.CooldownResult, error) {
	now := time.Now().Unix()
	allowed, remaining, err := p.variableValueStore.ConsumeCooldown(ctx, cooldownID, scope, now, durationSeconds, consume)
	if err != nil {
		return provider.CooldownResult{}, fmt.Errorf("failed to check cooldown: %w", err)
	}

	return provider.CooldownResult{
		Allowed:   allowed,
		Remaining: remaining,
	}, nil
}

type MessageTemplateProvider struct {
	messageStore         store.MessageStore
	messageInstanceStore store.MessageInstanceStore
}

func NewMessageTemplateProvider(messageStore store.MessageStore, messageInstanceStore store.MessageInstanceStore) *MessageTemplateProvider {
	return &MessageTemplateProvider{
		messageStore:         messageStore,
		messageInstanceStore: messageInstanceStore,
	}
}

func (p *MessageTemplateProvider) MessageTemplate(ctx context.Context, id string) (*message.MessageData, error) {
	message, err := p.messageStore.Message(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get message: %w", err)
	}

	return &message.Data, nil
}

func (p *MessageTemplateProvider) LinkMessageTemplateInstance(ctx context.Context, instance provider.MessageTemplateInstance) error {
	message, err := p.messageStore.Message(ctx, instance.MessageTemplateID)
	if err != nil {
		return fmt.Errorf("failed to get message: %w", err)
	}

	_, err = p.messageInstanceStore.CreateMessageInstance(ctx, &model.MessageInstance{
		MessageID:        message.ID,
		DiscordMessageID: instance.MessageID.String(),
		DiscordChannelID: instance.ChannelID.String(),
		DiscordGuildID:   instance.GuildID.String(),
		Ephemeral:        instance.Ephemeral,
		Hidden:           true,
		FlowSources:      message.FlowSources,
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	})
	if err != nil {
		return fmt.Errorf("failed to create message instance: %w", err)
	}

	return nil
}

type ResumePointProvider struct {
	resumePointStore store.ResumePointStore

	appID string
	links entityLinks
}

func NewResumePointProvider(
	resumePointStore store.ResumePointStore,
	appID string,
	links entityLinks,
) *ResumePointProvider {
	return &ResumePointProvider{
		resumePointStore: resumePointStore,
		appID:            appID,
		links:            links,
	}
}

func (p *ResumePointProvider) CreateResumePoint(ctx context.Context, s flow.ResumePoint) (flow.ResumePoint, error) {
	if s.ID == "" {
		s.ID = util.UniqueID()
	}

	var expiresAt null.Time
	if s.Type == flow.ResumePointTypeModal {
		expiresAt = null.NewTime(time.Now().UTC().Add(time.Hour*1), true)
	}

	// TODO: Implement some kind of expiration for other resume point types
	// Maybe based on last usage?

	err := p.resumePointStore.CreateResumePoint(ctx, &model.ResumePoint{
		ID:                s.ID,
		Type:              model.ResumePointType(s.Type),
		AppID:             p.appID,
		CommandID:         p.links.CommandID,
		EventListenerID:   p.links.EventListenerID,
		MessageID:         p.links.MessageID,
		MessageInstanceID: p.links.MessageInstanceID,
		FlowSourceID:      p.links.FlowSourceID,
		FlowNodeID:        s.NodeID,
		FlowState:         s.State,
		CreatedAt:         time.Now().UTC(),
		ExpiresAt:         expiresAt,
	})

	return s, err
}

type ValueProvider struct {
	pluginInstanceID string
	pluginValueStore store.PluginValueStore
}

func NewValueProvider(pluginInstanceID string, pluginValueStore store.PluginValueStore) *ValueProvider {
	return &ValueProvider{
		pluginInstanceID: pluginInstanceID,
		pluginValueStore: pluginValueStore,
	}
}

func (p *ValueProvider) UpdateValue(ctx context.Context, key string, op provider.VariableOperation, value thing.Thing) (thing.Thing, error) {
	v := model.PluginValue{
		PluginInstanceID: p.pluginInstanceID,
		Key:              key,
		Value:            value,
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}

	newValue, err := p.pluginValueStore.UpdatePluginValue(ctx, op, v)
	if err != nil {
		return thing.Null, fmt.Errorf("failed to %s plugin value: %w", op, err)
	}

	return newValue.Value, nil
}

func (p *ValueProvider) GetValue(ctx context.Context, key string) (thing.Thing, error) {
	v, err := p.pluginValueStore.GetPluginValue(ctx, p.pluginInstanceID, key)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return thing.Null, nil
		}
		return thing.Null, fmt.Errorf("failed to get plugin value: %w", err)
	}

	return v.Value, nil
}

func (p *ValueProvider) DeleteValue(ctx context.Context, key string) error {
	err := p.pluginValueStore.DeletePluginValue(ctx, p.pluginInstanceID, key)
	if err != nil {
		return fmt.Errorf("failed to delete plugin value: %w", err)
	}

	return nil
}
