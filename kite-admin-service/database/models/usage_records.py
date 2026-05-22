from sqlalchemy import Column, Text, Integer, DateTime, BigInteger, ForeignKey, Index
from database.base import Base


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    type = Column(Text, nullable=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    command_id = Column(Text, ForeignKey("commands.id", ondelete="SET NULL"), nullable=True)
    event_listener_id = Column(Text, ForeignKey("event_listeners.id", ondelete="SET NULL"), nullable=True)
    message_id = Column(Text, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    credits_used = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("usage_records_app_id", "app_id"),
        Index("usage_records_command_id", "command_id"),
        Index("usage_records_event_listener_id", "event_listener_id"),
        Index("usage_records_message_id", "message_id"),
    )
