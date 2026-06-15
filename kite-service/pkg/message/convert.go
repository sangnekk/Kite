package message

import (
	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/utils/json/option"
)

type ConvertOptions struct {
	ComponentIDFactory componentIDFactory

	// MediaFilenames maps an asset ID to the multipart filename it will be
	// uploaded under, so Components V2 media can reference it via
	// attachment://<filename>. It is only used for Components V2 messages.
	MediaFilenames map[string]string
}

func (m *MessageData) ToSendMessageData(opts ConvertOptions) api.SendMessageData {
	if m == nil {
		return api.SendMessageData{}
	}

	embeds := make([]discord.Embed, len(m.Embeds))
	for i, embed := range m.Embeds {
		embeds[i] = embed.ToEmbed()
	}

	components := make(discord.ContainerComponents, 0, len(m.Components))
	for i := range m.Components {
		cc := m.Components[i].toContainerComponent(opts)
		if cc != nil {
			components = append(components, cc)
		}
	}

	return api.SendMessageData{
		Content:         m.Content,
		Flags:           discord.MessageFlags(m.Flags),
		Embeds:          embeds,
		Components:      components,
		AllowedMentions: m.AllowedMentions.ToAllowedMentions(),
	}
}

func (m *MessageData) ToEditMessageData(opts ConvertOptions) api.EditMessageData {
	if m == nil {
		return api.EditMessageData{}
	}

	embeds := make([]discord.Embed, len(m.Embeds))
	for i, embed := range m.Embeds {
		embeds[i] = embed.ToEmbed()
	}

	components := make(discord.ContainerComponents, 0, len(m.Components))
	for i := range m.Components {
		cc := m.Components[i].toContainerComponent(opts)
		if cc != nil {
			components = append(components, cc)
		}
	}

	var flags *discord.MessageFlags
	if m.Flags != 0 {
		f := discord.MessageFlags(m.Flags)
		flags = &f
	}

	return api.EditMessageData{
		Content:         option.NewNullableString(m.Content),
		Flags:           flags,
		Embeds:          &embeds,
		Components:      &components,
		AllowedMentions: m.AllowedMentions.ToAllowedMentions(),
	}
}

func (m *MessageData) ToInteractionResponseData(opts ConvertOptions) api.InteractionResponseData {
	if m == nil {
		return api.InteractionResponseData{}
	}

	embeds := make([]discord.Embed, len(m.Embeds))
	for i, embed := range m.Embeds {
		embeds[i] = embed.ToEmbed()
	}

	components := make(discord.ContainerComponents, 0, len(m.Components))
	for i := range m.Components {
		cc := m.Components[i].toContainerComponent(opts)
		if cc != nil {
			components = append(components, cc)
		}
	}

	return api.InteractionResponseData{
		Content:         option.NewNullableString(m.Content),
		Flags:           discord.MessageFlags(m.Flags),
		Embeds:          &embeds,
		Components:      &components,
		AllowedMentions: m.AllowedMentions.ToAllowedMentions(),
	}
}

func (m *EmbedData) ToEmbed() discord.Embed {
	if m == nil {
		return discord.Embed{}
	}

	fields := make([]discord.EmbedField, len(m.Fields))
	for i, field := range m.Fields {
		fields[i] = field.ToEmbedField()
	}

	var timestamp discord.Timestamp
	if m.Timestamp != nil {
		timestamp = discord.NewTimestamp(*m.Timestamp)
	}

	return discord.Embed{
		Title:       m.Title,
		Description: m.Description,
		URL:         m.URL,
		Timestamp:   timestamp,
		Color:       discord.Color(m.Color),
		Footer:      m.Footer.ToEmbedFooter(),
		Image:       m.Image.ToEmbedImage(),
		Thumbnail:   m.Thumbnail.ToEmbedThumbnail(),
		Author:      m.Author.ToEmbedAuthor(),
		Fields:      fields,
	}
}

func (f *EmbedFieldData) ToEmbedField() discord.EmbedField {
	if f == nil {
		return discord.EmbedField{}
	}

	if f == nil {
		return discord.EmbedField{}
	}

	return discord.EmbedField{
		Name:   f.Name,
		Value:  f.Value,
		Inline: f.Inline,
	}
}

func (f *EmbedFooterData) ToEmbedFooter() *discord.EmbedFooter {
	if f == nil {
		return nil
	}

	return &discord.EmbedFooter{
		Text: f.Text,
		Icon: f.IconURL,
	}
}

func (i *EmbedImageData) ToEmbedImage() *discord.EmbedImage {
	if i == nil {
		return nil
	}

	return &discord.EmbedImage{
		URL: i.URL,
	}
}

func (t *EmbedThumbnailData) ToEmbedThumbnail() *discord.EmbedThumbnail {
	if t == nil {
		return nil
	}

	return &discord.EmbedThumbnail{
		URL: t.URL,
	}
}

func (a *EmbedAuthorData) ToEmbedAuthor() *discord.EmbedAuthor {
	if a == nil {
		return nil
	}

	return &discord.EmbedAuthor{
		Name: a.Name,
		URL:  a.URL,
		Icon: a.IconURL,
	}
}

// toContainerComponent converts a top-level component to an arikawa container
// component for the classic ("V1") send path. Only action rows are supported
// here; Components V2 layout components are serialized through a separate raw
// path (see convert_v2.go) and never reach this function.
func (c *ComponentData) toContainerComponent(opts ConvertOptions) discord.ContainerComponent {
	if c == nil {
		return nil
	}

	// A missing type (0) means a classic action row for backwards
	// compatibility with messages stored before the type field existed.
	if c.Type != 0 && c.Type != ComponentTypeActionRow {
		return nil
	}

	components := make(discord.ActionRowComponent, 0, len(c.Components))
	for i := range c.Components {
		ic := c.Components[i].ToComponent(opts)
		if ic != nil {
			components = append(components, ic)
		}
	}

	return &components
}

func (c *ComponentData) ToComponent(opts ConvertOptions) discord.InteractiveComponent {
	if c == nil {
		return nil
	}

	switch c.Type {
	case int(discord.ButtonComponentType):
		var style discord.ButtonComponentStyle
		switch c.Style {
		case 2:
			style = discord.SecondaryButtonStyle()
		case 3:
			style = discord.SuccessButtonStyle()
		case 4:
			style = discord.DangerButtonStyle()
		case 5:
			style = discord.LinkButtonStyle(c.URL)
		default:
			style = discord.PrimaryButtonStyle()
		}

		var customID discord.ComponentID
		if c.Style != 5 {
			if opts.ComponentIDFactory != nil {
				customID = opts.ComponentIDFactory(c)
			} else {
				customID = discord.ComponentID(c.FlowSourceID)
			}
		}

		return &discord.ButtonComponent{
			Style:    style,
			Label:    c.Label,
			Emoji:    c.Emoji.ToEmoji(),
			Disabled: c.Disabled,
			CustomID: customID,
		}
	}

	return nil
}

func (e *ComponentEmojiData) ToEmoji() *discord.ComponentEmoji {
	if e == nil {
		return nil
	}

	id, _ := discord.ParseSnowflake(e.ID)

	return &discord.ComponentEmoji{
		Name:     e.Name,
		ID:       discord.EmojiID(id),
		Animated: e.Animated,
	}
}

func (a *AllowedMentionsData) ToAllowedMentions() *api.AllowedMentions {
	if a == nil {
		return &api.AllowedMentions{
			Parse: []api.AllowedMentionType{
				api.AllowUserMention,
			},
		}
	}

	parse := make([]api.AllowedMentionType, len(a.Parse))
	for i, p := range a.Parse {
		parse[i] = api.AllowedMentionType(p)
	}

	return &api.AllowedMentions{
		Parse: parse,
	}
}

type componentIDFactory func(component *ComponentData) discord.ComponentID
