from datetime import datetime
from pydantic import BaseModel


class LogListItem(BaseModel):
    id: int
    app_id: str
    app_name: str | None = None
    message: str | None = None
    level: str | None = None
    command_id: str | None = None
    event_listener_id: str | None = None
    message_id: str | None = None
    created_at: datetime


class LogListResponse(BaseModel):
    items: list[LogListItem]
    total: int
    page: int
    page_size: int


class AppOption(BaseModel):
    id: str
    name: str
