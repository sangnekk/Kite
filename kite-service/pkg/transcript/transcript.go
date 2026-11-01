// Package transcript renders the messages of a Discord channel into a file
// that can be saved or sent: a self contained HTML page or plain text.
package transcript

import (
	"fmt"
	"html"
	"net/url"
	"path"
	"strings"
	"time"
	"unicode"

	"github.com/diamondburned/arikawa/v3/discord"
)

const (
	FormatHTML = "html"
	FormatText = "text"
	// FormatBoth is only understood by callers, which render both files.
	FormatBoth = "both"

	maxNameLength = 80
	watermarkURL  = "https://bot.vibehost.vn"
)

// Options controls how a transcript is rendered.
type Options struct {
	Format string
	// Name is the file name (without extension) and the title of the page. It
	// is cleaned up by SanitizeName, an empty name falls back to a default.
	Name string
	// ChannelName is shown in the header, it is optional.
	ChannelName string
	ChannelID   discord.ChannelID
	// HideWatermark leaves the "made by" badge out of the HTML page. It is meant
	// to be switched on for paid plans.
	HideWatermark bool
	// Now is the time shown as the creation time. Zero means time.Now().
	Now time.Time
}

// Result is a rendered transcript.
type Result struct {
	FileName    string
	ContentType string
	Content     []byte
	Count       int
}

// SanitizeName turns a user supplied name into a safe file name without an
// extension: letters and digits of any language are kept, everything else
// becomes a dash.
func SanitizeName(name string) string {
	var b strings.Builder
	lastDash := false
	for _, r := range strings.TrimSpace(name) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' {
			b.WriteRune(r)
			lastDash = false
		} else if !lastDash {
			b.WriteRune('-')
			lastDash = true
		}
	}

	res := strings.Trim(b.String(), "-")
	if runes := []rune(res); len(runes) > maxNameLength {
		res = strings.Trim(string(runes[:maxNameLength]), "-")
	}

	return res
}

func baseName(opts Options, now time.Time) string {
	if name := SanitizeName(opts.Name); name != "" {
		return name
	}
	return fmt.Sprintf("transcript-%s-%s", opts.ChannelID, now.Format("20060102-150405"))
}

// Render renders the messages, which must be sorted from oldest to newest.
// Unknown formats (including "both") fall back to HTML.
func Render(messages []discord.Message, opts Options) Result {
	now := opts.Now
	if now.IsZero() {
		now = time.Now()
	}
	now = now.UTC()

	base := baseName(opts, now)

	if opts.Format == FormatText {
		return Result{
			FileName:    base + ".txt",
			ContentType: "text/plain; charset=utf-8",
			Content:     []byte(renderText(messages, opts, now)),
			Count:       len(messages),
		}
	}

	return Result{
		FileName:    base + ".html",
		ContentType: "text/html; charset=utf-8",
		Content:     []byte(renderHTML(messages, opts, now)),
		Count:       len(messages),
	}
}

func formatTime(t discord.Timestamp) string {
	return time.Time(t).UTC().Format("2006-01-02 15:04:05")
}

func title(opts Options) string {
	if opts.ChannelName != "" {
		return "#" + opts.ChannelName
	}
	return "#" + opts.ChannelID.String()
}

// heading is the title of the page: the name given by the user, or the channel.
func heading(opts Options) string {
	if name := strings.TrimSpace(opts.Name); name != "" {
		return name
	}
	return "Transcript " + title(opts)
}

// safeURL returns the URL only when it is a plain http(s) link, so a
// javascript: or data: URL from a message can never end up in the page.
func safeURL(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return ""
	}
	return u.String()
}

var imageExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".webp": true, ".avif": true, ".bmp": true,
}

func isImage(a discord.Attachment) bool {
	if strings.HasPrefix(strings.ToLower(a.ContentType), "image/") {
		return !strings.Contains(strings.ToLower(a.ContentType), "svg")
	}
	if a.ContentType == "" {
		name := a.Filename
		if i := strings.IndexAny(name, "?#"); i >= 0 {
			name = name[:i]
		}
		return imageExtensions[strings.ToLower(path.Ext(name))]
	}
	return false
}

// extras returns the readable lines for the attachments and embeds of a
// message in the text format.
func extras(m discord.Message) []string {
	var res []string
	for _, a := range m.Attachments {
		res = append(res, fmt.Sprintf("[Tệp đính kèm] %s: %s", a.Filename, a.URL))
	}
	for _, e := range m.Embeds {
		parts := make([]string, 0, 6)
		if e.Author != nil && e.Author.Name != "" {
			parts = append(parts, e.Author.Name)
		}
		if e.Title != "" {
			parts = append(parts, e.Title)
		}
		if e.Description != "" {
			parts = append(parts, e.Description)
		}
		for _, f := range e.Fields {
			parts = append(parts, f.Name+": "+f.Value)
		}
		if e.URL != "" {
			parts = append(parts, string(e.URL))
		}
		if e.Image != nil && e.Image.URL != "" {
			parts = append(parts, string(e.Image.URL))
		}
		if e.Footer != nil && e.Footer.Text != "" {
			parts = append(parts, e.Footer.Text)
		}
		if len(parts) > 0 {
			res = append(res, "[Embed] "+strings.Join(parts, " - "))
		}
	}
	return res
}

func renderText(messages []discord.Message, opts Options, now time.Time) string {
	var b strings.Builder
	fmt.Fprintf(&b, "%s (%d tin nhắn), tạo lúc %s UTC\n\n", heading(opts), len(messages), now.Format("2006-01-02 15:04:05"))

	for _, m := range messages {
		fmt.Fprintf(&b, "[%s] %s: %s\n", formatTime(m.Timestamp), m.Author.DisplayOrUsername(), m.Content)
		for _, line := range extras(m) {
			fmt.Fprintf(&b, "    %s\n", line)
		}
	}

	return b.String()
}

const htmlStyle = "body{font-family:system-ui,sans-serif;background:#313338;color:#dbdee1;margin:0;padding:16px 16px 56px}" +
	"h1{font-size:18px}.m{display:flex;gap:12px;padding:6px 0}.m>img{width:40px;height:40px;border-radius:50%;flex:none}" +
	".b{min-width:0}.n{font-weight:600;color:#fff}.t{font-size:12px;color:#949ba4;margin-left:6px}" +
	".c{white-space:pre-wrap;word-break:break-word}a{color:#00a8fc}" +
	".bot{background:#5865f2;color:#fff;font-size:10px;border-radius:3px;padding:1px 4px;margin-left:6px}" +
	".f{font-size:13px;margin-top:4px}.pic{display:block;margin-top:6px}" +
	".pic img{display:block;max-width:min(100%,400px);max-height:300px;border-radius:6px}" +
	".e{display:grid;gap:6px;max-width:520px;margin-top:6px;padding:8px 12px 12px;background:#2b2d31;border-left:4px solid #4e5058;border-radius:4px}" +
	".e .a{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#fff}.e .a img{width:20px;height:20px;border-radius:50%}" +
	".e .h{font-weight:600;color:#fff}.e .d{white-space:pre-wrap;word-break:break-word;font-size:14px}" +
	".e .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}.e .g>div{min-width:0}" +
	".e .g .w{grid-column:1/-1}.e .g b{display:block;font-size:13px;color:#fff}.e .g span{white-space:pre-wrap;word-break:break-word;font-size:14px}" +
	".th-wrap{justify-self:end}.th-wrap img{display:block;width:80px;max-height:80px;border-radius:4px;object-fit:cover}" +
	".e .ft{display:flex;align-items:center;gap:6px;font-size:12px;color:#b5bac1}.e .ft img{width:18px;height:18px;border-radius:50%}" +
	".wm{position:fixed;left:12px;bottom:12px;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.6);font-size:12px;color:#dbdee1;text-decoration:none}" +
	".wm:hover{background:rgba(0,0,0,.8)}"

type htmlWriter struct {
	b strings.Builder
}

func (w *htmlWriter) raw(format string, args ...any) { fmt.Fprintf(&w.b, format, args...) }

// img writes an image for a Discord CDN style URL, nothing when the URL is not
// a plain http(s) link.
func (w *htmlWriter) img(class, raw, linkTo string) {
	src := safeURL(raw)
	if src == "" {
		return
	}
	e := html.EscapeString
	tag := fmt.Sprintf("<img src=\"%s\" alt=\"\" loading=\"lazy\" referrerpolicy=\"no-referrer\">", e(src))
	if href := safeURL(linkTo); href != "" {
		w.raw("<a class=\"%s\" href=\"%s\" target=\"_blank\" rel=\"noopener noreferrer\">%s</a>", class, e(href), tag)
		return
	}
	w.raw("<div class=\"%s\">%s</div>", class, tag)
}

func (w *htmlWriter) link(label, raw string) {
	e := html.EscapeString
	if href := safeURL(raw); href != "" {
		w.raw("<a href=\"%s\" target=\"_blank\" rel=\"noopener noreferrer\">%s</a>", e(href), e(label))
		return
	}
	w.raw("%s", e(label))
}

func (w *htmlWriter) embed(em discord.Embed) {
	e := html.EscapeString

	color := "#4e5058"
	if em.Color > 0 {
		color = fmt.Sprintf("#%06x", em.Color.Uint32()&0xffffff)
	}

	// Link previews that Discord makes itself come as embeds of the "image"
	// type with the picture in the thumbnail.
	image := em.Image
	thumb := em.Thumbnail
	if image == nil && em.Type == discord.ImageEmbed && thumb != nil {
		image = &discord.EmbedImage{URL: thumb.URL}
		thumb = nil
	}

	hasText := em.Title != "" || em.Description != "" || len(em.Fields) > 0 ||
		(em.Author != nil && em.Author.Name != "") || (em.Footer != nil && em.Footer.Text != "")

	// A bare picture embed has no card around it.
	if !hasText && image != nil {
		w.img("pic", string(image.URL), string(em.URL))
		return
	}

	w.raw("<div class=\"e\" style=\"border-left-color:%s\">", color)

	if thumb != nil {
		w.img("th-wrap", string(thumb.URL), "")
	}
	if em.Author != nil && em.Author.Name != "" {
		w.raw("<div class=\"a\">")
		if src := safeURL(string(em.Author.Icon)); src != "" {
			w.raw("<img src=\"%s\" alt=\"\" loading=\"lazy\" referrerpolicy=\"no-referrer\">", e(src))
		}
		w.link(em.Author.Name, string(em.Author.URL))
		w.raw("</div>")
	}
	if em.Title != "" {
		w.raw("<div class=\"h\">")
		w.link(em.Title, string(em.URL))
		w.raw("</div>")
	}
	if em.Description != "" {
		w.raw("<div class=\"d\">%s</div>", e(em.Description))
	}
	if len(em.Fields) > 0 {
		w.raw("<div class=\"g\">")
		for _, f := range em.Fields {
			class := ""
			if !f.Inline {
				class = " class=\"w\""
			}
			w.raw("<div%s><b>%s</b><span>%s</span></div>", class, e(f.Name), e(f.Value))
		}
		w.raw("</div>")
	}
	if image != nil {
		w.img("pic", string(image.URL), string(image.URL))
	}
	if em.Footer != nil && em.Footer.Text != "" {
		w.raw("<div class=\"ft\">")
		if src := safeURL(string(em.Footer.Icon)); src != "" {
			w.raw("<img src=\"%s\" alt=\"\" loading=\"lazy\" referrerpolicy=\"no-referrer\">", e(src))
		}
		w.raw("%s", e(em.Footer.Text))
		w.raw("</div>")
	}

	w.raw("</div>")
}

// Every value that comes from Discord goes through html.EscapeString and every
// URL through safeURL, and the page has no script and no inline event
// handlers, so it is safe to open.
func renderHTML(messages []discord.Message, opts Options, now time.Time) string {
	e := html.EscapeString
	w := &htmlWriter{}

	w.raw("<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\">")
	w.raw("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">")
	w.raw("<title>%s</title><style>%s</style></head><body>", e(heading(opts)), htmlStyle)
	w.raw("<h1>%s</h1><p>%s, %d tin nhắn, tạo lúc %s UTC</p>", e(heading(opts)), e(title(opts)), len(messages), e(now.Format("2006-01-02 15:04:05")))

	for _, m := range messages {
		w.raw("<div class=\"m\">")
		if src := safeURL(m.Author.AvatarURL()); src != "" {
			w.raw("<img src=\"%s\" alt=\"\" loading=\"lazy\" referrerpolicy=\"no-referrer\">", e(src))
		}
		w.raw("<div class=\"b\"><span class=\"n\">%s</span>", e(m.Author.DisplayOrUsername()))
		if m.Author.Bot {
			w.raw("<span class=\"bot\">BOT</span>")
		}
		w.raw("<span class=\"t\">%s</span>", e(formatTime(m.Timestamp)))
		if m.Content != "" {
			w.raw("<div class=\"c\">%s</div>", e(m.Content))
		}
		for _, a := range m.Attachments {
			if isImage(a) {
				w.img("pic", string(a.URL), string(a.URL))
				continue
			}
			w.raw("<div class=\"f\">Tệp đính kèm: ")
			w.link(a.Filename, string(a.URL))
			w.raw("</div>")
		}
		for _, em := range m.Embeds {
			w.embed(em)
		}
		w.raw("</div></div>")
	}

	if !opts.HideWatermark {
		w.raw("<a class=\"wm\" href=\"%s\" target=\"_blank\" rel=\"noopener noreferrer\">Tạo bởi Vibe Bot</a>", watermarkURL)
	}

	w.raw("</body></html>")
	return w.b.String()
}
