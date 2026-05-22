from datetime import datetime
from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_users: int
    total_apps: int
    active_apps: int
    disabled_apps: int
    errors_24h: int
    errors_prev_24h: int
    total_credits: int
    active_subscriptions: int


class UsageTimeSeriesItem(BaseModel):
    date: str
    credits: int
    errors: int


class RecentLogItem(BaseModel):
    id: int
    app_id: str
    app_name: str | None = None
    message: str | None = None
    level: str | None = None
    created_at: datetime


class DashboardResponse(BaseModel):
    stats: DashboardStats
    usage_chart: list[UsageTimeSeriesItem]
    recent_logs: list[RecentLogItem]
