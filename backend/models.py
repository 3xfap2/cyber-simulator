from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Stats
    total_score = Column(Integer, default=0)
    total_attacks_faced = Column(Integer, default=0)
    total_attacks_blocked = Column(Integer, default=0)
    current_hp = Column(Integer, default=100)
    league = Column(String(20), default="novice")  # novice, defender, expert, master

    progress = relationship("UserProgress", back_populates="user")
    certificates = relationship("Certificate", back_populates="user")


class Level(Base):
    __tablename__ = "levels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    location = Column(String(50))  # office, home, public_wifi
    order = Column(Integer, default=0)
    scenarios = relationship("Scenario", back_populates="level")


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    level_id = Column(Integer, ForeignKey("levels.id"))
    title = Column(String(200), nullable=False)
    attack_type = Column(String(50), nullable=False)  # phishing, skimming, brute_force, social_engineering, vishing
    interface_type = Column(String(50), nullable=False)  # email, social, sms, browser, phone
    content = Column(JSON, nullable=False)  # scenario content (email body, etc.)
    options = Column(JSON, nullable=False)  # list of choices
    correct_option = Column(Integer, nullable=False)  # index of correct option
    explanation = Column(Text, nullable=False)
    red_flags = Column(JSON)  # list of red flags to highlight
    hp_penalty = Column(Integer, default=20)
    score_reward = Column(Integer, default=100)
    order = Column(Integer, default=0)
    difficulty = Column(String(20), default="medium")  # easy, medium, hard

    level = relationship("Level", back_populates="scenarios")


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    completed = Column(Boolean, default=False)
    correct = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    score_earned = Column(Integer, default=0)
    completed_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="progress")
    scenario = relationship("Scenario")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    certificate_id = Column(String(50), unique=True, index=True)
    level_achieved = Column(String(20))
    score = Column(Integer)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    qr_code_url = Column(String(500))

    user = relationship("User", back_populates="certificates")
