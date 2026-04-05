"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { API_URL } from "@/lib/api";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Challenge {
  id: number;
  // Hacker phase
  hackerQuestion: string;
  hackerContext: string;
  hackerOptions: { text: string; value: number }[]; // value = damage points (higher = better attack)
  hackerBestIdx: number;
  hackerExplain: string;
  // Defender phase
  defenderQuestion: string;
  defenderOptions: { text: string; correct: boolean }[];
  defenderExplain: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    hackerQuestion: "Ты хакер. Нужно взломать аккаунт сотрудника банка. Какой пароль попробуешь первым?",
    hackerContext: "В профиле LinkedIn жертвы: имя — Андрей Петров, работает с 2019 года, есть кот по кличке Барсик.",
    hackerOptions: [
      { text: "qwerty123", value: 30 },
      { text: "Barsik2019!", value: 95 },
      { text: "password", value: 20 },
      { text: "12345678", value: 15 },
    ],
    hackerBestIdx: 1,
    hackerExplain: "Кличка питомца + год начала работы — классическая комбинация. Хакеры первым делом изучают соцсети жертвы и строят пароли на личных данных.",
    defenderQuestion: "Ты — Андрей. Как защититься от такой атаки?",
    defenderOptions: [
      { text: "Не публиковать кличку питомца в открытых профилях", correct: true },
      { text: "Использовать пароль длиннее — «Barsik20192023!»", correct: false },
      { text: "Включить 2FA и использовать случайный пароль из менеджера паролей", correct: true },
      { text: "Менять пароль раз в месяц", correct: false },
    ],
    defenderExplain: "2FA + случайный пароль из менеджера делают атаку по личным данным бессмысленной. Длинный пароль на основе личных данных всё равно уязвим.",
  },
  {
    id: 2,
    hackerQuestion: "Ты пишешь фишинговое письмо от имени «службы безопасности Сбербанка». Какой вариант сработает лучше?",
    hackerContext: "Цель — заставить жертву перейти по ссылке и ввести данные карты.",
    hackerOptions: [
      { text: "«Ваша карта заблокирована. Для разблокировки перейдите по ссылке в течение 24 часов.»", value: 85 },
      { text: "«Поздравляем! Вы выиграли 100 000 рублей. Введите данные карты для получения.»", value: 60 },
      { text: "«Уважаемый клиент, пожалуйста проверьте ваш аккаунт.»", value: 25 },
      { text: "«СРОЧНО!!! Ваши деньги украдут если не перейдёте по ссылке СЕЙЧАС!!!»", value: 10 },
    ],
    hackerBestIdx: 0,
    hackerExplain: "Страх потери + дедлайн 24 часа — самый эффективный триггер. Без кричащих заглавных букв письмо выглядит официально. Именно поэтому такие письма работают.",
    defenderQuestion: "Ты получил такое письмо. Как определить фишинг?",
    defenderOptions: [
      { text: "Проверить домен отправителя — он никогда не совпадёт точно с официальным", correct: true },
      { text: "Позвонить в банк по номеру на официальном сайте, не переходя по ссылке", correct: true },
      { text: "Банк пишет грамотно — значит письмо настоящее", correct: false },
      { text: "Нажать «Разблокировать» но не вводить PIN", correct: false },
    ],
    defenderExplain: "Хакеры умеют писать грамотно. Единственная надёжная проверка — домен отправителя и звонок в банк по официальному номеру.",
  },
  {
    id: 3,
    hackerQuestion: "Тебе нужно войти в корпоративную сеть. Ты в холле офиса. Что сделаешь?",
    hackerContext: "У тебя есть: ноутбук, смартфон, поддельный бейдж «Техподдержка», флешка с вредоносным ПО.",
    hackerOptions: [
      { text: "Оставить флешку с надписью «Зарплаты_2024.xlsx» на видном месте", value: 90 },
      { text: "Подключиться к корпоративному Wi-Fi и сканировать сеть", value: 45 },
      { text: "Позвонить на ресепшн и попросить пропустить «без бейджа»", value: 50 },
      { text: "Войти через запасной выход во время обеда", value: 30 },
    ],
    hackerBestIdx: 0,
    hackerExplain: "USB-дроппинг — один из самых эффективных методов. Любопытство + личная выгода (зарплаты) заставляют сотрудников вставить флешку. В 60% случаев кто-то её откроет.",
    defenderQuestion: "Сотрудник нашёл такую флешку. Что правильно?",
    defenderOptions: [
      { text: "Вставить и посмотреть что внутри — вдруг важное", correct: false },
      { text: "Передать в IT-отдел/службу безопасности не вставляя в компьютер", correct: true },
      { text: "Выбросить флешку в мусор", correct: false },
      { text: "Вставить в рабочий компьютер но не открывать файлы", correct: false },
    ],
    defenderExplain: "Найденный носитель — потенциальная угроза. IT-отдел проверит его в изолированной среде. Выбрасывать нельзя — данные могут быть нужны для расследования.",
  },
  {
    id: 4,
    hackerQuestion: "Ты звонишь в колл-центр банка, представившись клиентом. Цель — получить данные счёта. Что скажешь?",
    hackerContext: "У тебя есть имя клиента (Мария Иванова) из утечки данных.",
    hackerOptions: [
      { text: "«Я Мария Иванова, срочно — мой счёт взламывают прямо сейчас, проверьте остаток!»", value: 80 },
      { text: "«Здравствуйте, хочу узнать баланс карты»", value: 15 },
      { text: "«Это полиция, нам нужны данные клиента для следствия»", value: 40 },
      { text: "«Я забыла кодовое слово, подскажите его пожалуйста»", value: 5 },
    ],
    hackerBestIdx: 0,
    hackerExplain: "Срочность и паника снижают бдительность оператора. Имя + эмоция «взламывают сейчас» создают давление принять решение быстро, не по регламенту.",
    defenderQuestion: "Ты оператор. Как правильно поступить с таким звонком?",
    defenderOptions: [
      { text: "Попросить кодовое слово — стандартная верификация", correct: true },
      { text: "Поверить — человек явно расстроен", correct: false },
      { text: "Если нет кодового слова — перенаправить в отделение, не давать данные по телефону", correct: true },
      { text: "Проверить только имя и дату рождения", correct: false },
    ],
    defenderExplain: "Регламент верификации существует именно для таких случаев. Срочность и эмоции — инструменты мошенника. Кодовое слово + при отсутствии — только отделение.",
  },
  {
    id: 5,
    hackerQuestion: "Ты хочешь взломать аккаунт в соцсети через фишинговый сайт-двойник. Какой домен зарегистрируешь?",
    hackerContext: "Оригинальный сайт: vk.com",
    hackerOptions: [
      { text: "vk-login.com", value: 50 },
      { text: "vk.com.ru-login.net", value: 65 },
      { text: "vk.com-security.ru", value: 70 },
      { text: "vk.соm (кириллическая «о»)", value: 95 },
    ],
    hackerBestIdx: 3,
    hackerExplain: "Кириллическая «о» визуально идентична латинской. В браузере отображается как 'vk.com' — IDN-хоумограф атака. Большинство пользователей не замечают разницы даже при внимательном осмотре.",
    defenderQuestion: "Как защититься от IDN-хоумографных атак?",
    defenderOptions: [
      { text: "Всегда проверять URL в адресной строке вручную", correct: false },
      { text: "Использовать менеджер паролей — он привязан к точному домену и не заполнит данные на фейке", correct: true },
      { text: "Смотреть на SSL-замочек в браузере", correct: false },
      { text: "Добавить важные сайты в закладки и заходить только через них", correct: true },
    ],
    defenderExplain: "SSL есть и у мошеннических сайтов. Глаз не отличит кириллическую букву. Менеджер паролей и закладки — надёжная защита, так как они сверяют точный домен.",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "intro" | "hacker" | "transition" | "defender" | "result" | "final";

interface RoundState {
  challengeId: number;
  hackerChoice: number;
  hackerDamage: number;
  defenderChoices: boolean[];
  defenderCorrectCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HackMePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [hackerSelected, setHackerSelected] = useState<number | null>(null);
  const [defenderSelected, setDefenderSelected] = useState<Set<number>>(new Set());
  const [defenderConfirmed, setDefenderConfirmed] = useState(false);
  const [rounds, setRounds] = useState<RoundState[]>([]);
  const [totalHackerDamage, setTotalHackerDamage] = useState(0);
  const [totalDefenderScore, setTotalDefenderScore] = useState(0);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>(CHALLENGES);
  const [aiLoading, setAiLoading] = useState(false);

  const challenge = activeChallenges[challengeIdx];

  const startWithAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-hackme-challenges`);
      const data = await res.json();
      if (data.challenges?.length > 0) setActiveChallenges(data.challenges);
    } catch { /* fallback to static */ }
    finally {
      setAiLoading(false);
      setChallengeIdx(0);
      setHackerSelected(null);
      setDefenderSelected(new Set());
      setDefenderConfirmed(false);
      setRounds([]);
      setTotalHackerDamage(0);
      setTotalDefenderScore(0);
      setPhase("hacker");
    }
  };

  const handleHackerSelect = (idx: number) => {
    if (hackerSelected !== null) return;
    setHackerSelected(idx);
  };

  const handleHackerConfirm = () => {
    if (hackerSelected === null) return;
    const damage = challenge.hackerOptions[hackerSelected].value;
    setTotalHackerDamage((p: number) => p + damage);
    setTimeout(() => setPhase("transition"), 400);
  };

  const handleTransitionNext = () => {
    setDefenderSelected(new Set());
    setDefenderConfirmed(false);
    setPhase("defender");
  };

  const toggleDefender = (idx: number) => {
    if (defenderConfirmed) return;
    setDefenderSelected((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleDefenderConfirm = () => {
    if (defenderSelected.size === 0) return;
    setDefenderConfirmed(true);
    const correctSelected = Array.from(defenderSelected as Set<number>).filter(
      (i: number) => challenge.defenderOptions[i].correct
    ).length;
    const totalCorrect = challenge.defenderOptions.filter((o: { correct: boolean }) => o.correct).length;
    const score = Math.round((correctSelected / Math.max(totalCorrect, 1)) * 100);
    setTotalDefenderScore((p: number) => p + score);

    const round: RoundState = {
      challengeId: challenge.id,
      hackerChoice: hackerSelected ?? 0,
      hackerDamage: challenge.hackerOptions[hackerSelected ?? 0].value,
      defenderChoices: challenge.defenderOptions.map((_: unknown, i: number) => defenderSelected.has(i)),
      defenderCorrectCount: correctSelected,
    };
    setRounds((prev) => [...prev, round]);
  };

  const handleNext = () => {
    if (challengeIdx + 1 < activeChallenges.length) {
      setChallengeIdx((i) => i + 1);
      setHackerSelected(null);
      setDefenderSelected(new Set());
      setDefenderConfirmed(false);
      setPhase("hacker");
    } else {
      setPhase("final");
    }
  };

  const handleRestart = () => {
    setChallengeIdx(0);
    setHackerSelected(null);
    setDefenderSelected(new Set());
    setDefenderConfirmed(false);
    setRounds([]);
    setTotalHackerDamage(0);
    setTotalDefenderScore(0);
    setPhase("intro");
  };

  const avgDefenderScore = rounds.length > 0
    ? Math.round(totalDefenderScore / rounds.length)
    : 0;
  const avgHackerDamage = rounds.length > 0
    ? Math.round(totalHackerDamage / rounds.length)
    : 0;

  return (
    <div className="min-h-screen bg-cyber-dark text-white">
      {/* Header */}
      <header className="border-b border-cyber-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-cyber-green w-7 h-7" />
          <span className="text-white font-bold text-lg">Cyber<span className="text-cyber-green">Sim</span></span>
          <span className="text-gray-600 mx-2">|</span>
          <AnimatePresence mode="wait">
            {phase === "hacker" || phase === "intro" ? (
              <motion.span key="hacker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 font-semibold">💀 Режим хакера</motion.span>
            ) : phase === "defender" || phase === "transition" ? (
              <motion.span key="defender" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-cyber-green font-semibold">🛡️ Режим защитника</motion.span>
            ) : (
              <motion.span key="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-yellow-400 font-semibold">🏁 Итоги</motion.span>
            )}
          </AnimatePresence>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Дашборд
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <motion.div
                  animate={{ rotateY: [0, 180, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="text-7xl mb-4 inline-block"
                >⚔️</motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">Взломай меня</h1>
                <p className="text-gray-400">Стань хакером — потом встань на защиту. Пойми атаку изнутри.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">💀</div>
                  <h3 className="text-red-400 font-bold mb-1">Фаза 1: Хакер</h3>
                  <p className="text-gray-400 text-xs">Выбери самую эффективную атаку. Чем выше урон — тем лучше ты понял логику злоумышленника.</p>
                </div>
                <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">🛡️</div>
                  <h3 className="text-cyber-green font-bold mb-1">Фаза 2: Защитник</h3>
                  <p className="text-gray-400 text-xs">Ту же уязвимость — закрой. Выбери все правильные меры защиты.</p>
                </div>
              </div>

              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 mb-6 space-y-2">
                {[
                  "5 сценариев: пароли, фишинг, физический доступ, вишинг, хоумографы",
                  "Каждый сценарий — сначала атакуешь, потом защищаешься",
                  "Понять как думает хакер = лучшая защита",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-yellow-400 shrink-0">→</span> {t}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPhase("hacker")}
                className="w-full bg-gradient-to-r from-red-700 to-orange-600 hover:from-red-600 hover:to-orange-500 text-white font-bold py-4 rounded-xl text-lg transition-all"
              >
                💀 Начать — стать хакером
              </button>
              <button
                onClick={startWithAI}
                disabled={aiLoading}
                className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {aiLoading ? "⏳ Генерирую сценарии..." : "🤖 Режим ИИ — новые сценарии"}
              </button>
            </motion.div>
          )}

          {/* ── HACKER PHASE ── */}
          {phase === "hacker" && (
            <motion.div key={`hacker-${challengeIdx}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {/* Progress */}
              <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                <span>Сценарий {challengeIdx + 1} / {activeChallenges.length}</span>
                <span className="text-red-400 font-bold">💀 Ты — хакер</span>
              </div>
              <div className="h-1 bg-cyber-dark rounded-full overflow-hidden mb-5">
                <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${((challengeIdx) / activeChallenges.length) * 100}%` }} />
              </div>

              <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-5 mb-4">
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-2">Твоя задача как хакера</p>
                <p className="text-white font-semibold text-base leading-snug mb-3">{challenge.hackerQuestion}</p>
                <div className="bg-black/30 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">📋 Контекст</p>
                  <p className="text-gray-300 text-sm">{challenge.hackerContext}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3">Выбери наиболее эффективную атаку:</p>
              <div className="space-y-3 mb-5">
                {challenge.hackerOptions.map((opt: { text: string; value: number }, i: number) => {
                  const isSelected = hackerSelected === i;
                  const revealed = hackerSelected !== null;
                  const isBest = i === challenge.hackerBestIdx;
                  return (
                    <motion.button
                      key={i}
                      whileHover={!revealed ? { scale: 1.01 } : {}}
                      onClick={() => handleHackerSelect(i)}
                      className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                        revealed && isBest ? "border-red-500 bg-red-950/40" :
                        revealed && isSelected && !isBest ? "border-orange-700 bg-orange-950/30 opacity-70" :
                        revealed && !isSelected ? "border-gray-800 opacity-40 cursor-default" :
                        isSelected ? "border-red-500 bg-red-950/20" :
                        "border-cyber-border bg-cyber-card hover:border-red-500/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-200">{opt.text}</span>
                        {revealed && (
                          <span className={`text-xs font-bold ml-3 shrink-0 ${isBest ? "text-red-400" : "text-gray-600"}`}>
                            {isBest ? `💀 ${opt.value}% урон` : `${opt.value}%`}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {hackerSelected !== null && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-950/30 border border-red-700/50 rounded-xl p-4 mb-5">
                  <p className="text-red-300 font-bold text-sm mb-1">
                    {hackerSelected === challenge.hackerBestIdx ? "💀 Отлично! Ты выбрал самую опасную атаку" : "Неплохо, но есть эффективнее"}
                  </p>
                  <p className="text-gray-400 text-xs leading-relaxed">{challenge.hackerExplain}</p>
                </motion.div>
              )}

              <button
                onClick={handleHackerConfirm}
                disabled={hackerSelected === null}
                className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Перейти к защите <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ── TRANSITION ── */}
          {phase === "transition" && (
            <motion.div key="transition" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center py-10">
                <motion.div
                  animate={{ rotateY: [0, 90, 180] }}
                  transition={{ duration: 0.8 }}
                  className="text-7xl mb-6 inline-block"
                >🔄</motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Смена роли</h2>
                <p className="text-gray-400 mb-6">Ты только что думал как хакер.<br />Теперь — защити от того же самого.</p>
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="text-center">
                    <div className="text-3xl">💀</div>
                    <p className="text-red-400 text-xs mt-1">Хакер</p>
                  </div>
                  <div className="text-gray-600 text-2xl">→</div>
                  <div className="text-center">
                    <div className="text-3xl">🛡️</div>
                    <p className="text-cyber-green text-xs mt-1">Защитник</p>
                  </div>
                </div>
                <button
                  onClick={handleTransitionNext}
                  className="bg-cyber-green hover:bg-green-400 text-black font-bold py-3 px-8 rounded-xl transition-all"
                >
                  🛡️ Встать на защиту
                </button>
              </div>
            </motion.div>
          )}

          {/* ── DEFENDER PHASE ── */}
          {phase === "defender" && (
            <motion.div key={`defender-${challengeIdx}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                <span>Сценарий {challengeIdx + 1} / {activeChallenges.length}</span>
                <span className="text-cyber-green font-bold">🛡️ Ты — защитник</span>
              </div>
              <div className="h-1 bg-cyber-dark rounded-full overflow-hidden mb-5">
                <div className="h-full bg-cyber-green rounded-full transition-all" style={{ width: `${((challengeIdx) / activeChallenges.length) * 100}%` }} />
              </div>

              <div className="bg-green-950/20 border border-green-800/40 rounded-xl p-5 mb-4">
                <p className="text-xs text-cyber-green font-bold uppercase tracking-wider mb-2">Твоя задача как защитника</p>
                <p className="text-white font-semibold text-base leading-snug">{challenge.defenderQuestion}</p>
              </div>

              <p className="text-xs text-gray-500 mb-3">Выбери все правильные меры (может быть несколько):</p>
              <div className="space-y-3 mb-5">
                {challenge.defenderOptions.map((opt: { text: string; correct: boolean }, i: number) => {
                  const isSelected = defenderSelected.has(i);
                  return (
                    <motion.button
                      key={i}
                      whileHover={!defenderConfirmed ? { scale: 1.01 } : {}}
                      onClick={() => toggleDefender(i)}
                      className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                        defenderConfirmed
                          ? opt.correct
                            ? "border-green-500 bg-green-950/30 cursor-default"
                            : isSelected
                              ? "border-red-500 bg-red-950/30 cursor-default"
                              : "border-gray-800 opacity-40 cursor-default"
                          : isSelected
                            ? "border-cyber-green bg-green-950/20 cursor-pointer"
                            : "border-cyber-border bg-cyber-card hover:border-cyber-green/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          defenderConfirmed && opt.correct ? "border-green-500 bg-green-500" :
                          defenderConfirmed && isSelected && !opt.correct ? "border-red-500 bg-red-500" :
                          isSelected ? "border-cyber-green bg-cyber-green/20" :
                          "border-gray-600"
                        }`}>
                          {defenderConfirmed && opt.correct && <CheckCircle size={12} className="text-black" />}
                          {defenderConfirmed && isSelected && !opt.correct && <XCircle size={12} className="text-white" />}
                          {!defenderConfirmed && isSelected && <div className="w-2 h-2 bg-cyber-green rounded-full" />}
                        </div>
                        <span className="text-sm text-gray-200">{opt.text}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {defenderConfirmed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-green-950/30 border border-green-700/50 rounded-xl p-4 mb-5">
                  <p className="text-cyber-green font-bold text-sm mb-1">💡 Разбор</p>
                  <p className="text-gray-300 text-xs leading-relaxed">{challenge.defenderExplain}</p>
                </motion.div>
              )}

              {!defenderConfirmed ? (
                <button
                  onClick={handleDefenderConfirm}
                  disabled={defenderSelected.size === 0}
                  className="w-full bg-cyber-green hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-all"
                >
                  Подтвердить защиту
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full bg-cyber-green hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {challengeIdx + 1 < activeChallenges.length ? <>Следующий сценарий <ChevronRight size={18} /></> : <>🏁 Итоги</>}
                </button>
              )}
            </motion.div>
          )}

          {/* ── FINAL ── */}
          {phase === "final" && (
            <motion.div key="final" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-6">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-7xl mb-4"
                >
                  {avgDefenderScore >= 80 ? "🏆" : avgDefenderScore >= 60 ? "🛡️" : "📋"}
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-1">Расследование завершено</h2>
                <p className="text-gray-400 text-sm">Ты побывал по обе стороны баррикад</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">💀 Как хакер</p>
                  <p className="text-2xl font-bold text-red-400">{avgHackerDamage}%</p>
                  <p className="text-xs text-gray-500">средний урон</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {avgHackerDamage >= 80 ? "Опасно эффективен" : avgHackerDamage >= 60 ? "Понял логику атак" : "Ещё не думаешь как хакер"}
                  </p>
                </div>
                <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">🛡️ Как защитник</p>
                  <p className="text-2xl font-bold text-cyber-green">{avgDefenderScore}%</p>
                  <p className="text-xs text-gray-500">правильных мер</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {avgDefenderScore >= 80 ? "Отличная защита!" : avgDefenderScore >= 60 ? "Хорошая база" : "Нужна практика"}
                  </p>
                </div>
              </div>

              {/* Per-round breakdown */}
              <div className="space-y-2 mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Разбор по сценариям</p>
                {rounds.map((r, i) => {
                  const ch = activeChallenges.find((c: Challenge) => c.id === r.challengeId)!;
                  const isHackerBest = r.hackerChoice === ch.hackerBestIdx;
                  const totalCorrect = ch.defenderOptions.filter((o: { text: string; correct: boolean }) => o.correct).length;
                  const defScore = Math.round((r.defenderCorrectCount / Math.max(totalCorrect, 1)) * 100);
                  return (
                    <div key={i} className="bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 flex items-center justify-between">
                      <p className="text-gray-400 text-xs truncate flex-1 mr-3">Сценарий {i + 1}</p>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-bold ${isHackerBest ? "text-red-400" : "text-gray-500"}`}>
                          💀 {r.hackerDamage}%
                        </span>
                        <span className={`text-xs font-bold ${defScore >= 80 ? "text-cyber-green" : defScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          🛡️ {defScore}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 mb-6">
                <p className="text-white font-bold text-sm mb-2">💡 Главный вывод</p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {avgDefenderScore >= 80
                    ? "Ты хорошо понимаешь атаки и умеешь защищаться. Знание логики хакера — лучший инструмент защиты."
                    : avgDefenderScore >= 60
                    ? "Ты понял основные принципы атак. Улучши знание защитных мер — пройди лекции и повтори тесты."
                    : "Пройди лекции в разделе «Учебные материалы» — там подробно разобраны все типы атак которые встретились здесь."}
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={handleRestart}
                  className="flex-1 border border-cyber-border text-gray-300 hover:border-red-500 hover:text-red-400 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <RotateCcw size={16} /> Снова
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
