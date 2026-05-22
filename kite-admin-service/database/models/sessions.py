from sqlalchemy import Column, Text, DateTime, ForeignKey
from database.base import Base


class Session(Base):
    __tablename__ = "sessions"

    key_hash = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
