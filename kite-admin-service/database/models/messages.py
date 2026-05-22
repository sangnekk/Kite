from sqlalchemy import Column, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    data = Column(JSONB, nullable=False)
    flow_sources = Column(JSONB, nullable=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Text, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    creator_user_id = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("messages_app_id", "app_id"),
        Index("messages_module_id", "module_id"),
    )
