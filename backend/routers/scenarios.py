from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("/levels", response_model=List[schemas.LevelOut])
def get_levels(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    levels = db.query(models.Level).options(joinedload(models.Level.scenarios)).order_by(models.Level.order).all()
    return levels


@router.get("/levels/{level_id}", response_model=schemas.LevelOut)
def get_level(level_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    level = db.query(models.Level).options(joinedload(models.Level.scenarios)).filter(models.Level.id == level_id).first()
    if not level:
        raise HTTPException(status_code=404, detail="Уровень не найден")
    return level


@router.get("/levels/{level_id}/scenarios", response_model=List[schemas.ScenarioOut])
def get_level_scenarios(
    level_id: int,
    difficulty: Optional[str] = Query(None, description="easy | medium | hard"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Scenario).filter(models.Scenario.level_id == level_id)
    if difficulty:
        q = q.filter(models.Scenario.difficulty == difficulty)
    return q.order_by(models.Scenario.order).all()


@router.get("/{scenario_id}", response_model=schemas.ScenarioOut)
def get_scenario(scenario_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Сценарий не найден")
    return scenario
