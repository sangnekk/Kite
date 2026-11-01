package app

import (
	"context"
	"log/slog"

	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

type userLookup func(ctx context.Context, id string) (*model.User, error)

// appListToWire renders the apps of one user. For an app the user does not own
// it also names the owner and who added the user as a collaborator, so the list
// can say where the app comes from. A person that can no longer be found
// (deleted account) is left out instead of failing the whole list.
func appListToWire(ctx context.Context, entries []*model.AppListEntry, userID string, lookup userLookup) wire.AppListResponse {
	cache := make(map[string]*wire.User)
	find := func(id string) *wire.User {
		if id == "" {
			return nil
		}
		if user, ok := cache[id]; ok {
			return user
		}

		var res *wire.User
		user, err := lookup(ctx, id)
		if err != nil {
			slog.Warn("Failed to look up a user of the app list", slog.String("user_id", id), slog.String("error", err.Error()))
		} else {
			// The email of other people is never part of the list.
			res = wire.UserToWire(user, false)
		}
		cache[id] = res
		return res
	}

	res := make(wire.AppListResponse, len(entries))
	for i, entry := range entries {
		app := wire.AppToWire(entry.App)

		if entry.App.OwnerUserID != userID {
			app.Owner = find(entry.App.OwnerUserID)
			if entry.InvitedByUserID.Valid {
				app.InvitedBy = find(entry.InvitedByUserID.String)
			}
		}
		res[i] = app
	}
	return res
}
