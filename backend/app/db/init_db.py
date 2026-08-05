from app.db.base import Base
from app.db.session import engine


def init_db():
    """
    Create all database tables.
    Only used during development.
    """
    Base.metadata.create_all(bind=engine)