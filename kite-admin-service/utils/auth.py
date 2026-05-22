import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# --- Config ---
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL = timedelta(minutes=15)
REFRESH_TOKEN_TTL = timedelta(days=7)
USERS_FILE = "users.json"

_ph = PasswordHasher()
_users: dict[str, dict] = {}  # username -> {username, hash_password, role}


def load_users() -> None:
    """Load admins/staffs from users.json at startup."""
    global _users
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    _users = {}
    for entry in data.get("admins", []):
        _users[entry["username"]] = {**entry, "role": "admin"}
    for entry in data.get("staffs", []):
        _users[entry["username"]] = {**entry, "role": "staff"}


def get_user(username: str) -> Optional[dict]:
    return _users.get(username)


def verify_password(hash_password: str, plain_password: str) -> bool:
    try:
        return _ph.verify(hash_password, plain_password)
    except VerifyMismatchError:
        return False


def create_access_token(username: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + ACCESS_TOKEN_TTL,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(username: str, role: str) -> tuple[str, str, datetime]:
    """Returns (token, jti, expires_at)."""
    now = datetime.now(timezone.utc)
    jti = uuid.uuid4().hex
    expires_at = now + REFRESH_TOKEN_TTL
    payload = {
        "sub": username,
        "role": role,
        "type": "refresh",
        "iat": now,
        "exp": expires_at,
        "jti": jti,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, jti, expires_at


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises jwt.PyJWTError on failure."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def access_token_remaining_seconds(payload: dict) -> int:
    """Seconds until this access token expires (for Redis TTL)."""
    exp = payload.get("exp", 0)
    remaining = exp - datetime.now(timezone.utc).timestamp()
    return max(int(remaining), 0)
