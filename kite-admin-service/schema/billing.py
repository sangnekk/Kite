from datetime import datetime
from pydantic import BaseModel


class SubscriptionListItem(BaseModel):
    id: str
    user_id: str
    user_email: str | None = None
    display_name: str | None = None
    source: str | None = None
    status: str | None = None
    renews_at: datetime | None = None
    trial_ends_at: datetime | None = None
    ends_at: datetime | None = None
    created_at: datetime


class SubscriptionListResponse(BaseModel):
    items: list[SubscriptionListItem]
    total: int
    page: int
    page_size: int


class EntitlementListItem(BaseModel):
    id: str
    type: str | None = None
    app_id: str
    app_name: str | None = None
    subscription_id: str | None = None
    plan_id: str | None = None
    ends_at: datetime | None = None
    created_at: datetime


class EntitlementListResponse(BaseModel):
    items: list[EntitlementListItem]
    total: int
    page: int
    page_size: int


class PaymentSessionListItem(BaseModel):
    id: str
    app_id: str
    app_name: str | None = None
    provider: str | None = None
    amount: int | None = None
    status: str | None = None
    paid_at: datetime | None = None
    created_at: datetime


class PaymentSessionListResponse(BaseModel):
    items: list[PaymentSessionListItem]
    total: int
    page: int
    page_size: int


class GrantEntitlementRequest(BaseModel):
    app_id: str
    plan_id: str
    duration_days: int | None = None  # None hoặc 0 = vĩnh viễn


class UpdateSubscriptionRequest(BaseModel):
    status: str | None = None


class UpdatePaymentSessionRequest(BaseModel):
    status: str | None = None
