//go:build embedadmin
// +build embedadmin

package kiteadmin

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:dist
var distFS embed.FS

// NewHandler returns the handler for the embedded admin console.
func NewHandler() (http.Handler, error) {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return nil, err
	}
	return newHandler(sub)
}
