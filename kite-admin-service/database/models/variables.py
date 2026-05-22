from sqlalchemy import Column, Text, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from database.base import Base


class Variable(Base):
    __tablename__ = "variables"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    scoped = Column(Boolean, default=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Text, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        UniqueConstraint("app_id", "name"),
        Index("variables_app_id", "app_id"),
        Index("variables_module_id", "module_id"),
    )
