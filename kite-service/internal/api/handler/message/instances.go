package message

import (
	"fmt"
	"strconv"
	"time"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/message"
)

func (h *MessageHandler) HandleMessageInstanceList(c *handler.Context) (*wire.MessageInstanceListResponse, error) {
	instances, err := h.messageInstanceStore.MessageInstancesByMessage(c.Context(), c.Message.ID, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get message instances: %w", err)
	}

	res := make([]*wire.MessageInstance, len(instances))
	for i, instance := range instances {
		res[i] = wire.MessageInstanceToWire(instance)
	}

	return &res, nil
}

func (h *MessageHandler) HandleMessageInstanceCreate(c *handler.Context, req wire.MessageInstanceCreateRequest) (*wire.MessageInstanceCreateResponse, error) {
	client, err := h.appStateManager.AppClient(c.Context(), c.App.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get app client: %w", err)
	}

	channelID, _ := strconv.ParseUint(req.DiscordChannelID, 10, 64)

	if err := validateSendableComponents(&c.Message.Data); err != nil {
		return nil, err
	}

	data := c.Message.Data.ToSendMessageData(message.ConvertOptions{})
	data.Files, err = h.attachmentsToFiles(c.Context(), c.Message.Data.Attachments)
	if err != nil {
		return nil, fmt.Errorf("failed to get attachments: %w", err)
	}

	msg, err := client.SendMessageComplex(discord.ChannelID(channelID), data)
	if err != nil {
		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	instance, err := h.messageInstanceStore.CreateMessageInstance(c.Context(), &model.MessageInstance{
		MessageID:        c.Message.ID,
		DiscordGuildID:   req.DiscordGuildID,
		DiscordChannelID: req.DiscordChannelID,
		DiscordMessageID: msg.ID.String(),
		FlowSources:      c.Message.FlowSources,
		MessageData:      messageSnapshot(c.Message.Data),
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create message instance: %w", err)
	}

	return wire.MessageInstanceToWire(instance), nil
}

func (h *MessageHandler) HandleMessageInstanceUpdate(c *handler.Context) (*wire.MessageInstanceUpdateResponse, error) {
	instanceID, _ := strconv.ParseUint(c.Param("instanceID"), 10, 64)

	instance, err := h.messageInstanceStore.MessageInstance(c.Context(), c.Message.ID, instanceID)
	if err != nil {
		if err == store.ErrNotFound {
			return nil, handler.ErrNotFound("message_instance_not_found", "message instance not found")
		}
		return nil, fmt.Errorf("failed to get message instance: %w", err)
	}

	client, err := h.appStateManager.AppClient(c.Context(), c.App.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get app client: %w", err)
	}

	channelID, _ := strconv.ParseUint(instance.DiscordChannelID, 10, 64)
	messageID, _ := strconv.ParseUint(instance.DiscordMessageID, 10, 64)

	if err := validateSendableComponents(&c.Message.Data); err != nil {
		return nil, err
	}

	{
		data := c.Message.Data.ToEditMessageData(message.ConvertOptions{})
		data.Attachments = &[]discord.Attachment{}
		data.Files, err = h.attachmentsToFiles(c.Context(), c.Message.Data.Attachments)
		if err != nil {
			return nil, fmt.Errorf("failed to get attachments: %w", err)
		}

		_, err = client.EditMessageComplex(discord.ChannelID(channelID), discord.MessageID(messageID), data)
		if err != nil {
			return nil, fmt.Errorf("failed to edit message: %w", err)
		}
	}

	instance, err = h.messageInstanceStore.UpdateMessageInstance(c.Context(), &model.MessageInstance{
		ID:          instance.ID,
		MessageID:   instance.MessageID,
		FlowSources: c.Message.FlowSources,
		MessageData: messageSnapshot(c.Message.Data),
		UpdatedAt:   time.Now().UTC(),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update message instance: %w", err)
	}

	return wire.MessageInstanceToWire(instance), nil
}

// validateSendableComponents checks that a message can be sent from the
// dashboard. Messages sent this way aren't evaluated like messages sent by
// flows, so select options generated from a list can't be used.
func validateSendableComponents(data *message.MessageData) error {
	if err := data.ValidateComponents(); err != nil {
		return handler.ErrBadRequest("invalid_components", err.Error())
	}

	generated := data.FindComponent(func(c *message.ComponentData) bool {
		return c.OptionsSource != nil
	})
	if generated != nil {
		return handler.ErrBadRequest(
			"unsupported_options_source",
			"select menus with options generated from a list can only be sent by a flow",
		)
	}
	return nil
}

// messageSnapshot copies the message data that is stored with an instance, so
// its components (e.g. select menu options) match what was sent to Discord.
func messageSnapshot(data message.MessageData) *message.MessageData {
	snapshot := data.Copy()
	return &snapshot
}

func (h *MessageHandler) HandleMessageInstanceDelete(c *handler.Context) (*wire.MessageInstanceDeleteResponse, error) {
	instanceID, _ := strconv.ParseUint(c.Param("instanceID"), 10, 64)

	err := h.messageInstanceStore.DeleteMessageInstance(c.Context(), c.Message.ID, instanceID)
	if err != nil {
		if err == store.ErrNotFound {
			return nil, handler.ErrNotFound("message_instance_not_found", "message instance not found")
		}
		return nil, fmt.Errorf("failed to get message instance: %w", err)
	}

	return &wire.MessageInstanceDeleteResponse{}, nil
}
