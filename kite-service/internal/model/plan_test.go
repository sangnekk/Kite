package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlanFeaturesIncludesCustomTableLimit(t *testing.T) {
	features := (Plan{FeatureMaxCustomTables: 5}).Features()

	assert.Equal(t, 5, features.MaxCustomTables)
}

func TestFeaturesMergeUsesHigherCustomTableLimit(t *testing.T) {
	features := (Features{MaxCustomTables: 5}).Merge(Features{MaxCustomTables: 50})

	assert.Equal(t, 50, features.MaxCustomTables)
}

func TestFeaturesMergeTreatsNegativeOneCustomTableLimitAsUnlimited(t *testing.T) {
	features := (Features{MaxCustomTables: 5}).Merge(Features{MaxCustomTables: -1})

	assert.Equal(t, -1, features.MaxCustomTables)
}

func TestPlanFeaturesIncludesCustomEventLimit(t *testing.T) {
	features := (Plan{FeatureMaxCustomEvents: 5}).Features()

	assert.Equal(t, 5, features.MaxCustomEvents)
}

func TestFeaturesMergeTreatsNegativeOneCustomEventLimitAsUnlimited(t *testing.T) {
	features := (Features{MaxCustomEvents: 5}).Merge(Features{MaxCustomEvents: -1})

	assert.Equal(t, -1, features.MaxCustomEvents)
}
