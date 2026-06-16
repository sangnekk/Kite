package message

import (
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
)

func intPtr(v int) *int { return &v }

// TestToSendMessageData_V2Native verifies that a Components V2 message converts
// to native arikawa components (so Discord can parse it inbound) and that a
// button nested in a section gets its custom_id from the factory — the path
// that makes button interactions work.
func TestToSendMessageData_V2Native(t *testing.T) {
	msg := &MessageData{
		Flags: MessageFlagsComponentsV2,
		Components: []ComponentData{
			{
				Type:        ComponentTypeContainer,
				AccentColor: intPtr(0x5865F2),
				Components: []ComponentData{
					{Type: ComponentTypeTextDisplay, Content: "# Hello"},
					{Type: ComponentTypeSeparator, Spacing: 2},
					{
						Type:       ComponentTypeSection,
						Components: []ComponentData{{Type: ComponentTypeTextDisplay, Content: "Body"}},
						Accessory: &ComponentData{
							Type:  ComponentTypeButton,
							Style: 1,
							Label: "Click",
							ID:    7,
						},
					},
				},
			},
			{Type: ComponentTypeTextDisplay, Content: "top-level text"},
		},
	}

	data := msg.ToSendMessageData(ConvertOptions{
		ComponentIDFactory: func(c *ComponentData) discord.ComponentID {
			return discord.ComponentID("resume:" + string(rune('0'+c.ID)))
		},
	})

	if data.Flags&discord.IsComponentsV2 == 0 {
		t.Errorf("expected IsComponentsV2 flag set, got flags %d", data.Flags)
	}
	if data.Content != "" {
		t.Errorf("V2 message must not have content, got %q", data.Content)
	}
	if len(data.Components) != 2 {
		t.Fatalf("expected 2 top-level components, got %d", len(data.Components))
	}

	container, ok := data.Components[0].(*discord.ContainerComponent)
	if !ok {
		t.Fatalf("expected first top-level component to be a ContainerComponent, got %T", data.Components[0])
	}
	if container.AccentColor != discord.Color(0x5865F2) {
		t.Errorf("container accent color not preserved: %v", container.AccentColor)
	}
	if len(container.Components) != 3 {
		t.Fatalf("expected 3 container children, got %d", len(container.Components))
	}

	// Top-level text display must be allowed (patched into arikawa).
	if _, ok := data.Components[1].(*discord.TextDisplayComponent); !ok {
		t.Errorf("expected top-level TextDisplayComponent, got %T", data.Components[1])
	}

	section, ok := container.Components[2].(*discord.SectionComponent)
	if !ok {
		t.Fatalf("expected section as 3rd container child, got %T", container.Components[2])
	}
	button, ok := section.Accessory.(*discord.ButtonComponent)
	if !ok {
		t.Fatalf("expected section accessory to be a button, got %T", section.Accessory)
	}
	if button.CustomID != "resume:7" {
		t.Errorf("section accessory button custom_id = %q, want resume:7", button.CustomID)
	}
}

// TestToSendMessageData_V1ActionRow verifies the classic path still produces an
// action row with a button carrying a custom_id.
func TestToSendMessageData_V1ActionRow(t *testing.T) {
	msg := &MessageData{
		Components: []ComponentData{
			{
				Type: ComponentTypeActionRow,
				Components: []ComponentData{
					{Type: ComponentTypeButton, Style: 2, Label: "Hi", FlowSourceID: "flow-1"},
				},
			},
		},
	}

	data := msg.ToSendMessageData(ConvertOptions{})
	if len(data.Components) != 1 {
		t.Fatalf("expected 1 component, got %d", len(data.Components))
	}
	row, ok := data.Components[0].(*discord.ActionRowComponent)
	if !ok {
		t.Fatalf("expected ActionRowComponent, got %T", data.Components[0])
	}
	btn, ok := (*row)[0].(*discord.ButtonComponent)
	if !ok {
		t.Fatalf("expected ButtonComponent, got %T", (*row)[0])
	}
	if btn.CustomID != "flow-1" {
		t.Errorf("button custom_id = %q, want flow-1", btn.CustomID)
	}
}
