from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.services.demo_seeder import seed_demo_database

router = APIRouter(prefix="/demo", tags=["Demo Mode"])

class ResetConfirmRequest(BaseModel):
    confirm_reset: bool = False

@router.post("/seed")
def seed_demo_data(force_reset: bool = False, db: DBSession = Depends(get_db)):
    result = seed_demo_database(db, force_reset=force_reset)
    return result

@router.post("/reset")
def reset_demo_data(payload: ResetConfirmRequest, db: DBSession = Depends(get_db)):
    if not payload.confirm_reset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation flag 'confirm_reset' is required to re-seed demo data"
        )
    result = seed_demo_database(db, force_reset=True)
    return result
