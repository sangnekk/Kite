from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from database.base import get_db
from database.models.users import User
from database.models.apps import App
from database.models.logs import Log
from database.models.usage_records import UsageRecord
from database.models.subscriptions import Subscription
from schema.dashboard import DashboardResponse, DashboardStats, UsageTimeSeriesItem, RecentLogItem
from utils.auth_deps import require_admin

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    # DB timestamp columns are naive UTC (TIMESTAMP, not TIMESTAMPTZ); keep comparisons naive
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    h24_ago = now - timedelta(hours=24)
    h48_ago = now - timedelta(hours=48)

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0

    app_counts = (await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(App.enabled == True).label("active"),
        ).select_from(App)
    )).one()
    total_apps = app_counts.total
    active_apps = app_counts.active
    disabled_apps = total_apps - active_apps

    errors_24h = (await db.execute(
        select(func.count()).select_from(Log).where(Log.level == "error", Log.created_at >= h24_ago)
    )).scalar() or 0

    errors_prev_24h = (await db.execute(
        select(func.count()).select_from(Log).where(
            Log.level == "error", Log.created_at >= h48_ago, Log.created_at < h24_ago
        )
    )).scalar() or 0

    total_credits = (await db.execute(
        select(func.coalesce(func.sum(UsageRecord.credits_used), 0))
    )).scalar()
    total_credits = int(total_credits) if total_credits else 0

    active_subs = (await db.execute(
        select(func.count()).select_from(Subscription).where(Subscription.status.in_(["active", "on_trial"]))
    )).scalar() or 0

    stats = DashboardStats(
        total_users=total_users,
        total_apps=total_apps,
        active_apps=active_apps,
        disabled_apps=disabled_apps,
        errors_24h=errors_24h,
        errors_prev_24h=errors_prev_24h,
        total_credits=total_credits,
        active_subscriptions=active_subs,
    )

    days_ago_7 = now - timedelta(days=7)
    trunc_day = func.date_trunc("day", UsageRecord.created_at)

    usage_rows = (await db.execute(
        select(
            trunc_day.label("day"),
            func.coalesce(func.sum(UsageRecord.credits_used), 0).label("credits"),
        )
        .where(UsageRecord.created_at >= days_ago_7)
        .group_by("day")
        .order_by("day")
    )).all()

    error_rows = (await db.execute(
        select(
            func.date_trunc("day", Log.created_at).label("day"),
            func.count().label("errors"),
        )
        .where(Log.level == "error", Log.created_at >= days_ago_7)
        .group_by("day")
        .order_by("day")
    )).all()

    usage_map: dict[str, int] = {}
    for r in usage_rows:
        key = r.day.strftime("%b %d")
        usage_map[key] = int(r.credits)

    error_map: dict[str, int] = {}
    for r in error_rows:
        key = r.day.strftime("%b %d")
        error_map[key] = int(r.errors)

    all_dates: list[str] = []
    for i in range(7):
        d = now - timedelta(days=6 - i)
        all_dates.append(d.strftime("%b %d"))

    usage_chart = [
        UsageTimeSeriesItem(
            date=d,
            credits=usage_map.get(d, 0),
            errors=error_map.get(d, 0),
        )
        for d in all_dates
    ]

    recent_logs_rows = (await db.execute(
        select(Log).order_by(Log.created_at.desc()).limit(10)
    )).scalars().all()

    app_ids = list({l.app_id for l in recent_logs_rows})
    app_map: dict[str, str] = {}
    if app_ids:
        rows = (await db.execute(select(App.id, App.name).where(App.id.in_(app_ids)))).all()
        for r in rows:
            app_map[r.id] = r.name

    recent_logs = [
        RecentLogItem(
            id=l.id,
            app_id=l.app_id,
            app_name=app_map.get(l.app_id),
            message=l.message,
            level=l.level,
            created_at=l.created_at,
        )
        for l in recent_logs_rows
    ]

    return DashboardResponse(stats=stats, usage_chart=usage_chart, recent_logs=recent_logs)
