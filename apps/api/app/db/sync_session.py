from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import settings

# NullPool avoids holding server-side connections through PgBouncer transaction mode.
sync_engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    poolclass=NullPool,
)
# expire_on_commit=False keeps loaded ORM objects usable after an early commit, so we
# can release the DB transaction before slow LLM calls (avoids idle-in-transaction and
# statement-timeout on the pooler during report generation).
SyncSessionLocal = sessionmaker(
    bind=sync_engine, autocommit=False, autoflush=False, expire_on_commit=False
)


@contextmanager
def get_sync_db() -> Session:
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
