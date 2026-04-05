from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
from auth import get_current_user

router = APIRouter(prefix="/api/achievements", tags=["achievements"])

ALL_ACHIEVEMENTS = [
    {"id": "first_blood",   "name": "Первый бой",          "desc": "Пройди первый сценарий",                         "icon": "⚔️",  "rarity": "common"},
    {"id": "score_500",     "name": "Новобранец",           "desc": "Набери 500 очков",                               "icon": "🥉",  "rarity": "common"},
    {"id": "score_1500",    "name": "Защитник",             "desc": "Набери 1500 очков",                              "icon": "🥈",  "rarity": "rare"},
    {"id": "score_3000",    "name": "Мастер безопасности",  "desc": "Набери 3000 очков",                              "icon": "🏆",  "rarity": "epic"},
    {"id": "phishing_5",    "name": "Антифишер",            "desc": "Отрази 5 фишинговых атак",                       "icon": "🎣",  "rarity": "common"},
    {"id": "phishing_10",   "name": "Детектор фишинга",     "desc": "Отрази 10 фишинговых атак",                      "icon": "🔍",  "rarity": "rare"},
    {"id": "social_3",      "name": "Социальный щит",       "desc": "Отрази 3 атаки социальной инженерии",            "icon": "🛡️",  "rarity": "common"},
    {"id": "hard_5",        "name": "Элита",                "desc": "Пройди 5 тяжёлых сценариев верно",               "icon": "💎",  "rarity": "epic"},
    {"id": "accuracy_90",   "name": "Снайпер",              "desc": "Точность выше 90% (мин. 10 ответов)",            "icon": "🎯",  "rarity": "rare"},
    {"id": "hp_high",       "name": "Несгибаемый",          "desc": "Сохрани HP выше 80 после 10 сценариев",          "icon": "💪",  "rarity": "rare"},
    {"id": "all_types",     "name": "Полный арсенал",       "desc": "Отрази все 5 типов атак хотя бы по разу",        "icon": "🗡️",  "rarity": "rare"},
    {"id": "survivor",      "name": "Феникс",               "desc": "Набери очки несмотря на потерянный HP",          "icon": "❤️‍🔥", "rarity": "epic"},
    {"id": "vishing_stop",  "name": "Параноик-телефонист",  "desc": "Отрази 3 вишинговые атаки",                      "icon": "📵",  "rarity": "common"},
    {"id": "skimmer_hunt",  "name": "Охотник на скиммеры",  "desc": "Распознай 2 скимминговые атаки",                 "icon": "🔎",  "rarity": "common"},
    {"id": "legend",        "name": "Легенда",              "desc": "Получи 10 других достижений",                    "icon": "👑",  "rarity": "legendary"},
]

RARITY_ORDER = {"common": 0, "rare": 1, "epic": 2, "legendary": 3}


def calculate_earned(user: models.User, progress_records: list) -> set:
    earned = set()
    correct = [p for p in progress_records if p.correct and p.scenario]
    wrong   = [p for p in progress_records if not p.correct]

    if progress_records:
        earned.add("first_blood")

    if user.total_score >= 500:   earned.add("score_500")
    if user.total_score >= 1500:  earned.add("score_1500")
    if user.total_score >= 3000:  earned.add("score_3000")

    phishing_ok = sum(1 for p in correct if p.scenario.attack_type == "phishing")
    if phishing_ok >= 5:  earned.add("phishing_5")
    if phishing_ok >= 10: earned.add("phishing_10")

    social_ok = sum(1 for p in correct if p.scenario.attack_type == "social_engineering")
    if social_ok >= 3: earned.add("social_3")

    vishing_ok = sum(1 for p in correct if p.scenario.attack_type == "vishing")
    if vishing_ok >= 3: earned.add("vishing_stop")

    skimming_ok = sum(1 for p in correct if p.scenario.attack_type == "skimming")
    if skimming_ok >= 2: earned.add("skimmer_hunt")

    hard_ok = sum(1 for p in correct if p.scenario.difficulty == "hard")
    if hard_ok >= 5: earned.add("hard_5")

    if user.total_attacks_faced >= 10:
        acc = user.total_attacks_blocked / user.total_attacks_faced
        if acc >= 0.9: earned.add("accuracy_90")

    if user.current_hp >= 80 and user.total_attacks_faced >= 10:
        earned.add("hp_high")

    attack_types_seen = {p.scenario.attack_type for p in correct}
    if {"phishing", "vishing", "skimming", "social_engineering", "brute_force"}.issubset(attack_types_seen):
        earned.add("all_types")

    if wrong and user.total_score >= 300:
        earned.add("survivor")

    if len(earned) >= 10:
        earned.add("legend")

    return earned


@router.get("/my")
def get_my_achievements(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    progress = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id
    ).all()

    earned_ids = calculate_earned(current_user, progress)

    result = []
    for ach in ALL_ACHIEVEMENTS:
        result.append({**ach, "earned": ach["id"] in earned_ids})

    # Sort: earned first, then by rarity desc
    result.sort(key=lambda a: (-int(a["earned"]), -RARITY_ORDER.get(a["rarity"], 0)))
    return result
