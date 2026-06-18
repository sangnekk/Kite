package billing

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// discordNotifier sends alert messages to a Discord channel via an incoming
// webhook URL. It is intentionally best-effort: notifications must never block
// or break the payment flow, so all delivery happens in the background and
// failures are only logged.
type discordNotifier struct {
	webhookURL string
	httpClient *http.Client
}

func newDiscordNotifier(webhookURL string) *discordNotifier {
	return &discordNotifier{
		webhookURL: strings.TrimSpace(webhookURL),
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type discordEmbedField struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline"`
}

type discordEmbed struct {
	Title       string              `json:"title,omitempty"`
	Description string              `json:"description,omitempty"`
	Color       int                 `json:"color,omitempty"`
	Fields      []discordEmbedField `json:"fields,omitempty"`
	Timestamp   string              `json:"timestamp,omitempty"`
}

type discordWebhookPayload struct {
	Content string         `json:"content,omitempty"`
	Embeds  []discordEmbed `json:"embeds,omitempty"`
}

// NotifyAsync posts an embed to the configured Discord webhook in a background
// goroutine. It is a no-op when no webhook URL is configured.
func (n *discordNotifier) NotifyAsync(embed discordEmbed) {
	if n == nil || n.webhookURL == "" {
		return
	}

	if embed.Timestamp == "" {
		embed.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := n.send(ctx, embed); err != nil {
			slog.Error(
				"Failed to send discord webhook notification",
				slog.String("error", err.Error()),
			)
		}
	}()
}

func (n *discordNotifier) send(ctx context.Context, embed discordEmbed) error {
	payload := discordWebhookPayload{Embeds: []discordEmbed{embed}}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode discord payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.webhookURL, bytes.NewReader(encoded))
	if err != nil {
		return fmt.Errorf("failed to create discord request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := n.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call discord webhook: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("discord webhook returned %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}

	return nil
}

func truncateForDiscord(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) <= max {
		return value
	}
	if max <= 1 {
		return value[:max]
	}
	return value[:max-1] + "…"
}
