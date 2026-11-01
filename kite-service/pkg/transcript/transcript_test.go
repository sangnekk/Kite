package transcript

import (
	"strings"
	"testing"
	"time"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/stretchr/testify/assert"
)

func msg(id int, name, content string) discord.Message {
	return discord.Message{
		ID:        discord.MessageID(id),
		Author:    discord.User{ID: discord.UserID(id), Username: name},
		Content:   content,
		Timestamp: discord.Timestamp(time.Date(2026, 11, 1, 10, id, 0, 0, time.UTC)),
	}
}

var now = time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC)

func TestRenderTextKeepsOrderAndMetadata(t *testing.T) {
	res := Render([]discord.Message{msg(1, "an", "xin chào"), msg(2, "binh", "chào lại")}, Options{Format: FormatText, ChannelID: 42, Now: now})

	text := string(res.Content)
	assert.Equal(t, "transcript-42-20261101-120000.txt", res.FileName)
	assert.Equal(t, 2, res.Count)
	assert.Less(t, strings.Index(text, "xin chào"), strings.Index(text, "chào lại"))
	assert.Contains(t, text, "[2026-11-01 10:01:00] an: xin chào")
}

func TestRenderHTMLEscapesEverything(t *testing.T) {
	m := msg(1, "<script>alert(1)</script>", "<img src=x onerror=alert(2)>")
	m.Attachments = []discord.Attachment{{Filename: "\"><b>.png", URL: "https://cdn/x?a=\"b\""}}
	m.Embeds = []discord.Embed{{Title: "<i>t</i>", Description: "<u>d</u>"}}

	res := Render([]discord.Message{m}, Options{Format: FormatHTML, ChannelName: "<b>chan</b>", ChannelID: 1, Now: now})
	out := string(res.Content)

	assert.NotContains(t, out, "<script")
	assert.NotContains(t, out, "<img src=x")
	assert.NotContains(t, out, "<b>chan</b>")
	assert.NotContains(t, out, "<i>t</i>")
	assert.NotContains(t, out, "\"><b>")
	assert.Contains(t, out, "&lt;script&gt;")
	assert.True(t, strings.HasSuffix(res.FileName, ".html"))
}

func TestRenderEmptyAndUnknownFormat(t *testing.T) {
	res := Render(nil, Options{Format: "pdf", ChannelID: 7, Now: now})
	assert.Equal(t, 0, res.Count)
	assert.Contains(t, res.ContentType, "text/html")
	assert.Contains(t, string(res.Content), "0 tin nhắn")
}

func TestRenderUnicodeAndBotBadge(t *testing.T) {
	m := msg(1, "Đặng 🎉", "chúc mừng 🎉")
	m.Author.Bot = true
	out := string(Render([]discord.Message{m}, Options{ChannelID: 1, Now: now}).Content)
	assert.Contains(t, out, "Đặng 🎉")
	assert.Contains(t, out, ">BOT<")
}
