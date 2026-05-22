from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class EventListener(Base):
    __tablename__ = "event_listeners"

    id = Column(Text, primary_key=True)
    source = Column(Text, nullable=False)
    type = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    enabled = Column(Boolean, default=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Text, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    creator_user_id = Column(Text, nullable=False)
    filter = Column(JSONB, nullable=True)
    flow_source = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("event_listeners_app_id", "app_id"),
        Index("event_listeners_module_id", "module_id"),
    )
