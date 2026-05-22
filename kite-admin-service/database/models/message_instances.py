from sqlalchemy import Column, Text, Boolean, DateTime, BigInteger, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class MessageInstance(Base):
    __tablename__ = "message_instances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    message_id = Column(Text, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    hidden = Column(Boolean, default=False)
    ephemeral = Column(Boolean, default=False)
    discord_guild_id = Column(Text, nullable=False)
    discord_channel_id = Column(Text, nullable=False)
    discord_message_id = Column(Text, unique=True, nullable=False)
    flow_sources = Column(JSONB, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("message_instances_message_id", "message_id"),
    )
