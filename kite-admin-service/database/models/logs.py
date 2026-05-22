from sqlalchemy import Column, Text, DateTime, BigInteger, ForeignKey, Index
from database.base import Base


class Log(Base):
    __tablename__ = "logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    level = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    command_id = Column(Text, ForeignKey("commands.id", ondelete="SET NULL"), nullable=True)
    event_listener_id = Column(Text, ForeignKey("event_listeners.id", ondelete="SET NULL"), nullable=True)
    message_id = Column(Text, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        Index("logs_app_id", "app_id"),
        Index("logs_command_id", "command_id"),
        Index("logs_event_listener_id", "event_listener_id"),
        Index("logs_message_id", "message_id"),
    )
