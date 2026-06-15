package message

import (
	"encoding/json"
	"strconv"
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
)

func intPtr(v int) *int    { return &v }
func boolPtr(v bool) *bool { return &v }

// buildV2Message returns a message that exercises every Components V2 type.
func buildV2Message() *MessageData {
	return &MessageData{
		Flags: MessageFlagsComponentsV2,
		Components: []ComponentData{
			{
				Type:        ComponentTypeContainer,
				AccentColor: intPtr(0x5865F2),
				Components: []ComponentData{
					{Type: ComponentTypeTextDisplay, Content: "# Hello"},
					{Type: ComponentTypeSeparator, Divider: boolPtr(true), Spacing: 2},
					{
						Type: ComponentTypeSection,
						Components: []ComponentData{
							{Type: ComponentTypeTextDisplay, Content: "Some text"},
						},
						Accessory: &ComponentData{
							Type:         ComponentTypeButton,
							Style:        1,
							Label:        "Click",
							ID:           42,
							FlowSourceID: "flow-src",
						},
					},
					{
						Type: ComponentTypeMediaGallery,
						Items: []MediaGalleryItemData{
							{Media: &UnfurledMediaItemData{URL: "https://example.com/a.png"}, Description: "alt"},
						},
					},
					{
						Type:  ComponentTypeFile,
						Media: &UnfurledMediaItemData{URL: "attachment://doc.pdf"},
					},
				},
			},
		},
	}
}

func TestToV2Payload_Shape(t *testing.T) {
	msg := buildV2Message()

	payload := msg.ToV2Payload(ConvertOptions{
		ComponentIDFactory: func(c *ComponentData) discord.ComponentID {
			return discord.ComponentID("resume:" + strconv.Itoa(c.ID))
		},
	})

	if payload.Flags != MessageFlagsComponentsV2 {
		t.Fatalf("expected flags %d, got %d", MessageFlagsComponentsV2, payload.Flags)
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	// Content and embeds must never be present for V2 payloads.
	var generic map[string]json.RawMessage
	if err := json.Unmarshal(raw, &generic); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if _, ok := generic["content"]; ok {
		t.Errorf("V2 payload must not contain content: %s", raw)
	}
	if _, ok := generic["embeds"]; ok {
		t.Errorf("V2 payload must not contain embeds: %s", raw)
	}

	if len(payload.Components) != 1 {
		t.Fatalf("expected 1 top-level component, got %d", len(payload.Components))
	}

	container := payload.Components[0]
	if container.Type != ComponentTypeContainer {
		t.Fatalf("expected container type %d, got %d", ComponentTypeContainer, container.Type)
	}
	if container.AccentColor == nil || *container.AccentColor != 0x5865F2 {
		t.Errorf("container accent color not preserved: %+v", container.AccentColor)
	}
	if len(container.Components) != 5 {
		t.Fatalf("expected 5 container children, got %d", len(container.Components))
	}

	// Section accessory button must get its custom_id from the factory.
	section := container.Components[2]
	if section.Type != ComponentTypeSection {
		t.Fatalf("expected section type %d, got %d", ComponentTypeSection, section.Type)
	}
	if section.Accessory == nil {
		t.Fatal("section accessory missing")
	}
	if got := section.Accessory.CustomID; got != "resume:42" {
		t.Errorf("expected accessory custom_id resume:42, got %q", got)
	}

	// File uses the "file" key, not "media".
	file := container.Components[4]
	if file.Type != ComponentTypeFile {
		t.Fatalf("expected file type %d, got %d", ComponentTypeFile, file.Type)
	}
	if file.File == nil || file.File.URL != "attachment://doc.pdf" {
		t.Errorf("file media not serialized correctly: %+v", file.File)
	}
	if file.Media != nil {
		t.Errorf("file must not use media key: %+v", file.Media)
	}
}

func TestToV2Payload_LinkButtonNoCustomID(t *testing.T) {
	msg := &MessageData{
		Flags: MessageFlagsComponentsV2,
		Components: []ComponentData{
			{
				Type: ComponentTypeActionRow,
				Components: []ComponentData{
					{Type: ComponentTypeButton, Style: 5, Label: "Open", URL: "https://example.com"},
				},
			},
		},
	}

	payload := msg.ToV2Payload(ConvertOptions{
		ComponentIDFactory: func(c *ComponentData) discord.ComponentID {
			return discord.ComponentID("should-not-be-used")
		},
	})

	btn := payload.Components[0].Components[0]
	if btn.URL != "https://example.com" {
		t.Errorf("link button url missing: %+v", btn)
	}
	if btn.CustomID != "" {
		t.Errorf("link button must not have custom_id, got %q", btn.CustomID)
	}
}

func TestMediaAssetIDs_AndResolution(t *testing.T) {
	msg := &MessageData{
		Flags: MessageFlagsComponentsV2,
		Components: []ComponentData{
			{
				Type: ComponentTypeContainer,
				Components: []ComponentData{
					{Type: ComponentTypeFile, Media: &UnfurledMediaItemData{AssetID: "asset-a"}},
					{
						Type: ComponentTypeMediaGallery,
						Items: []MediaGalleryItemData{
							{Media: &UnfurledMediaItemData{AssetID: "asset-b"}},
							{Media: &UnfurledMediaItemData{AssetID: "asset-a"}}, // duplicate
							{Media: &UnfurledMediaItemData{URL: "https://example.com/x.png"}},
						},
					},
				},
			},
		},
	}

	ids := msg.MediaAssetIDs()
	if len(ids) != 2 || ids[0] != "asset-a" || ids[1] != "asset-b" {
		t.Fatalf("expected unique ordered [asset-a asset-b], got %v", ids)
	}

	payload := msg.ToV2Payload(ConvertOptions{
		MediaFilenames: map[string]string{
			"asset-a": "0-a.pdf",
			"asset-b": "1-b.png",
		},
	})

	container := payload.Components[0]
	file := container.Components[0]
	if file.File == nil || file.File.URL != "attachment://0-a.pdf" {
		t.Errorf("file should reference uploaded asset: %+v", file.File)
	}

	gallery := container.Components[1]
	if len(gallery.Items) != 3 {
		t.Fatalf("expected 3 gallery items, got %d", len(gallery.Items))
	}
	if gallery.Items[0].Media.URL != "attachment://1-b.png" {
		t.Errorf("gallery item 0 wrong url: %q", gallery.Items[0].Media.URL)
	}
	if gallery.Items[1].Media.URL != "attachment://0-a.pdf" {
		t.Errorf("gallery item 1 (dup asset-a) wrong url: %q", gallery.Items[1].Media.URL)
	}
	if gallery.Items[2].Media.URL != "https://example.com/x.png" {
		t.Errorf("gallery item 2 (external url) wrong url: %q", gallery.Items[2].Media.URL)
	}
}

func TestV2RequestBody_MarshalAndMultipart(t *testing.T) {
	v2 := &V2Message{
		Payload: V2Payload{Flags: MessageFlagsComponentsV2, Components: []V2Component{{Type: ComponentTypeTextDisplay, Content: "hi"}}},
	}

	// No files -> JSON marshal emits the payload itself, not a wrapper.
	body := v2.Body()
	if body.NeedsMultipart() {
		t.Error("body without files must not need multipart")
	}
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var generic map[string]json.RawMessage
	if err := json.Unmarshal(raw, &generic); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if _, ok := generic["components"]; !ok {
		t.Errorf("expected components in marshaled body, got %s", raw)
	}
	if _, ok := generic["Payload"]; ok {
		t.Errorf("body must marshal payload inline, not as {Payload:...}: %s", raw)
	}

	// Interaction response wrapper.
	rb := v2.ResponseBody(4)
	raw2, _ := json.Marshal(rb)
	var wrap map[string]json.RawMessage
	if err := json.Unmarshal(raw2, &wrap); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if _, ok := wrap["type"]; !ok {
		t.Errorf("response body must have type: %s", raw2)
	}
	if _, ok := wrap["data"]; !ok {
		t.Errorf("response body must have data: %s", raw2)
	}
}

func TestIsComponentsV2(t *testing.T) {
	if (&MessageData{}).IsComponentsV2() {
		t.Error("empty message should not be V2")
	}
	if !(&MessageData{Flags: MessageFlagsComponentsV2}).IsComponentsV2() {
		t.Error("message with V2 flag should be V2")
	}
	if !(&MessageData{Flags: MessageFlagsComponentsV2 | int(discord.EphemeralMessage)}).IsComponentsV2() {
		t.Error("V2 flag combined with ephemeral should still be V2")
	}
}
