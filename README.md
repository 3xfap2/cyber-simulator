# 🛡️ CyberSim — Симулятор защиты личных данных

> Образовательная платформа по кибербезопасности от **Банк Центр-Инвест**
> Разработана в рамках хакатона **UMIRHack**

## О проекте

CyberSim — интерактивный симулятор, который формирует устойчивые поведенческие паттерны безопасного поведения через геймификацию.

## 🎮 Игровые режимы

| Режим | Описание |
|---|---|
| 🏠 Полые сети | Открытый мир, 6 зданий, 3 NPC-мошенника |
| 📞 Оператор банка | Распознай мошенника среди звонков |
| 🔍 Детектив | Расследуй реальные кибератаки |
| 👣 Цифровой след | Осознай свои данные в сети |
| 🚨 Побег от хакера | Защити аккаунты за 10 минут |
| 💀 Взломай меня | Побудь в роли хакера и защитника |
| 🏙️ Кибергород | Платформер, 3 уровня сложности |
| 🔐 Анализатор паролей | Проверь надёжность пароля |
| 🏠 Дом в сети | Симулятор почты и мессенджеров |

## 🤖 AI-режим

В 5 играх доступна кнопка «Режим ИИ» — Groq (llama-3.3-70b) генерирует новые уникальные сценарии атак при каждом запуске.

## 🏆 Геймификация

- HP-шкала снижается при ошибках
- Очки за правильные ответы
- Лиги: Новичок → Защитник → Эксперт → Мастер
- Сертификат с QR-кодом
- Рейтинг среди всех пользователей

## 🛠️ Технологии

Frontend: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
Backend: FastAPI, SQLAlchemy, PostgreSQL
AI: Groq API (llama-3.3-70b-versatile)
Инфраструктура: Docker, Docker Compose

## 🚀 Быстрый запуск

git clone https://github.com/3xfap2/cyber-simulator.git
cd cyber-simulator
cp .env.example .env
docker-compose up --build

Откройте http://localhost:3000

## ⚙️ Переменные окружения

Создайте .env файл на основе .env.example:

POSTGRES_DB=cybersim
POSTGRES_USER=cybersim
POSTGRES_PASSWORD=your_password
DATABASE_URL=postgresql://cybersim:your_password@postgres:5432/cybersim
SECRET_KEY=your_secret_key_min_32_chars
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_API_URL=http://localhost:8000

Получить бесплатный Groq API ключ: https://console.groq.com

## 📚 API документация

После запуска: http://localhost:8000/docs (Swagger UI)

## 🗄️ Схема базы данных

users: id, username, email, hashed_password, is_admin, total_score, current_hp, league, created_at
scenarios: id, title, description, location, difficulty, attack_type
user_progress: id, user_id(FK), scenario_id(FK), completed, score, attempts, completed_at
achievements: id, user_id(FK), achievement_id, earned_at
