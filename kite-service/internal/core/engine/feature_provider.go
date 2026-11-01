package engine

import "context"

// featureProvider tells flows which optional plan features their app has.
type featureProvider struct {
	appID  string
	lookup FeatureLookup
}

func (p featureProvider) TranscriptNoWatermark(ctx context.Context) bool {
	if p.lookup == nil {
		return false
	}
	return p.lookup.AppFeatures(ctx, p.appID).TranscriptNoWatermark
}
