package transcript

import (
	"strings"
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/stretchr/testify/assert"
)

func TestSanitizeName(t *testing.T) {
	assert.Equal(t, "ticket-1234", SanitizeName("  ticket 1234  "))
	assert.Equal(t, "báo-cáo-Đặng", SanitizeName("báo cáo Đặng"))
	assert.Equal(t, "a-b", SanitizeName("a/../\\b"))
	assert.Equal(t, "", SanitizeName("***"))
	assert.Equal(t, "", SanitizeName(""))
	assert.Len(t, []rune(SanitizeName(strings.Repeat("x", 500))), maxNameLength)
}

func TestRenderUsesTheGivenName(t *testing.T) {
	html := Render(nil, Options{Name: "Ticket #42", ChannelID: 1, Now: now})
	assert.Equal(t, "Ticket-42.html", html.FileName)
	assert.Contains(t, string(html.Content), "<title>Ticket #42</title>")

	text := Render(nil, Options{Name: "Ticket #42", Format: FormatText, ChannelID: 1, Now: now})
	assert.Equal(t, "Ticket-42.txt", text.FileName)

	// a name that is only symbols falls back to the default one
	fallback := Render(nil, Options{Name: "***", ChannelID: 7, Now: now})
	assert.Equal(t, "transcript-7-20261101-120000.html", fallback.FileName)
}

func TestRenderNameIsEscapedInTheTitle(t *testing.T) {
	out := string(Render(nil, Options{Name: "<script>x</script>", ChannelID: 1, Now: now}).Content)
	assert.NotContains(t, out, "<script>")
	assert.Contains(t, out, "&lt;script&gt;")
}

func TestRenderImageAttachmentsArePreviewed(t *testing.T) {
	m := msg(1, "an", "")
	m.Attachments = []discord.Attachment{
		{Filename: "a.png", ContentType: "image/png", URL: "https://cdn.example/a.png"},
		{Filename: "b.JPG", URL: "https://cdn.example/b.JPG?ex=1"},
		{Filename: "doc.pdf", ContentType: "application/pdf", URL: "https://cdn.example/doc.pdf"},
		{Filename: "x.svg", ContentType: "image/svg+xml", URL: "https://cdn.example/x.svg"},
	}

	out := string(Render([]discord.Message{m}, Options{ChannelID: 1, Now: now}).Content)
	assert.Contains(t, out, `<img src="https://cdn.example/a.png"`)
	assert.Contains(t, out, `<img src="https://cdn.example/b.JPG?ex=1"`)
	assert.NotContains(t, out, `<img src="https://cdn.example/doc.pdf"`)
	assert.NotContains(t, out, `<img src="https://cdn.example/x.svg"`, "svg is linked, never inlined")
	assert.Contains(t, out, `>doc.pdf</a>`)
}

func TestRenderEmbedCard(t *testing.T) {
	m := msg(1, "bot", "")
	m.Embeds = []discord.Embed{{
		Type:        discord.NormalEmbed,
		Title:       "Tiêu đề",
		URL:         "https://example.com/post",
		Description: "Mô tả",
		Color:       0xff8800,
		Author:      &discord.EmbedAuthor{Name: "Tác giả", Icon: "https://cdn.example/author.png"},
		Fields: []discord.EmbedField{
			{Name: "F1", Value: "V1", Inline: true},
			{Name: "F2", Value: "V2"},
		},
		Image:     &discord.EmbedImage{URL: "https://cdn.example/big.png"},
		Thumbnail: &discord.EmbedThumbnail{URL: "https://cdn.example/small.png"},
		Footer:    &discord.EmbedFooter{Text: "Chân trang"},
	}}

	out := string(Render([]discord.Message{m}, Options{ChannelID: 1, Now: now}).Content)
	assert.Contains(t, out, `border-left-color:#ff8800`)
	assert.Contains(t, out, `<a href="https://example.com/post"`)
	assert.Contains(t, out, ">Tiêu đề</a>")
	assert.Contains(t, out, "Mô tả")
	assert.Contains(t, out, "<b>F1</b><span>V1</span>")
	assert.Contains(t, out, `<div class="w"><b>F2</b>`)
	assert.Contains(t, out, `https://cdn.example/big.png`)
	assert.Contains(t, out, `https://cdn.example/small.png`)
	assert.Contains(t, out, `https://cdn.example/author.png`)
	assert.Contains(t, out, "Chân trang")
}

func TestRenderImageLinkPreviewIsAPlainPicture(t *testing.T) {
	m := msg(1, "an", "https://example.com/cat.png")
	m.Embeds = []discord.Embed{{
		Type:      discord.ImageEmbed,
		URL:       "https://example.com/cat.png",
		Thumbnail: &discord.EmbedThumbnail{URL: "https://cdn.example/cat.png"},
	}}

	out := string(Render([]discord.Message{m}, Options{ChannelID: 1, Now: now}).Content)
	assert.Contains(t, out, `<img src="https://cdn.example/cat.png"`)
	assert.NotContains(t, out, `class="e"`, "no card around a bare picture")
}

func TestRenderRefusesUnsafeURLs(t *testing.T) {
	m := msg(1, "an", "")
	m.Attachments = []discord.Attachment{
		{Filename: "evil", ContentType: "image/png", URL: "javascript:alert(1)"},
		{Filename: "evil2", URL: "data:text/html;base64,AAAA"},
	}
	m.Embeds = []discord.Embed{{
		Title:  "t",
		URL:    "javascript:alert(2)",
		Image:  &discord.EmbedImage{URL: "javascript:alert(3)"},
		Author: &discord.EmbedAuthor{Name: "a", URL: "vbscript:x", Icon: "data:image/png;base64,AAAA"},
	}}

	out := string(Render([]discord.Message{m}, Options{ChannelID: 1, Now: now}).Content)
	assert.NotContains(t, out, "javascript:")
	assert.NotContains(t, out, "vbscript:")
	assert.NotContains(t, out, "data:text")
	assert.NotContains(t, out, "data:image")
	assert.Contains(t, out, "evil2", "the file name is still shown as text")
}

func TestRenderWatermark(t *testing.T) {
	with := string(Render(nil, Options{ChannelID: 1, Now: now}).Content)
	assert.Contains(t, with, `class="wm"`)
	assert.Contains(t, with, "Tạo bởi Vibe Bot")

	without := string(Render(nil, Options{ChannelID: 1, Now: now, HideWatermark: true}).Content)
	assert.NotContains(t, without, `class="wm"`)
	assert.NotContains(t, without, "Tạo bởi Vibe Bot")

	one := []discord.Message{msg(1, "an", "xin chào")}

	text := string(Render(one, Options{Format: FormatText, ChannelID: 1, Now: now}).Content)
	assert.True(t, strings.HasSuffix(text, "\n"+textWatermark+"\n"), "the text file ends with its own line")
	assert.Contains(t, text, "## -----  Tạo bởi VibeBot - tạo bot cho riêng bạn tại https://bot.vibehost.vn -------")

	textHidden := string(Render(one, Options{Format: FormatText, ChannelID: 1, Now: now, HideWatermark: true}).Content)
	assert.NotContains(t, textHidden, "VibeBot")
}
