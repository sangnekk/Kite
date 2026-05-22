from datetime import datetime
from pydantic import BaseModel


class CollaboratorInfo(BaseModel):
    user_id: str
    role: str


class AppListItem(BaseModel):
    id: str
    name: str
    owner_id: str
    owner_email: str | None = None
    enabled: bool
    discord_status: dict | None = None
    disabled_reason: str | None = None
    credits_used: int = 0
    collaborators_count: int = 0
    created_at: datetime


class AppDetail(BaseModel):
    id: str
    name: str
    description: str | None = None
    owner_id: str
    owner_email: str | None = None
    creator_user_id: str
    enabled: bool
    discord_id: str | None = None
    discord_status: dict | None = None
    disabled_reason: str | None = None
    collaborators: list[CollaboratorInfo] = []
    credits_used: int = 0
    resume_points_count: int = 0
    created_at: datetime
    updated_at: datetime


class AppListResponse(BaseModel):
    items: list[AppListItem]
    total: int
    page: int
    page_size: int


class UpdateAppRequest(BaseModel):
    enabled: bool | None = None
    disabled_reason: str | None = None
