from sqlalchemy import Column, Text, DateTime, ForeignKey, Index
from database.base import Base


class Collaborator(Base):
    __tablename__ = "collaborators"

    user_id = Column(Text, ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), primary_key=True)
    role = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("collaborators_user_id", "user_id"),
        Index("collaborators_app_id", "app_id"),
    )
