from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class Command(Base):
    __tablename__ = "commands"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    enabled = Column(Boolean, default=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Text, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    creator_user_id = Column(Text, nullable=False)
    flow_source = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    last_deployed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("commands_app_id", "app_id"),
        Index("commands_module_id", "module_id"),
    )
