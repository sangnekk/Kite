package discord

import (
	"testing"

	"github.com/diamondburned/arikawa/v3/utils/json"
)

func TestSelectComponentsRoundTrip(t *testing.T) {
	var components TopLevelComponents
	raw := `[{"type":1,"components":[{"type":3,"custom_id":"s","min_values":0,"max_values":3,"options":[{"label":"A","value":"a"}]}]},
	{"type":1,"components":[{"type":8,"custom_id":"c","max_values":2,"channel_types":[0],"default_values":[{"id":"5","type":"channel"}]}]},
	{"type":1,"components":[{"type":7,"custom_id":"m","default_values":[{"id":"1","type":"user"},{"id":"2","type":"role"}]}]}]`

	if err := json.Unmarshal([]byte(raw), &components); err != nil {
		t.Fatal(err)
	}

	str := (*components[0].(*ActionRowComponent))[0].(*StringSelectComponent)
	if str.ValueLimits != [2]int{0, 3} {
		t.Fatalf("string select limits = %v, want [0 3]", str.ValueLimits)
	}

	ch := (*components[1].(*ActionRowComponent))[0].(*ChannelSelectComponent)
	if ch.ValueLimits != [2]int{1, 2} {
		t.Fatalf("channel select limits = %v, want [1 2]", ch.ValueLimits)
	}
	if len(ch.DefaultChannels) != 1 || ch.DefaultChannels[0] != 5 {
		t.Fatalf("channel defaults = %v", ch.DefaultChannels)
	}

	mention := (*components[2].(*ActionRowComponent))[0].(*MentionableSelectComponent)
	if len(mention.DefaultMentions) != 2 {
		t.Fatalf("mentionable defaults = %v", mention.DefaultMentions)
	}
	if mention.ValueLimits != [2]int{0, 0} {
		t.Fatalf("mentionable limits = %v, want defaults", mention.ValueLimits)
	}

	// Sending the components back keeps min/max and defaults.
	out, err := json.Marshal(components)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`"min_values":0`, `"max_values":3`, `"default_values":[{"id":"5","type":"channel"}]`} {
		if !contains(string(out), want) {
			t.Errorf("marshalled components %s don't contain %s", out, want)
		}
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func TestMemberPermissionsFromInteraction(t *testing.T) {
	var m Member
	if err := json.Unmarshal([]byte(`{"user":{"id":"1"},"roles":[],"permissions":"8"}`), &m); err != nil {
		t.Fatal(err)
	}
	if m.Permissions != PermissionAdministrator {
		t.Fatalf("permissions = %d, want administrator", m.Permissions)
	}
}
