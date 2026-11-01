-- The avatar hash of the bot user of an app, kept up to date when the bot
-- connects to Discord. NULL until the bot has connected once.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS discord_avatar TEXT;

-- Who added a collaborator. NULL for collaborators added before this was
-- recorded, or when the person who added them has been removed.
ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS invited_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
