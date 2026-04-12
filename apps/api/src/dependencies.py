from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import settings

engine: AsyncEngine | None = None
async_session: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global engine, async_session

    if engine is None:
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        async_session = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    return engine


def get_async_session() -> async_sessionmaker[AsyncSession]:
    global async_session

    if async_session is None:
        get_engine()

    if async_session is None:
        raise RuntimeError("Async session factory was not initialized.")

    return async_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with get_async_session()() as session:
        yield session
