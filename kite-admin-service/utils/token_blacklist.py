import os

import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
BLACKLIST_PREFIX = "bl:access:"

_redis: redis.Redis | None = None


async def init_blacklist() -> None:
    global _redis
    _redis = redis.from_url(REDIS_URL, decode_responses=True)


async def close_blacklist() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


async def blacklist_access_token(jti: str, ttl_seconds: int) -> None:
    """Add access token jti to blacklist with TTL matching remaining token life."""
    if _redis and ttl_seconds > 0:
        await _redis.setex(f"{BLACKLIST_PREFIX}{jti}", ttl_seconds, "1")


async def is_blacklisted(jti: str) -> bool:
    if _redis is None:
        return False
    return await _redis.exists(f"{BLACKLIST_PREFIX}{jti}") > 0
