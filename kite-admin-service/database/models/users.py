from sqlalchemy import Column, Text, DateTime
from database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Text, primary_key=True)
    email = Column(Text, unique=True, nullable=False)
    display_name = Column(Text, nullable=False)
    discord_id = Column(Text, unique=True, nullable=False)
    discord_username = Column(Text, nullable=False)
    discord_avatar = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
