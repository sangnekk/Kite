package message

import (
	"time"
)

// Discord component types. Types 1-8 are the classic ("V1") components, types
// 9-17 are the new Components V2 layout/content components.
const (
	ComponentTypeActionRow         = 1
	ComponentTypeButton            = 2
	ComponentTypeStringSelect      = 3
	ComponentTypeTextInput         = 4
	ComponentTypeUserSelect        = 5
	ComponentTypeRoleSelect        = 6
	ComponentTypeMentionableSelect = 7
	ComponentTypeChannelSelect     = 8

	// Components V2
	ComponentTypeSection      = 9
	ComponentTypeTextDisplay  = 10
	ComponentTypeThumbnail    = 11
	ComponentTypeMediaGallery = 12
	ComponentTypeFile         = 13
	ComponentTypeSeparator    = 14
	ComponentTypeContainer    = 17
)

// MessageFlagsComponentsV2 (IS_COMPONENTS_V2) enables Components V2 for a
// message. When set, the content and embeds fields are not allowed and
// everything has to be expressed through components instead. Once a message has
// been sent with this flag it can no longer be removed.
const MessageFlagsComponentsV2 = 1 << 15 // 32768

type MessageData struct {
	Content         string               `json:"content,omitempty"`
	Flags           int                  `json:"flags,omitempty"`
	Attachments     []MessageAttachment  `json:"attachments,omitempty"`
	Embeds          []EmbedData          `json:"embeds,omitempty"`
	Components      []ComponentData      `json:"components,omitempty"`
	AllowedMentions *AllowedMentionsData `json:"allowed_mentions,omitempty"`
}

// IsComponentsV2 reports whether the message uses Components V2.
func (m *MessageData) IsComponentsV2() bool {
	return m != nil && m.Flags&MessageFlagsComponentsV2 != 0
}

func (m *MessageData) EachString(replace func(s *string) error) error {
	if err := replace(&m.Content); err != nil {
		return err
	}

	for e := range m.Embeds {
		embed := &m.Embeds[e]

		if err := replace(&embed.Description); err != nil {
			return err
		}

		if err := replace(&embed.Title); err != nil {
			return err
		}

		if err := replace(&embed.URL); err != nil {
			return err
		}

		if embed.Author != nil {
			if err := replace(&embed.Author.Name); err != nil {
				return err
			}

			if err := replace(&embed.Author.URL); err != nil {
				return err
			}

			if err := replace(&embed.Author.IconURL); err != nil {
				return err
			}

			if embed.Author.Name == "" {
				embed.Author = nil
			}
		}

		if embed.Footer != nil {
			if err := replace(&embed.Footer.Text); err != nil {
				return err
			}

			if err := replace(&embed.Footer.IconURL); err != nil {
				return err
			}

			if embed.Footer.Text == "" {
				embed.Footer = nil
			}
		}

		if embed.Image != nil {
			if err := replace(&embed.Image.URL); err != nil {
				return err
			}

			if embed.Image.URL == "" {
				embed.Image = nil
			}
		}

		if embed.Thumbnail != nil {
			if err := replace(&embed.Thumbnail.URL); err != nil {
				return err
			}

			if embed.Thumbnail.URL == "" {
				embed.Thumbnail = nil
			}
		}

		for f := range embed.Fields {
			field := &embed.Fields[f]

			if err := replace(&field.Name); err != nil {
				return err
			}

			if err := replace(&field.Value); err != nil {
				return err
			}
		}
	}

	for c := range m.Components {
		if err := m.Components[c].eachString(replace); err != nil {
			return err
		}
	}

	return nil
}

// eachString recursively applies replace to every templatable string of a
// component and its nested children (action rows, sections, containers and
// section accessories).
func (c *ComponentData) eachString(replace func(s *string) error) error {
	if err := replace(&c.Label); err != nil {
		return err
	}

	if err := replace(&c.Placeholder); err != nil {
		return err
	}

	if err := replace(&c.Content); err != nil {
		return err
	}

	for o := range c.Options {
		if err := replace(&c.Options[o].Label); err != nil {
			return err
		}

		if err := replace(&c.Options[o].Description); err != nil {
			return err
		}
	}

	for i := range c.Components {
		if err := c.Components[i].eachString(replace); err != nil {
			return err
		}
	}

	if c.Accessory != nil {
		if err := c.Accessory.eachString(replace); err != nil {
			return err
		}
	}

	return nil
}

// WalkComponents calls fn for every component in the message, recursing into
// nested layout components (action rows, sections, containers) and section
// accessories. It is the canonical way to discover e.g. all flow source IDs
// regardless of how deeply components are nested (Components V2).
func (m *MessageData) WalkComponents(fn func(c *ComponentData)) {
	for i := range m.Components {
		m.Components[i].walk(fn)
	}
}

func (c *ComponentData) walk(fn func(c *ComponentData)) {
	fn(c)

	for i := range c.Components {
		c.Components[i].walk(fn)
	}

	if c.Accessory != nil {
		c.Accessory.walk(fn)
	}
}

// MediaAssetIDs returns the unique asset IDs referenced by Components V2 media
// (thumbnails, files and media gallery items), in order of first appearance.
// These are the assets that have to be uploaded as multipart attachments.
func (m *MessageData) MediaAssetIDs() []string {
	seen := make(map[string]bool)
	var ids []string

	add := func(item *UnfurledMediaItemData) {
		if item == nil || item.AssetID == "" || seen[item.AssetID] {
			return
		}
		seen[item.AssetID] = true
		ids = append(ids, item.AssetID)
	}

	m.WalkComponents(func(c *ComponentData) {
		add(c.Media)
		for i := range c.Items {
			add(c.Items[i].Media)
		}
	})

	return ids
}

type MessageAttachment struct {
	AssetID string `json:"asset_id,omitempty"`
}

type EmbedData struct {
	ID int `json:"id,omitempty"`

	Title       string              `json:"title,omitempty"`
	Description string              `json:"description,omitempty"`
	URL         string              `json:"url,omitempty"`
	Timestamp   *time.Time          `json:"timestamp,omitempty"`
	Color       int                 `json:"color,omitempty"`
	Footer      *EmbedFooterData    `json:"footer,omitempty"`
	Image       *EmbedImageData     `json:"image,omitempty"`
	Thumbnail   *EmbedThumbnailData `json:"thumbnail,omitempty"`
	Author      *EmbedAuthorData    `json:"author,omitempty"`
	Fields      []EmbedFieldData    `json:"fields,omitempty"`
}

type EmbedFooterData struct {
	Text    string `json:"text,omitempty"`
	IconURL string `json:"icon_url,omitempty"`
}

type EmbedImageData struct {
	URL string `json:"url,omitempty"`
}

type EmbedThumbnailData struct {
	URL string `json:"url,omitempty"`
}

type EmbedAuthorData struct {
	Name    string `json:"name,omitempty"`
	URL     string `json:"url,omitempty"`
	IconURL string `json:"icon_url,omitempty"`
}

type EmbedFieldData struct {
	ID int `json:"id,omitempty"`

	Name   string `json:"name,omitempty"`
	Value  string `json:"value,omitempty"`
	Inline bool   `json:"inline,omitempty"`
}

// ComponentData is a single Discord message component. It is a recursive,
// "union-like" structure: depending on Type only a subset of the fields is
// relevant. It represents both the classic components (action rows, buttons,
// select menus) and the Components V2 layout/content components (containers,
// sections, text displays, thumbnails, media galleries, files, separators).
type ComponentData struct {
	ID int `json:"id,omitempty"`

	Type     int  `json:"type,omitempty"`
	Disabled bool `json:"disabled,omitempty"`

	// Button
	Style int                 `json:"style,omitempty"`
	Label string              `json:"label,omitempty"`
	Emoji *ComponentEmojiData `json:"emoji,omitempty"`
	URL   string              `json:"url,omitempty"`

	// Select Menu
	Placeholder string                      `json:"placeholder,omitempty"`
	MinValues   int                         `json:"min_values,omitempty"`
	MaxValues   int                         `json:"max_values,omitempty"`
	Options     []ComponentSelectOptionData `json:"options,omitempty"`

	// Text Display (10)
	Content string `json:"content,omitempty"`

	// Container (17)
	AccentColor *int `json:"accent_color,omitempty"`
	Spoiler     bool `json:"spoiler,omitempty"`

	// Separator (14)
	Divider *bool `json:"divider,omitempty"`
	Spacing int   `json:"spacing,omitempty"`

	// Thumbnail (11) and File (13)
	Media       *UnfurledMediaItemData `json:"media,omitempty"`
	Description string                 `json:"description,omitempty"`

	// Media Gallery (12)
	Items []MediaGalleryItemData `json:"items,omitempty"`

	// Children of layout components: Action Row (1), Section (9), Container (17).
	Components []ComponentData `json:"components,omitempty"`

	// Accessory of a Section (9): either a Button (2) or a Thumbnail (11).
	Accessory *ComponentData `json:"accessory,omitempty"`

	FlowSourceID string `json:"flow_source_id,omitempty"`
}

// UnfurledMediaItemData references media for Components V2 (thumbnails, files,
// media gallery items). It is either an external URL or an uploaded asset that
// is referenced through attachment://<filename> on the wire.
type UnfurledMediaItemData struct {
	URL     string `json:"url,omitempty"`
	AssetID string `json:"asset_id,omitempty"`
}

// MediaGalleryItemData is a single item of a Media Gallery (12) component.
type MediaGalleryItemData struct {
	Media       *UnfurledMediaItemData `json:"media,omitempty"`
	Description string                 `json:"description,omitempty"`
	Spoiler     bool                   `json:"spoiler,omitempty"`
}

type ComponentSelectOptionData struct {
	ID int `json:"id,omitempty"`

	Label       string              `json:"label,omitempty"`
	Description string              `json:"description,omitempty"`
	Emoji       *ComponentEmojiData `json:"emoji,omitempty"`
	Default     bool                `json:"default,omitempty"`

	FlowSourceID string `json:"flow_source_id,omitempty"`
}

type ComponentEmojiData struct {
	Name     string `json:"name,omitempty"`
	ID       string `json:"id,omitempty"`
	Animated bool   `json:"animated,omitempty"`
}

type AllowedMentionsData struct {
	Parse []string `json:"parse,omitempty"`
}
