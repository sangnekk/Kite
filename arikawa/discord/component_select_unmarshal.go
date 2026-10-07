package discord

import "github.com/diamondburned/arikawa/v3/utils/json"

// The select components marshal ValueLimits and their default values into
// min_values, max_values and default_values themselves. These UnmarshalJSON
// methods do the reverse, so a select read from a message (e.g. the message of
// a component interaction) can be sent back to Discord unchanged.

type selectLimitsJSON struct {
	MinValues *int `json:"min_values,omitempty"`
	MaxValues *int `json:"max_values,omitempty"`
}

func (l selectLimitsJSON) valueLimits() [2]int {
	if l.MinValues == nil && l.MaxValues == nil {
		return [2]int{0, 0} // Discord's defaults
	}

	limits := [2]int{1, 1}
	if l.MinValues != nil {
		limits[0] = *l.MinValues
	}
	if l.MaxValues != nil {
		limits[1] = *l.MaxValues
	}
	return limits
}

type selectDefaultValueJSON struct {
	ID   Snowflake `json:"id"`
	Type string    `json:"type"`
}

// UnmarshalJSON unmarshals the select from the format Discord sends.
func (s *StringSelectComponent) UnmarshalJSON(b []byte) error {
	type sel StringSelectComponent

	var v struct {
		*sel
		selectLimitsJSON
	}
	v.sel = (*sel)(s)

	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}

	s.ValueLimits = v.valueLimits()
	return nil
}

// UnmarshalJSON unmarshals the select from the format Discord sends.
func (s *UserSelectComponent) UnmarshalJSON(b []byte) error {
	type sel UserSelectComponent

	var v struct {
		*sel
		selectLimitsJSON
		DefaultValues []selectDefaultValueJSON `json:"default_values,omitempty"`
	}
	v.sel = (*sel)(s)

	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}

	s.ValueLimits = v.valueLimits()
	s.DefaultUsers = nil
	for _, d := range v.DefaultValues {
		s.DefaultUsers = append(s.DefaultUsers, UserID(d.ID))
	}
	return nil
}

// UnmarshalJSON unmarshals the select from the format Discord sends.
func (s *RoleSelectComponent) UnmarshalJSON(b []byte) error {
	type sel RoleSelectComponent

	var v struct {
		*sel
		selectLimitsJSON
		DefaultValues []selectDefaultValueJSON `json:"default_values,omitempty"`
	}
	v.sel = (*sel)(s)

	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}

	s.ValueLimits = v.valueLimits()
	s.DefaultRoles = nil
	for _, d := range v.DefaultValues {
		s.DefaultRoles = append(s.DefaultRoles, RoleID(d.ID))
	}
	return nil
}

// UnmarshalJSON unmarshals the select from the format Discord sends.
func (s *MentionableSelectComponent) UnmarshalJSON(b []byte) error {
	type sel MentionableSelectComponent

	var v struct {
		*sel
		selectLimitsJSON
		DefaultValues []selectDefaultValueJSON `json:"default_values,omitempty"`
	}
	v.sel = (*sel)(s)

	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}

	s.ValueLimits = v.valueLimits()
	s.DefaultMentions = nil
	for _, d := range v.DefaultValues {
		if d.Type == "role" {
			s.DefaultMentions = append(s.DefaultMentions, DefaultRoleMention(RoleID(d.ID)))
		} else {
			s.DefaultMentions = append(s.DefaultMentions, DefaultUserMention(UserID(d.ID)))
		}
	}
	return nil
}

// UnmarshalJSON unmarshals the select from the format Discord sends.
func (s *ChannelSelectComponent) UnmarshalJSON(b []byte) error {
	type sel ChannelSelectComponent

	var v struct {
		*sel
		selectLimitsJSON
		DefaultValues []selectDefaultValueJSON `json:"default_values,omitempty"`
	}
	v.sel = (*sel)(s)

	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}

	s.ValueLimits = v.valueLimits()
	s.DefaultChannels = nil
	for _, d := range v.DefaultValues {
		s.DefaultChannels = append(s.DefaultChannels, ChannelID(d.ID))
	}
	return nil
}
