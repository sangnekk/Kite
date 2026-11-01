package kiteadmin

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func testFS() fstest.MapFS {
	return fstest.MapFS{
		"index.html":       {Data: []byte("<html>console</html>")},
		"assets/app-1.js":  {Data: []byte("console.log(1)")},
		"assets/app-1.css": {Data: []byte("body{}")},
		"logo.svg":         {Data: []byte("<svg/>")},
	}
}

func get(t *testing.T, h http.Handler, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestServesFilesAndFallsBackToIndexForRoutes(t *testing.T) {
	h, err := newHandler(testFS())
	if err != nil {
		t.Fatal(err)
	}

	for _, path := range []string{"/", "/users", "/apps/abc-123", "/settings/billing", "/deep/client/route"} {
		rec := get(t, h, path)
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "console") {
			t.Errorf("%s: want index.html, got %d %q", path, rec.Code, rec.Body.String())
		}
		if rec.Header().Get("Cache-Control") != "no-cache" {
			t.Errorf("%s: the entry point must not be cached, got %q", path, rec.Header().Get("Cache-Control"))
		}
	}

	rec := get(t, h, "/assets/app-1.js")
	if rec.Code != http.StatusOK || rec.Body.String() != "console.log(1)" {
		t.Errorf("asset: got %d %q", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Cache-Control"); !strings.Contains(got, "immutable") {
		t.Errorf("fingerprinted assets should be cached forever, got %q", got)
	}

	if rec := get(t, h, "/logo.svg"); rec.Code != http.StatusOK {
		t.Errorf("static file: got %d", rec.Code)
	}
}

func TestMissingFilesAreRealNotFounds(t *testing.T) {
	h, _ := newHandler(testFS())

	for _, path := range []string{"/assets/gone-2.js", "/missing.png", "/assets/x.css", "/favicon.ico"} {
		if rec := get(t, h, path); rec.Code != http.StatusNotFound {
			t.Errorf("%s: a missing file must be a 404 and not an HTML page, got %d", path, rec.Code)
		}
	}
}

func TestPathTraversalCannotEscapeTheFS(t *testing.T) {
	h, _ := newHandler(testFS())

	for _, path := range []string{"/../../etc/passwd", "/assets/../../secret", "/%2e%2e/%2e%2e/etc/passwd"} {
		rec := get(t, h, path)
		if strings.Contains(rec.Body.String(), "root:") {
			t.Errorf("%s leaked a file", path)
		}
	}
}

func TestSecurityHeaders(t *testing.T) {
	h, _ := newHandler(testFS())
	rec := get(t, h, "/users")

	csp := rec.Header().Get("Content-Security-Policy")
	for _, want := range []string{"default-src 'self'", "script-src 'self'", "frame-ancestors 'none'", "object-src 'none'"} {
		if !strings.Contains(csp, want) {
			t.Errorf("CSP is missing %q: %s", want, csp)
		}
	}
	if strings.Contains(csp, "script-src 'self' 'unsafe") {
		t.Error("scripts must not allow unsafe sources")
	}
	if rec.Header().Get("X-Frame-Options") != "DENY" || rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("missing clickjacking / sniffing protection")
	}
}

func TestHandlerNeedsAnIndex(t *testing.T) {
	if _, err := newHandler(fstest.MapFS{"assets/a.js": {Data: []byte("x")}}); err == nil {
		t.Fatal("an empty build must be rejected instead of serving 404s")
	}
}

func TestNotEmbeddedByDefault(t *testing.T) {
	// Without the embedadmin tag the server keeps running and says why.
	if _, err := NewHandler(); err == nil {
		t.Skip("built with the embedadmin tag")
	}
}
