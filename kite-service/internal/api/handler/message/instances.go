package message

import (
	"bytes"
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/utils/sendpart"
	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/pkg/message"
)

// prepareV2Message resolves asset-backed media into multipart uploads and
// builds the Components V2 payload (with attachment:// references).
func (h *MessageHandler) prepareV2Message(ctx context.Context, data *message.MessageData) (message.V2Payload, []sendpart.File, error) {
	assetIDs := data.MediaAssetIDs()

	opts := message.ConvertOptions{}
	var files []sendpart.File
	var attachments []message.V2Attachment
	if len(assetIDs) > 0 {
		filenames := make(map[string]string, len(assetIDs))
		for i, assetID := range assetIDs {
			asset, err := h.assetStore.AssetWithContent(ctx, assetID)
			if err != nil {
				return message.V2Payload{}, nil, fmt.Errorf("failed to get asset: %w", err)
			}

			filename := fmt.Sprintf("%d-%s", i, asset.Name)
			filenames[assetID] = filename
			attachments = append(attachments, message.V2Attachment{ID: i, Filename: filename})
			files = append(files, sendpart.File{Name: filename, Reader: bytes.NewReader(asset.Content)})
		}
		opts.MediaFilenames = filenames
	}

	payload := data.ToV2Payload(opts)
	payload.Attachments = attachments
	return payload, files, nil
}

// sendV2Message sends a raw Components V2 payload (JSON or multipart) using the
// app's client and unmarshals the resulting message.
func sendV2Message(client *api.Client, method, url string, payload message.V2Payload, files []sendpart.File) (*discord.Message, error) {
	body := &message.V2RequestBody{Payload: &payload, Files: files}
	var msg discord.Message
	if err := sendpart.Do(client.Client, method, body, &msg, url); err != nil {
		return nil, err
	}
	return &msg, nil
}

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

	var msg *discord.Message
	if c.Message.Data.IsComponentsV2() {
		payload, files, err := h.prepareV2Message(c.Context(), &c.Message.Data)
		if err != nil {
			return nil, err
		}

		url := api.EndpointChannels + discord.ChannelID(channelID).String() + "/messages"
		msg, err = sendV2Message(client, "POST", url, payload, files)
		if err != nil {
			return nil, fmt.Errorf("failed to send message: %w", err)
		}
	} else {
		data := c.Message.Data.ToSendMessageData(message.ConvertOptions{})
		data.Files, err = h.attachmentsToFiles(c.Context(), c.Message.Data.Attachments)
		if err != nil {
			return nil, fmt.Errorf("failed to get attachments: %w", err)
		}

		msg, err = client.SendMessageComplex(discord.ChannelID(channelID), data)
		if err != nil {
			return nil, fmt.Errorf("failed to send message: %w", err)
		}
	}

	instance, err := h.messageInstanceStore.CreateMessageInstance(c.Context(), &model.MessageInstance{
		MessageID:        c.Message.ID,
		DiscordGuildID:   req.DiscordGuildID,
		DiscordChannelID: req.DiscordChannelID,
		DiscordMessageID: msg.ID.String(),
		FlowSources:      c.Message.FlowSources,
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

	if c.Message.Data.IsComponentsV2() {
		payload, files, err := h.prepareV2Message(c.Context(), &c.Message.Data)
		if err != nil {
			return nil, err
		}

		url := api.EndpointChannels + discord.ChannelID(channelID).String() +
			"/messages/" + discord.MessageID(messageID).String()
		if _, err := sendV2Message(client, "PATCH", url, payload, files); err != nil {
			return nil, fmt.Errorf("failed to edit message: %w", err)
		}
	} else {
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
		UpdatedAt:   time.Now().UTC(),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update message instance: %w", err)
	}

	return wire.MessageInstanceToWire(instance), nil
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
