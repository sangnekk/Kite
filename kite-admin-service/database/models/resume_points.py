from sqlalchemy import Column, Text, BigInteger, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class ResumePoint(Base):
    __tablename__ = "resume_points"

    id = Column(Text, primary_key=True)
    type = Column(Text, nullable=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    command_id = Column(Text, ForeignKey("commands.id", ondelete="SET NULL"), nullable=True)
    event_listener_id = Column(Text, ForeignKey("event_listeners.id", ondelete="SET NULL"), nullable=True)
    message_id = Column(Text, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    message_instance_id = Column(BigInteger, ForeignKey("message_instances.id", ondelete="SET NULL"), nullable=True)
    flow_source_id = Column(Text, nullable=True)
    flow_node_id = Column(Text, nullable=False)
    flow_state = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("resume_points_app_id", "app_id"),
        Index("resume_points_command_id", "command_id"),
        Index("resume_points_event_listener_id", "event_listener_id"),
        Index("resume_points_message_id", "message_id"),
        Index("resume_points_message_instance_id", "message_instance_id"),
    )
