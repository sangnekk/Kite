// Package kiteadmin serves the admin console single page application.
//
// The compiled frontend (dist/) is embedded into the binary when it is built
// with the "embedadmin" tag, see embed.go.
package kiteadmin

import (
	"bytes"
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// newHandler serves fsys as a single page application: files are served as is,
// every other path without a file extension falls back to index.html so client
// side routes survive a page reload. Missing files with an extension (a stale
// asset, a typo) are a real 404, not an HTML page.
//
// It expects the prefix it is mounted on (/admin) to be stripped already.
func newHandler(fsys fs.FS) (http.Handler, error) {
	if _, err := fs.Stat(fsys, "index.html"); err != nil {
		return nil, err
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setSecurityHeaders(w)

		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if name == "" {
			name = "index.html"
		}

		info, err := fs.Stat(fsys, name)
		switch {
		case err == nil && !info.IsDir():
			if name == "index.html" {
				// The entry point must always be revalidated, it names the
				// hashed assets of the current build.
				w.Header().Set("Cache-Control", "no-cache")
			} else if strings.HasPrefix(name, "assets/") {
				// Vite fingerprints everything in assets/.
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			serveFile(w, r, fsys, name)

		case path.Ext(name) != "":
			http.NotFound(w, r)

		default:
			w.Header().Set("Cache-Control", "no-cache")
			serveFile(w, r, fsys, "index.html")
		}
	}), nil
}

// serveFile writes one file of fsys. http.FileServer is deliberately not used:
// it redirects every request ending in /index.html to ./, which would turn the
// SPA fallback into a redirect loop.
func serveFile(w http.ResponseWriter, r *http.Request, fsys fs.FS, name string) {
	f, err := fsys.Open(name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	content, ok := f.(io.ReadSeeker)
	if !ok {
		data, err := io.ReadAll(f)
		if err != nil {
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		content = bytes.NewReader(data)
	}
	http.ServeContent(w, r, name, info.ModTime(), content)
}

// The console only talks to its own origin. Styles stay inline because the UI
// libraries set style attributes at runtime; Discord avatars come from the CDN.
const contentSecurityPolicy = "default-src 'self'; " +
	"script-src 'self'; " +
	"style-src 'self' 'unsafe-inline'; " +
	"img-src 'self' data: https://cdn.discordapp.com; " +
	"font-src 'self' data:; " +
	"connect-src 'self'; " +
	"object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

func setSecurityHeaders(w http.ResponseWriter) {
	h := w.Header()
	h.Set("Content-Security-Policy", contentSecurityPolicy)
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "DENY")
	h.Set("Referrer-Policy", "same-origin")
}
