from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Load environment variables from .env if present
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set. Please set it to your online PostgreSQL connection string.")

engine = create_async_engine(DATABASE_URL, echo = False, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False) # type: ignore
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an AsyncSession per request.

    This function is intended to be used with `Depends()` in route handlers.
    It creates a new database session, yields it to the request scope,
    and ensures the session is properly closed after the request finishes.

    Note:
        - This does NOT automatically start a transaction.
        - Transaction management (commit/rollback) should be handled explicitly if needed.
    """
    async with SessionLocal() as session:

        yield session


@asynccontextmanager
async def db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Async context manager for manually managing a database session.

    This is useful outside of FastAPI dependency injection, such as in
    background tasks, services, or scripts. It creates a session and ensures
    it is properly closed when exiting the context.
    Usage:

        async with db_context() as session:

            ...
    Note:

        - This does NOT automatically start a transaction.

        - Use `session.begin()` if transactional scope is required.

    """

    async with SessionLocal() as session:

        yield session
