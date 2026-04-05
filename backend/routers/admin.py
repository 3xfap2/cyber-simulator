from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
import models
from auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

ATTACK_LABELS = {
    "phishing": "Фишинг",
    "vishing": "Вишинг",
    "skimming": "Скимминг",
    "social_engineering": "Соц. инженерия",
    "brute_force": "Подбор пароля",
    "api_security": "Атака на API",
}


def require_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin and current_user.username != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return current_user


@router.get("/overview")
def get_overview(db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    total_users = db.query(func.count(models.User.id)).filter(models.User.is_admin == False).scalar() or 0
    total_plays = db.query(func.count(models.UserProgress.id)).scalar() or 0
    total_correct = (
        db.query(func.count(models.UserProgress.id))
        .filter(models.UserProgress.correct == True)
        .scalar() or 0
    )
    total_certs = db.query(func.count(models.Certificate.id)).scalar() or 0

    # Most failed attack type
    attack_fail_counts = (
        db.query(
            models.Scenario.attack_type,
            func.count(models.UserProgress.id).label("fails"),
        )
        .join(models.UserProgress, models.Scenario.id == models.UserProgress.scenario_id)
        .filter(models.UserProgress.correct == False)
        .group_by(models.Scenario.attack_type)
        .order_by(func.count(models.UserProgress.id).desc())
        .first()
    )

    fail_rate = round((total_plays - total_correct) / total_plays * 100, 1) if total_plays > 0 else 0.0
    most_failed = ATTACK_LABELS.get(attack_fail_counts.attack_type, attack_fail_counts.attack_type) if attack_fail_counts else "—"

    return {
        "total_users": total_users,
        "total_plays": total_plays,
        "total_correct": total_correct,
        "fail_rate": fail_rate,
        "total_certs": total_certs,
        "most_failed_attack": most_failed,
    }


@router.get("/attack-stats")
def get_attack_stats(db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    attack_types = ["phishing", "vishing", "skimming", "social_engineering", "brute_force", "api_security"]
    result = []

    for attack_type in attack_types:
        scenario_ids = (
            db.query(models.Scenario.id)
            .filter(models.Scenario.attack_type == attack_type)
            .all()
        )
        ids = [s.id for s in scenario_ids]
        if not ids:
            continue

        total = (
            db.query(func.count(models.UserProgress.id))
            .filter(models.UserProgress.scenario_id.in_(ids))
            .scalar() or 0
        )
        fails = (
            db.query(func.count(models.UserProgress.id))
            .filter(
                models.UserProgress.scenario_id.in_(ids),
                models.UserProgress.correct == False,
            )
            .scalar() or 0
        )

        result.append({
            "attack_type": attack_type,
            "label": ATTACK_LABELS.get(attack_type, attack_type),
            "total": total,
            "fails": fails,
            "correct": total - fails,
            "fail_rate": round(fails / total * 100, 1) if total > 0 else 0.0,
        })

    # Sort by fail_rate desc
    result.sort(key=lambda x: x["fail_rate"], reverse=True)
    return result


@router.get("/users")
def get_users(db: Session = Depends(get_db), _: models.User = Depends(require_admin)):
    users = (
        db.query(models.User)
        .filter(models.User.is_admin == False)
        .order_by(models.User.total_score.desc())
        .all()
    )
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "league": u.league,
            "total_score": u.total_score or 0,
            "total_attacks_faced": u.total_attacks_faced or 0,
            "total_attacks_blocked": u.total_attacks_blocked or 0,
            "current_hp": u.current_hp if u.current_hp is not None else 100,
            "accuracy": round(
                (u.total_attacks_blocked or 0) / (u.total_attacks_faced or 1) * 100, 1
            ),
            "created_at": u.created_at.strftime("%d.%m.%Y") if u.created_at else "—",
        }
        for u in users
    ]
