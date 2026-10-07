package engine

import (
	"context"
	"log/slog"
	"time"
)

const resumePointCleanupInterval = time.Hour

// RunResumePointCleanup periodically deletes expired resume points (modals that
// were never submitted, and components if a TTL is configured). Resume points
// live in the shared database, so this only needs to run on one cluster.
func (e *Engine) RunResumePointCleanup(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(resumePointCleanupInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := e.env.ResumePointStore.DeleteExpiredResumePoints(ctx, time.Now().UTC()); err != nil {
					slog.Error(
						"Failed to delete expired resume points",
						slog.String("error", err.Error()),
					)
				}
			}
		}
	}()
}
