package app

import (
	"context"
	"errors"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/guregu/null.v4"
)

func fakeUsers(calls *int) userLookup {
	users := map[string]*model.User{
		"owner": {ID: "owner", Email: "owner@example.com", DisplayName: "Owner", DiscordID: "1", DiscordUsername: "owner", DiscordAvatar: null.StringFrom("av1")},
		"admin": {ID: "admin", Email: "admin@example.com", DisplayName: "Admin", DiscordID: "2", DiscordUsername: "admin"},
	}
	return func(_ context.Context, id string) (*model.User, error) {
		*calls++
		if u, ok := users[id]; ok {
			return u, nil
		}
		return nil, errors.New("not found")
	}
}

func entry(id, owner, invitedBy string, avatar string) *model.AppListEntry {
	return &model.AppListEntry{
		App:             &model.App{ID: id, Name: id, OwnerUserID: owner, DiscordID: "99", DiscordAvatar: null.NewString(avatar, avatar != "")},
		InvitedByUserID: null.NewString(invitedBy, invitedBy != ""),
	}
}

func TestAppListNamesWhoAddedYouOnlyForAppsYouDoNotOwn(t *testing.T) {
	calls := 0
	list := appListToWire(context.Background(), []*model.AppListEntry{
		entry("mine", "me", "", "botavatar"),
		entry("shared", "owner", "admin", ""),
	}, "me", fakeUsers(&calls))
	require.Len(t, list, 2)

	assert.Nil(t, list[0].Owner, "your own app needs no explanation")
	assert.Nil(t, list[0].InvitedBy)
	assert.Equal(t, "botavatar", list[0].DiscordAvatar.String, "the bot avatar is part of every entry")

	assert.Equal(t, "Owner", list[1].Owner.DisplayName)
	assert.Equal(t, "av1", list[1].Owner.DiscordAvatar.String)
	assert.Equal(t, "Admin", list[1].InvitedBy.DisplayName)
}

func TestAppListNeverExposesEmailsOfOtherPeople(t *testing.T) {
	calls := 0
	list := appListToWire(context.Background(), []*model.AppListEntry{entry("shared", "owner", "admin", "")}, "me", fakeUsers(&calls))

	assert.False(t, list[0].Owner.Email.Valid)
	assert.False(t, list[0].InvitedBy.Email.Valid)
}

func TestAppListWithoutRecordedInviterOnlyNamesTheOwner(t *testing.T) {
	calls := 0
	list := appListToWire(context.Background(), []*model.AppListEntry{entry("old", "owner", "", "")}, "me", fakeUsers(&calls))

	assert.Equal(t, "Owner", list[0].Owner.DisplayName)
	assert.Nil(t, list[0].InvitedBy, "nobody is named when it is not known who added you")
}

func TestAppListSurvivesAMissingUser(t *testing.T) {
	calls := 0
	list := appListToWire(context.Background(), []*model.AppListEntry{entry("shared", "gone", "alsogone", "")}, "me", fakeUsers(&calls))

	require.Len(t, list, 1)
	assert.Equal(t, "shared", list[0].ID)
	assert.Nil(t, list[0].Owner)
	assert.Nil(t, list[0].InvitedBy)
}

func TestAppListLooksEachPersonUpOnce(t *testing.T) {
	calls := 0
	appListToWire(context.Background(), []*model.AppListEntry{
		entry("a", "owner", "admin", ""),
		entry("b", "owner", "admin", ""),
		entry("c", "owner", "owner", ""),
	}, "me", fakeUsers(&calls))

	assert.Equal(t, 2, calls, "owner and admin, however many apps mention them")
}

func TestAppListIsEmptyNotNull(t *testing.T) {
	calls := 0
	list := appListToWire(context.Background(), nil, "me", fakeUsers(&calls))

	assert.NotNil(t, list, "the website maps over the list")
	assert.Empty(t, list)
}
