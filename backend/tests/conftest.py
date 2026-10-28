import pytest
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.services.demo_seeder import seed_demo_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    # Create all tables before tests run
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_database(db, force_reset=True)
    db.close()
    yield
