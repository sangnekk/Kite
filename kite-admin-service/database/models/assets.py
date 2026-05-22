from sqlalchemy import Column, Text, Integer, DateTime, ForeignKey, Index
from database.base import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    content_hash = Column(Text, nullable=False)
    content_type = Column(Text, nullable=False)
    content_size = Column(Integer, nullable=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Text, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    creator_user_id = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("assets_app_id", "app_id"),
        Index("assets_module_id", "module_id"),
        Index("assets_content_hash", "content_hash"),
    )
