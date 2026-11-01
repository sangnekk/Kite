package store

import "context"

// Setting is one raw row of the settings table. Secret values are stored as a
// JSON string holding the base64 ciphertext.
type Setting struct {
	Namespace string
	Key       string
	Value     []byte
	IsSecret  bool
}

type SettingStore interface {
	Settings(ctx context.Context) ([]Setting, error)
	SaveSetting(ctx context.Context, setting Setting, updatedBy string) error
}
