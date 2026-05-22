from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from database.base import get_db
from database.models.apps import App
from database.models.users import User
from database.models.collaborators import Collaborator
from database.models.usage_records import UsageRecord
from database.models.resume_points import ResumePoint
from schema.apps import AppListItem, AppDetail, AppListResponse, CollaboratorInfo, UpdateAppRequest
from utils.auth_deps import require_admin

router = APIRouter(prefix="/apps", tags=["apps"])


@router.get("", response_model=AppListResponse)
async def list_apps(
    search: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    query = select(App)
    if search:
        query = query.where(App.name.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(App.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    apps = (await db.execute(query)).scalars().all()

    app_ids = [a.id for a in apps]
    owner_ids = list({a.owner_user_id for a in apps})

    owner_map: dict[str, str] = {}
    if owner_ids:
        users = (await db.execute(
            select(User.id, User.email).where(User.id.in_(owner_ids))
        )).all()
        for u in users:
            owner_map[u.id] = u.email

    credit_map: dict[str, int] = {}
    if app_ids:
        rows = (await db.execute(
            select(UsageRecord.app_id, func.coalesce(func.sum(UsageRecord.credits_used), 0)).where(
                UsageRecord.app_id.in_(app_ids)
            ).group_by(UsageRecord.app_id)
        )).all()
        for row in rows:
            credit_map[row[0]] = int(row[1])

    collab_map: dict[str, int] = {}
    if app_ids:
        rows = (await db.execute(
            select(Collaborator.app_id, func.count()).where(
                Collaborator.app_id.in_(app_ids)
            ).group_by(Collaborator.app_id)
        )).all()
        for row in rows:
            collab_map[row[0]] = row[1]

    items = [
        AppListItem(
            id=a.id,
            name=a.name,
            owner_id=a.owner_user_id,
            owner_email=owner_map.get(a.owner_user_id),
            enabled=a.enabled,
            discord_status=a.discord_status,
            disabled_reason=a.disabled_reason,
            credits_used=credit_map.get(a.id, 0),
            collaborators_count=collab_map.get(a.id, 0),
            created_at=a.created_at,
        )
        for a in apps
    ]

    return AppListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{app_id}", response_model=AppDetail)
async def get_app(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    app = (await db.execute(select(App).where(App.id == app_id))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    owner = (await db.execute(select(User.email).where(User.id == app.owner_user_id))).scalar_one_or_none()

    collaborators = (await db.execute(
        select(Collaborator).where(Collaborator.app_id == app_id)
    )).scalars().all()

    total_credits = (await db.execute(
        select(func.coalesce(func.sum(UsageRecord.credits_used), 0)).where(UsageRecord.app_id == app_id)
    )).scalar()
    total_credits = int(total_credits) if total_credits else 0

    rp_count = (await db.execute(
        select(func.count()).select_from(select(ResumePoint).where(ResumePoint.app_id == app_id).subquery())
    )).scalar() or 0

    return AppDetail(
        id=app.id,
        name=app.name,
        description=app.description,
        owner_id=app.owner_user_id,
        owner_email=owner,
        creator_user_id=app.creator_user_id,
        enabled=app.enabled,
        discord_id=app.discord_id,
        discord_status=app.discord_status,
        disabled_reason=app.disabled_reason,
        collaborators=[CollaboratorInfo(user_id=c.user_id, role=c.role) for c in collaborators],
        credits_used=total_credits,
        resume_points_count=rp_count,
        created_at=app.created_at,
        updated_at=app.updated_at,
    )


@router.patch("/{app_id}", response_model=AppDetail)
async def update_app(
    app_id: str,
    body: UpdateAppRequest,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    app = (await db.execute(select(App).where(App.id == app_id))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "disabled_reason" in update_data and update_data["disabled_reason"] == "":
        update_data["disabled_reason"] = None

    await db.execute(update(App).where(App.id == app_id).values(**update_data))
    await db.commit()

    return await get_app(app_id, db, _admin)


@router.post("/{app_id}/rotate-token", response_model=AppDetail)
async def rotate_token(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    app = (await db.execute(select(App).where(App.id == app_id))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    await db.execute(
        update(App).where(App.id == app_id).values(
            discord_token=None,
            discord_id=None,
            discord_status=None,
        )
    )
    await db.commit()

    return await get_app(app_id, db, _admin)


@router.post("/{app_id}/kill-flows", status_code=status.HTTP_204_NO_CONTENT)
async def kill_flows(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    app = (await db.execute(select(App).where(App.id == app_id))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    await db.execute(delete(ResumePoint).where(ResumePoint.app_id == app_id))
    await db.commit()
    return None
