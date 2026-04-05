from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# Auth
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    total_score: int = 0
    total_attacks_faced: int = 0
    total_attacks_blocked: int = 0
    current_hp: int = 100
    league: str = "novice"
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# Scenarios
class ScenarioOption(BaseModel):
    text: str
    is_safe: bool

class ScenarioOut(BaseModel):
    id: int
    title: str
    attack_type: str
    interface_type: str
    difficulty: str
    content: Any
    options: List[Any]
    red_flags: Optional[List[str]] = []
    hp_penalty: int
    score_reward: int
    order: int

    class Config:
        from_attributes = True

class LevelOut(BaseModel):
    id: int
    name: str
    description: str
    location: str
    order: int
    scenarios: List[ScenarioOut] = []

    class Config:
        from_attributes = True


# Progress
class AnswerSubmit(BaseModel):
    scenario_id: int
    selected_option: int

class AnswerResult(BaseModel):
    correct: bool
    correct_option: int
    explanation: str
    red_flags: List[str]
    hp_change: int
    score_change: int
    current_hp: int
    current_score: int
    ai_explanation: Optional[str] = None

class UserProgressOut(BaseModel):
    scenario_id: int
    completed: bool = False
    correct: bool = False
    score_earned: int = 0

    class Config:
        from_attributes = True


# Leaderboard
class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    total_score: int = 0
    league: str = "novice"
    total_attacks_blocked: int = 0


# Certificate
class CertificateOut(BaseModel):
    certificate_id: str
    username: str
    level_achieved: str
    score: int
    issued_at: datetime
    qr_code_url: str

    class Config:
        from_attributes = True


# Mistakes
class MistakeOut(BaseModel):
    scenario_id: int
    title: str
    attack_type: str
    difficulty: str
    explanation: str
    red_flags: List[str]
    attempts: int

class AiAnalysisOut(BaseModel):
    analysis: str
    total_mistakes: int
    weakest_attack_type: Optional[str] = None


# Stats
class UserStats(BaseModel):
    total_score: int
    current_hp: int
    league: str
    total_attacks_faced: int
    total_attacks_blocked: int
    accuracy: float
    completed_scenarios: int
    total_scenarios: int
    progress_percent: float
