package command

import (
	"strings"
	"testing"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
)

func TestValidCommandName(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  bool
	}{
		{"simple", "ping", true},
		{"with digits", "roll20", true},
		{"with dash underscore", "my-cmd_2", true},
		{"subcommand", "config set", true},
		{"unicode letters", "lệnh", true},
		{"empty", "", false},
		{"uppercase", "Ping", false},
		{"space in part via double space", "config  set", false}, // empty middle part
		{"invalid char", "hello!", false},
		{"too long", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", false}, // 33 chars
		{"subcommand part invalid", "config Set", false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := validCommandName(tc.input); got != tc.want {
				t.Errorf("validCommandName(%q) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}

func TestCommandNamesConflict(t *testing.T) {
	cases := []struct {
		name string
		a, b string
		want bool
	}{
		{"distinct roots", "ping", "pong", false},
		{"sibling subcommands merge", "config set", "config get", false},
		{"distinct nested leaves", "admin user ban", "admin user kick", false},
		{"empty is ignored", "ping", "", false},
		{"duplicate root", "ping", "ping", true},
		{"duplicate subcommand", "config set", "config set", true},
		{"duplicate nested subcommand", "admin user ban", "admin user ban", true},
		{"mixed nested and unnested", "config", "config set", true},
		{"mixed nested subcommands", "admin user", "admin user ban", true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// conflict is symmetric, so both orderings must agree.
			gotAB, _ := commandNamesConflict(tc.a, tc.b)
			gotBA, _ := commandNamesConflict(tc.b, tc.a)
			if gotAB != tc.want || gotBA != tc.want {
				t.Errorf("commandNamesConflict(%q,%q) = %v / reversed %v, want %v", tc.a, tc.b, gotAB, gotBA, tc.want)
			}
		})
	}
}

func TestValidateDiscordCommand(t *testing.T) {
	str := func(name string) *discord.StringOption {
		return &discord.StringOption{OptionName: name, Description: "d"}
	}
	manyOptions := func(n int) discord.CommandOptions {
		opts := make(discord.CommandOptions, 0, n)
		for i := 0; i < n; i++ {
			opts = append(opts, str("opt"+strings.Repeat("x", i%3)+string(rune('a'+i))))
		}
		return opts
	}

	cases := []struct {
		name    string
		cmd     api.CreateCommandData
		wantErr bool
	}{
		{
			name: "valid simple",
			cmd:  api.CreateCommandData{Name: "ping", Description: "Pong!"},
		},
		{
			name:    "empty description",
			cmd:     api.CreateCommandData{Name: "ping", Description: ""},
			wantErr: true,
		},
		{
			name:    "description too long",
			cmd:     api.CreateCommandData{Name: "ping", Description: strings.Repeat("a", maxDescriptionLen+1)},
			wantErr: true,
		},
		{
			name:    "duplicate option name",
			cmd:     api.CreateCommandData{Name: "x", Description: "d", Options: discord.CommandOptions{str("dup"), str("dup")}},
			wantErr: true,
		},
		{
			name:    "too many options",
			cmd:     api.CreateCommandData{Name: "x", Description: "d", Options: manyOptions(maxCommandOptions + 1)},
			wantErr: true,
		},
		{
			name: "valid subcommand",
			cmd: api.CreateCommandData{Name: "config", Description: "d", Options: discord.CommandOptions{
				&discord.SubcommandOption{OptionName: "set", Description: "set it", Options: []discord.CommandOptionValue{str("key"), str("value")}},
			}},
		},
		{
			name: "duplicate option in subcommand",
			cmd: api.CreateCommandData{Name: "config", Description: "d", Options: discord.CommandOptions{
				&discord.SubcommandOption{OptionName: "set", Description: "set it", Options: []discord.CommandOptionValue{str("k"), str("k")}},
			}},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateDiscordCommand(tc.cmd)
			if (err != nil) != tc.wantErr {
				t.Errorf("validateDiscordCommand() error = %v, wantErr %v", err, tc.wantErr)
			}
		})
	}
}
