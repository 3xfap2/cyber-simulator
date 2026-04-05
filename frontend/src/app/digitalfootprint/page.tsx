"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronLeft, ChevronRight, AlertTriangle, Eye, RotateCcw } from "lucide-react";
import { API_URL } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Choice {
  id: string;
  text: string;
  detail: string;
  exposure: number; // 0 = safe, 1 = low, 2 = medium, 3 = high
  dataLeaked: string[]; // what info hacker gets
}

interface Stage {
  id: number;
  title: string;
  context: string;
  icon: string;
  platform: string;
  choices: Choice[];
}

// ─── Game data ────────────────────────────────────────────────────────────────

const STAGES: Stage[] = [
  {
    id: 1,
    title: "Профиль ВКонтакте",
    context: "Ты регистрируешься во ВКонтакте. Что указываешь в профиле?",
    icon: "📱",
    platform: "ВКонтакте",
    choices: [
      {
        id: "a",
        text: "Настоящее имя, город, дата рождения, место работы — всё открыто",
        detail: "Полный публичный профиль для лёгкого общения",
        exposure: 3,
        dataLeaked: ["Полное имя", "Дата рождения", "Город", "Место работы", "Список друзей"],
      },
      {
        id: "b",
        text: "Имя и город — дата рождения и работа скрыты",
        detail: "Частично открытый профиль",
        exposure: 1,
        dataLeaked: ["Имя", "Город"],
      },
      {
        id: "c",
        text: "Псевдоним, без личных данных, профиль закрыт",
        detail: "Максимальная приватность",
        exposure: 0,
        dataLeaked: [],
      },
      {
        id: "d",
        text: "Настоящее имя, фото с геотегом, школа и вуз видны всем",
        detail: "Открытый профиль с историей обучения",
        exposure: 3,
        dataLeaked: ["Полное имя", "Фото", "Геолокация", "Школа/Вуз", "Дата рождения из подписчиков"],
      },
    ],
  },
  {
    id: 2,
    title: "Вопрос безопасности",
    context: "Банк просит установить секретный вопрос для восстановления доступа. Что выбираешь?",
    icon: "🏦",
    platform: "Банк",
    choices: [
      {
        id: "a",
        text: "«Имя домашнего животного?» — отвечаю честно: «Барсик»",
        detail: "Имя питомца часто в соцсетях",
        exposure: 3,
        dataLeaked: ["Кличка питомца (есть в соцсетях)", "Ответ на секретный вопрос"],
      },
      {
        id: "b",
        text: "«Девичья фамилия матери?» — отвечаю честно",
        detail: "Может быть в открытых источниках",
        exposure: 2,
        dataLeaked: ["Девичья фамилия матери (OSINT)"],
      },
      {
        id: "c",
        text: "Использую случайную фразу как пароль, не связанную с вопросом",
        detail: "Например на вопрос «город рождения» отвечаю «Фиолетовый крокодил 7#»",
        exposure: 0,
        dataLeaked: [],
      },
      {
        id: "d",
        text: "«Кличка первого питомца?» — «Шарик». Написал то же в посте ВК на прошлой неделе",
        detail: "Публично упомянул в соцсетях",
        exposure: 3,
        dataLeaked: ["Кличка питомца (в публичном посте)", "Полный обход защиты"],
      },
    ],
  },
  {
    id: 3,
    title: "Разрешения приложения",
    context: "Скачал бесплатную игру. Она запрашивает разрешения. Что разрешаешь?",
    icon: "🎮",
    platform: "Google Play",
    choices: [
      {
        id: "a",
        text: "Принимаю всё — хочу скорее играть",
        detail: "Контакты, микрофон, камера, геолокация, SMS",
        exposure: 3,
        dataLeaked: ["Все контакты", "Геолокация в реальном времени", "SMS (коды 2FA)", "Фото и видео"],
      },
      {
        id: "b",
        text: "Разрешаю только нужное для игры (хранилище), остальное отклоняю",
        detail: "Минимально необходимые права",
        exposure: 0,
        dataLeaked: [],
      },
      {
        id: "c",
        text: "Разрешаю геолокацию — думаю, это для карты в игре",
        detail: "Приложение получает GPS-координаты 24/7",
        exposure: 2,
        dataLeaked: ["Постоянная геолокация", "Маршруты и места посещения"],
      },
      {
        id: "d",
        text: "Разрешаю доступ к контактам и SMS — решаю, что это для входа",
        detail: "Критически опасно: SMS содержат коды 2FA",
        exposure: 3,
        dataLeaked: ["Список контактов", "Все входящие SMS (включая коды банков и 2FA)"],
      },
    ],
  },
  {
    id: 4,
    title: "Публичный Wi-Fi",
    context: "В кафе работаешь на ноутбуке. Нужно зайти в онлайн-банк. Как подключаешься?",
    icon: "☕",
    platform: "Кафе",
    choices: [
      {
        id: "a",
        text: "Подключаюсь к «CafeWifi_Free» и захожу в банк напрямую",
        detail: "Открытая сеть без шифрования",
        exposure: 3,
        dataLeaked: ["Логин и пароль банка (перехват)", "Номер карты", "Баланс счёта"],
      },
      {
        id: "b",
        text: "Использую мобильный интернет (4G) вместо публичного Wi-Fi",
        detail: "Мобильный трафик шифруется оператором",
        exposure: 0,
        dataLeaked: [],
      },
      {
        id: "c",
        text: "Подключаюсь к Wi-Fi через VPN, потом захожу в банк",
        detail: "VPN шифрует весь трафик",
        exposure: 0,
        dataLeaked: [],
      },
      {
        id: "d",
        text: "Подключаюсь к первой открытой сети и проверяю почту и соцсети — в банк не захожу",
        detail: "Соцсети тоже могут быть перехвачены",
        exposure: 1,
        dataLeaked: ["Сессионные токены соцсетей"],
      },
    ],
  },
  {
    id: 5,
    title: "Фото и посты",
    context: "Уходишь в отпуск на 2 недели. Что постишь в соцсетях?",
    icon: "✈️",
    platform: "Instagram / VK",
    choices: [
      {
        id: "a",
        text: "Пощу фото с геотегом «аэропорт Сочи» + «дома никого нет 2 недели!»",
        detail: "Открытое приглашение для воров",
        exposure: 3,
        dataLeaked: ["Домашний адрес (из профиля)", "Дата отъезда", "Пустая квартира", "Геолокация"],
      },
      {
        id: "b",
        text: "Ничего не пощу до возвращения, потом выкладываю фото без геотегов",
        detail: "Максимально безопасно",
        exposure: 0,
        dataLeaked: [],
      },
      {
        id: "c",
        text: "Делюсь фото только с друзьями (закрытый профиль), без геотегов",
        detail: "Умеренно безопасно",
        exposure: 1,
        dataLeaked: ["Информация доступна списку друзей"],
      },
      {
        id: "d",
        text: "Публично: фото билетов с QR-кодом, дата вылета, курорт",
        detail: "QR на билете можно использовать для регистрации вместо тебя",
        exposure: 3,
        dataLeaked: ["QR-код билета", "Рейс и дата", "Длительность отсутствия дома"],
      },
    ],
  },
  {
    id: 6,
    title: "Пароли и аккаунты",
    context: "Регистрируешься на новом форуме. Как создаёшь аккаунт?",
    icon: "🔑",
    platform: "Форум",
    choices: [
      {
        id: "a",
        text: "Тот же пароль что везде + реальная почта",
        detail: "При утечке форума — скомпрометированы все аккаунты",
        exposure: 3,
        dataLeaked: ["Пароль (используется везде)", "Email", "Возможный взлом всех аккаунтов"],
      },
      {
        id: "b",
        text: "Уникальный сложный пароль + временный email (guerrillamail.com)",
        detail: "Изолированный аккаунт",
        exposure: 0,
        dataLeaked: [],
      },
      {
        id: "c",
        text: "Вхожу через «Войти через ВКонтакте»",
        detail: "Форум получает базовые данные твоего VK-профиля",
        exposure: 2,
        dataLeaked: ["Имя из VK", "Email VK", "Аватар", "ID профиля"],
      },
      {
        id: "d",
        text: "Пароль «Петров1987» — моя фамилия и год рождения",
        detail: "Первое что проверят при атаке",
        exposure: 3,
        dataLeaked: ["Фамилия", "Год рождения", "Предсказуемый пароль"],
      },
    ],
  },
];

// ─── Attack scenarios ──────────────────────────────────────────────────────────

function buildHackerProfile(selections: Record<number, Choice>): {
  totalExposure: number;
  collectedData: string[];
  attacks: { title: string; desc: string; icon: string }[];
} {
  const allData: string[] = [];
  let totalExposure = 0;

  Object.values(selections).forEach((c) => {
    totalExposure += c.exposure;
    c.dataLeaked.forEach((d) => { if (!allData.includes(d)) allData.push(d); });
  });

  const attacks: { title: string; desc: string; icon: string }[] = [];

  const hasName = allData.some((d) => d.includes("имя") || d.includes("Имя") || d.includes("Полное"));
  const hasBirthday = allData.some((d) => d.includes("рождения") || d.includes("рождени"));
  const hasLocation = allData.some((d) => d.includes("Город") || d.includes("Геолок") || d.includes("геолок"));
  const hasPetName = allData.some((d) => d.includes("питомца") || d.includes("Кличка"));
  const hasSMS = allData.some((d) => d.includes("SMS"));
  const hasContacts = allData.some((d) => d.includes("контакт") || d.includes("Контакт"));
  const hasBankCreds = allData.some((d) => d.includes("пароль банка") || d.includes("Логин"));
  const hasReusedPwd = allData.some((d) => d.includes("везде") || d.includes("всех аккаунтов"));
  const hasHomeEmpty = allData.some((d) => d.includes("квартира") || d.includes("отсутствия"));
  const hasSecretAnswer = allData.some((d) => d.includes("секретный вопрос") || d.includes("обход защиты") || d.includes("питомца (в публичном)"));

  if (hasName && hasBirthday)
    attacks.push({ icon: "🪪", title: "Взлом через «Забыл пароль»", desc: `Имя + дата рождения — стандартная форма восстановления. Хакер сбрасывает твой пароль в большинстве сервисов.` });
  if (hasPetName || hasSecretAnswer)
    attacks.push({ icon: "🐾", title: "Обход секретного вопроса", desc: `Кличка питомца найдена в публичных постах. Ответ на секретный вопрос скомпрометирован — доступ к банку открыт.` });
  if (hasSMS)
    attacks.push({ icon: "💬", title: "Перехват 2FA-кодов", desc: `Приложение с доступом к SMS читает все коды двухфакторной аутентификации. Хакер может войти в любой аккаунт, даже с 2FA.` });
  if (hasContacts)
    attacks.push({ icon: "👥", title: "Атака на твоих контактов", desc: `Список контактов позволяет рассылать фишинг от твоего имени всем знакомым — они доверяют «тебе».` });
  if (hasBankCreds)
    attacks.push({ icon: "🏦", title: "Прямой доступ к банку", desc: `Логин и пароль перехвачены через открытый Wi-Fi. Баланс счёта виден, переводы доступны.` });
  if (hasReusedPwd)
    attacks.push({ icon: "🔓", title: "Credential Stuffing", desc: `Один пароль для всех — утечка с форума даёт доступ к почте, соцсетям, банку. Всё взломано одновременно.` });
  if (hasHomeEmpty)
    attacks.push({ icon: "🏠", title: "Физическое ограбление", desc: `Пост о 2-недельном отсутствии + адрес из профиля = открытое приглашение. Твои данные проданы на форуме воров.` });
  if (hasLocation)
    attacks.push({ icon: "📍", title: "Составлен маршрут передвижений", desc: `Геотеги и геолокация приложения раскрывают где ты живёшь, работаешь, бываешь. Идеально для слежки.` });

  if (attacks.length === 0)
    attacks.push({ icon: "🛡️", title: "Хакер отступил", desc: `Недостаточно данных для атаки. Твои настройки приватности не позволили собрать нужную информацию.` });

  return { totalExposure, collectedData: allData, attacks };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Screen = "intro" | "game" | "reveal";

export default function DigitalFootprintPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("intro");
  const [stageIndex, setStageIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, Choice>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [activeStages, setActiveStages] = useState<Stage[]>(STAGES);
  const [aiLoading, setAiLoading] = useState(false);

  const stage = activeStages[stageIndex];

  const startWithAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-digitalfootprint-stages`);
      const data = await res.json();
      if (data.stages?.length > 0) setActiveStages(data.stages);
    } catch { /* fallback to static */ }
    finally {
      setAiLoading(false);
      setStageIndex(0);
      setSelections({});
      setSelected(null);
      setConfirmed(false);
      setScreen("game");
    }
  };

  const handleSelect = (choice: Choice) => {
    if (confirmed) return;
    setSelected(choice.id);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const choice = stage.choices.find((c: Choice) => c.id === selected)!;
    setSelections((prev: Record<number, Choice>) => ({ ...prev, [stage.id]: choice }));
    setConfirmed(true);
  };

  const handleNext = () => {
    if (stageIndex < activeStages.length - 1) {
      setStageIndex((i: number) => i + 1);
      setSelected(null);
      setConfirmed(false);
    } else {
      setScreen("reveal");
    }
  };

  const handleRestart = () => {
    setScreen("intro");
    setStageIndex(0);
    setSelections({});
    setSelected(null);
    setConfirmed(false);
  };

  const profile = screen === "reveal" ? buildHackerProfile(selections) : null;
  const maxExposure = STAGES.length * 3;

  const EXPOSURE_COLORS = ["text-green-400", "text-yellow-400", "text-orange-400", "text-red-400"];
  const EXPOSURE_LABELS = ["Безопасно", "Низкий риск", "Средний риск", "Высокий риск"];
  const EXPOSURE_BG = ["bg-green-500", "bg-yellow-400", "bg-orange-400", "bg-red-500"];

  const choiceExposureColor = (exp: number) => ["border-green-500/60 bg-green-950/20", "border-yellow-500/60 bg-yellow-950/20", "border-orange-500/60 bg-orange-950/20", "border-red-500/60 bg-red-950/20"][exp];

  return (
    <div className="min-h-screen bg-cyber-dark text-white">
      {/* Header */}
      <header className="border-b border-cyber-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-cyber-green w-7 h-7" />
          <span className="text-white font-bold text-lg">Cyber<span className="text-cyber-green">Sim</span></span>
          <span className="text-gray-600 mx-2">|</span>
          <span className="text-pink-400 font-semibold">👣 Цифровой след</span>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Дашборд
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {screen === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-7xl mb-4">👣</motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">Цифровой след</h1>
                <p className="text-gray-400 text-sm">Каждое твоё решение в сети оставляет след. Посмотри, что хакер может о тебе узнать.</p>
              </div>
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-6 mb-6 space-y-3">
                {[
                  { icon: "🎭", text: `${STAGES.length} ситуаций — соцсети, банк, Wi-Fi, приложения, посты` },
                  { icon: "👣", text: "Твои выборы формируют цифровой след" },
                  { icon: "🕵️", text: "В конце хакер показывает что он собрал и как использует" },
                  { icon: "💡", text: "Узнай свои слабые места и как их закрыть" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setScreen("game")}
                className="w-full bg-gradient-to-r from-pink-700 to-rose-600 hover:from-pink-600 hover:to-rose-500 text-white font-bold py-4 rounded-xl text-lg transition-all">
                👣 Начать — что ты оставляешь в сети?
              </button>
              <button onClick={startWithAI} disabled={aiLoading}
                className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {aiLoading ? "⏳ Генерирую ситуации..." : "🤖 Режим ИИ — новые ситуации"}
              </button>
            </motion.div>
          )}

          {/* ── GAME ── */}
          {screen === "game" && (
            <motion.div key={`stage-${stageIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Ситуация {stageIndex + 1} из {STAGES.length}</span>
                  <span className="text-pink-400">{stage.platform}</span>
                </div>
                <div className="h-1.5 bg-cyber-dark rounded-full overflow-hidden">
                  <motion.div className="h-full bg-pink-500 rounded-full"
                    animate={{ width: `${((stageIndex + 1) / STAGES.length) * 100}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>

              {/* Stage card */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{stage.icon}</span>
                  <div>
                    <h2 className="text-white font-bold">{stage.title}</h2>
                    <p className="text-gray-400 text-sm mt-0.5">{stage.context}</p>
                  </div>
                </div>
              </div>

              {/* Choices */}
              <div className="space-y-3 mb-5">
                {stage.choices.map((choice: Choice) => {
                  const isSelected = selected === choice.id;
                  const isConfirmed = confirmed;
                  return (
                    <motion.button key={choice.id} whileHover={!isConfirmed ? { scale: 1.01 } : {}}
                      onClick={() => handleSelect(choice)}
                      className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                        isConfirmed
                          ? isSelected
                            ? choiceExposureColor(choice.exposure)
                            : "border-cyber-border bg-cyber-card opacity-40 cursor-default"
                          : isSelected
                            ? "border-pink-500 bg-pink-950/20 cursor-pointer"
                            : "border-cyber-border bg-cyber-card hover:border-pink-500/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold ${
                          isSelected && !isConfirmed ? "border-pink-500 bg-pink-500/20 text-pink-400" :
                          isSelected && isConfirmed ? "border-current bg-current" :
                          "border-gray-600 text-gray-500"
                        }`}>
                          {choice.id.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-200 font-medium">{choice.text}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{choice.detail}</p>
                          {isConfirmed && isSelected && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2">
                              {choice.exposure === 0 ? (
                                <p className="text-xs text-green-400 font-medium">✓ Хорошее решение — данные защищены</p>
                              ) : (
                                <div>
                                  <p className="text-xs font-medium mb-1" style={{ color: ["", "#facc15", "#fb923c", "#f87171"][choice.exposure] }}>
                                    ⚠ Хакер получил:
                                  </p>
                                  <ul className="space-y-0.5">
                                    {choice.dataLeaked.map((d: string, i: number) => (
                                      <li key={i} className="text-xs text-gray-400 flex gap-1"><span className="text-red-400">•</span>{d}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {!confirmed ? (
                <button onClick={handleConfirm} disabled={!selected}
                  className="w-full bg-pink-700 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all">
                  Выбрать
                </button>
              ) : (
                <button onClick={handleNext}
                  className="w-full bg-cyber-green hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  {stageIndex < STAGES.length - 1 ? <><ChevronRight size={18} /> Следующая ситуация</> : <>👣 Посмотреть мой след</>}
                </button>
              )}
            </motion.div>
          )}

          {/* ── REVEAL ── */}
          {screen === "reveal" && profile && (
            <motion.div key="reveal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Hacker title */}
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center mb-6">
                <div className="text-6xl mb-3">🕵️</div>
                <h2 className="text-2xl font-bold text-white">Вот что узнал хакер</h2>
                <p className="text-gray-400 text-sm mt-1">На основе твоих решений в сети</p>
              </motion.div>

              {/* Exposure meter */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Уровень раскрытия данных</span>
                  <span className={`text-sm font-bold ${EXPOSURE_COLORS[Math.min(3, Math.floor(profile.totalExposure / (maxExposure / 3)))]}`}>
                    {EXPOSURE_LABELS[Math.min(3, Math.floor(profile.totalExposure / (maxExposure / 3)))]}
                  </span>
                </div>
                <div className="h-3 bg-cyber-dark rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${(profile.totalExposure / maxExposure) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className={`h-full rounded-full ${EXPOSURE_BG[Math.min(3, Math.floor(profile.totalExposure / (maxExposure / 3)))]}`}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{profile.totalExposure} / {maxExposure} очков риска</p>
              </div>

              {/* Collected data */}
              {profile.collectedData.length > 0 && (
                <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={14} className="text-red-400" />
                    <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Собранные данные о тебе</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.collectedData.map((d, i) => (
                      <span key={i} className="bg-red-900/40 border border-red-800/50 text-red-300 text-xs px-2 py-1 rounded-full">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attacks */}
              <div className="space-y-3 mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Возможные атаки</p>
                {profile.attacks.map((atk, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className={`border rounded-xl p-4 ${atk.icon === "🛡️" ? "border-green-700/50 bg-green-950/20" : "border-orange-700/40 bg-orange-950/15"}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{atk.icon}</span>
                      <div>
                        <p className={`font-bold text-sm ${atk.icon === "🛡️" ? "text-green-400" : "text-orange-300"}`}>{atk.title}</p>
                        <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{atk.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Choices review */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold">Твои решения</p>
                <div className="space-y-2">
                  {STAGES.map((s) => {
                    const sel = selections[s.id];
                    if (!sel) return null;
                    const col = ["text-green-400", "text-yellow-400", "text-orange-400", "text-red-400"][sel.exposure];
                    return (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{s.icon} {s.title}</span>
                        <span className={`font-bold ${col}`}>{["✓ Безопасно", "⚠ Низкий", "⚠ Средний", "✗ Высокий"][sel.exposure]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleRestart}
                  className="flex-1 border border-cyber-border text-gray-300 hover:border-pink-500 hover:text-pink-400 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <RotateCcw size={16} /> Заново
                </button>
                <button onClick={() => router.push("/dashboard")}
                  className="flex-1 bg-cyber-green hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-all">
                  На дашборд
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
