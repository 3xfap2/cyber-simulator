from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models, schemas
from auth import get_current_user
from services.groq_service import get_ai_explanation, get_ai_mistake_analysis

router = APIRouter(prefix="/api/progress", tags=["progress"])

LEAGUE_THRESHOLDS = {
    "novice": 0,
    "defender": 500,
    "expert": 1500,
    "master": 3000,
}


def update_league(user: models.User):
    score = user.total_score
    if score >= 3000:
        user.league = "master"
    elif score >= 1500:
        user.league = "expert"
    elif score >= 500:
        user.league = "defender"
    else:
        user.league = "novice"


@router.post("/answer", response_model=schemas.AnswerResult)
def submit_answer(answer: schemas.AnswerSubmit, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    scenario = db.query(models.Scenario).filter(models.Scenario.id == answer.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Сценарий не найден")

    is_correct = answer.selected_option == scenario.correct_option
    options = scenario.options

    # Update or create progress
    progress = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id,
        models.UserProgress.scenario_id == scenario.id,
    ).first()

    if not progress:
        progress = models.UserProgress(
            user_id=current_user.id,
            scenario_id=scenario.id,
            attempts=0,
            score_earned=0,
        )
        db.add(progress)

    progress.attempts = (progress.attempts or 0) + 1
    progress.completed = True
    progress.correct = is_correct

    # Update user stats (guard against None values)
    current_user.total_attacks_faced = (current_user.total_attacks_faced or 0) + 1
    current_user.total_score = current_user.total_score or 0
    current_user.current_hp = current_user.current_hp if current_user.current_hp is not None else 100
    current_user.total_attacks_blocked = current_user.total_attacks_blocked or 0
    hp_change = 0
    score_change = 0

    if is_correct:
        current_user.total_attacks_blocked += 1
        score_change = scenario.score_reward or 100
        current_user.total_score += score_change
        progress.score_earned = score_change
        hp_change = min(10, 100 - current_user.current_hp)
        current_user.current_hp = min(100, current_user.current_hp + 10)
    else:
        hp_change = -(scenario.hp_penalty or 20)
        current_user.current_hp = max(0, current_user.current_hp - (scenario.hp_penalty or 20))

    update_league(current_user)
    db.commit()

    # Get AI explanation
    selected_text = options[answer.selected_option]["text"] if answer.selected_option < len(options) else ""
    correct_text = options[scenario.correct_option]["text"] if scenario.correct_option < len(options) else ""
    ai_explanation = get_ai_explanation(
        attack_type=scenario.attack_type,
        user_choice=selected_text,
        correct_action=correct_text,
        red_flags=scenario.red_flags or [],
        is_correct=is_correct,
    )

    return schemas.AnswerResult(
        correct=is_correct,
        correct_option=scenario.correct_option,
        explanation=scenario.explanation,
        red_flags=scenario.red_flags or [],
        hp_change=hp_change,
        score_change=score_change,
        current_hp=current_user.current_hp,
        current_score=current_user.total_score,
        ai_explanation=ai_explanation,
    )


@router.get("/mistakes", response_model=List[schemas.MistakeOut])
def get_mistakes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    wrong = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id,
        models.UserProgress.correct == False,
    ).all()
    result = []
    for m in wrong:
        if m.scenario:
            result.append(schemas.MistakeOut(
                scenario_id=m.scenario_id,
                title=m.scenario.title,
                attack_type=m.scenario.attack_type,
                difficulty=m.scenario.difficulty or "medium",
                explanation=m.scenario.explanation,
                red_flags=m.scenario.red_flags or [],
                attempts=m.attempts or 1,
            ))
    return result


@router.get("/ai-analysis", response_model=schemas.AiAnalysisOut)
def get_ai_analysis(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    wrong = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id,
        models.UserProgress.correct == False,
    ).all()
    if not wrong:
        return schemas.AiAnalysisOut(analysis="Отличная работа! Пока ошибок нет. Продолжай в том же духе.", total_mistakes=0)

    mistakes_data = []
    attack_counts: dict = {}
    for m in wrong:
        if m.scenario:
            t = m.scenario.attack_type
            attack_counts[t] = attack_counts.get(t, 0) + 1
            mistakes_data.append({"title": m.scenario.title, "attack_type": t})

    weakest = max(attack_counts, key=lambda k: attack_counts[k]) if attack_counts else None
    analysis_text = get_ai_mistake_analysis(mistakes_data)

    return schemas.AiAnalysisOut(
        analysis=analysis_text,
        total_mistakes=len(wrong),
        weakest_attack_type=weakest,
    )


@router.get("/my", response_model=List[schemas.UserProgressOut])
def get_my_progress(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.UserProgress).filter(models.UserProgress.user_id == current_user.id).all()


@router.get("/stats", response_model=schemas.UserStats)
def get_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_scenarios = db.query(models.Scenario).count()
    completed = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id,
        models.UserProgress.completed == True,
    ).count()

    faced = current_user.total_attacks_faced or 0
    blocked = current_user.total_attacks_blocked or 0
    accuracy = 0.0
    if faced > 0:
        accuracy = round(blocked / faced * 100, 1)

    progress_percent = round(completed / total_scenarios * 100, 1) if total_scenarios > 0 else 0.0

    return schemas.UserStats(
        total_score=current_user.total_score or 0,
        current_hp=current_user.current_hp if current_user.current_hp is not None else 100,
        league=current_user.league or "novice",
        total_attacks_faced=faced,
        total_attacks_blocked=blocked,
        accuracy=accuracy,
        completed_scenarios=completed,
        total_scenarios=total_scenarios,
        progress_percent=progress_percent,
    )
