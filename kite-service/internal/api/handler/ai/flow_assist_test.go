package ai

import "testing"

func TestParseFlowAssistOutput(t *testing.T) {
	cases := []struct {
		name      string
		raw       string
		wantMsg   string
		wantFlow  bool
		wantError bool
	}{
		{
			name:     "plain json",
			raw:      `{"message":"hi","flow":{"nodes":[],"edges":[]}}`,
			wantMsg:  "hi",
			wantFlow: true,
		},
		{
			name:     "fenced json",
			raw:      "```json\n{\"message\":\"hi\",\"flow\":{\"nodes\":[]}}\n```",
			wantMsg:  "hi",
			wantFlow: true,
		},
		{
			name:     "prose around json",
			raw:      "Sure!\n{\"message\":\"done\"}\nHope that helps",
			wantMsg:  "done",
			wantFlow: false,
		},
		{
			name:      "no json",
			raw:       "I can't help with that",
			wantError: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			out, err := parseFlowAssistOutput(tc.raw)
			if tc.wantError {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if out.Message != tc.wantMsg {
				t.Errorf("message = %q, want %q", out.Message, tc.wantMsg)
			}
			if got := len(out.Flow) > 0; got != tc.wantFlow {
				t.Errorf("hasFlow = %v, want %v", got, tc.wantFlow)
			}
		})
	}
}

func TestValidateFlowRejectsGarbage(t *testing.T) {
	if err := validateFlow([]byte(`not json`)); err == nil {
		t.Errorf("expected error for invalid json")
	}
	if err := validateFlow([]byte(`{"nodes":[],"edges":[]}`)); err != nil {
		t.Errorf("expected empty flow to validate, got %v", err)
	}
}
