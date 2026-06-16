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

func (m *MessageData) toComponents(opts ConvertOptions) discord.TopLevelComponents {
	components := make(discord.TopLevelComponents, 0, len(m.Components))
	for i := range m.Components {
		if tlc := m.Components[i].toTopLevelComponent(opts); tlc != nil {
			components = append(components, tlc)
		}
	}
	return components
}

func (m *MessageData) ToSendMessageData(opts ConvertOptions) api.SendMessageData {
	if m == nil {
		return api.SendMessageData{}
	}

	// Components V2 disallows content and embeds.
	content := m.Content
	var embeds []discord.Embed
	if !m.IsComponentsV2() {
		embeds = make([]discord.Embed, len(m.Embeds))
		for i, embed := range m.Embeds {
			embeds[i] = embed.ToEmbed()
		}
	} else {
		content = ""
	}

	return api.SendMessageData{
		Content:         content,
		Flags:           discord.MessageFlags(m.Flags),
		Embeds:          embeds,
		Components:      m.toComponents(opts),
		AllowedMentions: m.AllowedMentions.ToAllowedMentions(),
	}
}

func (m *MessageData) ToEditMessageData(opts ConvertOptions) api.EditMessageData {
	if m == nil {
		return api.EditMessageData{}
	}

	components := m.toComponents(opts)

	content := option.NewNullableString(m.Content)
	var embeds *[]discord.Embed
	if !m.IsComponentsV2() {
		e := make([]discord.Embed, len(m.Embeds))
		for i, embed := range m.Embeds {
			e[i] = embed.ToEmbed()
		}
		embeds = &e
	} else {
		content = option.NewNullableString("")
	}

	var flags *discord.MessageFlags
	if m.Flags != 0 {
		f := discord.MessageFlags(m.Flags)
		flags = &f
	}

	return api.EditMessageData{
		Content:         content,
		Flags:           flags,
		Embeds:          embeds,
		Components:      &components,
		AllowedMentions: m.AllowedMentions.ToAllowedMentions(),
	}
}

func (m *MessageData) ToInteractionResponseData(opts ConvertOptions) api.InteractionResponseData {
	if m == nil {
		return api.InteractionResponseData{}
	}

	components := m.toComponents(opts)

	content := option.NewNullableString(m.Content)
	var embeds *[]discord.Embed
	if !m.IsComponentsV2() {
		e := make([]discord.Embed, len(m.Embeds))
		for i, embed := range m.Embeds {
			e[i] = embed.ToEmbed()
		}
		embeds = &e
	} else {
		content = option.NewNullableString("")
	}

	return api.InteractionResponseData{
		Content:         content,
		Flags:           discord.MessageFlags(m.Flags),
		Embeds:          embeds,
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

// toTopLevelComponent converts a top-level component, returning nil if the
// resulting component can't appear at the top level of a message.
func (c *ComponentData) toTopLevelComponent(opts ConvertOptions) discord.TopLevelComponent {
	comp := c.toComponent(opts)
	if comp == nil {
		return nil
	}
	if tlc, ok := comp.(discord.TopLevelComponent); ok {
		return tlc
	}
	return nil
}

// toComponent maps an internal component (any nesting level) to a native
// arikawa component, supporting both classic and Components V2 types.
func (c *ComponentData) toComponent(opts ConvertOptions) discord.Component {
	if c == nil {
		return nil
	}

	switch c.Type {
	case 0, ComponentTypeActionRow:
		// type 0 means a classic action row for backwards compatibility.
		row := make(discord.ActionRowComponent, 0, len(c.Components))
		for i := range c.Components {
			if ic, ok := c.Components[i].toComponent(opts).(discord.InteractiveComponent); ok {
				row = append(row, ic)
			}
		}
		return &row
	case ComponentTypeButton:
		return c.toButton(opts)
	case ComponentTypeTextDisplay:
		return &discord.TextDisplayComponent{Content: c.Content}
	case ComponentTypeSeparator:
		divider := true
		if c.Divider != nil {
			divider = *c.Divider
		}
		return &discord.SeparatorComponent{
			Divider: divider,
			Spacing: discord.SeparatorComponentSpacing(c.Spacing),
		}
	case ComponentTypeThumbnail:
		return &discord.ThumbnailComponent{
			Media:       c.Media.toUnfurled(opts),
			Description: c.Description,
			Spoiler:     c.Spoiler,
		}
	case ComponentTypeMediaGallery:
		items := make([]discord.MediaGalleryComponentItem, 0, len(c.Items))
		for i := range c.Items {
			items = append(items, discord.MediaGalleryComponentItem{
				Media:       c.Items[i].Media.toUnfurled(opts),
				Description: c.Items[i].Description,
				Spoiler:     c.Items[i].Spoiler,
			})
		}
		return &discord.MediaGalleryComponent{Items: items}
	case ComponentTypeFile:
		return &discord.FileComponent{
			File:    c.Media.toUnfurled(opts),
			Spoiler: c.Spoiler,
		}
	case ComponentTypeSection:
		section := &discord.SectionComponent{}
		for i := range c.Components {
			if child := c.Components[i].toComponent(opts); child != nil {
				section.Components = append(section.Components, child)
			}
		}
		if c.Accessory != nil {
			section.Accessory = c.Accessory.toComponent(opts)
		}
		return section
	case ComponentTypeContainer:
		container := &discord.ContainerComponent{Spoiler: c.Spoiler}
		if c.AccentColor != nil {
			container.AccentColor = discord.Color(*c.AccentColor)
		}
		for i := range c.Components {
			if child := c.Components[i].toComponent(opts); child != nil {
				container.Components = append(container.Components, child)
			}
		}
		return container
	}

	return nil
}

func (c *ComponentData) toButton(opts ConvertOptions) *discord.ButtonComponent {
	var style discord.ButtonComponentStyle
	switch c.Style {
	case 2:
		style = discord.SecondaryButtonStyle()
	case 3:
		style = discord.SuccessButtonStyle()
	case 4:
		style = discord.DangerButtonStyle()
	case 5:
		style = discord.LinkButtonStyle(discord.URL(c.URL))
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

// toUnfurled converts a media item to a native unfurled media item. External
// URLs are used directly; uploaded assets are referenced via attachment://.
func (m *UnfurledMediaItemData) toUnfurled(opts ConvertOptions) discord.UnfurledMediaitem {
	if m == nil {
		return discord.UnfurledMediaitem{}
	}

	url := m.URL
	if url == "" && m.AssetID != "" {
		if filename, ok := opts.MediaFilenames[m.AssetID]; ok {
			url = "attachment://" + filename
		}
	}

	return discord.UnfurledMediaitem{URL: url}
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
