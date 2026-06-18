import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database.base import get_db
from database.models.subscriptions import Subscription
from database.models.entitlements import Entitlement
from database.models.payment_sessions import PaymentSession
from database.models.users import User
from database.models.apps import App
from schema.billing import (
    SubscriptionListItem, SubscriptionListResponse,
    EntitlementListItem, EntitlementListResponse,
    PaymentSessionListItem, PaymentSessionListResponse,
    UpdateSubscriptionRequest, UpdatePaymentSessionRequest,
    GrantEntitlementRequest,
)
from utils.auth_deps import require_admin

router = APIRouter(prefix="/billing", tags=["billing"])


# ── Subscriptions ──────────────────────────────────────────────

@router.get("/subscriptions", response_model=SubscriptionListResponse)
async def list_subscriptions(
    search: str = Query("", max_length=100),
    status_filter: str = Query("", alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    query = select(Subscription)

    if status_filter:
        query = query.where(Subscription.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Subscription.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    subs = (await db.execute(query)).scalars().all()

    user_ids = list({s.user_id for s in subs})
    email_map: dict[str, str] = {}
    if user_ids:
        rows = (await db.execute(select(User.id, User.email).where(User.id.in_(user_ids)))).all()
        for r in rows:
            email_map[r.id] = r.email

    if search:
        subs = [s for s in subs if search.lower() in (email_map.get(s.user_id, "")).lower()]
        total = len(subs)

    items = [
        SubscriptionListItem(
            id=s.id,
            user_id=s.user_id,
            user_email=email_map.get(s.user_id),
            display_name=s.display_name,
            source=s.source,
            status=s.status,
            renews_at=s.renews_at,
            trial_ends_at=s.trial_ends_at,
            ends_at=s.ends_at,
            created_at=s.created_at,
        )
        for s in subs
    ]

    return SubscriptionListResponse(items=items, total=total, page=page, page_size=page_size)


@router.patch("/subscriptions/{sub_id}")
async def update_subscription(
    sub_id: str,
    body: UpdateSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    sub = (await db.execute(select(Subscription).where(Subscription.id == sub_id))).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    update_data["updated_at"] = now

    if update_data.get("status") == "cancelled":
        update_data["ends_at"] = now

    await db.execute(update(Subscription).where(Subscription.id == sub_id).values(**update_data))
    await db.commit()

    return {"ok": True}


# ── Entitlements ───────────────────────────────────────────────

@router.get("/entitlements", response_model=EntitlementListResponse)
async def list_entitlements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    query = select(Entitlement)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Entitlement.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ents = (await db.execute(query)).scalars().all()

    app_ids = list({e.app_id for e in ents})
    app_map: dict[str, str] = {}
    if app_ids:
        rows = (await db.execute(select(App.id, App.name).where(App.id.in_(app_ids)))).all()
        for r in rows:
            app_map[r.id] = r.name

    items = [
        EntitlementListItem(
            id=e.id,
            type=e.type,
            app_id=e.app_id,
            app_name=app_map.get(e.app_id),
            subscription_id=e.subscription_id,
            plan_id=e.plan_id,
            ends_at=e.ends_at,
            created_at=e.created_at,
        )
        for e in ents
    ]

    return EntitlementListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/entitlements", response_model=EntitlementListItem, status_code=status.HTTP_201_CREATED)
async def grant_entitlement(
    body: GrantEntitlementRequest,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    app = (await db.execute(select(App).where(App.id == body.app_id))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    ends_at = None
    if body.duration_days and body.duration_days > 0:
        ends_at = now + timedelta(days=body.duration_days)

    ent = Entitlement(
        id=uuid.uuid4().hex,
        type="manual",
        subscription_id=None,
        app_id=body.app_id,
        plan_id=body.plan_id,
        created_at=now,
        updated_at=now,
        ends_at=ends_at,
    )
    db.add(ent)
    await db.commit()

    return EntitlementListItem(
        id=ent.id,
        type=ent.type,
        app_id=ent.app_id,
        app_name=app.name,
        subscription_id=ent.subscription_id,
        plan_id=ent.plan_id,
        ends_at=ent.ends_at,
        created_at=ent.created_at,
    )


@router.delete("/entitlements/{ent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entitlement(
    ent_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    ent = (await db.execute(select(Entitlement).where(Entitlement.id == ent_id))).scalar_one_or_none()
    if not ent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entitlement not found")

    await db.execute(delete(Entitlement).where(Entitlement.id == ent_id))
    await db.commit()
    return None


# ── Payment Sessions ──────────────────────────────────────────

@router.get("/payment-sessions", response_model=PaymentSessionListResponse)
async def list_payment_sessions(
    status_filter: str = Query("", alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    query = select(PaymentSession)

    if status_filter:
        query = query.where(PaymentSession.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(PaymentSession.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    sessions = (await db.execute(query)).scalars().all()

    app_ids = list({s.app_id for s in sessions})
    app_map: dict[str, str] = {}
    if app_ids:
        rows = (await db.execute(select(App.id, App.name).where(App.id.in_(app_ids)))).all()
        for r in rows:
            app_map[r.id] = r.name

    items = [
        PaymentSessionListItem(
            id=s.id,
            app_id=s.app_id,
            app_name=app_map.get(s.app_id),
            provider=s.provider,
            amount=s.amount,
            status=s.status,
            paid_at=s.paid_at,
            created_at=s.created_at,
        )
        for s in sessions
    ]

    return PaymentSessionListResponse(items=items, total=total, page=page, page_size=page_size)


@router.patch("/payment-sessions/{session_id}")
async def update_payment_session(
    session_id: str,
    body: UpdatePaymentSessionRequest,
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    session = (await db.execute(
        select(PaymentSession).where(PaymentSession.id == session_id)
    )).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment session not found")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    update_data["updated_at"] = now

    if update_data.get("status") == "paid":
        update_data["paid_at"] = now

    await db.execute(update(PaymentSession).where(PaymentSession.id == session_id).values(**update_data))
    await db.commit()

    return {"ok": True}
