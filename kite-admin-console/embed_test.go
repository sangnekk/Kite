//go:build embedadmin

package kiteadmin

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

// Runs against the real build in dist/ (npm run build), only with -tags embedadmin.
func TestEmbeddedBuildIsServed(t *testing.T) {
	h, err := NewHandler()
	if err != nil {
		t.Fatalf("the build is not embedded: %v", err)
	}
	get := func(path string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		return rec
	}

	index := get("/")
	if index.Code != http.StatusOK || !strings.Contains(index.Body.String(), `<div id="root">`) {
		t.Fatalf("index: %d %q", index.Code, index.Body.String())
	}

	// Every asset the page references must be served, with the right type.
	refs := regexp.MustCompile(`/admin/(assets/[^"]+)`).FindAllStringSubmatch(index.Body.String(), -1)
	if len(refs) < 2 {
		t.Fatalf("expected script and stylesheet references, got %v", refs)
	}
	for _, ref := range refs {
		rec := get("/" + ref[1])
		if rec.Code != http.StatusOK || rec.Body.Len() == 0 {
			t.Errorf("%s: %d", ref[1], rec.Code)
		}
		if strings.HasSuffix(ref[1], ".js") && !strings.Contains(rec.Header().Get("Content-Type"), "javascript") {
			t.Errorf("%s: content type %q", ref[1], rec.Header().Get("Content-Type"))
		}
	}

	for _, route := range []string{"/users", "/apps/abc", "/billing/payments", "/settings/ai"} {
		if rec := get(route); rec.Code != http.StatusOK || rec.Body.String() != index.Body.String() {
			t.Errorf("%s should fall back to index.html, got %d", route, rec.Code)
		}
	}
	if rec := get("/assets/missing-123.js"); rec.Code != http.StatusNotFound {
		t.Errorf("a missing asset must be a 404, got %d", rec.Code)
	}
}
