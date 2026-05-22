from datetime import datetime
from pydantic import BaseModel


class SubscriptionInfo(BaseModel):
    id: str
    status: str | None = None
    display_name: str | None = None
    renews_at: datetime | None = None
    ends_at: datetime | None = None


class AppInfo(BaseModel):
    id: str
    name: str
    enabled: bool
    created_at: datetime


class UserListItem(BaseModel):
    id: str
    email: str
    display_name: str
    discord_username: str
    discord_avatar: str | None = None
    plan: str
    apps_count: int
    created_at: datetime


class UserDetail(BaseModel):
    id: str
    email: str
    display_name: str
    discord_username: str
    discord_avatar: str | None = None
    plan: str
    apps_count: int
    apps: list[AppInfo]
    subscription: SubscriptionInfo | None = None
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    items: list[UserListItem]
    total: int
    page: int
    page_size: int
