//go:build !embedadmin
// +build !embedadmin

package kiteadmin

import (
	"fmt"
	"net/http"
)

// NewHandler reports that the console was not embedded in this build.
func NewHandler() (http.Handler, error) {
	return nil, fmt.Errorf("admin console not embedded, build with the embedadmin tag")
}
