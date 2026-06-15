package message

import (
	"encoding/json"
	"mime/multipart"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/utils/sendpart"
)

// This file contains the serialization for Discord's Components V2. The arikawa
// library (both upstream and the fork used here) does not support Components V2
// and its component interfaces cannot be implemented from outside its package
// (they use unexported marker methods). We therefore serialize V2 messages into
// plain wire structs ourselves and send them through arikawa's low-level client
// (see the *Raw provider methods).
//
// These wire types are intentionally separate from the storage types in data.go
// so that the database representation (which uses fields like flow_source_id and
// asset_id) stays decoupled from what is actually sent to Discord (custom_id,
// attachment:// URLs, ...).

// V2Payload is the raw Discord message payload used when a message has the
// IS_COMPONENTS_V2 flag set. Note that content and embeds are intentionally
// absent: Discord rejects them when the V2 flag is present.
type V2Payload struct {
	Flags           int                  `json:"flags,omitempty"`
	Components      []V2Component        `json:"components,omitempty"`
	Attachments     []V2Attachment       `json:"attachments,omitempty"`
	AllowedMentions *api.AllowedMentions `json:"allowed_mentions,omitempty"`
}

// V2Attachment declares an uploaded file so it can be referenced from a media
// component via attachment://<filename>. ID matches the index of the file in
// the multipart upload (file0, file1, ...).
type V2Attachment struct {
	ID       int    `json:"id"`
	Filename string `json:"filename"`
}

// V2Message bundles a Components V2 payload with the files that need to be
// uploaded alongside it (for attachment:// media references).
type V2Message struct {
	Payload V2Payload
	Files   []sendpart.File
}

// Body returns the request body for sending the message directly (channel
// message create/edit, interaction followup, edit interaction response).
func (m *V2Message) Body() *V2RequestBody {
	return &V2RequestBody{Payload: &m.Payload, Files: m.Files}
}

// ResponseBody returns the request body for an interaction callback, wrapping
// the payload as {"type": callbackType, "data": {...}}. callbackType is an
// api.InteractionResponseType value (4 = message with source, 7 = update).
func (m *V2Message) ResponseBody(callbackType int) *V2RequestBody {
	return &V2RequestBody{
		Payload: V2InteractionResponse{Type: callbackType, Data: &m.Payload},
		Files:   m.Files,
	}
}

// V2RequestBody adapts a Components V2 payload (or interaction callback) to
// arikawa's sendpart so it can be sent as JSON or multipart/form-data depending
// on whether there are files to upload.
type V2RequestBody struct {
	Payload any
	Files   []sendpart.File
}

func (b *V2RequestBody) NeedsMultipart() bool {
	return len(b.Files) > 0
}

func (b *V2RequestBody) WriteMultipart(w *multipart.Writer) error {
	return sendpart.Write(w, b.Payload, b.Files)
}

func (b *V2RequestBody) MarshalJSON() ([]byte, error) {
	return json.Marshal(b.Payload)
}

// V2InteractionResponse wraps a V2Payload as an interaction callback body
// ({"type": ..., "data": {...}}). Type is an api.InteractionResponseType value
// (4 = message with source, 7 = update message).
type V2InteractionResponse struct {
	Type int        `json:"type"`
	Data *V2Payload `json:"data,omitempty"`
}

// V2Component is the wire representation of a single Components V2 component.
// Which fields are relevant depends on Type.
type V2Component struct {
	Type int `json:"type"`
	ID   int `json:"id,omitempty"`

	// Children of layout components: Action Row (1), Section (9), Container (17).
	Components []V2Component `json:"components,omitempty"`

	// Button (2)
	Style    int                     `json:"style,omitempty"`
	Label    string                  `json:"label,omitempty"`
	Emoji    *discord.ComponentEmoji `json:"emoji,omitempty"`
	CustomID string                  `json:"custom_id,omitempty"`
	URL      string                  `json:"url,omitempty"`
	Disabled bool                    `json:"disabled,omitempty"`

	// Text Display (10)
	Content string `json:"content,omitempty"`

	// Section (9) accessory: Button (2) or Thumbnail (11)
	Accessory *V2Component `json:"accessory,omitempty"`

	// Thumbnail (11) and File (13)
	Media       *V2UnfurledMedia `json:"media,omitempty"`
	File        *V2UnfurledMedia `json:"file,omitempty"`
	Description string           `json:"description,omitempty"`
	Spoiler     bool             `json:"spoiler,omitempty"`

	// Media Gallery (12)
	Items []V2MediaGalleryItem `json:"items,omitempty"`

	// Separator (14)
	Divider *bool `json:"divider,omitempty"`
	Spacing int   `json:"spacing,omitempty"`

	// Container (17)
	AccentColor *int `json:"accent_color,omitempty"`
}

// V2UnfurledMedia is a media reference (an external URL or attachment://<file>).
type V2UnfurledMedia struct {
	URL string `json:"url"`
}

// V2MediaGalleryItem is a single item of a Media Gallery (12).
type V2MediaGalleryItem struct {
	Media       *V2UnfurledMedia `json:"media,omitempty"`
	Description string           `json:"description,omitempty"`
	Spoiler     bool             `json:"spoiler,omitempty"`
}

// ToV2Payload converts the message into a raw Components V2 payload. It assumes
// the message uses Components V2 (see MessageData.IsComponentsV2).
func (m *MessageData) ToV2Payload(opts ConvertOptions) V2Payload {
	if m == nil {
		return V2Payload{}
	}

	components := make([]V2Component, 0, len(m.Components))
	for i := range m.Components {
		if c := m.Components[i].toV2Component(opts); c != nil {
			components = append(components, *c)
		}
	}

	return V2Payload{
		Flags:           m.Flags,
		Components:      components,
		AllowedMentions: m.AllowedMentions.ToAllowedMentions(),
	}
}

func (c *ComponentData) toV2Component(opts ConvertOptions) *V2Component {
	if c == nil {
		return nil
	}

	out := &V2Component{
		Type: c.Type,
		ID:   c.ID,
	}

	switch c.Type {
	case ComponentTypeActionRow:
		out.Components = c.childrenV2(opts)
	case ComponentTypeButton:
		c.applyButtonV2(out, opts)
	case ComponentTypeTextDisplay:
		out.Content = c.Content
	case ComponentTypeSection:
		out.Components = c.childrenV2(opts)
		if c.Accessory != nil {
			out.Accessory = c.Accessory.toV2Component(opts)
		}
	case ComponentTypeThumbnail:
		out.Media = c.Media.toV2Media(opts)
		out.Description = c.Description
		out.Spoiler = c.Spoiler
	case ComponentTypeMediaGallery:
		items := make([]V2MediaGalleryItem, 0, len(c.Items))
		for i := range c.Items {
			media := c.Items[i].Media.toV2Media(opts)
			if media == nil {
				continue
			}
			items = append(items, V2MediaGalleryItem{
				Media:       media,
				Description: c.Items[i].Description,
				Spoiler:     c.Items[i].Spoiler,
			})
		}
		out.Items = items
	case ComponentTypeFile:
		out.File = c.Media.toV2Media(opts)
		out.Spoiler = c.Spoiler
	case ComponentTypeSeparator:
		out.Divider = c.Divider
		out.Spacing = c.Spacing
	case ComponentTypeContainer:
		out.Components = c.childrenV2(opts)
		out.AccentColor = c.AccentColor
		out.Spoiler = c.Spoiler
	default:
		return nil
	}

	return out
}

func (c *ComponentData) childrenV2(opts ConvertOptions) []V2Component {
	components := make([]V2Component, 0, len(c.Components))
	for i := range c.Components {
		if child := c.Components[i].toV2Component(opts); child != nil {
			components = append(components, *child)
		}
	}
	return components
}

func (c *ComponentData) applyButtonV2(out *V2Component, opts ConvertOptions) {
	style := c.Style
	if style < 1 || style > 5 {
		style = 1
	}
	out.Style = style
	out.Label = c.Label
	out.Emoji = c.Emoji.ToEmoji()
	out.Disabled = c.Disabled

	if c.Style == 5 {
		// Link buttons carry a URL and no custom ID.
		out.URL = c.URL
		return
	}

	if opts.ComponentIDFactory != nil {
		out.CustomID = string(opts.ComponentIDFactory(c))
	} else {
		out.CustomID = c.FlowSourceID
	}
}

func (m *UnfurledMediaItemData) toV2Media(opts ConvertOptions) *V2UnfurledMedia {
	if m == nil {
		return nil
	}

	// Prefer an uploaded asset (resolved to attachment://<filename> by the
	// caller) over an external URL.
	if m.AssetID != "" {
		if filename, ok := opts.MediaFilenames[m.AssetID]; ok {
			return &V2UnfurledMedia{URL: "attachment://" + filename}
		}
	}

	if m.URL == "" {
		return nil
	}

	return &V2UnfurledMedia{URL: m.URL}
}
