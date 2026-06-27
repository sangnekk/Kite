package api

import (
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"
)

// responseRecorder wraps http.ResponseWriter to capture the status code and the
// number of bytes written so they can be included in the access log.
type responseRecorder struct {
	http.ResponseWriter

	status int
	bytes  int
}

func (r *responseRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}

	n, err := r.ResponseWriter.Write(b)
	r.bytes += n
	return n, err
}

// accessLog logs one structured line per HTTP request after it completes. It is
// meant to wrap the outermost handler so every request (website, API, 404s and
// CORS preflight) is logged.
func accessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip health checks to avoid spamming the log with probe requests.
		if r.URL.Path == "/v1/health" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		rec := &responseRecorder{ResponseWriter: w}

		next.ServeHTTP(rec, r)

		status := rec.status
		if status == 0 {
			status = http.StatusOK
		}

		slog.LogAttrs(r.Context(), accessLogLevel(status), "HTTP request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", status),
			slog.Int("bytes", rec.bytes),
			slog.String("duration", time.Since(start).String()),
			slog.String("remote_ip", clientIP(r)),
			slog.String("user_agent", r.UserAgent()),
		)
	})
}

// accessLogLevel maps an HTTP status code to a log level so 5xx responses stand
// out as errors and 4xx as warnings.
func accessLogLevel(status int) slog.Level {
	switch {
	case status >= 500:
		return slog.LevelError
	case status >= 400:
		return slog.LevelWarn
	default:
		return slog.LevelInfo
	}
}

// clientIP returns the originating client IP, honouring the X-Forwarded-For and
// X-Real-IP headers set by a reverse proxy before falling back to RemoteAddr.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// The first entry is the original client; the rest are proxies.
		first, _, _ := strings.Cut(xff, ",")
		return strings.TrimSpace(first)
	}

	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(xrip)
	}

	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}

	return r.RemoteAddr
}
