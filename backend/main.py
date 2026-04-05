from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import json
import random
import httpx

from database import engine, SessionLocal
import models
from routers import auth, scenarios, progress, leaderboard, certificates, admin, achievements
from scenarios.data import LEVELS_DATA, SCENARIOS_DATA

models.Base.metadata.create_all(bind=engine)


def migrate_db():
    """Добавляет новые колонки если их нет (для совместимости с существующей БД)."""
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium'"
            ))
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE"
            ))
            conn.commit()
            conn.execute(text(
                "UPDATE users SET is_admin = TRUE WHERE username = 'admin'"
            ))
            # Fix NULL values for integer user fields (can cause Pydantic validation errors)
            conn.execute(text("UPDATE users SET total_score = 0 WHERE total_score IS NULL"))
            conn.execute(text("UPDATE users SET total_attacks_faced = 0 WHERE total_attacks_faced IS NULL"))
            conn.execute(text("UPDATE users SET total_attacks_blocked = 0 WHERE total_attacks_blocked IS NULL"))
            conn.execute(text("UPDATE users SET current_hp = 100 WHERE current_hp IS NULL"))
            conn.execute(text("UPDATE users SET league = 'novice' WHERE league IS NULL"))
            # Fix NULL values in progress
            conn.execute(text("UPDATE user_progress SET score_earned = 0 WHERE score_earned IS NULL"))
            conn.execute(text("UPDATE user_progress SET attempts = 1 WHERE attempts IS NULL"))
            conn.execute(text("UPDATE user_progress SET completed = FALSE WHERE completed IS NULL"))
            conn.execute(text("UPDATE user_progress SET correct = FALSE WHERE correct IS NULL"))
            conn.commit()
        except Exception as e:
            print(f"Migration warning: {e}")
            pass

app = FastAPI(
    title="CyberSim API",
    description="Образовательный симулятор защиты личных данных — Банк Центр-Инвест",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(scenarios.router)
app.include_router(progress.router)
app.include_router(leaderboard.router)
app.include_router(certificates.router)
app.include_router(admin.router)
app.include_router(achievements.router)


def seed_db():
    db: Session = SessionLocal()
    try:
        existing_count = db.query(models.Scenario).count()
        expected_count = len(SCENARIOS_DATA)
        if existing_count == expected_count:
            return  # Already up to date

        # Re-seed scenarios (keep users)
        db.query(models.UserProgress).delete()
        db.query(models.Scenario).delete()
        db.query(models.Level).delete()
        db.flush()

        for level_data in LEVELS_DATA:
            level = models.Level(
                id=level_data["id"],
                name=level_data["name"],
                description=level_data["description"],
                location=level_data["location"],
                order=level_data["order"],
            )
            db.add(level)
        db.flush()

        for i, s in enumerate(SCENARIOS_DATA):
            # Shuffle options so correct answer isn't always option B
            options = list(s["options"])
            correct_idx = s["correct_option"]
            indices = list(range(len(options)))
            random.seed(i * 31 + 7)  # deterministic per scenario
            random.shuffle(indices)
            shuffled_options = [options[j] for j in indices]
            new_correct_idx = indices.index(correct_idx)

            scenario = models.Scenario(
                level_id=s["level_id"],
                title=s["title"],
                attack_type=s["attack_type"],
                interface_type=s["interface_type"],
                difficulty=s.get("difficulty", "medium"),
                content=s["content"],
                options=shuffled_options,
                correct_option=new_correct_idx,
                explanation=s["explanation"],
                red_flags=s["red_flags"],
                hp_penalty=s["hp_penalty"],
                score_reward=s["score_reward"],
                order=s["order"],
            )
            db.add(scenario)
        db.commit()
        print("✅ Database seeded successfully")
    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    migrate_db()
    seed_db()


@app.get("/")
def root():
    return {"status": "ok", "app": "CyberSim", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# ─────────────────────────────────────────────
# AI Chat endpoint (social engineering simulator)
# ─────────────────────────────────────────────

class ChatHistoryItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    app: str = "telegram"
    history: list[ChatHistoryItem] = []

@app.post("/api/chat")
async def ai_chat(request: ChatRequest):
    from services.groq_service import client as groq_client
    app_label = "ВКонтакте" if request.app == "vk" else "Telegram"
    system = f"""Ты — мошенник в образовательном симуляторе кибербезопасности, пишешь в {app_label}.
Твоя цель: сымитировать реальную социальную инженерию, чтобы пользователь учился её распознавать.
Начни дружелюбно. Постепенно (через 2-3 сообщения) выдвигай нарастающие просьбы: сначала невинные (имя, город), потом чувствительные (номер телефона, код из SMS, данные карты).
Используй типичные манипуляции: срочность, авторитет, соблазн выгоды, давление на жалость.
Отвечай КОРОТКО — 1-3 предложения. Только русский язык. Без markdown.
КОНТЕКСТ: это учебная симуляция — пользователь должен распознать манипуляцию."""

    messages: list[dict] = [{"role": "system", "content": system}]
    for h in request.history[-12:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": request.message})

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=120,
            temperature=0.85,
        )
        return {"reply": response.choices[0].message.content.strip()}
    except Exception:
        return {"reply": "Привет! Слушай, есть одно выгодное предложение для тебя..."}


# ─────────────────────────────────────────────
# Search Game — AI-generated results with phishing
# ─────────────────────────────────────────────

@app.get("/api/search-game")
async def search_game(q: str = Query(..., min_length=1)):
    from services.groq_service import client as groq_client
    import json as _json

    prompt = f"""Ты генерируешь учебные результаты поиска Google для симулятора кибербезопасности. Пользователь должен самостоятельно найти фишинговые сайты — без подсказок в тексте.

Запрос пользователя: "{q}"

Создай РОВНО 10 результатов поиска в формате JSON-массива:
- РОВНО 7 — настоящие легитимные сайты (реальные популярные домены)
- РОВНО 3 — поддельные фишинговые сайты

КРИТИЧЕСКИ ВАЖНО для фишинговых сайтов:
1. Заголовок должен выглядеть как настоящий (НЕ писать слова "фишинг", "мошенник", "поддельный", "атака")
2. Сниппет должен звучать убедительно — как будто это реальный сайт (но можно добавить заманчивое предложение: скидки, выплаты, бонусы)
3. Подозрительность — ТОЛЬКО в домене: опечатка (sberbahk.ru), лишние слова (sberbank-online-kabinet.ru), подозрительный TLD (.xyz, .info, .com для российских сервисов)

Примеры хороших фишинговых результатов:
- title: "Сбербанк Онлайн — Личный кабинет", url: "sberbank-online-kabinet.ru", snippet: "Войдите в личный кабинет Сбербанка. Управляйте счетами и картами 24/7."
- title: "Госуслуги — Единовременная выплата 10 000 руб", url: "gosuslugi-viplata2024.ru", snippet: "Подайте заявку на получение государственной выплаты. Одобрение за 5 минут."

Фавикон — подходящий эмодзи (🏦 банк, 🛒 магазин, 🏛️ госорган, 💼 работа и т.д.)
phishingReason — объяснение почему это фишинг (только для isPhishing:true, пользователь увидит его ПОСЛЕ того как найдёт сайт)

Отвечай ТОЛЬКО валидным JSON-массивом без markdown:
[{{"favicon":"эмодзи","title":"Название","url":"domain.ru","snippet":"Описание","isPhishing":false,"phishingReason":""}}]"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.75,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown if model wraps in ```
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.split("```")[0]
        results = _json.loads(raw.strip())
        for i, r in enumerate(results):
            r["id"] = i + 1
        return {"results": results[:10]}
    except Exception as e:
        return {"results": [], "error": str(e)}


# ─────────────────────────────────────────────
# Homegame — AI-generated phishing events
# ─────────────────────────────────────────────

@app.get("/api/generate-homegame-events")
async def generate_homegame_events():
    from services.groq_service import client as groq_client
    import json as _json

    prompt = """Ты генерируешь события для симулятора кибербезопасности "Рабочий стол".
Игрок видит уведомления на экране и должен распознать фишинг.

Создай РОВНО 10 событий в формате JSON-массива:
- 6 ФИШИНГОВЫХ (isPhishing: true) — реалистичные атаки через email, sms, telegram, vk, browser
- 4 НАСТОЯЩИХ (isPhishing: false) — обычные безопасные уведомления

Для каждого события:
- app: одно из "email" | "vk" | "telegram" | "browser" | "sms"
- sender: отправитель (для фишинга — похожий на настоящий, но с ошибкой или подозрительный)
- subject: тема / заголовок (для фишинга — срочность, страх, выгода)
- preview: краткий текст сообщения (1-2 предложения)
- isPhishing: true/false
- baitLabel: текст кнопки-ловушки (только для фишинга: "Подтвердить →", "Получить приз →" и т.д.)
- safeLabel: текст безопасного действия ("Удалить", "Игнорировать", "Закрыть")
- explanation: короткое объяснение (1 предложение) почему это фишинг или почему это безопасно

Примеры хороших фишинговых событий:
- SMS от "Sbеrbank" (с кириллической е): "Ваша карта заблокирована! Пройдите верификацию."
- Email от "support@gosuslugi-help.ru": "Требуется подтверждение паспортных данных"
- Telegram от "Pavel Durov": "Вы выиграли Premium на год! Активируйте сейчас."

Отвечай ТОЛЬКО валидным JSON-массивом без markdown:
[{"id":1,"app":"email","sender":"...","subject":"...","preview":"...","isPhishing":true,"baitLabel":"...","safeLabel":"Удалить","explanation":"..."}]"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2500,
            temperature=0.85,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.split("```")[0]
        events = _json.loads(raw.strip())
        for i, e in enumerate(events):
            e["id"] = i + 1
            if "baitLabel" not in e or not e["baitLabel"]:
                e["baitLabel"] = "Открыть →"
            if "safeLabel" not in e or not e["safeLabel"]:
                e["safeLabel"] = "Закрыть"
        return {"events": events[:10]}
    except Exception as ex:
        return {"events": [], "error": str(ex)}


# ─────────────────────────────────────────────
# Bankgame — AI-generated call scenarios
# ─────────────────────────────────────────────

@app.get("/api/generate-bankgame-calls")
async def generate_bankgame_calls():
    from services.groq_service import client as groq_client
    import json as _json

    prompt = """Ты генерируешь звонки для симулятора «Оператор банка» (образовательная игра по кибербезопасности).
Создай РОВНО 8 звонков: 4 мошеннических (isScammer:true) и 4 легитимных (isScammer:false).

Для мошеннических используй РАЗНЫЕ схемы: вишинг «ФСБ/полиция», «безопасный счёт», «родственник попал в беду», «техподдержка», «налоговая», «мошенник-племянник».
Для легитимных: блокировка карты, запрос баланса, открытие вклада, смена лимита, перевод, информация о кредите.

Формат — ТОЛЬКО валидный JSON-массив:
[{"id":1,"callerName":"Имя","callerPhone":"+7 (9XX) XXX-XX-XX","callerAvatar":"emoji","request":"краткое описание запроса","script":["фраза1","фраза2","фраза3","фраза4"],"isScammer":false,"redFlags":[],"explanation":"объяснение 1-2 предложения","difficulty":"easy"}]

Правила:
- difficulty: easy/medium/hard
- redFlags: пустой массив для легитимных, 2-3 конкретных признака для мошеннических
- script: РОВНО 4 реалистичные фразы от звонящего
- callerAvatar: 👨/👩/👴/👵/🎭/🕵️/👮/👩‍💼 и т.д.
- explanation: почему это мошенничество или почему легитимно
Отвечай ТОЛЬКО JSON-массивом."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.85,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
            raw = raw.split("```")[0]
        calls = _json.loads(raw.strip())
        for i, c in enumerate(calls):
            c["id"] = i + 1
            if "redFlags" not in c: c["redFlags"] = []
            if "difficulty" not in c: c["difficulty"] = "medium"
        return {"calls": calls[:8]}
    except Exception as ex:
        return {"calls": [], "error": str(ex)}


# ─────────────────────────────────────────────
# Detective — AI-generated investigation cases
# ─────────────────────────────────────────────

@app.get("/api/generate-detective-cases")
async def generate_detective_cases():
    from services.groq_service import client as groq_client
    import json as _json

    prompt = """Ты генерируешь дела для симулятора «Режим Детектив» — образовательная игра по кибербезопасности.
Создай РОВНО 4 расследования разных кибератак: вишинг, BEC-мошенничество, фишинг email, кража аккаунта в соцсети/мессенджере.

Каждое дело — цепочка 4-5 событий, которые привели к потере денег или данных. Затем 3 вопроса по делу.

Формат — ТОЛЬКО валидный JSON-массив:
[{"id":1,"title":"Дело №1: название","victim":"Имя, возраст, кто по профессии","outcome":"Что случилось итогом (потеря суммы или данных)","events":[{"time":"ЧЧ:ММ","channel":"call","icon":"📞","from":"Откуда звонок/письмо","content":"Точный текст сообщения или разговора","redFlag":"Признак мошенничества (или null если нет)"}],"questions":[{"question":"Вопрос следователя?","options":["А","Б","В","Г"],"correct":0,"explanation":"Объяснение правильного ответа"}]}]

channel может быть: call, email, sms, site, app, telegram
icon для channel: 📞 call, 📧 email, 💬 sms, 🌐 site, 📱 app/telegram
Каждое дело — УНИКАЛЬНАЯ схема атаки, не повторяй.
Отвечай ТОЛЬКО JSON-массивом."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4000,
            temperature=0.8,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
            raw = raw.split("```")[0]
        cases = _json.loads(raw.strip())
        for i, c in enumerate(cases):
            c["id"] = i + 1
            c["title"] = f"Дело №{i+1}: {c.get('title','').replace(f'Дело №{i+1}: ','').replace(f'Дело №{i+1}:','')}"
            for ev in c.get("events", []):
                if ev.get("redFlag") == "null" or ev.get("redFlag") is None:
                    ev.pop("redFlag", None)
        return {"cases": cases[:4]}
    except Exception as ex:
        return {"cases": [], "error": str(ex)}


# ─────────────────────────────────────────────
# Digitalfootprint — AI-generated situations
# ─────────────────────────────────────────────

@app.get("/api/generate-digitalfootprint-stages")
async def generate_digitalfootprint_stages():
    from services.groq_service import client as groq_client
    import json as _json

    prompt = """Ты генерируешь ситуации для игры «Цифровой след» — образовательный симулятор кибербезопасности.
Пользователь делает выбор в 6 жизненных ситуациях, и хакер собирает данные по его ответам.

Создай РОВНО 6 ситуаций на разных платформах/сервисах (не повторяй: ВК, банк, приложение, Wi-Fi, соцсеть, почта и т.д.).
Каждая ситуация — 4 варианта выбора с разным уровнем утечки данных.

Формат — ТОЛЬКО валидный JSON-массив:
[{"id":1,"title":"Название ситуации","context":"Описание: что происходит, что нужно решить","icon":"emoji","platform":"Название сервиса/места","choices":[{"id":"a","text":"Вариант выбора","detail":"Пояснение к варианту","exposure":3,"dataLeaked":["Данные1","Данные2"]}]}]

exposure: 0=безопасно, 1=низкий риск, 2=средний, 3=высокий
dataLeaked: список данных которые узнаёт хакер (пустой массив если exposure=0)
В каждой ситуации должны быть варианты с exposure 0, 1, 2 и 3.
Отвечай ТОЛЬКО JSON-массивом."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3500,
            temperature=0.85,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
            raw = raw.split("```")[0]
        stages = _json.loads(raw.strip())
        for i, s in enumerate(stages):
            s["id"] = i + 1
            for c in s.get("choices", []):
                if "dataLeaked" not in c: c["dataLeaked"] = []
                c["exposure"] = max(0, min(3, int(c.get("exposure", 1))))
        return {"stages": stages[:6]}
    except Exception as ex:
        return {"stages": [], "error": str(ex)}


# ─────────────────────────────────────────────
# HackerEscape — AI-generated tasks
# ─────────────────────────────────────────────

@app.get("/api/generate-hackerescape-tasks")
async def generate_hackerescape_tasks():
    from services.groq_service import client as groq_client
    import json as _json

    prompt = """Ты генерируешь задания для игры «Побег от хакера» — escape room по кибербезопасности. Игрок получил уведомление что его аккаунты взломаны, и должен за 120 секунд выполнить 6 заданий по защите.

Создай РОВНО 6 заданий. Используй ТОЛЬКО типы "identify" и "select" (не "type").

identify — игрок выбирает все угрозы из списка (isThreat:true — угроза, false — безопасно)
select — игрок выбирает один правильный вариант из 4

Формат — ТОЛЬКО валидный JSON-массив:
[{"id":1,"icon":"emoji","title":"Название задания","description":"Что нужно сделать (1-2 предложения)","type":"identify","items":[{"id":"s1","label":"Устройство/сессия/письмо/приложение","detail":"Пояснение","isThreat":true}],"options":null,"explanation":"Почему так"}]

Для type="select": items=null, options=[{"id":"a","label":"Вариант","isCorrect":false}] (РОВНО 4 варианта, один isCorrect:true)
Для type="identify": options=null, items=[...] (4-5 элементов, минимум 2 isThreat:true)

Темы заданий (придумай новые сценарии для каждого):
1. Подозрительные входы/сессии в аккаунте
2. Выбор правильного метода восстановления доступа
3. Фишинговые письма в ящике
4. Опасные разрешения приложений
5. Выбор способа хранения паролей
6. Поддельные уведомления от сервисов

Отвечай ТОЛЬКО JSON-массивом."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.85,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
            raw = raw.split("```")[0]
        tasks = _json.loads(raw.strip())
        for i, t in enumerate(tasks):
            t["id"] = i + 1
            if t.get("items") is None: t["items"] = []
            if t.get("options") is None: t["options"] = []
        return {"tasks": tasks[:6]}
    except Exception as ex:
        return {"tasks": [], "error": str(ex)}


# ─────────────────────────────────────────────
# HackMe — AI-generated dual-role challenges
# ─────────────────────────────────────────────

@app.get("/api/generate-hackme-challenges")
async def generate_hackme_challenges():
    from services.groq_service import client as groq_client
    import json as _json

    prompt = """Ты генерируешь сценарии для игры «Взломай меня» — образовательный симулятор кибербезопасности.
Игрок сначала играет за ХАКЕРА (выбирает наиболее эффективную атаку), потом за ЗАЩИТНИКА (выбирает правильные меры защиты).

Создай РОВНО 5 сценариев с РАЗНЫМИ типами атак: атака на пароль, фишинг email, социальная инженерия по телефону, атака через публичный Wi-Fi, атака через вредоносное ПО/USB.

Формат — ТОЛЬКО валидный JSON-массив:
[{"id":1,"hackerQuestion":"Вопрос хакеру: какую технику выбрать?","hackerContext":"Контекст: цель, ситуация","hackerOptions":[{"text":"Метод атаки","value":40}],"hackerBestIdx":2,"hackerExplain":"Почему этот метод самый эффективный","defenderQuestion":"Вопрос защитнику: как защититься?","defenderOptions":[{"text":"Мера защиты","correct":true}],"defenderExplain":"Объяснение правильной защиты"}]

Правила:
- hackerOptions: РОВНО 4 варианта, value — процент успеха атаки (0-100), hackerBestIdx — индекс самого эффективного (0-3)
- defenderOptions: РОВНО 4 варианта, 2 correct:true и 2 correct:false
- Каждый сценарий — уникальная, реалистичная история
Отвечай ТОЛЬКО JSON-массивом."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3500,
            temperature=0.85,
        )
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
            raw = raw.split("```")[0]
        challenges = _json.loads(raw.strip())
        for i, ch in enumerate(challenges):
            ch["id"] = i + 1
            if "hackerBestIdx" not in ch: ch["hackerBestIdx"] = 0
        return {"challenges": challenges[:5]}
    except Exception as ex:
        return {"challenges": [], "error": str(ex)}


# ─────────────────────────────────────────────
# Search proxy (DuckDuckGo Instant Answer)
# ─────────────────────────────────────────────

@app.get("/api/search")
async def search(q: str = Query(..., min_length=1)):
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": q, "format": "json", "no_html": "1", "skip_disambig": "1"},
                headers={"User-Agent": "Mozilla/5.0 CyberSim/1.0"},
            )
            data = resp.json()

        results = []
        if data.get("AbstractText"):
            results.append({
                "title": data.get("Heading", q),
                "url": data.get("AbstractURL", ""),
                "snippet": data["AbstractText"][:300],
            })
        for topic in data.get("RelatedTopics", [])[:6]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic["Text"][:70],
                    "url": topic.get("FirstURL", ""),
                    "snippet": topic["Text"][:200],
                })
        return {"query": q, "results": results}
    except Exception:
        return {"query": q, "results": []}


# WebSocket for real-time leaderboard
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass


manager = ConnectionManager()


@app.websocket("/ws/leaderboard")
async def websocket_leaderboard(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        db = SessionLocal()
        users = (
            db.query(models.User)
            .filter(models.User.is_active == True)
            .order_by(models.User.total_score.desc())
            .limit(10)
            .all()
        )
        data = [
            {"rank": i + 1, "username": u.username, "score": u.total_score, "league": u.league}
            for i, u in enumerate(users)
        ]
        db.close()
        await websocket.send_text(json.dumps(data))

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
