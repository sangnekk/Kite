from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class Module(Base):
    __tablename__ = "modules"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    enabled = Column(Boolean, default=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    creator_user_id = Column(Text, nullable=False)
    resources = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
