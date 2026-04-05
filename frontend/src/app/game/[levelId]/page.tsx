"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, ChevronLeft, Heart, Star, Eye, EyeOff, Zap, Trophy } from "lucide-react";
import { scenariosApi, progressApi, achievementsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

const ATTACK_CHAINS: Record<string, { icon: string; title: string; desc: string; color: string }[]> = {
  phishing: [
    { icon: "🖱️", title: "Ты кликнул на ссылку", desc: "Браузер отправил запрос на поддельный сервер злоумышленника", color: "text-yellow-400" },
    { icon: "🌐", title: "Поддельный сайт загружен", desc: "Визуально идентичен настоящему, но все данные идут хакеру", color: "text-orange-400" },
    { icon: "⌨️", title: "Ты ввёл данные", desc: "Логин, пароль или данные карты перехвачены в реальном времени", color: "text-red-400" },
    { icon: "📡", title: "Данные переданы хакеру", desc: "За миллисекунды отправлены на удалённый C2-сервер", color: "text-red-500" },
    { icon: "💀", title: "Аккаунт скомпрометирован", desc: "Злоумышленник получил полный доступ — сменил пароль и email", color: "text-red-600" },
  ],
  vishing: [
    { icon: "📞", title: "Ты поднял трубку", desc: "Номер был подделан через SIM-спуфинг — АОН показывает банк", color: "text-yellow-400" },
    { icon: "🎭", title: "Доверие установлено", desc: "Мошенник назвал твоё имя и последние цифры карты — данные куплены в даркнете", color: "text-orange-400" },
    { icon: "🗣️", title: "Ты назвал код из SMS", desc: "Одноразовый код подтверждения передан злоумышленнику", color: "text-red-400" },
    { icon: "🏦", title: "Операция подтверждена", desc: "Код использован для перевода средств или смены пароля", color: "text-red-500" },
    { icon: "💸", title: "Деньги ушли", desc: "Переведены на подставной счёт — вернуть практически невозможно", color: "text-red-600" },
  ],
  skimming: [
    { icon: "💳", title: "Карта вставлена в банкомат", desc: "Скиммер-накладка считала все данные магнитной полосы", color: "text-yellow-400" },
    { icon: "📷", title: "PIN снят на камеру", desc: "Миниатюрная камера над клавиатурой записала твой код", color: "text-orange-400" },
    { icon: "🖨️", title: "Дубликат карты создан", desc: "Злоумышленник записал данные на пустую карту за несколько минут", color: "text-red-400" },
    { icon: "🏧", title: "Снятие наличных", desc: "Дубликат успешно использован в другом городе или стране", color: "text-red-500" },
    { icon: "💸", title: "Счёт опустошён", desc: "До момента блокировки сняли весь доступный баланс", color: "text-red-600" },
  ],
  social_engineering: [
    { icon: "👤", title: "Злоумышленник установил контакт", desc: "Собрал о тебе данные из соцсетей и LinkedIn заранее", color: "text-yellow-400" },
    { icon: "🤝", title: "Ты выполнил просьбу", desc: "Передал данные доступа или конфиденциальную информацию", color: "text-orange-400" },
    { icon: "🔑", title: "Доступ к системам получен", desc: "Вошёл в корпоративные системы под твоим аккаунтом", color: "text-red-400" },
    { icon: "📂", title: "Данные компании похищены", desc: "Клиентские базы, финансовые документы, переписка скопированы", color: "text-red-500" },
    { icon: "⚖️", title: "Ты несёшь ответственность", desc: "Инцидент безопасности — возможно увольнение и судебные иски", color: "text-red-600" },
  ],
  brute_force: [
    { icon: "🔍", title: "Слабый пароль обнаружен", desc: "Автоматическая атака перебрала тысячи комбинаций за секунды", color: "text-yellow-400" },
    { icon: "🚪", title: "Вход выполнен", desc: "Злоумышленник авторизовался с твоими учётными данными", color: "text-orange-400" },
    { icon: "🔒", title: "Пароль сменён", desc: "Ты мгновенно потерял доступ к собственному аккаунту", color: "text-red-400" },
    { icon: "📧", title: "Email и телефон изменены", desc: "Восстановление доступа стало технически невозможным", color: "text-red-500" },
    { icon: "💀", title: "Аккаунт захвачен навсегда", desc: "Все данные, история и контакты теперь у злоумышленника", color: "text-red-600" },
  ],
  api_security: [
    { icon: "🔑", title: "API-ключ скомпрометирован", desc: "Ключ был передан небезопасным способом или утёк из кода", color: "text-yellow-400" },
    { icon: "📡", title: "Несанкционированный запрос", desc: "Злоумышленник обращается к API от твоего имени с полными правами", color: "text-orange-400" },
    { icon: "📂", title: "Данные утекают", desc: "Нарушен принцип наименьших привилегий — доступны все ресурсы", color: "text-red-400" },
    { icon: "🗄️", title: "База данных скомпрометирована", desc: "Входящие запросы не валидировались — внедрён вредоносный код", color: "text-red-500" },
    { icon: "💸", title: "Данные пользователей похищены", desc: "Утечка персональных данных, штрафы по 152-ФЗ, репутационный ущерб", color: "text-red-600" },
  ],
};

const INTERFACE_LABELS: Record<string, string> = {
  email: "📧 Электронная почта",
  social: "💬 Мессенджер",
  sms: "📱 SMS",
  browser: "🌐 Браузер",
  phone: "📞 Звонок",
};

const ATTACK_LABELS: Record<string, string> = {
  phishing: "Фишинг",
  social_engineering: "Социальная инженерия",
  vishing: "Вишинг",
  skimming: "Скимминг",
  brute_force: "Подбор пароля",
  api_security: "Атака на API",
};

const LEVEL_INTROS: Record<string, { emoji: string; setting: string; story: string; mission: string }> = {
  "1": {
    emoji: "🏢",
    setting: "Офис банка — первый рабочий день",
    story: "Ты — новый сотрудник отдела безопасности Центр-Инвест банка. Начальник предупредил: «Атаки идут каждый день. Будь внимателен к письмам, звонкам и ссылкам». Ещё не прошло и часа, как приходит первое подозрительное сообщение...",
    mission: "Защити корпоративные данные банка",
  },
  "2": {
    emoji: "🏠",
    setting: "Дома после работы",
    story: "Ты вернулся домой. Устал, хочешь расслабиться. Именно в этот момент мошенники действуют — когда ты не ожидаешь. Телефон пищит, приходят SMS, кто-то звонит... Не всё то, чем кажется.",
    mission: "Защити личные данные и деньги",
  },
  "3": {
    emoji: "📶",
    setting: "Кофейня с публичным Wi-Fi",
    story: "Ты в кофейне, подключился к бесплатному Wi-Fi «CoffeeNet_Free». Ноутбук открыт, нужно проверить рабочую почту. Ты не знаешь, что сосед за соседним столиком — не просто посетитель. Он уже видит твой трафик.",
    mission: "Не допусти перехвата данных в публичной сети",
  },
  "4": {
    emoji: "📱",
    setting: "Социальные сети и мессенджеры",
    story: "Открываешь ленту — всё выглядит обычно. Посты друзей, новости, объявления. Но мошенники научились маскироваться под знакомых, официальные аккаунты и даже звёзд. Одно неверное нажатие — и данные уйдут.",
    mission: "Распознай фейков среди реальных пользователей",
  },
};

const CONSEQUENCES: Record<string, { title: string; desc: string; icon: string; color: string }> = {
  phishing: {
    title: "Аккаунт взломан",
    desc: "Твои логин и пароль перехвачены. Злоумышленник уже сменил email и пароль — ты потерял доступ навсегда.",
    icon: "🔓",
    color: "#dc2626",
  },
  vishing: {
    title: "Деньги списаны",
    desc: "Со счёта переведено 87 432 ₽. Операция подтверждена кодом из SMS который ты назвал. Вернуть практически невозможно.",
    icon: "💸",
    color: "#b91c1c",
  },
  skimming: {
    title: "Карта клонирована",
    desc: "Данные карты скопированы. Через 2 часа в банкомате другого города сняли 150 000 ₽ — весь доступный баланс.",
    icon: "💳",
    color: "#7f1d1d",
  },
  social_engineering: {
    title: "Корпоративный инцидент",
    desc: "Данные клиентов банка утекли к конкурентам. Служба безопасности уже знает. Тебя вызывают к директору.",
    icon: "📁",
    color: "#991b1b",
  },
  brute_force: {
    title: "Пароль подобран",
    desc: "Слабый пароль взломан за 4 секунды. Злоумышленник вошёл в систему под твоим именем и скачал все файлы.",
    icon: "🔐",
    color: "#b91c1c",
  },
};

const RARITY_COLORS: Record<string, string> = {
  common: "border-gray-500 from-gray-900 to-gray-800",
  rare: "border-blue-500 from-blue-950 to-gray-900",
  epic: "border-purple-500 from-purple-950 to-gray-900",
  legendary: "border-yellow-400 from-yellow-950 to-gray-900",
};

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Лёгкий",
    emoji: "🟢",
    description: "Очевидные угрозы с явными признаками. Для знакомства с темой.",
    color: "border-green-500 bg-green-900/20 hover:border-green-400",
    activeColor: "border-green-400 bg-green-900/40",
    textColor: "text-green-400",
    badge: "bg-green-900/50 text-green-300",
    scoreBonus: "×1",
  },
  medium: {
    label: "Средний",
    emoji: "🟡",
    description: "Реалистичные атаки. Требует внимания к деталям.",
    color: "border-yellow-500 bg-yellow-900/20 hover:border-yellow-400",
    activeColor: "border-yellow-400 bg-yellow-900/40",
    textColor: "text-yellow-400",
    badge: "bg-yellow-900/50 text-yellow-300",
    scoreBonus: "×1.5",
  },
  hard: {
    label: "Тяжёлый",
    emoji: "🔴",
    description: "Изощрённые атаки профессионального уровня. Сложно распознать.",
    color: "border-red-500 bg-red-900/20 hover:border-red-400",
    activeColor: "border-red-400 bg-red-900/40",
    textColor: "text-red-400",
    badge: "bg-red-900/50 text-red-300",
    scoreBonus: "×2",
  },
};

export default function GamePage() {
  const { levelId } = useParams();
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showHack, setShowHack] = useState(false);
  const [showAttackMap, setShowAttackMap] = useState(false);
  const [showConsequence, setShowConsequence] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [newAchievement, setNewAchievement] = useState<any>(null);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [dmVisible, setDmVisible] = useState(false);
  const [levelName, setLevelName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // DM delay mechanic — сбрасывается при смене сценария
  useEffect(() => {
    setDmVisible(false);
    if (!scenarios[current]?.content?.dm) return;
    const delay = scenarios[current].content.dm.delay_ms ?? 4000;
    const timer = setTimeout(() => setDmVisible(true), delay);
    return () => clearTimeout(timer);
  }, [current, scenarios]);

  // ─── Difficulty mechanics ───
  // Easy: auto-show red flags; Medium: 45s timer; Hard: 20s timer, no hints toggle
  useEffect(() => {
    if (!difficulty || !scenarios.length || selected !== null) return;
    // Easy — сразу показываем подсказки
    if (difficulty === "easy") {
      setShowRedFlags(true);
      setTimeLeft(null);
      return;
    }
    // Medium / Hard — таймер
    const limit = difficulty === "hard" ? 20 : 45;
    setShowRedFlags(false);
    setTimeLeft(limit);
    const interval = setInterval(() => {
      setTimeLeft((prev: number | null) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [current, difficulty, scenarios.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit wrong answer when timer hits 0
  useEffect(() => {
    if (timeLeft !== 0 || selected !== null || !scenarios.length) return;
    // Find first wrong option index
    const sc = scenarios[current];
    if (!sc) return;
    const wrongIdx = sc.options.findIndex((_: unknown, i: number) => i !== sc.correct_option);
    if (wrongIdx !== -1) handleSelect(wrongIdx);
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.push("/"); return; }
    // Load level name only
    scenariosApi.getLevel(Number(levelId))
      .then((r: { data: { name: string } }) => setLevelName(r.data.name))
      .catch(() => router.push("/dashboard"));
  }, [mounted]);

  const startGame = async (selectedDifficulty: string) => {
    setDifficulty(selectedDifficulty);
    setLoading(true);
    try {
      const res = await scenariosApi.getLevelScenarios(Number(levelId), selectedDifficulty);
      if (res.data.length === 0) {
        toast.error("Сценарии не найдены для этой сложности");
        setDifficulty(null);
        return;
      }
      setScenarios(res.data);
      setCurrent(0);
      setSelected(null);
      setResult(null);
      setShowIntro(true);
    } catch {
      toast.error("Ошибка загрузки");
      setDifficulty(null);
    } finally {
      setLoading(false);
    }
  };

  const checkNewAchievements = async () => {
    try {
      const res = await achievementsApi.getMy();
      const all: any[] = res.data;
      const newlyEarned = all.filter((a) => a.earned && !earnedIds.has(a.id));
      const updatedIds = new Set(Array.from(earnedIds).concat(all.filter((a) => a.earned).map((a) => a.id)));
      setEarnedIds(updatedIds);
      if (newlyEarned.length > 0) {
        setNewAchievement(newlyEarned[0]);
        setTimeout(() => setNewAchievement(null), 5000);
      }
    } catch { /* silent */ }
  };

  const handleSelect = async (idx: number) => {
    if (selected !== null || submitting) return;
    setSelected(idx);
    setSubmitting(true);
    try {
      const res = await progressApi.submitAnswer(scenarios[current].id, idx);
      setResult(res.data);
      updateUser({ current_hp: res.data.current_hp, total_score: res.data.current_score });
      if (!res.data.correct) {
        setShowConsequence(true);
        setTimeout(() => {
          setShowConsequence(false);
          setShowHack(true);
          setTimeout(() => {
            setShowHack(false);
            setTimeout(() => setShowAttackMap(true), 300);
          }, 1800);
        }, 2200);
      } else {
        checkNewAchievements();
      }
    } catch {
      toast.error("Ошибка отправки ответа");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    // Hard mode: wrong answer = restart from scenario 1
    if (difficulty === "hard" && result && !result.correct) {
      startGame("hard");
      setShowAttackMap(false);
      return;
    }
    if (current + 1 < scenarios.length) {
      setCurrent((c: number) => c + 1);
      setSelected(null);
      setResult(null);
      setShowRedFlags(false);
    } else {
      toast.success("Уровень пройден!");
      router.push("/dashboard");
    }
  };

  if (!mounted) return null;

  // --- ЭКРАН ВЫБОРА СЛОЖНОСТИ ---
  if (!difficulty || loading) {
    const diffCfg = DIFFICULTY_CONFIG;
    return (
      <div className="min-h-screen bg-cyber-dark">
        <header className="border-b border-cyber-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-bold">{levelName || "Загрузка..."}</span>
        </header>

        <div className="max-w-lg mx-auto px-4 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <Zap className="text-cyber-green w-10 h-10 mx-auto mb-3" />
              <h2 className="text-white text-2xl font-bold mb-2">Выбери сложность</h2>
              <p className="text-gray-400 text-sm">От этого зависит тип атак и количество очков</p>
            </div>

            <div className="space-y-4">
              {(["easy", "medium", "hard"] as const).map((d, i) => {
                const cfg = diffCfg[d];
                return (
                  <motion.button
                    key={d}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => startGame(d)}
                    disabled={loading}
                    className={`w-full text-left border rounded-xl p-5 transition-all group ${cfg.color} disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cfg.emoji}</span>
                        <div>
                          <div className={`font-bold text-lg ${cfg.textColor}`}>{cfg.label}</div>
                          <div className="text-gray-400 text-sm mt-0.5">{cfg.description}</div>
                        </div>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <div className={`text-xs font-bold px-2 py-1 rounded ${cfg.badge}`}>
                          Очки {cfg.scoreBonus}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- INTRO SCREEN ---
  if (showIntro && scenarios.length > 0) {
    const intro = LEVEL_INTROS[String(levelId)] ?? LEVEL_INTROS["1"];
    const diffCfg = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-cyber-card border border-cyber-border rounded-2xl overflow-hidden">
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-cyber-green via-blue-500 to-purple-500" />

            <div className="p-8 text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="text-6xl mb-4"
              >
                {intro.emoji}
              </motion.div>

              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">{intro.setting}</div>
              <h2 className="text-white text-xl font-bold mb-4">{levelName}</h2>

              <div className="bg-cyber-dark rounded-xl p-4 mb-5 text-left">
                <p className="text-gray-300 text-sm leading-relaxed">{intro.story}</p>
              </div>

              <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-6 ${diffCfg.badge}`}>
                {diffCfg.emoji} {diffCfg.label} · {intro.mission}
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowIntro(false)}
                className="w-full bg-cyber-green text-black font-bold py-3 rounded-xl text-lg hover:bg-green-400 transition-colors"
              >
                В бой! ⚔️
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- ИГРОВОЙ ЭКРАН ---
  if (scenarios.length === 0) return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center flex-col gap-4">
      <div className="text-gray-400">Сценарии не найдены</div>
      <button onClick={() => setDifficulty(null)} className="text-cyber-green hover:underline">← Назад к выбору сложности</button>
    </div>
  );

  const scenario = scenarios[current];
  const content = scenario.content;
  const hpColor = (user?.current_hp ?? 100) > 60 ? "bg-cyber-green" : (user?.current_hp ?? 100) > 30 ? "bg-yellow-400" : "bg-cyber-red";
  const diffCfg = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
  const consequence = scenario ? (CONSEQUENCES[scenario.attack_type] ?? CONSEQUENCES.phishing) : CONSEQUENCES.phishing;

  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden">

      {/* Achievement popup — Minecraft style */}
      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className={`fixed top-16 right-4 z-[60] w-72 rounded-xl border bg-gradient-to-br ${RARITY_COLORS[newAchievement.rarity] || RARITY_COLORS.common} p-4 shadow-2xl`}
          >
            <div className="flex items-center gap-1 mb-2">
              <Trophy size={12} className="text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Достижение получено!</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{newAchievement.icon}</span>
              <div>
                <div className="text-white font-bold text-sm">{newAchievement.name}</div>
                <div className="text-gray-400 text-xs">{newAchievement.desc}</div>
              </div>
            </div>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-0.5 bg-yellow-400 rounded-full mt-3"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consequence overlay — появляется ДО троллфейса */}
      <AnimatePresence>
        {showConsequence && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="text-center px-6"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-7xl mb-4"
              >{consequence.icon}</motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black mb-3"
                style={{ color: consequence.color }}
              >{consequence.title}</motion.div>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-300 text-base max-w-xs mx-auto leading-relaxed"
              >{consequence.desc}</motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hack animation overlay */}
      <AnimatePresence>
        {showHack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-red-900/40 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 0.9, 1.05, 1], rotate: [0, -2, 2, -1, 0] }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <svg viewBox="0 0 200 200" className="w-40 h-40 mx-auto mb-2">
                {/* Голова */}
                <path d="M100 12 C68 12 35 32 26 65 C18 95 26 128 46 148 C60 162 78 170 100 172 C122 170 140 162 154 148 C174 128 182 95 174 65 C165 32 132 12 100 12Z" fill="white" stroke="black" strokeWidth="3.5"/>
                {/* Морщины на лбу */}
                <path d="M66 40 Q76 33 84 40" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M116 40 Q124 33 134 40" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round"/>
                {/* Левая бровь */}
                <path d="M38 57 Q58 44 78 56" stroke="black" strokeWidth="6" fill="none" strokeLinecap="round"/>
                {/* Правая бровь */}
                <path d="M122 56 Q142 44 162 57" stroke="black" strokeWidth="6" fill="none" strokeLinecap="round"/>
                {/* Левый глаз */}
                <path d="M44 72 Q62 62 80 72 Q62 82 44 72Z" fill="black"/>
                <path d="M42 68 Q62 58 82 66" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                {/* Правый глаз */}
                <path d="M120 72 Q138 62 156 72 Q138 82 120 72Z" fill="black"/>
                <path d="M118 66 Q138 58 158 68" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                {/* Нос */}
                <path d="M86 100 Q100 110 114 100" stroke="black" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                {/* Ухмылка */}
                <path d="M25 116 Q50 106 100 110 Q150 106 175 116 Q160 160 100 166 Q40 160 25 116Z" fill="black"/>
                <line x1="45" y1="115" x2="42" y2="154" stroke="white" strokeWidth="5"/>
                <line x1="62" y1="111" x2="59" y2="163" stroke="white" strokeWidth="5"/>
                <line x1="80" y1="110" x2="78" y2="165" stroke="white" strokeWidth="5"/>
                <line x1="100" y1="110" x2="100" y2="166" stroke="white" strokeWidth="5"/>
                <line x1="120" y1="110" x2="122" y2="165" stroke="white" strokeWidth="5"/>
                <line x1="138" y1="111" x2="141" y2="163" stroke="white" strokeWidth="5"/>
                <line x1="155" y1="115" x2="158" y2="154" stroke="white" strokeWidth="5"/>
                {/* Подбородок */}
                <path d="M60 170 Q100 184 140 170" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round"/>
                {/* Складки щёк */}
                <path d="M24 122 Q14 113 20 104" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M176 122 Q186 113 180 104" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
              <div className="text-cyber-red text-3xl font-bold glitch-text">ВАС ВЗЛОМАЛИ!</div>
              <div className="text-red-300 mt-2 text-xl font-bold">PROBLEM? 😏</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attack map modal */}
      <AnimatePresence>
        {showAttackMap && scenario && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-cyber-card border border-cyber-red rounded-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="text-center mb-5">
                <div className="text-4xl mb-2">⛓️</div>
                <h3 className="text-white font-bold text-lg">Цепочка атаки</h3>
                <p className="text-gray-400 text-sm">Вот что произошло бы в реальности</p>
              </div>

              <div className="space-y-0">
                {(ATTACK_CHAINS[scenario.attack_type] ?? ATTACK_CHAINS.phishing).map((step, i, arr) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.25 }}
                    className="flex gap-3"
                  >
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-9 h-9 rounded-full bg-cyber-dark border border-red-700 flex items-center justify-center text-base">
                        {step.icon}
                      </div>
                      {i < arr.length - 1 && (
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.25 + i * 0.25, duration: 0.2 }}
                          style={{ transformOrigin: "top" }}
                          className="w-0.5 h-6 bg-red-700 my-0.5"
                        />
                      )}
                    </div>
                    <div className="pb-3 pt-1">
                      <div className={`text-sm font-semibold ${step.color}`}>{step.title}</div>
                      <div className="text-gray-400 text-xs mt-0.5 leading-relaxed">{step.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                onClick={() => { setShowAttackMap(false); if (difficulty === "hard") handleNext(); }}
                className={`mt-5 w-full font-bold py-2.5 rounded-xl transition-colors ${
                  difficulty === "hard"
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-cyber-green hover:bg-green-400 text-black"
                }`}
              >
                {difficulty === "hard" ? "🔄 Начать заново (Тяжёлый режим)" : "Понял, больше не попадусь →"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-cyber-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => setDifficulty(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={18} /> {levelName}
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${diffCfg.badge}`}>
            {diffCfg.emoji} {diffCfg.label}
          </span>
          {timeLeft !== null && selected === null && (
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              timeLeft <= 5 ? "bg-red-900/60 text-red-300 animate-pulse" :
              timeLeft <= 10 ? "bg-orange-900/60 text-orange-300" :
              "bg-gray-800 text-gray-300"
            }`}>
              ⏱ {timeLeft}с
            </span>
          )}
          <div className="flex items-center gap-2">
            <Heart size={14} className={(user?.current_hp ?? 100) > 30 ? "text-cyber-green" : "text-cyber-red"} />
            <div className="w-20 h-2 bg-cyber-dark rounded-full overflow-hidden">
              <div className={`h-full ${hpColor} transition-all duration-500`} style={{ width: `${user?.current_hp ?? 100}%` }} />
            </div>
            <span className="text-xs text-gray-400">{user?.current_hp ?? 100}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400" />
            <span className="text-white text-sm font-bold">{user?.total_score ?? 0}</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {scenarios.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < current ? "bg-cyber-green" : i === current ? "bg-cyber-green opacity-50" : "bg-cyber-border"}`} />
          ))}
          <span className="text-xs text-gray-400 ml-2">{current + 1}/{scenarios.length}</span>
        </div>

        {/* Interface label */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-cyber-card border border-cyber-border px-2 py-1 rounded text-gray-400">
            {INTERFACE_LABELS[scenario.interface_type]}
          </span>
          <span className="text-xs bg-red-900/30 border border-red-800 px-2 py-1 rounded text-red-400">
            {ATTACK_LABELS[scenario.attack_type]}
          </span>
        </div>

        {/* Scenario card */}
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-cyber-card border border-cyber-border rounded-xl mb-4 overflow-hidden"
        >
          {/* Email interface */}
          {scenario.interface_type === "email" && (
            <div>
              <div className="bg-gray-900 px-4 py-2 border-b border-cyber-border">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-400 text-xs ml-2">Входящие — {content.subject}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-gray-500 mb-1">От: <span className="text-cyber-red">{content.from_display}</span></div>
                <div className="text-xs text-gray-500 mb-3">Кому: {content.to} · {content.time}</div>
                <div className="text-white font-medium mb-3">{content.subject}</div>
                <div className="text-gray-300 text-sm whitespace-pre-line bg-gray-900 rounded-lg p-3">{content.body}</div>
              </div>
            </div>
          )}

          {/* Social/Messenger interface */}
          {scenario.interface_type === "social" && (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-cyber-border">
                <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-xl">{content.sender_avatar}</div>
                <div>
                  <div className="text-white font-medium">{content.sender}</div>
                  <div className="text-xs text-green-400">{content.status}</div>
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 max-w-xs">
                <p className="text-gray-200 text-sm">{content.message}</p>
                <span className="text-xs text-gray-500 mt-1 block text-right">{content.time}</span>
              </div>
            </div>
          )}

          {/* SMS interface */}
          {scenario.interface_type === "sms" && (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-900 flex items-center justify-center">📱</div>
                <div>
                  <div className="text-white font-medium">{content.sender}</div>
                  <div className="text-xs text-gray-400">SMS · {content.time}</div>
                </div>
              </div>
              <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4">
                <p className="text-gray-200 text-sm">{content.message}</p>
              </div>
            </div>
          )}

          {/* Phone interface */}
          {scenario.interface_type === "phone" && (
            <div className="p-6 text-center">
              <div className="text-6xl mb-3">📞</div>
              <div className="text-white font-bold text-lg">{content.caller_display}</div>
              <div className="text-gray-400 text-sm mb-4">{content.caller}</div>
              <div className="bg-gray-900 rounded-xl p-4 text-left">
                <p className="text-gray-300 text-sm italic">"{content.script}"</p>
              </div>
            </div>
          )}

          {/* Feed interface — VK / Instagram */}
          {scenario.interface_type === "feed" && (
            <div>
              {/* Platform header */}
              <div
                className="px-4 py-2.5 flex items-center gap-2"
                style={{ backgroundColor: content.platform_color || "#0077ff" }}
              >
                <span className="text-white font-bold text-sm tracking-wide">
                  {content.platform_icon} {content.platform}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">🔍</div>
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">💬</div>
                </div>
              </div>

              {/* Posts feed */}
              <div className="bg-gray-100 divide-y divide-gray-200 max-h-72 overflow-y-auto">
                {(content.posts || []).map((post: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className={`bg-white p-3 ${post.suspicious ? "border-l-4 border-red-400" : ""}`}
                  >
                    {/* Post header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-base">
                        {post.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-900 text-xs font-semibold flex items-center gap-1">
                          {post.author}
                          {post.verified && <span className="text-blue-500 text-xs">✓</span>}
                        </div>
                        <div className="text-gray-400 text-xs">{post.time}</div>
                      </div>
                    </div>

                    {/* Post text */}
                    <p className="text-gray-800 text-xs leading-relaxed mb-2">{post.text}</p>

                    {/* Suspicious link */}
                    {post.link && (
                      <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 mb-2">
                        <div className="text-blue-600 text-xs font-mono break-all">{post.link}</div>
                      </div>
                    )}

                    {/* Likes / comments */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span style={{ color: content.platform_color }}>❤</span>
                        {post.likes?.toLocaleString("ru-RU")}
                      </span>
                      <span>💬 {(post.comments || 0).toLocaleString("ru-RU")}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Browser interface */}
          {scenario.interface_type === "browser" && (
            <div>
              <div className="bg-gray-900 px-4 py-2 border-b border-cyber-border">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  {content.url ? (
                    <div className="flex-1 bg-gray-800 rounded px-3 py-1 text-xs flex items-center gap-1">
                      {content.ssl_shown ? <span className="text-green-400">🔒</span> : <span className="text-red-400">⚠️</span>}
                      <span className={content.ssl_shown ? "text-gray-300" : "text-red-300"}>{content.url}</span>
                    </div>
                  ) : (
                    <div className="flex-1 bg-gray-800 rounded px-3 py-1 text-xs text-gray-500">
                      {content.platform || "Уведомление безопасности"}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                {content.url ? (
                  <>
                    <p className="text-gray-300 text-sm mb-2">{content.page_content}</p>
                    {content.warning && (
                      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mt-2">
                        <p className="text-yellow-300 text-xs">⚠️ {content.warning}</p>
                      </div>
                    )}
                    {content.networks && (
                      <div className="space-y-2 mt-2">
                        {content.networks.map((n: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                            <span className="text-sm text-white">{n.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{"▂▄▆".slice(0, n.signal > 3 ? 3 : n.signal)}</span>
                              <span className="text-xs text-red-400">Открытая</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-white font-medium mb-3">{content.platform}</div>
                    {content.message && (
                      <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-3">
                        <p className="text-red-300 text-sm">{content.message}</p>
                      </div>
                    )}
                    {content.networks && (
                      <div className="space-y-2">
                        {content.networks.map((n: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                            <span className="text-sm text-white">{n.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{"▂▄▆".slice(0, n.signal > 3 ? 3 : n.signal)}</span>
                              <span className="text-xs text-red-400">Открытая</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {content.warning && !content.networks && (
                      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                        <p className="text-yellow-300 text-xs">⚠️ {content.warning}</p>
                      </div>
                    )}
                    {content.current_password_strength && (
                      <div className="bg-gray-900 rounded-lg p-3 text-xs text-gray-400 mt-2">
                        <span>Текущий пароль: </span>
                        <span className="text-red-400 font-mono">{content.current_password_example}</span>
                        <span className="ml-2">(надёжность: <span className="text-red-400">{content.current_password_strength}</span>)</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* DM notification — появляется с задержкой */}
        <AnimatePresence>
          {dmVisible && scenario.interface_type === "feed" && scenario.content?.dm && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 18 }}
              className="mb-4 rounded-xl overflow-hidden shadow-2xl border-2"
              style={{ borderColor: scenario.content.platform_color || "#0077ff" }}
            >
              <div
                className="px-4 py-2 flex items-center gap-2"
                style={{ backgroundColor: scenario.content.platform_color || "#0077ff" }}
              >
                <span className="text-white text-xs font-bold">💬 Новое сообщение</span>
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="ml-auto w-2 h-2 rounded-full bg-white"
                />
              </div>
              <div className="bg-white p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-lg shrink-0">
                  {scenario.content.dm.avatar}
                </div>
                <div>
                  <div className="text-gray-900 text-xs font-bold mb-0.5">{scenario.content.dm.sender}</div>
                  <div className="text-gray-700 text-xs leading-relaxed">{scenario.content.dm.text}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Red flags toggle — hidden on hard, auto-visible on easy */}
        {difficulty !== "hard" && (
          <button
            onClick={() => setShowRedFlags(!showRedFlags)}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-yellow-400 transition-colors mb-3"
          >
            {showRedFlags ? <EyeOff size={14} /> : <Eye size={14} />}
            {showRedFlags
              ? difficulty === "easy" ? "🟢 Подсказки включены" : "Скрыть подсказки"
              : "Показать подсказки"}
          </button>
        )}
        {difficulty === "hard" && !selected && (
          <p className="text-xs text-red-500/60 mb-3">🔴 Режим эксперта — подсказки недоступны</p>
        )}

        <AnimatePresence>
          {showRedFlags && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-yellow-900/10 border border-yellow-800/50 rounded-xl p-4 mb-4"
            >
              <p className="text-yellow-400 text-xs font-bold mb-2">🚩 Признаки угрозы:</p>
              {(scenario.red_flags || []).map((flag: string, i: number) => (
                <p key={i} className="text-yellow-300 text-xs mb-1">• {flag}</p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        <div className="space-y-3 mb-4">
          <p className="text-gray-400 text-sm font-medium">Что ты будешь делать?</p>
          {scenario.options.map((option: any, idx: number) => {
            let style = "border-cyber-border bg-cyber-card hover:border-gray-500";
            if (selected !== null) {
              if (idx === result?.correct_option) style = "border-cyber-green bg-green-900/20";
              else if (idx === selected && !result?.correct) style = "border-cyber-red bg-red-900/20";
            }
            return (
              <motion.button
                key={idx}
                whileHover={selected === null ? { scale: 1.01 } : {}}
                whileTap={selected === null ? { scale: 0.99 } : {}}
                onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                className={`w-full text-left border rounded-xl px-4 py-3 text-sm transition-all ${style}`}
              >
                <span className="text-gray-400 mr-3 font-mono">{String.fromCharCode(65 + idx)}.</span>
                <span className="text-white">{option.text}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border rounded-xl p-4 mb-4 ${result.correct ? "border-cyber-green bg-green-900/10" : "border-cyber-red bg-red-900/10"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.correct ? (
                  <><Shield className="text-cyber-green" size={18} /><span className="text-cyber-green font-bold">Верно! +{result.score_change} очков</span></>
                ) : (
                  <><AlertTriangle className="text-cyber-red" size={18} /><span className="text-cyber-red font-bold">Ошибка! -{Math.abs(result.hp_change)} HP</span></>
                )}
              </div>
              <p className="text-gray-300 text-sm mb-2">{result.explanation}</p>
              {result.ai_explanation && !result.correct && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 rounded-xl border border-orange-700/60 bg-orange-950/30 p-4 space-y-2"
                >
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">🤖 Разбор ИИ-наставника</p>
                  {result.ai_explanation.split("\n").filter((l: string) => l.trim()).map((line: string, i: number) => (
                    <p key={i} className="text-sm text-gray-200 leading-relaxed">{line}</p>
                  ))}
                </motion.div>
              )}
              {result.ai_explanation && result.correct && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2 text-xs text-green-400 italic"
                >
                  🤖 {result.ai_explanation}
                </motion.div>
              )}
              <div className="mt-3 pt-3 border-t border-cyber-border">
                <p className="text-xs text-gray-500 mb-1">🚩 Признаки которые нужно было заметить:</p>
                {result.red_flags.map((f: string, i: number) => (
                  <p key={i} className="text-yellow-400 text-xs">• {f}</p>
                ))}
              </div>
              <button
                onClick={handleNext}
                className={`mt-4 w-full font-bold py-2 rounded-lg transition-colors ${
                  difficulty === "hard" && result && !result.correct
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-cyber-green hover:bg-green-400 text-black"
                }`}
              >
                {difficulty === "hard" && result && !result.correct
                  ? "🔄 Начать заново — Тяжёлый режим"
                  : current + 1 < scenarios.length ? "Следующий сценарий →" : "Завершить уровень ✓"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
