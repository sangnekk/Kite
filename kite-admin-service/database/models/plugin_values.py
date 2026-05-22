from sqlalchemy import Column, Text, DateTime, BigInteger, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class PluginValue(Base):
    __tablename__ = "plugin_values"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plugin_instance_id = Column(Text, ForeignKey("plugin_instances.id", ondelete="CASCADE"), nullable=False)
    key = Column(Text, nullable=False)
    value = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        UniqueConstraint("plugin_instance_id", "key"),
        Index("plugin_values_plugin_instance_id", "plugin_instance_id"),
        Index("plugin_values_plugin_instance_key", "plugin_instance_id", "key"),
    )
