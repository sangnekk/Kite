from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database.base import get_db
from database.models.users import User
from database.models.apps import App
from database.models.sessions import Session
from database.models.subscriptions import Subscription
from schema.users import UserListItem, UserDetail, UserListResponse, AppInfo, SubscriptionInfo
from utils.auth_deps import require_admin

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    search: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    query = select(User)
    if search:
        query = query.where(
            User.email.ilike(f"%{search}%")
            | User.discord_username.ilike(f"%{search}%")
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    users = (await db.execute(query)).scalars().all()

    user_ids = [u.id for u in users]

    app_counts: dict[str, int] = {}
    if user_ids:
        rows = (await db.execute(
            select(App.owner_user_id, func.count()).where(
                App.owner_user_id.in_(user_ids)
            ).group_by(App.owner_user_id)
        )).all()
        for row in rows:
            app_counts[row[0]] = row[1]

    sub_map: dict[str, Subscription] = {}
    if user_ids:
        subs = (await db.execute(
            select(Subscription).where(
                Subscription.user_id.in_(user_ids),
                Subscription.status.in_(["active", "on_trial"]),
            )
        )).scalars().all()
        for s in subs:
            sub_map[s.user_id] = s

    items = [
        UserListItem(
            id=u.id,
            email=u.email,
            display_name=u.display_name,
            discord_username=u.discord_username,
            discord_avatar=u.discord_avatar,
            plan=sub_map[u.id].display_name if u.id in sub_map else "free",
            apps_count=app_counts.get(u.id, 0),
            created_at=u.created_at,
        )
        for u in users
    ]

    return UserListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    apps = (await db.execute(
        select(App).where(App.owner_user_id == user_id).order_by(App.created_at.desc())
    )).scalars().all()

    sub = (await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status.in_(["active", "on_trial"]),
        ).limit(1)
    )).scalar_one_or_none()

    return UserDetail(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        discord_username=user.discord_username,
        discord_avatar=user.discord_avatar,
        plan=sub.display_name if sub else "free",
        apps_count=len(apps),
        apps=[AppInfo(id=a.id, name=a.name, enabled=a.enabled, created_at=a.created_at) for a in apps],
        subscription=SubscriptionInfo(
            id=sub.id,
            status=sub.status,
            display_name=sub.display_name,
            renews_at=sub.renews_at,
            ends_at=sub.ends_at,
        ) if sub else None,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/{user_id}/force-logout", status_code=status.HTTP_204_NO_CONTENT)
async def force_logout(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.execute(delete(Session).where(Session.user_id == user_id))
    await db.commit()
    return None
