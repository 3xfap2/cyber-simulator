"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  npc: string; npcEmoji: string;
  text: string; answers: string[];
  correct: number; explanation: string;
  hp_penalty: number; score_reward: number;
}

interface Building {
  id: string; label: string; emoji: string;
  x: number; y: number; w: number; h: number;
  fillColor: string; glowColor: string; accent: string;
  questions: Question[];
}

interface ScammerNPC {
  id: string; name: string; role: string; emoji: string;
  intro: string; dialog: string;
  answers: string[]; correct: number; explanation: string;
  reward: number; penalty: number;
  patrolX1: number; patrolX2: number; patrolY: number; speed: number;
}

interface NpcState { x: number; y: number; dir: number; }

// ─── World constants ──────────────────────────────────────────────────────────

const WW = 1860; const WH = 1100;
const CW = 860;  const CH = 520;
const SPEED = 3.2;
const INTERACT_R = 90;
const TOTAL_HP = 100;

// Russian ↔ Latin key map (WASD + E)
const RU_KEY: Record<string, string> = {
  "ц": "w", "Ц": "w", "ф": "a", "Ф": "a",
  "ы": "s", "Ы": "s", "в": "d", "В": "d",
  "у": "e", "У": "e",
};

// ─── Buildings ────────────────────────────────────────────────────────────────

const BUILDINGS: Building[] = [
  {
    id: "home", label: "Дом", emoji: "🏠",
    x: 90, y: 70, w: 230, h: 185,
    fillColor: "#041a0c", glowColor: "#00ff88", accent: "#00cc66",
    questions: [
      { npc: "Мама", npcEmoji: "👩",
        text: "Пришло письмо от «Сбербанк»: «Ваш счёт заблокирован. Перейдите по ссылке и введите PIN». Что делаешь?",
        answers: ["Нажимаю — нужно срочно!", "Звоню в банк по номеру на карте", "Прошу друга проверить ссылку", "Перехожу, но не ввожу данные"],
        correct: 1, explanation: "Банки НИКОГДА не просят PIN по email. Позвони по официальному номеру с обратной стороны карты.",
        hp_penalty: 20, score_reward: 150 },
      { npc: "Папа", npcEmoji: "👨",
        text: "В WhatsApp пишет незнакомец: «Я из техподдержки, нужен удалённый доступ к телефону для обновления». Как реагируешь?",
        answers: ["Даю доступ — это же поддержка!", "Отказываю и блокирую контакт", "Даю, но слежу за экраном", "Отвечу позже"],
        correct: 1, explanation: "Настоящая техподдержка не пишет в мессенджеры с просьбой о доступе. Это предлог для кражи данных.",
        hp_penalty: 20, score_reward: 150 },
      { npc: "Сестра", npcEmoji: "👧",
        text: "Нашла флешку у подъезда с надписью «Фото». Что сделаешь?",
        answers: ["Вставлю в ПК — вдруг важные данные", "Выброшу или сдам в полицию", "Вставлю в рабочий ноутбук", "Открою только папку с фото"],
        correct: 1, explanation: "USB-дроппинг — известная атака. Флешка может автоматически запустить вредоносный код при подключении.",
        hp_penalty: 25, score_reward: 150 },
    ],
  },
  {
    id: "bank", label: "Банк", emoji: "🏦",
    x: 720, y: 55, w: 270, h: 215,
    fillColor: "#1a1200", glowColor: "#ffd700", accent: "#cc9900",
    questions: [
      { npc: "Кассир", npcEmoji: "💼",
        text: "Звонит «служба безопасности банка»: «Мошенники пытаются снять ваши деньги! Переведите их на защищённый счёт!»",
        answers: ["Перевожу — надо спасти деньги!", "Кладу трубку и звоню в банк сам", "Прошу перезвонить завтра", "Называю только номер карты"],
        correct: 1, explanation: "Схема «безопасный счёт» — самый распространённый вишинг. Банк НИКОГДА не требует переводов по телефону.",
        hp_penalty: 30, score_reward: 200 },
      { npc: "Охранник", npcEmoji: "💂",
        text: "В банкомате — накладка на картоприёмнике и маленькая камера над клавиатурой. Что делаешь?",
        answers: ["Использую, прикрою клавиатуру рукой", "Не использую, сообщу банку и в полицию", "Попытаюсь снять накладку", "Пользуюсь быстро"],
        correct: 1, explanation: "Скиммер + камера = кража данных карты. Немедленно сообщите в банк и полицию.",
        hp_penalty: 25, score_reward: 200 },
      { npc: "Менеджер", npcEmoji: "👔",
        text: "Интернет-магазин запрашивает данные карты, CVV и SMS-код одновременно. Платить?",
        answers: ["Плачу — хочу купить!", "Отказываюсь — легитимные магазины так не делают", "Ввожу только номер карты и срок", "Плачу с другой карты"],
        correct: 1, explanation: "SMS-код вводится только на странице банка, а не магазина. Запрос на той же странице = фишинг.",
        hp_penalty: 25, score_reward: 200 },
    ],
  },
  {
    id: "cafe", label: "Кафе / Wi-Fi", emoji: "☕",
    x: 1420, y: 70, w: 230, h: 180,
    fillColor: "#1a0e00", glowColor: "#ff8c00", accent: "#cc6600",
    questions: [
      { npc: "Бариста", npcEmoji: "👩‍🍳",
        text: "В кафе есть «CafeWifi» и «Free_CafeWifi». Ты подключился к «Free_CafeWifi» и вошёл в онлайн-банк. Что не так?",
        answers: ["Всё нормально, Wi-Fi бесплатный!", "Evil Twin — хакерская точка, все данные перехватываются", "Нужен только инкогнито-режим", "Достаточно HTTPS"],
        correct: 1, explanation: "Evil Twin: хакер создаёт точку доступа с похожим именем. Банк — только через мобильные данные.",
        hp_penalty: 20, score_reward: 150 },
      { npc: "Посетитель", npcEmoji: "🧑",
        text: "Коллега зашёл в свой email с твоего ноутбука в кафе. Что нужно сделать после?",
        answers: ["Ничего, браузер сам закроет", "Явно выйти из аккаунта и очистить куки", "Просто закрыть вкладку", "Перезагрузить ноутбук"],
        correct: 1, explanation: "Закрытая вкладка не завершает сессию. Любой может войти в чужой аккаунт. Нажми «Выйти».",
        hp_penalty: 15, score_reward: 120 },
    ],
  },
  {
    id: "shop", label: "Магазин", emoji: "🛒",
    x: 80, y: 740, w: 230, h: 175,
    fillColor: "#0a1420", glowColor: "#00bfff", accent: "#0088cc",
    questions: [
      { npc: "Продавец", npcEmoji: "🧾",
        text: "Кассир просит паспорт и вводит данные «для карты лояльности». Что делаешь?",
        answers: ["Показываю — скидки выгодны", "Отказываюсь — для скидок нужен только телефон", "Показываю только имя", "Даю ксерокопию"],
        correct: 1, explanation: "Для карты лояльности нужен только телефон. Сбор паспортных данных без оснований — нарушение 152-ФЗ.",
        hp_penalty: 15, score_reward: 120 },
      { npc: "Охранник", npcEmoji: "👮",
        text: "POS-терминал просит ввести PIN дважды «для подтверждения». Что это означает?",
        answers: ["Двойной PIN — дополнительная защита", "Терминал заражён — PIN вводится один раз", "Новая функция банков", "Уточнить у кассира"],
        correct: 1, explanation: "Легитимный терминал никогда не просит PIN дважды. Это признак скиммера или подменного устройства.",
        hp_penalty: 20, score_reward: 150 },
    ],
  },
  {
    id: "office", label: "Офис", emoji: "🏢",
    x: 710, y: 770, w: 290, h: 215,
    fillColor: "#0d0d28", glowColor: "#7b68ee", accent: "#5540cc",
    questions: [
      { npc: "Коллега", npcEmoji: "👷",
        text: "Директор написал в Telegram: «Срочно переведи 50 000 ₽ поставщику, я на совещании». Что делаешь?",
        answers: ["Перевожу — директор же просит!", "Звоню директору лично — аккаунт могли взломать", "Подтверждаю в Telegram", "Перевожу часть"],
        correct: 1, explanation: "BEC-атака: взлом аккаунта руководителя. Всегда подтверждай финансовые операции голосовым звонком.",
        hp_penalty: 30, score_reward: 200 },
      { npc: "IT-специалист", npcEmoji: "💻",
        text: "Ссылка ведёт на drive.googIe.com (с большой латинской I вместо l). Открываешь?",
        answers: ["Открываю — это же Google!", "Нет: IDN-атака, I ≠ l. Сообщаю в IT", "Открываю в инкогнито", "Спрашиваю в том же письме"],
        correct: 1, explanation: "Гомографическая атака: визуально похожие символы разных алфавитов. Всегда проверяй домен посимвольно.",
        hp_penalty: 25, score_reward: 200 },
      { npc: "Начальник", npcEmoji: "🧑‍💼",
        text: "Email «от IT» с темой «Срочно: обновите VPN» содержит вложение setup.exe. Как поступишь?",
        answers: ["Запускаю — IT же рекомендует!", "Проверяю адрес отправителя, звоню в IT, не запускаю", "Запускаю в отдельной папке", "Пересылаю коллеге"],
        correct: 1, explanation: "Spear-phishing через поддельный email IT-отдела. Исполняемые файлы из email = заражение сети.",
        hp_penalty: 25, score_reward: 200 },
    ],
  },
  {
    id: "gov", label: "Гос. услуги", emoji: "🏛️",
    x: 1420, y: 745, w: 245, h: 190,
    fillColor: "#1a0808", glowColor: "#ff4444", accent: "#cc2222",
    questions: [
      { npc: "Инспектор", npcEmoji: "📋",
        text: "SMS от «Госуслуги»: «Аккаунт удалят. Перейдите на gosuslugi-podтверждение.ru и введите данные».",
        answers: ["Перехожу — аккаунт важен!", "Не перехожу: официальный домен только gosuslugi.ru", "Перехожу но не ввожу пароль", "Звоню в МФЦ"],
        correct: 1, explanation: "Единственный официальный домен — gosuslugi.ru. Любой другой = фишинг.",
        hp_penalty: 25, score_reward: 175 },
      { npc: "Консультант", npcEmoji: "👩‍💼",
        text: "Звонит «МВД»: «Вы подозреваетесь в преступлении. Переведите деньги на защищённый счёт».",
        answers: ["Перевожу деньги — боюсь!", "МВД так не действует. Кладу трубку, звоню 102", "Объясняю что невиновен", "Прошу время подумать"],
        correct: 1, explanation: "Ни одно ведомство не требует денег по телефону. Это всегда мошенничество. Звони 102.",
        hp_penalty: 25, score_reward: 175 },
    ],
  },
];

// ─── NPC Мошенники ────────────────────────────────────────────────────────────

const SCAMMERS: ScammerNPC[] = [
  {
    id: "scam_bank", name: "Артём", role: "«Сотрудник банка»", emoji: "🕴️",
    intro: "Ваш счёт под угрозой!",
    dialog: "Здравствуйте! Служба безопасности банка. На ваш счёт поступила подозрительная заявка на снятие 180 000 ₽. Для отмены и защиты средств — срочно переведите их на наш защищённый счёт №40817810. Это займёт 3 минуты!",
    answers: [
      "Хорошо, переведу деньги на указанный счёт",
      "Это мошенничество! Банки не просят о переводах",
      "Назову номер карты для проверки",
      "Подожду, пока банк сам мне перезвонит",
    ],
    correct: 1,
    explanation: "Банки НИКОГДА не просят переводить деньги «для защиты». Классическая схема «безопасный счёт». Положи трубку и позвони в банк по номеру с карты.",
    reward: 200, penalty: 30,
    patrolX1: 660, patrolX2: 990, patrolY: 300, speed: 0.9,
  },
  {
    id: "scam_mvd", name: "Дмитрий", role: "«Следователь МВД»", emoji: "🕵️",
    intro: "Гражданин, нужна ваша помощь!",
    dialog: "Майор Соколов, МВД России. На вас зарегистрировано уголовное дело по ст. 159 УК РФ — мошенничество. Чтобы закрыть его прямо сейчас и избежать задержания, необходимо оплатить залог 50 000 ₽ переводом. Действуйте немедленно!",
    answers: [
      "Заплачу залог — не хочу проблем с законом",
      "МВД никогда не требует денег переводом — это мошенник!",
      "Дам паспортные данные для проверки личности",
      "Попрошу прислать официальный документ на email",
    ],
    correct: 1,
    explanation: "Ни полиция, ни ФСБ, ни суд не требуют денег переводами. Это всегда мошенничество. Немедленно звони 102.",
    reward: 200, penalty: 30,
    patrolX1: 1380, patrolX2: 1668, patrolY: 958, speed: 1.0,
  },
  {
    id: "scam_tech", name: "Технарь", role: "«Техподдержка Windows»", emoji: "👨‍💻",
    intro: "Ваш ПК заражён вирусом!",
    dialog: "Добрый день! Техническая поддержка Microsoft. Наши серверы зафиксировали критический вирус на вашем устройстве — он уже похищает ваши банковские данные. Дайте мне удалённый доступ прямо сейчас, иначе через 10 минут все данные будут уничтожены!",
    answers: [
      "Даю удалённый доступ — нужно срочно исправить!",
      "Microsoft не звонит с такими предупреждениями — мошенник!",
      "Скачаю предложенный патч и установлю",
      "Дам доступ, но сам буду наблюдать за экраном",
    ],
    correct: 1,
    explanation: "Microsoft никогда не звонит сама. Это Tech Support Scam — цель получить удалённый доступ и украсть деньги или данные.",
    reward: 200, penalty: 30,
    patrolX1: 672, patrolX2: 998, patrolY: 1012, speed: 0.8,
  },
];

const TOTAL_Q = BUILDINGS.reduce((s, b) => s + b.questions.length, 0);

// ─── Decorative trees ─────────────────────────────────────────────────────────

const TREES: [number, number, number][] = [
  [370,130,19],[470,210,15],[540,155,17],[600,290,14],[420,360,18],[320,420,20],
  [1010,125,18],[1120,205,15],[1230,160,20],[1300,290,16],[1130,370,18],
  [1700,200,17],[1750,320,15],[1680,420,19],
  [360,660,20],[465,610,16],[560,690,18],[640,560,15],
  [1020,660,17],[1130,610,20],[1220,710,15],[1310,630,18],
  [1700,660,19],[1760,580,16],
  [500,500,16],[530,490,12],[1310,500,17],[1350,510,13],
  [860,350,18],[870,680,17],[860,200,15],[870,850,16],
];


// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  cam: { x: number; y: number },
  player: { x: number; y: number; w: number; h: number; dir: string; animT: number; invTimer: number },
  bProgress: Record<string, number>,
  nearId: string | null,
  t: number,
  npcStates: Record<string, NpcState>,
  npcDone: Set<string>,
  nearNpcId: string | null
) {
  const cx = cam.x, cy = cam.y;

  // Background
  ctx.fillStyle = "#060611";
  ctx.fillRect(0, 0, CW, CH);

  // Grid
  ctx.strokeStyle = "#0b0b1e";
  ctx.lineWidth = 1;
  const gs = 50;
  const gx0 = Math.floor(cx / gs) * gs - cx;
  const gy0 = Math.floor(cy / gs) * gs - cy;
  for (let x = gx0; x < CW; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
  for (let y = gy0; y < CH; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

  // Roads
  const roadY = 530; const roadH = 70;
  ctx.fillStyle = "#111120";
  ctx.fillRect(0 - cx, roadY - cy, WW, roadH);
  const roadX = 855; const roadW = 70;
  ctx.fillRect(roadX - cx, 0 - cy, roadW, WH);

  ctx.strokeStyle = "#1e1e35"; ctx.lineWidth = 2;
  [[0, roadY - cy], [0, roadY + roadH - cy]].forEach(([, y]) => {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  });
  [[roadX - cx, 0], [roadX + roadW - cx, 0]].forEach(([x]) => {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
  });

  ctx.strokeStyle = "#22224a"; ctx.lineWidth = 2;
  ctx.setLineDash([18, 18]);
  ctx.beginPath(); ctx.moveTo(0, roadY + roadH / 2 - cy); ctx.lineTo(CW, roadY + roadH / 2 - cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(roadX + roadW / 2 - cx, 0); ctx.lineTo(roadX + roadW / 2 - cx, CH); ctx.stroke();
  ctx.setLineDash([]);

  // World border
  ctx.strokeStyle = "#1a1a40"; ctx.lineWidth = 4;
  ctx.strokeRect(2 - cx, 2 - cy, WW - 4, WH - 4);

  // Trees
  for (const [tx, ty, tr] of TREES) {
    const sx = tx - cx, sy = ty - cy;
    if (sx < -tr - 20 || sx > CW + tr + 20 || sy < -tr - 20 || sy > CH + tr + 20) continue;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(sx + 3, sy + tr * 0.7 + 3, tr * 0.9, tr * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a1505"; ctx.fillRect(sx - 3, sy + tr * 0.5, 6, tr * 0.6);
    const sway = Math.sin(t / 1800 + tx * 0.3) * 2;
    ctx.fillStyle = "#0a2a0a"; ctx.beginPath(); ctx.arc(sx + sway, sy, tr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0d3a0d"; ctx.beginPath(); ctx.arc(sx + sway - tr * 0.3, sy - tr * 0.2, tr * 0.65, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#082008"; ctx.beginPath(); ctx.arc(sx + sway + tr * 0.25, sy - tr * 0.3, tr * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  // ── Buildings ─────────────────────────────────────────────────────────────
  for (const b of BUILDINGS) {
    const bx = b.x - cx, by = b.y - cy;
    if (bx + b.w < -20 || bx > CW + 20 || by + b.h < -20 || by > CH + 20) continue;
    const done = bProgress[b.id] >= b.questions.length;
    const isNear = nearId === b.id;
    ctx.shadowColor = done ? "#00ff88" : b.glowColor;
    ctx.shadowBlur = isNear ? 30 + Math.sin(t / 300) * 10 : 15;
    ctx.fillStyle = b.fillColor;
    drawRoundRect(ctx, bx, by, b.w, b.h, 8); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = done ? "#00ff88" : b.glowColor;
    ctx.lineWidth = isNear ? 2.5 : 1.5;
    ctx.globalAlpha = isNear ? 0.9 : 0.6;
    drawRoundRect(ctx, bx, by, b.w, b.h, 8); ctx.stroke();
    ctx.globalAlpha = 1;
    // Roof
    ctx.fillStyle = done ? "#003322" : b.accent + "22";
    drawRoundRect(ctx, bx + 2, by + 2, b.w - 4, 34, 7); ctx.fill();
    // Windows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const wx = bx + 18 + col * (b.w - 36) / 2.5;
        const wy = by + 50 + row * 38;
        ctx.fillStyle = done ? "#00ff4422" : b.accent + (row % 2 ? "33" : "22");
        ctx.fillRect(wx, wy, 28, 20);
        ctx.strokeStyle = (done ? "#00ff44" : b.accent) + "55";
        ctx.lineWidth = 1; ctx.strokeRect(wx, wy, 28, 20);
      }
    }
    // Door
    const doorW = 38, doorH = 52;
    const doorX = bx + b.w / 2 - doorW / 2;
    const doorY = by + b.h - doorH;
    ctx.fillStyle = done ? "#004422" : b.accent + "44";
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.strokeStyle = done ? "#00ff88" : b.glowColor;
    ctx.lineWidth = isNear ? 2 : 1; ctx.strokeRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = done ? "#00ff88" : b.glowColor;
    ctx.beginPath(); ctx.arc(doorX + doorW - 8, doorY + doorH / 2, 3, 0, Math.PI * 2); ctx.fill();
    // Label
    ctx.font = "24px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(b.emoji, bx + b.w / 2, by + 19);
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillStyle = done ? "#00ff88" : "#ccc";
    ctx.fillText(b.label, bx + b.w / 2, by - 14);
    if (done) {
      ctx.fillStyle = "#00ff88"; ctx.font = "bold 12px monospace";
      ctx.fillText("✓ ПРОЙДЕНО", bx + b.w / 2, by - 28);
    } else {
      const qDone = bProgress[b.id] || 0;
      for (let i = 0; i < b.questions.length; i++) {
        const dotX = bx + b.w / 2 - (b.questions.length - 1) * 8 + i * 16;
        ctx.fillStyle = i < qDone ? b.glowColor : "#333";
        ctx.beginPath(); ctx.arc(dotX, by - 26, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (isNear && !done) {
      const pulse = 0.85 + Math.sin(t / 250) * 0.15;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = b.glowColor; ctx.font = "bold 12px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("[ E ] Войти", bx + b.w / 2, by + b.h + 22);
      ctx.globalAlpha = 1;
    }
    if (isNear && done) {
      ctx.fillStyle = "#00ff8888"; ctx.font = "11px monospace"; ctx.textAlign = "center";
      ctx.fillText("Все вопросы пройдены ✓", bx + b.w / 2, by + b.h + 22);
    }
  }

  // ── NPC Мошенники ─────────────────────────────────────────────────────────
  for (const npc of SCAMMERS) {
    const ns = npcStates[npc.id];
    if (!ns || npcDone.has(npc.id)) continue;
    const nx = ns.x - cx, ny = ns.y - cy;
    if (nx < -80 || nx > CW + 80 || ny < -80 || ny > CH + 80) continue;

    const bounce = Math.sin(t / 350 + npc.id.charCodeAt(5)) * 2;
    const isNear = nearNpcId === npc.id;

    // Shadow
    ctx.fillStyle = "rgba(255,40,0,0.18)";
    ctx.beginPath(); ctx.ellipse(nx + 14, ny + 42, 14, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Body (villain red)
    ctx.shadowColor = "#ff2200";
    ctx.shadowBlur = isNear ? 18 : 8;
    ctx.fillStyle = "#3a0800";
    drawRoundRect(ctx, nx + 2, ny + 12 + bounce, 24, 28, 5); ctx.fill();
    ctx.fillStyle = "#5c1200";
    drawRoundRect(ctx, nx + 4, ny + 14 + bounce, 20, 13, 4); ctx.fill();
    ctx.shadowBlur = 0;

    // Head
    ctx.fillStyle = "#ffd0a0";
    ctx.beginPath(); ctx.arc(nx + 14, ny + 8 + bounce, 9, 0, Math.PI * 2); ctx.fill();

    // Evil eyes
    ctx.fillStyle = "#ff1100";
    ctx.beginPath(); ctx.arc(nx + 10, ny + 7 + bounce, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(nx + 18, ny + 7 + bounce, 2.5, 0, Math.PI * 2); ctx.fill();

    // Emoji "hat"
    ctx.font = "15px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(npc.emoji, nx + 14, ny - 6);

    // Name + role
    ctx.font = "bold 9px monospace"; ctx.fillStyle = "#ff6644"; ctx.textAlign = "center";
    ctx.fillText(npc.name, nx + 14, ny - 19);
    ctx.font = "8px monospace"; ctx.fillStyle = "#ff9977";
    ctx.fillText(npc.role, nx + 14, ny - 30);

    // Pulsing "!" above
    const excPulse = 0.6 + Math.sin(t / 220) * 0.4;
    ctx.globalAlpha = excPulse;
    ctx.font = "bold 15px monospace"; ctx.fillStyle = "#ff2200";
    ctx.fillText("!", nx + 14, ny - 43);
    ctx.globalAlpha = 1;

    // Speech bubble + E prompt when near
    if (isNear) {
      const txt = npc.intro;
      ctx.font = "10px monospace";
      const tw = Math.min(ctx.measureText(txt).width + 16, 190);
      const bh = 26;
      const bxb = nx + 14 - tw / 2;
      const byb = ny - 72;
      ctx.fillStyle = "#200a00";
      ctx.strokeStyle = "#ff330088"; ctx.lineWidth = 1;
      drawRoundRect(ctx, bxb, byb, tw, bh, 6); ctx.fill();
      drawRoundRect(ctx, bxb, byb, tw, bh, 6); ctx.stroke();
      ctx.fillStyle = "#ffaa88"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText(txt.length > 28 ? txt.substring(0, 27) + "…" : txt, nx + 14, byb + 16);

      const ep = 0.85 + Math.sin(t / 250) * 0.15;
      ctx.globalAlpha = ep;
      ctx.fillStyle = "#ff7755"; ctx.font = "bold 11px 'Courier New', monospace";
      ctx.fillText("[ E ] Поговорить", nx + 14, ny + 56);
      ctx.globalAlpha = 1;
    }
  }

  // ── Player ──────────────────────────────────────────────────────────────────
  const px = player.x - cx, py = player.y - cy;
  const bounce = player.dir !== "idle" ? Math.sin(player.animT / 180) * 2.5 : 0;
  const isInvinc = player.invTimer > 0;
  if (!isInvinc || Math.floor(t / 80) % 2 === 0) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(px + player.w / 2, py + player.h + 3, player.w / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "#00ddff"; ctx.shadowBlur = 10;
    ctx.fillStyle = "#003344";
    drawRoundRect(ctx, px + 2, py + 10 + bounce, player.w - 4, player.h - 10, 5); ctx.fill();
    ctx.fillStyle = "#004466";
    drawRoundRect(ctx, px + 4, py + 12 + bounce, player.w - 8, 14, 4); ctx.fill();
    ctx.fillStyle = "#ffe0b0";
    ctx.beginPath(); ctx.arc(px + player.w / 2, py + 7 + bounce, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#00ddff"; ctx.shadowBlur = 0;
    const eyeOff = player.dir === "left" ? -3 : player.dir === "right" ? 3 : 0;
    ctx.beginPath(); ctx.arc(px + player.w / 2 + eyeOff - 3, py + 6 + bounce, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + player.w / 2 + eyeOff + 3, py + 6 + bounce, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HollowGamePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const prevERef = useRef(false);
  const pausedRef = useRef(false);
  const frameRef = useRef<number>(0);
  const tRef = useRef(0);

  const playerRef = useRef({
    x: WW / 2 - 14, y: WH / 2 - 18, w: 28, h: 38,
    hp: TOTAL_HP, score: 0, invTimer: 0, dir: "idle" as string, animT: 0,
  });
  const camRef = useRef({ x: 0, y: 0 });
  const nearIdRef = useRef<string | null>(null);
  const nearNpcIdRef = useRef<string | null>(null);
  const bProgressRef = useRef<Record<string, number>>(Object.fromEntries(BUILDINGS.map(b => [b.id, 0])));
  const npcStatesRef = useRef<Record<string, NpcState>>({});
  const npcDoneRef = useRef<Set<string>>(new Set());

  const [screen, setScreen] = useState<"intro" | "game" | "gameover" | "victory">("intro");
  const [dialog, setDialog] = useState<{ building: Building; qIdx: number } | null>(null);
  const [result, setResult] = useState<{ correct: boolean; explanation: string; scoreChange: number; hpChange: number } | null>(null);
  const [npcDialog, setNpcDialog] = useState<ScammerNPC | null>(null);
  const [npcResult, setNpcResult] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [hud, setHud] = useState({ hp: TOTAL_HP, score: 0, completed: 0 });

  // ── Game loop ───────────────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    let last = performance.now();
    function loop(now: number) {
      const dt = Math.min(now - last, 50);
      last = now;
      tRef.current += dt;
      const t = tRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) { frameRef.current = requestAnimationFrame(loop); return; }

      const player = playerRef.current;
      const cam = camRef.current;
      const keys = keysRef.current;

      if (!pausedRef.current) {
        // Movement
        let dx = 0, dy = 0;
        if (keys.has("a") || keys.has("arrowleft")) dx -= SPEED;
        if (keys.has("d") || keys.has("arrowright")) dx += SPEED;
        if (keys.has("w") || keys.has("arrowup")) dy -= SPEED;
        if (keys.has("s") || keys.has("arrowdown")) dy += SPEED;
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        player.x = Math.max(0, Math.min(WW - player.w, player.x + dx));
        player.y = Math.max(0, Math.min(WH - player.h, player.y + dy));
        if (dx !== 0 || dy !== 0) {
          player.dir = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
          player.animT += dt;
        } else { player.dir = "idle"; }
        if (player.invTimer > 0) player.invTimer -= dt;

        // Camera
        const tcx = player.x + player.w / 2 - CW / 2;
        const tcy = player.y + player.h / 2 - CH / 2;
        cam.x += (tcx - cam.x) * 0.12;
        cam.y += (tcy - cam.y) * 0.12;
        cam.x = Math.max(0, Math.min(WW - CW, cam.x));
        cam.y = Math.max(0, Math.min(WH - CH, cam.y));

        // NPC patrol update
        for (const npc of SCAMMERS) {
          if (npcDoneRef.current.has(npc.id)) continue;
          const ns = npcStatesRef.current[npc.id];
          if (!ns) continue;
          ns.x += npc.speed * ns.dir * (dt / 16);
          if (ns.x >= npc.patrolX2) { ns.x = npc.patrolX2; ns.dir = -1; }
          if (ns.x <= npc.patrolX1) { ns.x = npc.patrolX1; ns.dir = 1; }
        }

        // Building proximity
        const pCX = player.x + player.w / 2, pCY = player.y + player.h / 2;
        let nearId: string | null = null;
        for (const b of BUILDINGS) {
          const doorCX = b.x + b.w / 2, doorCY = b.y + b.h;
          if (Math.hypot(pCX - doorCX, pCY - doorCY) < INTERACT_R) { nearId = b.id; break; }
        }
        nearIdRef.current = nearId;

        // NPC proximity
        let nearNpcId: string | null = null;
        if (!nearId) {
          for (const npc of SCAMMERS) {
            if (npcDoneRef.current.has(npc.id)) continue;
            const ns = npcStatesRef.current[npc.id];
            if (!ns) continue;
            if (Math.hypot(pCX - (ns.x + 14), pCY - (ns.y + 20)) < INTERACT_R) { nearNpcId = npc.id; break; }
          }
        }
        nearNpcIdRef.current = nearNpcId;

        // E key
        const eNow = keys.has("e");
        if (eNow && !prevERef.current) {
          if (nearId) {
            const building = BUILDINGS.find(b => b.id === nearId)!;
            const qIdx = bProgressRef.current[nearId] || 0;
            if (qIdx < building.questions.length) {
              pausedRef.current = true;
              setDialog({ building, qIdx });
            }
          } else if (nearNpcId) {
            const npc = SCAMMERS.find(n => n.id === nearNpcId)!;
            pausedRef.current = true;
            setNpcDialog(npc);
          }
        }
        prevERef.current = eNow;
      }

      drawScene(ctx, cam, player, bProgressRef.current, nearIdRef.current, t,
        npcStatesRef.current, npcDoneRef.current, nearNpcIdRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Keyboard (EN + RU) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const MOVE_KEYS = new Set(["w","a","s","d","e","arrowup","arrowdown","arrowleft","arrowright"]);
    const down = (e: KeyboardEvent) => {
      const key = RU_KEY[e.key] || e.key.toLowerCase();
      keysRef.current.add(key);
      if (MOVE_KEYS.has(key)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const key = RU_KEY[e.key] || e.key.toLowerCase();
      keysRef.current.delete(key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [screen]);

  // ── Start game ───────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    playerRef.current = { x: WW / 2 - 14, y: WH / 2 - 18, w: 28, h: 38, hp: TOTAL_HP, score: 0, invTimer: 0, dir: "idle", animT: 0 };
    camRef.current = { x: WW / 2 - CW / 2, y: WH / 2 - CH / 2 };
    bProgressRef.current = Object.fromEntries(BUILDINGS.map(b => [b.id, 0]));
    npcStatesRef.current = Object.fromEntries(SCAMMERS.map(n => [n.id, { x: n.patrolX1, y: n.patrolY, dir: 1 }]));
    npcDoneRef.current = new Set();
    prevERef.current = false;
    pausedRef.current = false;
    tRef.current = 0;
    setHud({ hp: TOTAL_HP, score: 0, completed: 0 });
    setDialog(null); setResult(null);
    setNpcDialog(null); setNpcResult(null);
    setScreen("game");
  }, []);

  useEffect(() => {
    if (screen !== "game") return;
    startLoop();
    return () => cancelAnimationFrame(frameRef.current);
  }, [screen, startLoop]);

  // ── Building answer ──────────────────────────────────────────────────────────
  const handleAnswer = useCallback((idx: number) => {
    if (!dialog) return;
    const { building, qIdx } = dialog;
    const q = building.questions[qIdx];
    const correct = idx === q.correct;
    const player = playerRef.current;
    let hpChange = 0, scoreChange = 0;
    if (correct) { scoreChange = q.score_reward; player.score += scoreChange; }
    else { hpChange = -q.hp_penalty; player.hp = Math.max(0, player.hp - q.hp_penalty); player.invTimer = 1200; }
    bProgressRef.current[building.id] = qIdx + 1;
    const completed = BUILDINGS.filter(b => (bProgressRef.current[b.id] ?? 0) >= b.questions.length).length;
    setHud({ hp: player.hp, score: player.score, completed });
    setResult({ correct, explanation: q.explanation, scoreChange, hpChange });
    if (player.hp <= 0) setTimeout(() => { setDialog(null); setResult(null); setScreen("gameover"); }, 1800);
  }, [dialog]);

  const handleContinue = useCallback(() => {
    if (!dialog) return;
    const { building, qIdx } = dialog;
    const newQIdx = qIdx + 1;
    const allDone = BUILDINGS.every(b => bProgressRef.current[b.id] >= b.questions.length);
    setResult(null);
    if (newQIdx < building.questions.length) {
      setDialog({ building, qIdx: newQIdx });
    } else {
      setDialog(null);
      pausedRef.current = false;
      if (allDone) setTimeout(() => setScreen("victory"), 400);
    }
  }, [dialog]);

  // ── NPC answer ───────────────────────────────────────────────────────────────
  const handleNpcAnswer = useCallback((idx: number) => {
    if (!npcDialog) return;
    const correct = idx === npcDialog.correct;
    const player = playerRef.current;
    if (correct) { player.score += npcDialog.reward; }
    else { player.hp = Math.max(0, player.hp - npcDialog.penalty); player.invTimer = 1200; }
    npcDoneRef.current.add(npcDialog.id);
    const completed = BUILDINGS.filter(b => (bProgressRef.current[b.id] ?? 0) >= b.questions.length).length;
    setHud({ hp: player.hp, score: player.score, completed });
    setNpcResult({ correct, explanation: npcDialog.explanation });
    if (player.hp <= 0) setTimeout(() => { setNpcDialog(null); setNpcResult(null); setScreen("gameover"); }, 1800);
  }, [npcDialog]);

  const handleNpcClose = useCallback(() => {
    setNpcDialog(null); setNpcResult(null);
    pausedRef.current = false;
  }, []);

  // ── Mini map ─────────────────────────────────────────────────────────────────
  const MiniMap = () => {
    const scale = 0.095;
    const mw = WW * scale, mh = WH * scale;
    return (
      <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 overflow-hidden"
        style={{ width: mw, height: mh, background: "#060611" }}>
        {BUILDINGS.map(b => {
          const done = bProgressRef.current[b.id] >= b.questions.length;
          return (
            <div key={b.id} className="absolute rounded-sm"
              style={{ left: b.x * scale, top: b.y * scale, width: b.w * scale, height: b.h * scale,
                background: done ? "#00ff8833" : b.glowColor + "33",
                border: `1px solid ${done ? "#00ff88" : b.glowColor}88` }} />
          );
        })}
        {SCAMMERS.map(n => {
          const ns = npcStatesRef.current[n.id];
          if (!ns || npcDoneRef.current.has(n.id)) return null;
          return (
            <div key={n.id} className="absolute rounded-full"
              style={{ left: ns.x * scale - 2, top: ns.y * scale - 2, width: 5, height: 5, background: "#ff3300" }} />
          );
        })}
        <div className="absolute rounded-full bg-white"
          style={{ left: playerRef.current.x * scale - 3, top: playerRef.current.y * scale - 3,
            width: 6, height: 6, boxShadow: "0 0 4px #00ddff" }} />
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030308] flex items-center justify-center">
      <AnimatePresence mode="wait">

        {/* ── Intro ── */}
        {screen === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="max-w-xl w-full mx-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-green-400 text-lg">🛡️</span>
              <span className="text-white font-bold text-lg">Cyber<span className="text-green-400">Sim</span></span>
            </div>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-6xl mb-6">🌆</motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Кибер<span className="text-purple-400">Город</span></h1>
            <p className="text-gray-400 mb-6 text-sm">Открытый мир · 6 зданий · 3 мошенника · 15+ вопросов</p>
            <div className="bg-[#0d0d20] border border-purple-800/40 rounded-2xl p-6 mb-6 text-left space-y-3">
              <p className="text-white font-semibold text-sm mb-1">Как играть:</p>
              {[
                ["🕹️", "WASD / стрелки", "Движение (работает и с русской раскладкой)"],
                ["🏠", "Подойди к зданию", "Появится подсказка ниже двери"],
                ["⌨️", "Нажми E", "Войти и поговорить с NPC"],
                ["🕴️", "Мошенники на улице", "Подойди и нажми E — распознай схему"],
                ["✅", "Отвечай правильно", "+очки, неверно — −HP"],
              ].map(([emoji, action, desc]) => (
                <div key={action} className="flex items-center gap-3">
                  <span className="text-xl w-7 text-center">{emoji}</span>
                  <div>
                    <span className="text-purple-300 font-mono text-sm">{action}</span>
                    <span className="text-gray-500 text-xs"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <p className="text-xs text-red-400 font-mono mb-2">⚠️ Мошенники в городе:</p>
              <div className="grid grid-cols-3 gap-2">
                {SCAMMERS.map(n => (
                  <div key={n.id} className="bg-[#150505] border border-red-900/50 rounded-xl py-2 px-1 text-center">
                    <div className="text-xl mb-0.5">{n.emoji}</div>
                    <div className="text-xs text-red-400">{n.name}</div>
                    <div className="text-xs text-gray-600">{n.role}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={startGame} className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all">
                Начать игру
              </button>
              <button onClick={() => router.push("/dashboard")} className="px-6 py-3 border border-white/20 text-gray-400 hover:text-white rounded-xl transition-all">
                ← Меню
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Game ── */}
        {screen === "game" && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative" style={{ width: CW, height: CH }}>
            <canvas ref={canvasRef} width={CW} height={CH} className="rounded-xl border border-white/10" />

            {/* HUD */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              {/* CyberSim logo */}
              <button onClick={() => { cancelAnimationFrame(frameRef.current); router.push("/dashboard"); }}
                className="pointer-events-auto flex items-center gap-1.5 bg-black/60 rounded-lg px-3 py-1.5 backdrop-blur-sm hover:bg-black/80 transition-colors">
                <span className="text-green-400 text-xs">🛡️</span>
                <span className="text-white font-bold text-xs">Cyber<span className="text-green-400">Sim</span></span>
              </button>
              <div className="flex items-center gap-2 bg-black/60 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                <span className="text-red-400 text-xs">❤️</span>
                <div className="w-24 h-2 bg-[#1a1a2a] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${hud.hp}%`, background: hud.hp > 60 ? "#00ff88" : hud.hp > 30 ? "#ffaa00" : "#ff4444" }} />
                </div>
                <span className="text-xs text-gray-300 font-mono">{hud.hp}%</span>
              </div>
              <div className="bg-black/60 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                <span className="text-xs text-yellow-400 font-mono font-bold">⭐ {hud.score}</span>
              </div>
              <div className="bg-black/60 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                <span className="text-xs text-purple-400 font-mono">{hud.completed}/{BUILDINGS.length} зданий</span>
              </div>
              <button onClick={() => { cancelAnimationFrame(frameRef.current); router.push("/dashboard"); }}
                className="pointer-events-auto bg-black/60 rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white backdrop-blur-sm transition-colors">
                ← Меню
              </button>
            </div>

            <MiniMap />

            {/* Building dialog */}
            <AnimatePresence>
              {dialog && (
                <motion.div key="dialog" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-0 flex items-end rounded-xl overflow-hidden"
                  style={{ background: "rgba(3,3,16,0.6)", backdropFilter: "blur(4px)" }}>
                  <div className="w-full" style={{ background: "linear-gradient(to top, #06061a, #08081e)", borderTop: `2px solid ${dialog.building.glowColor}55` }}>
                    <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: dialog.building.fillColor, border: `2px solid ${dialog.building.glowColor}88` }}>
                        {dialog.building.questions[dialog.qIdx].npcEmoji}
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: dialog.building.glowColor }}>
                          {dialog.building.questions[dialog.qIdx].npc} · {dialog.building.emoji} {dialog.building.label}
                        </p>
                        <p className="text-xs text-gray-500">Вопрос {dialog.qIdx + 1} из {dialog.building.questions.length}</p>
                      </div>
                    </div>
                    <p className="text-white text-sm px-5 pb-3 leading-relaxed">{dialog.building.questions[dialog.qIdx].text}</p>
                    {!result && (
                      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                        {dialog.building.questions[dialog.qIdx].answers.map((a: string, i: number) => (
                          <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => handleAnswer(i)}
                            className="text-left px-3 py-2 rounded-lg border text-xs text-gray-200 transition-all"
                            style={{ background: dialog.building.fillColor, borderColor: dialog.building.accent + "55" }}>
                            <span className="font-mono font-bold mr-1" style={{ color: dialog.building.glowColor }}>{String.fromCharCode(65 + i)}.</span>
                            {a}
                          </motion.button>
                        ))}
                      </div>
                    )}
                    {result && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-4 space-y-2">
                        <div className={`rounded-xl p-3 border ${result.correct ? "border-green-700/50 bg-green-950/40" : "border-red-700/50 bg-red-950/30"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{result.correct ? "✅" : "❌"}</span>
                            <span className={`font-bold text-sm ${result.correct ? "text-green-400" : "text-red-400"}`}>
                              {result.correct ? `Правильно! +${result.scoreChange} очков` : `Ошибка! −${Math.abs(result.hpChange)} HP`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed">{result.explanation}</p>
                        </div>
                        <button onClick={handleContinue} className="w-full py-2 rounded-lg text-sm font-bold transition-all"
                          style={{ background: dialog.building.glowColor + "22", color: dialog.building.glowColor, border: `1px solid ${dialog.building.glowColor}55` }}>
                          Продолжить →
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* NPC Мошенник dialog */}
              {npcDialog && (
                <motion.div key="npcdialog" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-0 flex items-end rounded-xl overflow-hidden"
                  style={{ background: "rgba(20,2,2,0.7)", backdropFilter: "blur(4px)" }}>
                  <div className="w-full" style={{ background: "linear-gradient(to top, #140000, #1c0303)", borderTop: "2px solid #ff330055" }}>
                    {/* NPC header */}
                    <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: "#2a0500", border: "2px solid #ff330088" }}>
                        {npcDialog.emoji}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-400">{npcDialog.name} · {npcDialog.role}</p>
                        <p className="text-xs text-red-900">⚠️ Подозрительная личность</p>
                      </div>
                      <div className="ml-auto">
                        <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full border border-red-800/50">МОШЕННИК?</span>
                      </div>
                    </div>

                    {/* Dialog text */}
                    <p className="text-orange-100 text-sm px-5 pb-3 leading-relaxed italic">«{npcDialog.dialog}»</p>

                    {/* Answers */}
                    {!npcResult && (
                      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                        {npcDialog.answers.map((a: string, i: number) => (
                          <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => handleNpcAnswer(i)}
                            className="text-left px-3 py-2 rounded-lg border text-xs text-gray-200 transition-all bg-[#200500] border-red-900/50 hover:border-red-600/70">
                            <span className="font-mono font-bold mr-1 text-red-500">{String.fromCharCode(65 + i)}.</span>
                            {a}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Result */}
                    {npcResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-4 space-y-2">
                        <div className={`rounded-xl p-3 border ${npcResult.correct ? "border-green-700/50 bg-green-950/40" : "border-red-700/50 bg-red-950/30"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{npcResult.correct ? "🛡️" : "💸"}</span>
                            <span className={`font-bold text-sm ${npcResult.correct ? "text-green-400" : "text-red-400"}`}>
                              {npcResult.correct ? `Мошенник разоблачён! +${npcDialog?.reward} очков` : `Попался на уловку! −${npcDialog?.penalty} HP`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed">{npcResult.explanation}</p>
                        </div>
                        <button onClick={handleNpcClose} className="w-full py-2 rounded-lg text-sm font-bold text-red-400 transition-all"
                          style={{ background: "#ff330011", border: "1px solid #ff330044" }}>
                          Продолжить →
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Game Over ── */}
        {screen === "gameover" && (
          <motion.div key="over" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full mx-4 text-center">
            <div className="text-6xl mb-4">💀</div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">Взломан!</h2>
            <p className="text-gray-400 mb-6">Твои данные скомпрометированы. Изучи советы и попробуй снова.</p>
            <div className="bg-[#0d0d20] border border-red-800/30 rounded-2xl p-5 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-3xl font-bold text-yellow-400">{hud.score}</p><p className="text-xs text-gray-500">очков</p></div>
                <div><p className="text-3xl font-bold text-purple-400">{hud.completed}/{BUILDINGS.length}</p><p className="text-xs text-gray-500">зданий</p></div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={startGame} className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl transition-all">Попробовать снова</button>
              <button onClick={() => router.push("/dashboard")} className="px-6 py-3 border border-white/20 text-gray-400 hover:text-white rounded-xl transition-all">← Меню</button>
            </div>
          </motion.div>
        )}

        {/* ── Victory ── */}
        {screen === "victory" && (
          <motion.div key="victory" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full mx-4 text-center">
            <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-6xl mb-4">🏆</motion.div>
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">Город защищён!</h2>
            <p className="text-gray-400 mb-6">Ты прошёл все {BUILDINGS.length} зданий и разоблачил мошенников!</p>
            <div className="bg-[#0d0d20] border border-yellow-700/30 rounded-2xl p-5 mb-4">
              <p className="text-5xl font-bold text-yellow-400 mb-1">{hud.score}</p>
              <p className="text-gray-400 text-sm">из {TOTAL_Q * 150}+ возможных очков</p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {BUILDINGS.map(b => (
                  <div key={b.id} className="text-center">
                    <div className="text-2xl">{b.emoji}</div>
                    <div className="text-xs text-green-400 font-mono">✓</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={startGame} className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-xl transition-all">Играть снова</button>
              <button onClick={() => router.push("/dashboard")} className="px-6 py-3 border border-white/20 text-gray-400 hover:text-white rounded-xl transition-all">← Меню</button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
