from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class App(Base):
    __tablename__ = "apps"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    enabled = Column(Boolean, default=True)
    owner_user_id = Column(Text, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    creator_user_id = Column(Text, nullable=False)
    discord_token = Column(Text, nullable=False)
    discord_id = Column(Text, unique=True, nullable=False)
    discord_status = Column(JSONB, nullable=True)
    disabled_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("apps_owner_user_id", "owner_user_id"),
    )
