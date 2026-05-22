from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from database.base import Base


class PluginInstance(Base):
    __tablename__ = "plugin_instances"

    id = Column(Text, primary_key=True)
    plugin_id = Column(Text, nullable=False)
    enabled = Column(Boolean, default=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    creator_user_id = Column(Text, nullable=False)
    config = Column(JSONB, nullable=False)
    enabled_resource_ids = Column(ARRAY(Text), nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    last_deployed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("plugin_id", "app_id"),
        Index("plugin_instances_app_id", "app_id"),
        Index("plugin_instances_plugin_id", "plugin_id"),
    )
