package message

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"unicode/utf8"
)

// Discord limits of select menus.
const (
	MaxSelectPlaceholderLength = 150
	MaxSelectOptions           = 25
	MaxSelectValues            = 25
	MaxSelectOptionTextLength  = 100
	MaxActionRowButtons        = 5
	MaxLegacyActionRows        = 5
)

// validChannelTypes are the channel types a Channel Select can be restricted to.
var validChannelTypes = map[int]bool{
	0: true, 2: true, 4: true, 5: true, 10: true, 11: true, 12: true, 13: true, 15: true, 16: true,
}

// ValidateComponents checks the interactive components of the message (action
// row layout, select menus and access rules) against Discord's limits, so an
// invalid configuration is rejected when it is saved instead of failing when
// the message is sent.
func (m *MessageData) ValidateComponents() error {
	if m == nil {
		return nil
	}

	if !m.IsComponentsV2() {
		rows := 0
		for _, c := range m.Components {
			if c.Type == 0 || c.Type == ComponentTypeActionRow {
				rows++
			}
		}
		if rows > MaxLegacyActionRows {
			return fmt.Errorf("components: a message can have at most %d action rows", MaxLegacyActionRows)
		}
	}

	var errs []error
	for i := range m.Components {
		errs = append(errs, m.Components[i].validate(fmt.Sprintf("components.%d", i)))
	}
	return errors.Join(errs...)
}

func (c *ComponentData) validate(path string) error {
	var errs []error

	switch {
	case c.Type == 0 || c.Type == ComponentTypeActionRow:
		errs = append(errs, c.validateActionRow(path))
	case c.IsSelect():
		errs = append(errs, c.validateSelect(path))
	}

	if c.IsInteractive() {
		errs = append(errs, c.Access.validate(path+".access"))
	}

	for i := range c.Components {
		errs = append(errs, c.Components[i].validate(fmt.Sprintf("%s.components.%d", path, i)))
	}
	if c.Accessory != nil {
		errs = append(errs, c.Accessory.validate(path+".accessory"))
	}

	return errors.Join(errs...)
}

// validateActionRow enforces Discord's layout rule: an action row holds up to 5
// buttons or exactly one select menu, never both.
func (c *ComponentData) validateActionRow(path string) error {
	var buttons, selects int
	for _, child := range c.Components {
		switch {
		case child.Type == ComponentTypeButton:
			buttons++
		case child.IsSelect():
			selects++
		}
	}

	if selects > 0 && (selects > 1 || buttons > 0) {
		return fmt.Errorf("%s: a select menu must be the only component of its action row", path)
	}
	if buttons > MaxActionRowButtons {
		return fmt.Errorf("%s: an action row can have at most %d buttons", path, MaxActionRowButtons)
	}
	return nil
}

func (c *ComponentData) validateSelect(path string) error {
	var errs []error
	fail := func(format string, args ...any) {
		errs = append(errs, fmt.Errorf(path+": "+format, args...))
	}

	if utf8.RuneCountInString(c.Placeholder) > MaxSelectPlaceholderLength {
		fail("placeholder must be at most %d characters", MaxSelectPlaceholderLength)
	}

	min, max := c.ValueLimits()
	if min < 0 || min > MaxSelectValues {
		fail("min_values must be between 0 and %d", MaxSelectValues)
	}
	if max < 1 || max > MaxSelectValues {
		fail("max_values must be between 1 and %d", MaxSelectValues)
	}
	if min > max {
		fail("min_values must not be greater than max_values")
	}

	if c.IsStringSelect() {
		errs = append(errs, c.validateStringSelectOptions(path, max))
	} else {
		errs = append(errs, c.validateEntitySelect(path, max))
	}

	return errors.Join(errs...)
}

func (c *ComponentData) validateStringSelectOptions(path string, max int) error {
	if c.OptionsSource != nil {
		s := c.OptionsSource
		if strings.TrimSpace(s.Items) == "" || strings.TrimSpace(s.Label) == "" || strings.TrimSpace(s.Value) == "" {
			return fmt.Errorf("%s.options_source: items, label and value are required", path)
		}
		return nil
	}

	var errs []error
	fail := func(format string, args ...any) {
		errs = append(errs, fmt.Errorf(path+": "+format, args...))
	}

	if len(c.Options) < 1 || len(c.Options) > MaxSelectOptions {
		fail("a select menu must have between 1 and %d options", MaxSelectOptions)
	}
	if max > len(c.Options) && len(c.Options) > 0 {
		fail("max_values must not be greater than the number of options")
	}

	seen := make(map[string]int, len(c.Options))
	defaults := 0
	for i, o := range c.Options {
		optPath := fmt.Sprintf("options.%d", i)
		if n := utf8.RuneCountInString(o.Label); n < 1 || n > MaxSelectOptionTextLength {
			fail("%s.label must be between 1 and %d characters", optPath, MaxSelectOptionTextLength)
		}
		if n := utf8.RuneCountInString(o.Value); n < 1 || n > MaxSelectOptionTextLength {
			fail("%s.value must be between 1 and %d characters", optPath, MaxSelectOptionTextLength)
		}
		if strings.Contains(o.Value, "{{") {
			fail("%s.value can't contain placeholders", optPath)
		}
		if utf8.RuneCountInString(o.Description) > MaxSelectOptionTextLength {
			fail("%s.description must be at most %d characters", optPath, MaxSelectOptionTextLength)
		}
		if first, ok := seen[o.Value]; ok && o.Value != "" {
			fail("%s.value %q is already used by option %d", optPath, o.Value, first+1)
		} else {
			seen[o.Value] = i
		}
		if o.Default {
			defaults++
		}
	}
	if defaults > max {
		fail("at most %d options can be selected by default", max)
	}

	return errors.Join(errs...)
}

func (c *ComponentData) validateEntitySelect(path string, max int) error {
	var errs []error
	fail := func(format string, args ...any) {
		errs = append(errs, fmt.Errorf(path+": "+format, args...))
	}

	if len(c.Options) > 0 || c.OptionsSource != nil {
		fail("only string selects can have options")
	}
	if len(c.DefaultValues) > max {
		fail("at most %d values can be selected by default", max)
	}

	for i, v := range c.DefaultValues {
		if !defaultValueTypeAllowed(c.Type, v.Type) {
			fail("default_values.%d has an invalid type %q for this select", i, v.Type)
		}
	}

	if len(c.ChannelTypes) > 0 {
		if c.Type != ComponentTypeChannelSelect {
			fail("only channel selects can restrict channel types")
		}
		for _, t := range c.ChannelTypes {
			if !validChannelTypes[t] {
				fail("invalid channel type %d", t)
			}
		}
	}

	return errors.Join(errs...)
}

func defaultValueTypeAllowed(selectType int, valueType string) bool {
	switch selectType {
	case ComponentTypeUserSelect:
		return valueType == DefaultValueTypeUser
	case ComponentTypeRoleSelect:
		return valueType == DefaultValueTypeRole
	case ComponentTypeMentionableSelect:
		return valueType == DefaultValueTypeUser || valueType == DefaultValueTypeRole
	case ComponentTypeChannelSelect:
		return valueType == DefaultValueTypeChannel
	}
	return false
}

func (a *ComponentAccessData) validate(path string) error {
	if a == nil {
		return nil
	}

	switch a.Mode {
	case "", ComponentAccessModeEveryone, ComponentAccessModeInvoker:
	case ComponentAccessModeRoles:
		if len(a.RoleIDs) == 0 {
			return fmt.Errorf("%s: at least one role is required", path)
		}
	case ComponentAccessModePermissions:
		if _, err := strconv.ParseUint(a.Permissions, 10, 64); err != nil || a.Permissions == "0" {
			return fmt.Errorf("%s: permissions are required", path)
		}
	default:
		return fmt.Errorf("%s: unknown access mode %q", path, a.Mode)
	}

	if utf8.RuneCountInString(a.DenyMessage) > 2000 {
		return fmt.Errorf("%s: deny_message must be at most 2000 characters", path)
	}
	return nil
}
