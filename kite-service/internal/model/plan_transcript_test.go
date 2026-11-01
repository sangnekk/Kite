package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTranscriptNoWatermarkIsOffUnlessAPlanTurnsItOn(t *testing.T) {
	assert.False(t, Plan{}.Features().TranscriptNoWatermark, "a plan has it off by default")
	assert.False(t, Features{}.Merge(Plan{}.Features()).TranscriptNoWatermark)

	on := Plan{FeatureTranscriptNoWatermark: true}.Features()
	assert.True(t, on.TranscriptNoWatermark)
	assert.True(t, Features{}.Merge(on).TranscriptNoWatermark, "one plan with it is enough")
	assert.True(t, on.Merge(Features{}).TranscriptNoWatermark)
}
