import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.core.database import Base, engine, SessionLocal
from backend.app.services.demo_seeder import seed_demo_database

def main():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Seeding deterministic demo data...")
        res = seed_demo_database(db, force_reset=True)
        print(f"Success: {res['message']}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
