from fastapi import APIRouter, HTTPException, status, Depends
from schema.auth import LoginRequest, RefreshRequest, LogoutRequest, TokenResponse

from utils.auth import (
    get_user,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    access_token_remaining_seconds,
)
from utils.session_store import save_session, get_session, revoke_session, revoke_all_sessions
from utils.token_blacklist import blacklist_access_token
from utils.auth_deps import get_current_user

import jwt

router = APIRouter(prefix="/auth", tags=["auth"])

# --- POST /auth/login ---
@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = get_user(body.username)
    if user is None or not verify_password(user["hash_password"], body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(user["username"], user["role"])
    refresh_token, jti, expires_at = create_refresh_token(user["username"], user["role"])
    await save_session(jti, user["username"], user["role"], expires_at)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# --- POST /auth/refresh ---
@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    session = await get_session(payload["jti"])
    if session is None or session["revoked"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked or not found")

    # Revoke old refresh token (rotation)
    await revoke_session(payload["jti"])

    # Issue new pair
    username, role = payload["sub"], payload["role"]
    access_token = create_access_token(username, role)
    refresh_token, jti, expires_at = create_refresh_token(username, role)
    await save_session(jti, username, role, expires_at)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# --- POST /auth/logout ---
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: LogoutRequest):
    # Blacklist access token in Redis if provided
    if body.access_token:
        try:
            payload = decode_token(body.access_token)
            ttl = access_token_remaining_seconds(payload)
            await blacklist_access_token(payload["jti"], ttl)
        except jwt.PyJWTError:
            pass  # expired/invalid — already unusable

    # Revoke refresh token in SQLite if provided
    if body.refresh_token:
        try:
            payload = decode_token(body.refresh_token)
            await revoke_session(payload["jti"])
        except jwt.PyJWTError:
            pass

    return None


# --- POST /auth/logout-all ---
@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(user: dict = Depends(get_current_user)):
    """Revoke all refresh sessions for the current user."""
    await revoke_all_sessions(user["sub"])
    return None


# --- GET /auth/me ---
@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"username": user["sub"], "role": user["role"]}
