package engine

import (
	"reflect"
	"testing"

	"github.com/diamondburned/arikawa/v3/discord"
)

func TestSplitFirstToken(t *testing.T) {
	cases := []struct {
		in, name, rest string
	}{
		{"ping", "ping", ""},
		{"ban  123  spam reason", "ban", "123  spam reason"},
		{"  say   hello world ", "say", "hello world"},
		{"", "", ""},
	}
	for _, c := range cases {
		name, rest := splitFirstToken(c.in)
		if name != c.name || rest != c.rest {
			t.Errorf("splitFirstToken(%q) = (%q, %q), want (%q, %q)", c.in, name, rest, c.name, c.rest)
		}
	}
}

func TestTokenizeArgs(t *testing.T) {
	cases := []struct {
		in   string
		want []string
	}{
		{"a b c", []string{"a", "b", "c"}},
		{`"hello world" foo`, []string{"hello world", "foo"}},
		{`  spaced   out  `, []string{"spaced", "out"}},
		{"", nil},
		{`"only quoted"`, []string{"only quoted"}},
	}
	for _, c := range cases {
		got := tokenizeArgs(c.in)
		if !reflect.DeepEqual(got, c.want) {
			t.Errorf("tokenizeArgs(%q) = %#v, want %#v", c.in, got, c.want)
		}
	}
}

func TestExtractSnowflake(t *testing.T) {
	cases := []struct{ in, want string }{
		{"<@123>", "123"},
		{"<@!123>", "123"},
		{"<@&456>", "456"},
		{"<#789>", "789"},
		{"123456789", "123456789"},
		{"  <@!42> ", "42"},
	}
	for _, c := range cases {
		if got := extractSnowflake(c.in); got != c.want {
			t.Errorf("extractSnowflake(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestCoerceArg(t *testing.T) {
	if v := coerceArg("42", discord.IntegerOptionType); v != int64(42) {
		t.Errorf("integer coercion = %v (%T), want int64(42)", v, v)
	}
	if v := coerceArg("notanint", discord.IntegerOptionType); v != "notanint" {
		t.Errorf("invalid integer should fall back to raw, got %v", v)
	}
	if v := coerceArg("3.14", discord.NumberOptionType); v != float64(3.14) {
		t.Errorf("number coercion = %v, want 3.14", v)
	}
	if v := coerceArg("yes", discord.BooleanOptionType); v != true {
		t.Errorf("boolean 'yes' should be true, got %v", v)
	}
	if v := coerceArg("false", discord.BooleanOptionType); v != false {
		t.Errorf("boolean 'false' should be false, got %v", v)
	}
	if v := coerceArg("<@99>", discord.UserOptionType); v != "99" {
		t.Errorf("user coercion = %v, want 99", v)
	}
	if v := coerceArg("hello", discord.StringOptionType); v != "hello" {
		t.Errorf("string coercion = %v, want hello", v)
	}
}
