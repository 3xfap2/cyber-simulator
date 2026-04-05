"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronLeft, CheckCircle, XCircle, AlertTriangle, Lock, RotateCcw } from "lucide-react";
import { API_URL } from "@/lib/api";

// ─── Task definitions ─────────────────────────────────────────────────────────

type TaskType = "click" | "type" | "identify" | "select";
type TaskStatus = "pending" | "active" | "done" | "failed";

interface Task {
  id: number;
  icon: string;
  title: string;
  description: string;
  type: TaskType;
  // For "type" tasks
  placeholder?: string;
  validator?: (val: string) => { ok: boolean; hint: string };
  // For "identify" tasks
  items?: { id: string; label: string; detail: string; isThreat: boolean }[];
  // For "select" tasks
  options?: { id: string; label: string; isCorrect: boolean }[];
  // For "click" — just a button
  clickLabel?: string;
  explanation: string;
}

const TASKS: Task[] = [
  {
    id: 1,
    icon: "🔐",
    title: "Смени пароль от почты",
    description: "Хакер уже знает твой старый пароль. Придумай новый — минимум 12 символов, заглавные буквы, цифры и символы.",
    type: "type",
    placeholder: "Введи новый надёжный пароль...",
    validator: (val) => {
      if (val.length < 12) return { ok: false, hint: "Минимум 12 символов" };
      if (!/[A-Z]/.test(val)) return { ok: false, hint: "Нужна хотя бы одна заглавная буква" };
      if (!/\d/.test(val)) return { ok: false, hint: "Нужна хотя бы одна цифра" };
      if (!/[!@#$%^&*\-_=+]/.test(val)) return { ok: false, hint: "Нужен символ (!@#$...)" };
      if (/password|пароль|qwerty|123/i.test(val)) return { ok: false, hint: "Не используй очевидные слова" };
      return { ok: true, hint: "Надёжный пароль!" };
    },
    explanation: "Пароль должен быть уникальным для каждого сервиса и содержать 4 типа символов.",
  },
  {
    id: 2,
    icon: "📱",
    title: "Включи двухфакторную аутентификацию",
    description: "Выбери правильный метод 2FA — самый надёжный способ защиты аккаунта.",
    type: "select",
    options: [
      { id: "a", label: "SMS-код на телефон", isCorrect: false },
      { id: "b", label: "Приложение-аутентификатор (Google Authenticator)", isCorrect: true },
      { id: "c", label: "Вопрос безопасности «Кличка питомца»", isCorrect: false },
      { id: "d", label: "Подтверждение по email", isCorrect: false },
    ],
    explanation: "Приложение-аутентификатор — самый надёжный метод 2FA. SMS можно перехватить через SIM-своп, email — взломать.",
  },
  {
    id: 3,
    icon: "🖥️",
    title: "Найди подозрительные сессии",
    description: "Хакер уже залогинился с чужого устройства. Найди и закрой все подозрительные сессии.",
    type: "identify",
    items: [
      { id: "s1", label: "iPhone 13 · Москва · 2 мин. назад", detail: "Твоё текущее устройство", isThreat: false },
      { id: "s2", label: "Windows PC · Нигерия · Лагос · 5 мин. назад", detail: "Неизвестное устройство, другой континент", isThreat: true },
      { id: "s3", label: "MacBook Pro · Ростов-на-Дону · вчера", detail: "Твой рабочий ноутбук", isThreat: false },
      { id: "s4", label: "Android · Китай · Пекин · только что", detail: "Неизвестное устройство", isThreat: true },
      { id: "s5", label: "Chrome · Ростов-на-Дону · 3 дня назад", detail: "Твой домашний браузер", isThreat: false },
    ],
    explanation: "Все сессии из неизвестных стран нужно немедленно закрыть. После смены пароля — завершить все сессии кроме текущей.",
  },
  {
    id: 4,
    icon: "📧",
    title: "Найди фишинговое письмо",
    description: "В твоём ящике 5 писем. Найди все фишинговые — они могли передать хакеру твои данные.",
    type: "identify",
    items: [
      { id: "e1", label: "noreply@sberbank.ru — «Выписка по счёту за апрель»", detail: "Официальный домен банка, стандартная выписка", isThreat: false },
      { id: "e2", label: "security@sberb4nk.ru — «СРОЧНО: ваш счёт заблокирован!»", detail: "Домен с цифрой 4 вместо буквы «а» — поддельный", isThreat: true },
      { id: "e3", label: "boss@company.ru — «Встреча в пятницу»", detail: "Письмо от коллеги", isThreat: false },
      { id: "e4", label: "prize@lucky-win2077.xyz — «Вы выиграли 500 000 руб!»", detail: "Неизвестный домен .xyz, слишком хорошо чтобы быть правдой", isThreat: true },
      { id: "e5", label: "support@gosuslugi-help.ru — «Подтвердите данные паспорта»", detail: "Госуслуги никогда не присылают письма с просьбой подтвердить паспорт по email", isThreat: true },
    ],
    explanation: "Проверяй домен отправителя. Опечатки, .xyz/.info домены, срочность — признаки фишинга.",
  },
  {
    id: 5,
    icon: "🔑",
    title: "Отзови доступ у сторонних приложений",
    description: "Одно из этих приложений имеет лишние права — оно передаёт данные хакеру. Найди его и удали.",
    type: "identify",
    items: [
      { id: "a1", label: "Google Drive — доступ к файлам", detail: "Официальное приложение Google", isThreat: false },
      { id: "a2", label: "«SuperBoost VPN Free» — доступ к контактам, SMS, геолокации", detail: "Бесплатный VPN не должен читать SMS и контакты", isThreat: true },
      { id: "a3", label: "Telegram — уведомления", detail: "Официальное приложение", isThreat: false },
      { id: "a4", label: "«Фонарик Pro» — доступ к камере, микрофону, контактам", detail: "Фонарику нужна только камера, остальное лишнее", isThreat: true },
      { id: "a5", label: "Сбербанк Онлайн — платежи", detail: "Официальное банковское приложение", isThreat: false },
    ],
    explanation: "Приложения должны запрашивать только те права, которые нужны для их работы. Фонарику не нужны контакты и микрофон.",
  },
  {
    id: 6,
    icon: "🚨",
    title: "Заблокируй карту",
    description: "Хакер знает реквизиты твоей карты. Заблокируй её — введи последние 4 цифры карты для подтверждения.",
    type: "type",
    placeholder: "Последние 4 цифры карты (например: 4291)...",
    validator: (val) => {
      if (!/^\d{4}$/.test(val.trim())) return { ok: false, hint: "Введи ровно 4 цифры" };
      return { ok: true, hint: "Карта заблокирована. Перевыпуск займёт 3-5 дней." };
    },
    explanation: "При компрометации данных карты — немедленно блокируй и запрашивай перевыпуск. Банк не несёт ответственности за операции до блокировки.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

type Screen = "intro" | "game" | "win" | "lose";

interface TaskState {
  status: TaskStatus;
  inputValue: string;
  selectedItems: Set<string>;
  selectedOption: string | null;
  hint: string;
  confirmedItems: Set<string>;
  wrongItems: Set<string>;
}

const TOTAL_TIME = 120; // seconds
const HACKER_FILL_RATE = 100 / TOTAL_TIME; // % per second

export default function HackerEscapePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("intro");
  const [activeTaskId, setActiveTaskId] = useState<number>(1);
  const [taskStates, setTaskStates] = useState<Record<number, TaskState>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [hackerProgress, setHackerProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [activeTasks, setActiveTasks] = useState<Task[]>(TASKS);
  const [aiLoading, setAiLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didWinRef = useRef(false);

  const activeTask = activeTasks.find((t: Task) => t.id === activeTaskId)!;
  const activeState = taskStates[activeTaskId] ?? {
    status: "active" as TaskStatus, inputValue: "", selectedItems: new Set<string>(),
    selectedOption: null, hint: "", confirmedItems: new Set<string>(), wrongItems: new Set<string>(),
  };

  const getTaskStatus = useCallback((id: number): TaskStatus => {
    return taskStates[id]?.status ?? (id === 1 ? "active" : "pending");
  }, [taskStates]);

  // Timer
  useEffect(() => {
    if (screen !== "game") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t: number) => {
        const next = t - 1;
        setHackerProgress(((TOTAL_TIME - next) / TOTAL_TIME) * 100);
        if (next <= 0) {
          clearInterval(timerRef.current!);
          if (!didWinRef.current) setScreen("lose");
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [screen]);

  const startGame = () => {
    didWinRef.current = false;
    setScreen("game");
    setActiveTaskId(1);
    setTaskStates({});
    setTimeLeft(TOTAL_TIME);
    setHackerProgress(0);
    setCompletedCount(0);
  };

  const updateState = (id: number, patch: Partial<TaskState>) => {
    setTaskStates((prev: Record<number, TaskState>) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { status: "active", inputValue: "", selectedItems: new Set(), selectedOption: null, hint: "", confirmedItems: new Set(), wrongItems: new Set() }), ...patch },
    }));
  };

  const startWithAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-hackerescape-tasks`);
      const data = await res.json();
      if (data.tasks?.length > 0) setActiveTasks(data.tasks.map((t: Task, i: number) => ({ ...t, id: i + 1 })));
    } catch { /* fallback to static */ }
    finally {
      setAiLoading(false);
      didWinRef.current = false;
      setScreen("game");
      setActiveTaskId(1);
      setTaskStates({});
      setTimeLeft(TOTAL_TIME);
      setHackerProgress(0);
      setCompletedCount(0);
    }
  };

  const completeTask = useCallback((id: number) => {
    updateState(id, { status: "done" });
    const newCount = completedCount + 1;
    setCompletedCount(newCount);
    if (newCount >= activeTasks.length) {
      clearInterval(timerRef.current!);
      didWinRef.current = true;
      setTimeout(() => setScreen("win"), 600);
      return;
    }
    // Activate next task
    const nextTask = activeTasks.find((t: Task) => t.id > id);
    if (nextTask) {
      setActiveTaskId(nextTask.id);
      updateState(nextTask.id, { status: "active" });
    }
  }, [completedCount, activeTasks]);

  // ── Task handlers ──────────────────────────────────────────────────────────

  const handleTypeSubmit = () => {
    const task = activeTasks.find((t: Task) => t.id === activeTaskId)!;
    const val = activeState.inputValue.trim();
    if (!task.validator) return;
    const result = task.validator(val);
    updateState(activeTaskId, { hint: result.hint });
    if (result.ok) setTimeout(() => completeTask(activeTaskId), 500);
  };

  const handleSelectOption = (optId: string) => {
    const task = activeTasks.find((t: Task) => t.id === activeTaskId)!;
    const opt = task.options?.find((o: { id: string; label: string; isCorrect: boolean }) => o.id === optId);
    if (!opt) return;
    updateState(activeTaskId, { selectedOption: optId });
    if (opt.isCorrect) {
      updateState(activeTaskId, { hint: "✓ Правильно!" });
      setTimeout(() => completeTask(activeTaskId), 600);
    } else {
      updateState(activeTaskId, { hint: "✗ Не самый надёжный способ — попробуй ещё раз" });
    }
  };

  const handleIdentifyClick = (itemId: string, isThreat: boolean) => {
    const task = activeTasks.find((t: Task) => t.id === activeTaskId)!;
    if (!task.items) return;
    if (activeState.confirmedItems.has(itemId) || activeState.wrongItems.has(itemId)) return;

    if (isThreat) {
      const newConfirmed = new Set(activeState.confirmedItems).add(itemId);
      const newWrong = new Set(activeState.wrongItems);
      updateState(activeTaskId, { confirmedItems: newConfirmed, wrongItems: newWrong });
      const totalThreats = task.items.filter((i) => i.isThreat).length;
      if (newConfirmed.size >= totalThreats) {
        setTimeout(() => completeTask(activeTaskId), 500);
      }
    } else {
      const newWrong = new Set(activeState.wrongItems).add(itemId);
      updateState(activeTaskId, { wrongItems: newWrong, hint: "Это не угроза — будь внимательнее!" });
      setTimeout(() => {
        updateState(activeTaskId, { wrongItems: new Set(activeState.wrongItems), hint: "" });
      }, 1200);
    }
  };

  const timerColor = timeLeft > 60 ? "text-green-400" : timeLeft > 30 ? "text-yellow-400" : "text-red-400 animate-pulse";
  const hackerColor = hackerProgress < 40 ? "bg-green-500" : hackerProgress < 70 ? "bg-yellow-400" : "bg-red-500";

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-cyber-dark text-white">
      {/* Header */}
      <header className="border-b border-cyber-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-cyber-green w-7 h-7" />
          <span className="text-white font-bold text-lg">Cyber<span className="text-cyber-green">Sim</span></span>
          <span className="text-gray-600 mx-2">|</span>
          <span className="text-red-400 font-semibold">🚨 Побег от хакера</span>
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
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="text-7xl mb-4">🚨</motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">Побег от хакера</h1>
                <p className="text-gray-400 text-sm">Твои аккаунты взламывают прямо сейчас. Успей защититься до того как хакер получит полный контроль.</p>
              </div>
              <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-red-400" size={16} />
                  <span className="text-red-400 font-bold text-sm uppercase tracking-wider">Ситуация</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Ты перешёл по фишинговой ссылке и ввёл логин/пароль. Хакер уже в системе. У тебя есть <span className="text-white font-bold">{formatTime(TOTAL_TIME)}</span> чтобы выполнить все защитные меры.
                </p>
              </div>
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 mb-6 space-y-3">
                {[
                  { icon: "⏱️", text: `${formatTime(TOTAL_TIME)} на выполнение ${TASKS.length} задач` },
                  { icon: "📊", text: "Прогресс хакера растёт с каждой секундой" },
                  { icon: "✅", text: "Выполни все задачи — и спасёшь аккаунты" },
                  { icon: "💀", text: "Если время истечёт — хакер получает полный доступ" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={startGame}
                className="w-full bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white font-bold py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2">
                🚨 Начать защиту
              </button>
              <button onClick={startWithAI} disabled={aiLoading}
                className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {aiLoading ? "⏳ Генерирую задания..." : "🤖 Режим ИИ — новые задания"}
              </button>
            </motion.div>
          )}

          {/* ── GAME ── */}
          {screen === "game" && (
            <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Top HUD */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Прогресс хакера</span>
                    <span className="text-xs font-bold text-red-400">{Math.round(hackerProgress)}%</span>
                  </div>
                  <div className={`font-mono font-bold text-lg ${timerColor}`}>
                    ⏱ {formatTime(timeLeft)}
                  </div>
                </div>
                <div className="h-3 bg-cyber-dark rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-1000 ${hackerColor}`}
                    style={{ width: `${hackerProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Защита активна</span>
                  <span>Полный взлом</span>
                </div>
              </div>

              {/* Task list sidebar */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {activeTasks.map((t: Task) => {
                  const st = getTaskStatus(t.id);
                  return (
                    <button key={t.id}
                      onClick={() => st !== "pending" && setActiveTaskId(t.id)}
                      className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all text-xs ${
                        t.id === activeTaskId ? "border-red-500 bg-red-950/30 text-red-300" :
                        st === "done" ? "border-green-700/50 bg-green-950/20 text-green-400" :
                        st === "pending" ? "border-gray-800 bg-cyber-dark text-gray-700 cursor-not-allowed" :
                        "border-cyber-border bg-cyber-card text-gray-400"
                      }`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <span className="font-medium whitespace-nowrap">{st === "done" ? "✓" : t.id}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active task */}
              <AnimatePresence mode="wait">
                <motion.div key={activeTaskId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-cyber-card border border-red-900/40 rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{activeTask.icon}</span>
                      <h3 className="text-white font-bold">{activeTask.title}</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">{activeTask.description}</p>
                  </div>

                  {/* TYPE task */}
                  {activeTask.type === "type" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={activeState.inputValue}
                        onChange={(e) => updateState(activeTaskId, { inputValue: e.target.value, hint: "" })}
                        onKeyDown={(e) => e.key === "Enter" && handleTypeSubmit()}
                        placeholder={activeTask.placeholder}
                        autoComplete="off"
                        className="w-full bg-cyber-dark border border-cyber-border rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-red-500 transition-colors font-mono text-sm"
                      />
                      {activeState.hint && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className={`text-sm font-medium ${activeState.hint.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                          {activeState.hint}
                        </motion.p>
                      )}
                      <button onClick={handleTypeSubmit}
                        disabled={!activeState.inputValue.trim()}
                        className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all">
                        Подтвердить
                      </button>
                    </div>
                  )}

                  {/* SELECT task */}
                  {activeTask.type === "select" && (
                    <div className="space-y-2">
                      {activeTask.options?.map((opt: { id: string; label: string; isCorrect: boolean }) => {
                        const isSelected = activeState.selectedOption === opt.id;
                        return (
                          <motion.button key={opt.id} whileHover={{ scale: 1.01 }}
                            onClick={() => handleSelectOption(opt.id)}
                            className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                              isSelected && opt.isCorrect ? "border-green-500 bg-green-950/30" :
                              isSelected && !opt.isCorrect ? "border-red-500 bg-red-950/30" :
                              "border-cyber-border bg-cyber-card hover:border-red-500/50"
                            }`}>
                            <span className="text-sm text-gray-200">{opt.label}</span>
                          </motion.button>
                        );
                      })}
                      {activeState.hint && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className={`text-sm font-medium pt-1 ${activeState.hint.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                          {activeState.hint}
                        </motion.p>
                      )}
                    </div>
                  )}

                  {/* IDENTIFY task */}
                  {activeTask.type === "identify" && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-400 mb-2">
                        Нажми на подозрительные — угроз: {activeTask.items?.filter((i: { isThreat: boolean }) => i.isThreat).length}
                      </p>
                      {activeTask.items?.map((item: { id: string; label: string; detail: string; isThreat: boolean }) => {
                        const isConfirmed = activeState.confirmedItems.has(item.id);
                        const isWrong = activeState.wrongItems.has(item.id);
                        return (
                          <motion.button key={item.id}
                            animate={isWrong ? { x: [0, -8, 8, -4, 4, 0] } : {}}
                            transition={{ duration: 0.3 }}
                            onClick={() => !isConfirmed && handleIdentifyClick(item.id, item.isThreat)}
                            className={`w-full text-left border-2 rounded-xl p-3 transition-all ${
                              isConfirmed ? "border-green-600 bg-green-950/30 cursor-default" :
                              isWrong ? "border-red-600 bg-red-950/30" :
                              "border-cyber-border bg-cyber-card hover:border-amber-500/60 cursor-pointer"
                            }`}>
                            <p className={`text-sm font-medium ${isConfirmed ? "text-green-300" : "text-gray-200"}`}>
                              {isConfirmed && "✓ "}{item.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                          </motion.button>
                        );
                      })}
                      {activeState.hint && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400 font-medium pt-1">
                          {activeState.hint}
                        </motion.p>
                      )}
                    </div>
                  )}

                  {/* Explanation if done */}
                  {getTaskStatus(activeTaskId) === "done" && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-4 bg-green-950/30 border border-green-700/50 rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-green-400 font-bold text-sm">Задача выполнена!</p>
                        <p className="text-gray-400 text-xs mt-0.5">{activeTask.explanation}</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Progress */}
              <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                <span>Выполнено: <span className="text-white font-bold">{completedCount}/{activeTasks.length}</span></span>
                <span className="text-cyber-green">{activeTasks.filter((t: Task) => getTaskStatus(t.id) === "done").map((t: Task) => t.icon).join(" ")}</span>
              </div>
            </motion.div>
          )}

          {/* ── WIN ── */}
          {screen === "win" && (
            <motion.div key="win" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center py-8">
                <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ duration: 0.5, delay: 0.2 }} className="text-7xl mb-4">🛡️</motion.div>
                <h2 className="text-3xl font-bold text-green-400 mb-2">Аккаунты спасены!</h2>
                <p className="text-gray-400 mb-1">Ты успел выполнить все защитные меры</p>
                <p className="text-cyber-green font-bold">Осталось времени: {formatTime(timeLeft)}</p>
              </div>
              <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-5 mb-6">
                <p className="text-green-300 text-sm font-bold mb-3">Что ты сделал правильно:</p>
                <ul className="space-y-2">
                  {activeTasks.map((t: Task) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle size={14} className="text-green-400 shrink-0" /> {t.icon} {t.title}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3">
                <button onClick={startGame}
                  className="flex-1 border border-cyber-border text-gray-300 hover:border-red-500 hover:text-red-400 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <RotateCcw size={16} /> Ещё раз
                </button>
                <button onClick={() => router.push("/dashboard")}
                  className="flex-1 bg-cyber-green hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-all">
                  На дашборд
                </button>
              </div>
            </motion.div>
          )}

          {/* ── LOSE ── */}
          {screen === "lose" && (
            <motion.div key="lose" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center py-8">
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 3, duration: 0.3 }} className="text-7xl mb-4">💀</motion.div>
                <h2 className="text-3xl font-bold text-red-400 mb-2">Хакер победил</h2>
                <p className="text-gray-400 mb-1">Время вышло — все аккаунты скомпрометированы</p>
                <p className="text-gray-500 text-sm mt-1">Выполнено задач: <span className="text-white font-bold">{completedCount}/{TASKS.length}</span></p>
              </div>
              <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-5 mb-6">
                <p className="text-red-400 text-sm font-bold mb-3">Не успел выполнить:</p>
                <ul className="space-y-2">
                  {activeTasks.filter((t: Task) => getTaskStatus(t.id) !== "done").map((t: Task) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm text-gray-400">
                      <XCircle size={14} className="text-red-400 shrink-0" /> {t.icon} {t.title}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3">
                <button onClick={startGame}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <RotateCcw size={16} /> Попробовать снова
                </button>
                <button onClick={() => router.push("/dashboard")}
                  className="flex-1 border border-cyber-border text-gray-300 hover:border-cyber-green hover:text-cyber-green font-semibold py-3 rounded-xl transition-all">
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
