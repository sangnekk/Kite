package engine

import (
	"sync"
	"time"

	"github.com/diamondburned/arikawa/v3/discord"
)

const interactionDedupeTTL = 5 * time.Minute

// interactionDeduper remembers recently handled interaction IDs so an
// interaction that is delivered twice (e.g. replayed after a gateway resume)
// doesn't execute its flow twice. It keeps two generations of IDs and drops the
// older one every ttl, so memory stays bounded without per-entry bookkeeping.
// An ID is remembered for at least ttl and at most 2*ttl.
type interactionDeduper struct {
	mu sync.Mutex

	ttl       time.Duration
	now       func() time.Time
	rotatedAt time.Time
	current   map[discord.InteractionID]struct{}
	previous  map[discord.InteractionID]struct{}
}

func newInteractionDeduper(ttl time.Duration) *interactionDeduper {
	return &interactionDeduper{
		ttl:       ttl,
		now:       time.Now,
		rotatedAt: time.Now(),
		current:   make(map[discord.InteractionID]struct{}),
		previous:  make(map[discord.InteractionID]struct{}),
	}
}

// FirstSeen records the interaction ID and reports whether it hasn't been seen
// before.
func (d *interactionDeduper) FirstSeen(id discord.InteractionID) bool {
	d.mu.Lock()
	defer d.mu.Unlock()

	if now := d.now(); now.Sub(d.rotatedAt) >= d.ttl {
		d.previous = d.current
		d.current = make(map[discord.InteractionID]struct{})
		d.rotatedAt = now
	}

	if _, ok := d.current[id]; ok {
		return false
	}
	if _, ok := d.previous[id]; ok {
		return false
	}

	d.current[id] = struct{}{}
	return true
}
