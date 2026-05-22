import aiosqlite
from datetime import datetime, timezone

DB_PATH = ".data/sessions.db"


async def init_db() -> None:
    """Create sessions table if not exists. Call once at startup."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS refresh_sessions (
                jti TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
        """)
        await db.commit()


async def save_session(jti: str, username: str, role: str, expires_at: datetime) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO refresh_sessions (jti, username, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
            (jti, username, role, datetime.now(timezone.utc).isoformat(), expires_at.isoformat()),
        )
        await db.commit()


async def get_session(jti: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM refresh_sessions WHERE jti = ?", (jti,)) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return None
            return dict(row)


async def revoke_session(jti: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE refresh_sessions SET revoked = 1 WHERE jti = ?", (jti,))
        await db.commit()


async def revoke_all_sessions(username: str) -> None:
    """Revoke all refresh sessions for a user."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE refresh_sessions SET revoked = 1 WHERE username = ?", (username,))
        await db.commit()
