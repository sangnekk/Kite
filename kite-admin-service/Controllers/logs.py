from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.base import get_db
from database.models.logs import Log
from database.models.apps import App
from schema.logs import LogListItem, LogListResponse, AppOption
from utils.auth_deps import require_admin

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=LogListResponse)
async def list_logs(
    search: str = Query("", max_length=200),
    level: str = Query(""),
    app_id: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    query = select(Log)

    if level:
        query = query.where(Log.level == level)
    if app_id:
        query = query.where(Log.app_id == app_id)
    if search:
        query = query.where(Log.message.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Log.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    logs = (await db.execute(query)).scalars().all()

    app_ids = list({l.app_id for l in logs})
    app_map: dict[str, str] = {}
    if app_ids:
        rows = (await db.execute(select(App.id, App.name).where(App.id.in_(app_ids)))).all()
        for r in rows:
            app_map[r.id] = r.name

    items = [
        LogListItem(
            id=l.id,
            app_id=l.app_id,
            app_name=app_map.get(l.app_id),
            message=l.message,
            level=l.level,
            command_id=l.command_id,
            event_listener_id=l.event_listener_id,
            message_id=l.message_id,
            created_at=l.created_at,
        )
        for l in logs
    ]

    return LogListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/apps", response_model=list[AppOption])
async def list_log_apps(
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    rows = (await db.execute(
        select(App.id, App.name).order_by(App.name)
    )).all()
    return [AppOption(id=r.id, name=r.name) for r in rows]
