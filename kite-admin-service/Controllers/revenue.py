from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.base import get_db
from database.models.payment_sessions import PaymentSession
from database.models.subscriptions import Subscription
from utils.auth_deps import get_current_user

router = APIRouter(prefix="/revenue", tags=["revenue"])


def _period_boundaries(period: str) -> tuple[datetime, datetime, datetime, datetime]:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if period == "day":
        current_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = current_start - timedelta(days=1)
    elif period == "week":
        current_start = now - timedelta(days=now.weekday())
        current_start = current_start.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = current_start - timedelta(weeks=1)
    else:
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 1:
            prev_start = now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            prev_start = now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)

    return prev_start, current_start, current_start, now


@router.get("/summary")
async def revenue_summary(
    period: str = Query("month", pattern="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    prev_start, prev_end, cur_start, cur_end = _period_boundaries(period)

    async def _agg(start: datetime, end: datetime):
        result = await db.execute(
            select(
                func.coalesce(func.sum(PaymentSession.amount), 0),
                func.count(),
            ).where(
                PaymentSession.status == "paid",
                PaymentSession.paid_at >= start,
                PaymentSession.paid_at < end,
            )
        )
        row = result.one()
        return int(row[0]), int(row[1])

    current_total, current_count = await _agg(cur_start, cur_end)
    prev_total, prev_count = await _agg(prev_start, prev_end)

    return {
        "total": current_total,
        "count": current_count,
        "prev_total": prev_total,
        "prev_count": prev_count,
    }


@router.get("/chart")
async def revenue_chart(
    period: str = Query("month", pattern="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if period == "day":
        start = now - timedelta(hours=24)
        trunc = func.date_trunc("hour", PaymentSession.paid_at)
    elif period == "week":
        start = now - timedelta(days=7)
        trunc = func.date_trunc("day", PaymentSession.paid_at)
    else:
        start = now - timedelta(days=30)
        trunc = func.date_trunc("day", PaymentSession.paid_at)

    result = await db.execute(
        select(
            trunc.label("bucket"),
            func.coalesce(func.sum(PaymentSession.amount), 0).label("total"),
            func.count().label("count"),
        )
        .where(
            PaymentSession.status == "paid",
            PaymentSession.paid_at >= start,
        )
        .group_by("bucket")
        .order_by("bucket")
    )

    return [
        {"date": row.bucket.isoformat(), "total": int(row.total), "count": int(row.count)}
        for row in result.all()
    ]


@router.get("/subscriptions")
async def subscription_stats(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(
            Subscription.status,
            func.count().label("count"),
        ).group_by(Subscription.status)
    )

    stats = {row.status: row.count for row in result.all()}
    return {
        "active": stats.get("active", 0),
        "cancelled": stats.get("cancelled", 0),
        "trial": stats.get("on_trial", 0),
        "total": sum(stats.values()),
    }
