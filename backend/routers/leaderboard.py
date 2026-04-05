from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(limit: int = 20, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    users = (
        db.query(models.User)
        .filter(models.User.is_active == True)
        .order_by(models.User.total_score.desc())
        .limit(limit)
        .all()
    )
    result = []
    for rank, user in enumerate(users, 1):
        result.append(schemas.LeaderboardEntry(
            rank=rank,
            username=user.username,
            total_score=user.total_score or 0,
            league=user.league or "novice",
            total_attacks_blocked=user.total_attacks_blocked or 0,
        ))
    return result
