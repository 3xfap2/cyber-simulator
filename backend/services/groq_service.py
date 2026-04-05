import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))


ATTACK_TYPE_LABELS = {
    "phishing": "фишинг",
    "vishing": "вишинг (телефонное мошенничество)",
    "social_engineering": "социальная инженерия",
    "skimming": "скимминг",
    "brute_force": "подбор пароля",
    "api_security": "атака на API",
}

PSYCHOLOGICAL_TRIGGERS = {
    "phishing": "срочность и страх (аккаунт заблокируют, деньги спишут)",
    "vishing": "авторитет и доверие (звонок «из банка» или «из полиции»)",
    "social_engineering": "доверие к знакомым и желание помочь",
    "skimming": "привычка и доверие к знакомым устройствам",
    "brute_force": "слабая культура паролей",
    "api_security": "недооценка технических угроз",
}


def get_ai_explanation(attack_type: str, user_choice: str, correct_action: str, red_flags: list, is_correct: bool = False) -> str:
    """Generates a personalized AI explanation after user makes a choice."""
    try:
        attack_label = ATTACK_TYPE_LABELS.get(attack_type, attack_type)
        trigger = PSYCHOLOGICAL_TRIGGERS.get(attack_type, "манипуляция")

        if is_correct:
            prompt = f"""Ты — наставник по кибербезопасности. Пользователь правильно распознал атаку "{attack_label}" и выбрал: "{user_choice}".
Напиши 1-2 предложения похвалы на русском — объясни кратко почему его выбор защитил его. Без формализма, живо."""
            max_tok = 120
        else:
            prompt = f"""Ты — наставник по кибербезопасности. Пользователь попался на атаку "{attack_label}".

Что сделал пользователь: "{user_choice}"
Правильное действие: "{correct_action}"
Признаки которые он пропустил: {', '.join(red_flags[:3]) if red_flags else 'нет данных'}
Психологический триггер который сработал: {trigger}

Напиши разбор ошибки — ровно 3 абзаца, каждый с меткой:
🧠 ПОЧЕМУ ПОПАЛСЯ: [1 предложение — какой триггер сработал и почему это работает на большинство людей]
⚠️ ЧТО БЫЛО БЫ В РЕАЛЬНОСТИ: [1 предложение — конкретные последствия этой ошибки]
🛡️ КАК ЗАЩИТИТЬСЯ: [1 предложение — конкретное правило которое нужно запомнить]

Только русский язык. Без markdown кроме эмодзи-меток. Пиши как живой наставник."""
            max_tok = 280

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tok,
            temperature=0.75,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return ""


def get_ai_mistake_analysis(mistakes: list) -> str:
    """Generates a personalized analysis of user's mistakes pattern."""
    try:
        if not mistakes:
            return ""
        attack_counts = {}
        for m in mistakes:
            t = m.get("attack_type", "unknown")
            attack_counts[t] = attack_counts.get(t, 0) + 1
        sorted_attacks = sorted(attack_counts.items(), key=lambda x: x[1], reverse=True)
        top_weaknesses = ", ".join([f"{a} ({c} ошибок)" for a, c in sorted_attacks[:3]])
        titles = "; ".join([m.get("title", "") for m in mistakes[:5]])

        prompt = f"""Ты — персональный тренер по кибербезопасности в образовательном симуляторе банка.
Пользователь допустил {len(mistakes)} ошибок в симуляторе кибератак.
Наиболее частые типы атак на которые он попался: {top_weaknesses}
Примеры сценариев где он ошибся: {titles}

Напиши персональный разбор (4-5 предложений) на русском:
1. Назови главную слабость пользователя
2. Объясни почему именно этот тип атак опасен в реальной жизни
3. Дай 2-3 конкретных совета как защититься
Пиши как живой наставник, без формализма. Не используй markdown."""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=350,
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception:
        return ""


def generate_dynamic_scenario(attack_type: str, location: str) -> dict:
    """Generates a unique scenario using AI."""
    try:
        prompt = f"""Создай реалистичный сценарий кибератаки для образовательного симулятора.
Тип атаки: {attack_type}
Локация: {location}

Верни ТОЛЬКО валидный JSON без markdown:
{{
  "title": "название сценария",
  "content": {{
    "from": "email или отправитель",
    "subject": "тема если email",
    "body": "текст сообщения на русском (реалистичный, с ошибками злоумышленника)"
  }},
  "options": [
    {{"text": "вариант 1 (неправильный)", "is_safe": false}},
    {{"text": "правильное действие", "is_safe": true}},
    {{"text": "вариант 3 (неправильный)", "is_safe": false}},
    {{"text": "вариант 4", "is_safe": false}}
  ],
  "correct_option": 1,
  "red_flags": ["признак 1", "признак 2", "признак 3"],
  "explanation": "объяснение на русском почему это атака"
}}"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.8,
        )
        content = response.choices[0].message.content.strip()
        return json.loads(content)
    except Exception:
        return {}
