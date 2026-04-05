"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Shield, AlertTriangle, CheckCircle, XCircle, ChevronLeft } from "lucide-react";
import { API_URL } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Call {
  id: number;
  callerName: string;
  callerPhone: string;
  callerAvatar: string;
  request: string;
  script: string[];
  isScammer: boolean;
  redFlags: string[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

// ─── Call dataset ─────────────────────────────────────────────────────────────

const CALLS: Call[] = [
  {
    id: 1,
    callerName: "Алексей Морозов",
    callerPhone: "+7 (912) 345-67-89",
    callerAvatar: "👨",
    request: "Хочет заблокировать карту — потерял кошелёк",
    difficulty: "easy",
    isScammer: false,
    script: [
      "Здравствуйте, я потерял кошелёк с картой, нужно срочно заблокировать.",
      "Карта на имя Морозов Алексей Игоревич, последние 4 цифры — 7823.",
      "Да, могу назвать кодовое слово: ЛАЗУРЬ.",
      "Подождите, приду в отделение для восстановления, спасибо.",
    ],
    redFlags: [],
    explanation: "Клиент правильно прошёл верификацию — назвал имя, последние 4 цифры и кодовое слово. Это стандартная легитимная процедура блокировки.",
  },
  {
    id: 2,
    callerName: "Неизвестный",
    callerPhone: "+7 (800) 555-01-23",
    callerAvatar: "🎭",
    request: "Называет себя 'сотрудником ФСБ', требует данные клиента",
    difficulty: "easy",
    isScammer: true,
    script: [
      "Здравствуйте! Майор Соколов, ФСБ России, отдел по киберпреступлениям.",
      "У нас оперативная информация — ваш клиент Петров Д.И. участвует в мошеннической схеме.",
      "Мне нужны остатки на его счетах и последние операции. Это государственная тайна, никому не сообщайте.",
      "Если откажете — будете препятствовать следствию. Передайте данные немедленно.",
    ],
    redFlags: [
      "ФСБ запрашивает данные клиентов только через официальный судебный запрос, не по телефону",
      "Давление и угроза уголовной ответственностью — классическая манипуляция",
      "Требование секретности — попытка изолировать от коллег и проверки",
    ],
    explanation: "Настоящие силовые структуры не запрашивают банковские данные по телефону. Только официальный запрос с подписью и печатью. Мошенник использует авторитет ФСБ для давления.",
  },
  {
    id: 3,
    callerName: "Ирина Соколова",
    callerPhone: "+7 (903) 221-44-55",
    callerAvatar: "👩",
    request: "Спрашивает баланс карты",
    difficulty: "easy",
    isScammer: false,
    script: [
      "Добрый день, могу узнать баланс своей карты?",
      "Соколова Ирина Васильевна, карта заканчивается на 4412.",
      "Кодовое слово — ВЕСНА, дата рождения 12 марта 1985 года.",
      "Да, всё верно. Спасибо большое!",
    ],
    redFlags: [],
    explanation: "Клиент прошёл стандартную верификацию: ФИО, последние 4 цифры карты, кодовое слово и дата рождения. Запрос законный.",
  },
  {
    id: 4,
    callerName: "Дмитрий",
    callerPhone: "+7 (999) 111-22-33",
    callerAvatar: "🕵️",
    request: "Представляется племянником клиента, просит перевести деньги",
    difficulty: "medium",
    isScammer: true,
    script: [
      "Алло, здравствуйте. Моя тётя Галина Петровна Захарова, она у вас клиент.",
      "Она попала в больницу, без сознания. Ей срочно нужны деньги на операцию.",
      "Я племянник, Дмитрий. Переведите пожалуйста 80 000 рублей с её счёта вот на эту карту.",
      "Она потом всё подтвердит, она мне полностью доверяет, мы родственники!",
    ],
    redFlags: [
      "Банк не может переводить деньги по просьбе третьих лиц без нотариальной доверенности",
      "Срочность и эмоциональное давление (больница, операция) — манипуляция",
      "Звонящий не может пройти верификацию как владелец счёта",
    ],
    explanation: "Операции со счётом может проводить только владелец или лицо с нотариальной доверенностью. «Родственник» без доверенности — не основание для перевода. Это классическая схема мошенничества.",
  },
  {
    id: 5,
    callerName: "Наталья Громова",
    callerPhone: "+7 (916) 788-99-01",
    callerAvatar: "👩‍💼",
    request: "Хочет открыть вклад, узнать условия",
    difficulty: "easy",
    isScammer: false,
    script: [
      "Здравствуйте, интересуют условия по вкладам, какие сейчас ставки?",
      "А есть ли возможность открыть онлайн или нужно в отделение?",
      "Хорошо, подскажите ещё — при досрочном закрытии теряются проценты?",
      "Понятно, спасибо за информацию, приду в отделение в конце недели.",
    ],
    redFlags: [],
    explanation: "Стандартный информационный запрос об условиях вкладов. Клиент не запрашивает конфиденциальных данных и не просит совершить операции.",
  },
  {
    id: 6,
    callerName: "Сергей",
    callerPhone: "+7 (495) 000-11-22",
    callerAvatar: "🦹",
    request: "Называет себя 'сотрудником IT-отдела банка', просит PIN-код для 'проверки'",
    difficulty: "medium",
    isScammer: true,
    script: [
      "Добрый день, это технический отдел банка, Сергей Лебедев.",
      "Проводим плановую проверку безопасности карт клиентов.",
      "Мне нужно убедиться что карта Захаровой Г.П. не скомпрометирована.",
      "Назовите пожалуйста PIN-код карты клиента для верификации в нашей системе.",
    ],
    redFlags: [
      "Банк НИКОГДА не запрашивает PIN-код — ни у клиента, ни у сотрудников",
      "«Плановая проверка безопасности» по телефону — не существует",
      "Внутренний сотрудник не должен звонить оператору с такими запросами",
    ],
    explanation: "PIN-код не знает никто, кроме самого клиента — это фундаментальный принцип безопасности. Никакой «технический отдел» не может и не должен его запрашивать. Немедленно завершить разговор и сообщить службе безопасности.",
  },
  {
    id: 7,
    callerName: "Олег Петров",
    callerPhone: "+7 (921) 654-32-10",
    callerAvatar: "👨‍💼",
    request: "Сообщает о подозрительной транзакции на своей карте",
    difficulty: "easy",
    isScammer: false,
    script: [
      "Здравствуйте, только что пришло уведомление о списании 12 000 рублей, но я ничего не покупал.",
      "Петров Олег Станиславович, карта на 9910, кодовое слово — ГРАНИТ.",
      "Операция была в каком-то интернет-магазине в 3 часа ночи, я спал.",
      "Да, прошу заблокировать карту и оспорить операцию.",
    ],
    redFlags: [],
    explanation: "Клиент сообщает о несанкционированной операции и просит стандартные действия: блокировку и чарджбэк. Верификация пройдена корректно.",
  },
  {
    id: 8,
    callerName: "Анна",
    callerPhone: "+7 (812) 333-44-55",
    callerAvatar: "🎪",
    request: "Называет себя 'клиенткой', знает много данных, просит изменить номер телефона без визита",
    difficulty: "hard",
    isScammer: true,
    script: [
      "Здравствуйте, я Захарова Анна Михайловна, у меня новый номер телефона.",
      "Хочу поменять контактный номер, так как старый телефон украли.",
      "Да, скажу всё для верификации: дата рождения 5 июля 1978, карта на 3341.",
      "Кодовое слово — ЛАЗУРЬ. Поменяйте пожалуйста номер на +7 (999) 888-77-66.",
    ],
    redFlags: [
      "Смена номера телефона — критическая операция, требует личного визита с паспортом",
      "Мошенник может знать данные клиента из утечки баз данных",
      "Новый номер — у мошенника, после смены все OTP коды будут приходить ему",
    ],
    explanation: "Смена контактного номера телефона — это критически важная операция. Её можно провести только при личном визите с паспортом. Знание данных (дата рождения, номер карты) не достаточно — эти данные могут быть куплены в даркнете.",
  },
  {
    id: 9,
    callerName: "Виктор Зайцев",
    callerPhone: "+7 (985) 123-45-67",
    callerAvatar: "👴",
    request: "Пожилой клиент, хочет сделать перевод дочери",
    difficulty: "easy",
    isScammer: false,
    script: [
      "Алло, здравствуйте, мне нужна помощь — хочу перевести деньги дочери.",
      "Зайцев Виктор Николаевич, карта заканчивается на 5521, кодовое слово РЯБИНА.",
      "Нужно перевести 15 000 рублей на карту дочери, она номер продиктует.",
      "Да, сейчас она рядом, продиктует данные своей карты.",
    ],
    redFlags: [],
    explanation: "Легитимный запрос на перевод. Клиент прошёл верификацию, операция стандартная — перевод близкому родственнику по его собственному желанию.",
  },
  {
    id: 10,
    callerName: "Марина",
    callerPhone: "+7 (800) 100-30-00",
    callerAvatar: "🎭",
    request: "Называет себя 'сотрудником банка', просит оператора передать данные клиента 'для внутренней проверки'",
    difficulty: "hard",
    isScammer: true,
    script: [
      "Здравствуйте, коллега! Это Марина из отдела противодействия мошенничеству, головной офис.",
      "У нас сигнал по клиенту Зайцеву В.Н. — подозрение на компрометацию.",
      "Мне нужно срочно: остаток на счёте, последние 5 операций и привязанный номер телефона.",
      "Это внутренний запрос, не нужно оформлять заявку — просто скажите мне устно, это срочно.",
    ],
    redFlags: [
      "Внутренние запросы данных клиентов всегда оформляются через систему, не устно по телефону",
      "Настоящий сотрудник отдела безопасности видит данные сам — ему не нужно звонить оператору",
      "«Не оформляй заявку» — попытка обойти систему контроля и аудита",
    ],
    explanation: "Это социальная инженерия внутри компании (insider social engineering). Настоящий сотрудник службы безопасности имеет доступ к нужным данным в системе. Запрос данных клиента устно по телефону — грубое нарушение процедур. Нужно завершить звонок и сообщить руководителю.",
  },
  {
    id: 11,
    callerName: "Екатерина Белова",
    callerPhone: "+7 (963) 456-78-90",
    callerAvatar: "👩",
    request: "Хочет увеличить кредитный лимит",
    difficulty: "easy",
    isScammer: false,
    script: [
      "Здравствуйте, хотела бы подать заявку на увеличение кредитного лимита.",
      "Белова Екатерина Романовна, карта на 8834, кодовое слово СИРЕНЬ.",
      "Я работаю уже 3 года, зарплата выросла, хотела бы лимит с 50 до 150 тысяч.",
      "Хорошо, жду решения. Когда примерно придёт ответ?",
    ],
    redFlags: [],
    explanation: "Стандартная заявка на изменение кредитного лимита. Клиент корректно прошёл верификацию. Решение принимается автоматически системой скоринга.",
  },
  {
    id: 12,
    callerName: "Неизвестный",
    callerPhone: "+7 (977) 000-00-01",
    callerAvatar: "💀",
    request: "Угрожает, требует немедленно разблокировать счёт 'или будут последствия'",
    difficulty: "medium",
    isScammer: true,
    script: [
      "Значит так. У вас заблокирован счёт на имя Попов Артём. Немедленно разблокируйте.",
      "Это незаконно! Вы нарушаете мои права! Я подам в суд на весь ваш банк!",
      "Не надо никакой верификации — я сказал разблокировать СЕЙЧАС. Вы понимаете?!",
      "Если через 10 минут счёт не разблокирован — я знаю где находится ваш офис.",
    ],
    redFlags: [
      "Угрозы и давление — инструмент манипуляции, цель — заставить нарушить процедуры",
      "Отказ от верификации означает невозможность подтвердить личность",
      "Любые операции со счётом — только после верификации, независимо от тона разговора",
    ],
    explanation: "Агрессия и угрозы — это давление с целью заставить нарушить регламент. Оператор обязан сохранять спокойствие, следовать стандартным процедурам и при необходимости подключить службу безопасности. Без верификации — никаких операций.",
  },
];

// ─── Game logic ───────────────────────────────────────────────────────────────

type GameScreen = "intro" | "call" | "result" | "final";

interface RoundResult {
  call: Call;
  playerChoice: "help" | "block";
  correct: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BankGamePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<GameScreen>("intro");
  const [queue, setQueue] = useState<Call[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [scriptLine, setScriptLine] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [timer, setTimer] = useState(35);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const decidedRef = useRef(false);

  const call = queue[current] ?? null;

  // Auto-advance script lines
  useEffect(() => {
    if (screen !== "call" || !call) return;
    if (scriptLine >= call.script.length) return;
    const t = setTimeout(() => setScriptLine((s: number) => s + 1), 2200);
    return () => clearTimeout(t);
  }, [screen, call, scriptLine]);

  // Timer countdown
  useEffect(() => {
    if (screen !== "call") return;
    decidedRef.current = false;
    setTimer(35);
    timerRef.current = setInterval(() => {
      setTimer((t: number) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [screen, current]);

  // Timeout handler — fires when timer hits 0
  useEffect(() => {
    if (screen === "call" && timer === 0 && !decidedRef.current) {
      decidedRef.current = true;
      handleDecision("help");
    }
  }, [timer, screen]);

  const startGame = useCallback((calls?: Call[]) => {
    const pool = calls && calls.length > 0 ? calls : CALLS;
    const selected = shuffle(pool).slice(0, 8);
    setQueue(selected);
    setCurrent(0);
    setResults([]);
    setScriptLine(0);
    setScreen("call");
  }, []);

  const startGameWithAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-bankgame-calls`);
      const data = await res.json();
      startGame(data.calls?.length > 0 ? data.calls : undefined);
    } catch { startGame(); }
    finally { setAiLoading(false); }
  }, [startGame]);

  const handleDecision = useCallback((choice: "help" | "block") => {
    if (!call) return;
    clearInterval(timerRef.current!);
    const correct = choice === "block" ? call.isScammer : !call.isScammer;
    const r: RoundResult = { call, playerChoice: choice, correct };
    setLastResult(r);
    setResults((prev: RoundResult[]) => [...prev, r]);
    setScreen("result");
  }, [call]);

  const nextCall = useCallback(() => {
    if (current + 1 >= queue.length) {
      setScreen("final");
    } else {
      setCurrent((c: number) => c + 1);
      setScriptLine(0);
      setLastResult(null);
      setScreen("call");
    }
  }, [current, queue.length]);

  const score = results.filter((r: RoundResult) => r.correct).length;
  const total = results.length;

  // ─── Screens ──────────────────────────────────────────────────────────────

  if (screen === "intro") {
    return (
      <div className="min-h-screen bg-cyber-dark flex flex-col">
        <header className="border-b border-cyber-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-cyber-green w-6 h-6" />
            <span className="text-white font-bold">Cyber<span className="text-cyber-green">Sim</span></span>
            <span className="text-gray-600 mx-1">|</span>
            <span className="text-green-400 font-semibold text-sm">📞 Оператор банка</span>
          </div>
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
            <ChevronLeft size={16} /> Дашборд
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <div className="text-center mb-8">
              <div className="text-7xl mb-4">📞</div>
              <h1 className="text-white text-3xl font-bold mb-3">Оператор банка</h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ты — оператор колл-центра банка. Тебе звонят клиенты — и мошенники.
                Твоя задача: распознать кто есть кто и принять правильное решение.
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                { icon: "📋", text: "8 звонков, каждый с таймером 35 секунд" },
                { icon: "✅", text: "Нажми «Помочь» если клиент настоящий" },
                { icon: "🚫", text: "Нажми «Блокировать» если это мошенник" },
                { icon: "⚠️", text: "Ошибка — клиент теряет деньги или мошенник получает данные" },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 bg-cyber-card border border-cyber-border rounded-xl p-3">
                  <span className="text-xl">{tip.icon}</span>
                  <p className="text-gray-300 text-sm">{tip.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => startGame()}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
            >
              Начать дежурство →
            </button>
            <button
              onClick={startGameWithAI}
              disabled={aiLoading}
              className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              {aiLoading ? "⏳ Генерирую звонки..." : "🤖 Режим ИИ — уникальные звонки"}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (screen === "call" && call) {
    const timerColor = timer > 20 ? "text-green-400" : timer > 10 ? "text-yellow-400" : "text-red-400 animate-pulse";
    const timerBg = timer > 20 ? "bg-green-900/30" : timer > 10 ? "bg-yellow-900/30" : "bg-red-900/30";

    return (
      <div className="min-h-screen bg-cyber-dark flex flex-col">
        {/* Header */}
        <div className="bg-cyber-card border-b border-cyber-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-cyber-green w-5 h-5" />
            <span className="text-white font-bold text-sm">Cyber<span className="text-cyber-green">Sim</span></span>
            <span className="text-gray-600 text-xs">|</span>
            <span className="text-gray-400 text-sm">Звонок {current + 1} из {queue.length}</span>
          </div>
          <div className={`font-mono font-bold text-lg px-3 py-1 rounded-lg ${timerColor} ${timerBg}`}>
            {timer}с
          </div>
          <div className="text-gray-400 text-sm">
            ✅ {results.filter(r => r.correct).length} / {results.length}
          </div>
        </div>

        {/* Caller info */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-b from-green-900/30 to-cyber-dark border-b border-green-800/30 px-4 py-5"
        >
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-14 h-14 rounded-full bg-green-900/50 border-2 border-green-500 flex items-center justify-center text-3xl"
            >
              {call.callerAvatar}
            </motion.div>
            <div>
              <div className="text-white font-bold text-lg">{call.callerName}</div>
              <div className="text-gray-400 text-sm font-mono">{call.callerPhone}</div>
              <div className="flex items-center gap-1 mt-1">
                <Phone size={12} className="text-green-400" />
                <span className="text-green-400 text-xs">Входящий звонок</span>
              </div>
            </div>
          </div>
          <div className="mt-3 bg-black/20 rounded-lg px-3 py-2">
            <p className="text-gray-300 text-xs italic">«{call.request}»</p>
          </div>
        </motion.div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <p className="text-gray-500 text-xs text-center mb-4">— Разговор —</p>
          <AnimatePresence>
            {call.script.slice(0, scriptLine).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3"
              >
                <span className="text-xl shrink-0 mt-0.5">{call.callerAvatar}</span>
                <div className="bg-cyber-card border border-cyber-border rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-xs">
                  <p className="text-gray-200 text-sm leading-relaxed">{line}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {scriptLine < call.script.length && (
            <div className="flex gap-3">
              <span className="text-xl">{call.callerAvatar}</span>
              <div className="bg-cyber-card border border-cyber-border rounded-2xl rounded-tl-sm px-4 py-2.5">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.3 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Decision buttons */}
        <div className="p-4 border-t border-cyber-border grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDecision("block")}
            className="flex items-center justify-center gap-2 bg-red-900/50 border border-red-700 hover:bg-red-800 text-red-300 font-bold py-4 rounded-2xl transition-all active:scale-95"
          >
            <PhoneOff size={20} />
            <span>Блокировать</span>
          </button>
          <button
            onClick={() => handleDecision("help")}
            className="flex items-center justify-center gap-2 bg-green-900/50 border border-green-700 hover:bg-green-800 text-green-300 font-bold py-4 rounded-2xl transition-all active:scale-95"
          >
            <Phone size={20} />
            <span>Помочь</span>
          </button>
        </div>
      </div>
    );
  }

  if (screen === "result" && lastResult) {
    const { correct, call: c, playerChoice } = lastResult;
    return (
      <div className="min-h-screen bg-cyber-dark flex flex-col">
        <div className="bg-cyber-card border-b border-cyber-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-cyber-green w-5 h-5" />
            <span className="text-white font-bold text-sm">Cyber<span className="text-cyber-green">Sim</span></span>
            <span className="text-gray-600 text-xs mx-1">|</span>
            <span className="text-gray-400 text-sm">Результат звонка {current + 1}</span>
          </div>
          <div className="text-gray-400 text-sm">✅ {score} / {total}</div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {/* Verdict */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-2xl p-5 text-center border ${
              correct
                ? "bg-green-900/30 border-green-600"
                : "bg-red-900/30 border-red-600"
            }`}
          >
            <div className="text-5xl mb-2">{correct ? "✅" : "❌"}</div>
            <div className={`text-xl font-bold ${correct ? "text-green-400" : "text-red-400"}`}>
              {correct ? "Правильное решение!" : "Ошибка!"}
            </div>
            <div className="text-gray-300 text-sm mt-1">
              {c.isScammer
                ? playerChoice === "block"
                  ? "Ты распознал мошенника и заблокировал звонок"
                  : "Ты помог мошеннику — клиент под угрозой!"
                : playerChoice === "help"
                ? "Ты правильно помог настоящему клиенту"
                : "Ты заблокировал настоящего клиента — он остался без помощи!"}
            </div>
          </motion.div>

          {/* Caller */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 flex items-center gap-3">
            <span className="text-3xl">{c.callerAvatar}</span>
            <div>
              <div className="text-white font-bold">{c.callerName}</div>
              <div className="text-xs font-mono text-gray-400">{c.callerPhone}</div>
              <div className={`text-xs mt-0.5 font-bold ${c.isScammer ? "text-red-400" : "text-green-400"}`}>
                {c.isScammer ? "🎭 МОШЕННИК" : "✅ НАСТОЯЩИЙ КЛИЕНТ"}
              </div>
            </div>
          </div>

          {/* Red flags (scammer only) */}
          {c.isScammer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/20 border border-red-700/40 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-red-400" size={16} />
                <span className="text-red-300 font-bold text-sm">Красные флаги</span>
              </div>
              <ul className="space-y-2">
                {c.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-red-400 shrink-0 mt-0.5">•</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Explanation */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-cyber-green" size={16} />
              <span className="text-white font-bold text-sm">Разбор</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{c.explanation}</p>
          </div>
        </div>

        <div className="p-4 border-t border-cyber-border">
          <button
            onClick={nextCall}
            className="w-full bg-cyber-green text-black font-bold py-4 rounded-2xl hover:bg-green-400 transition-colors"
          >
            {current + 1 >= queue.length ? "Итоги →" : "Следующий звонок →"}
          </button>
        </div>
      </div>
    );
  }

  if (screen === "final") {
    const pct = Math.round((score / total) * 100);
    const grade =
      pct >= 90 ? { label: "Эксперт безопасности", emoji: "🏆", color: "text-yellow-400" }
      : pct >= 70 ? { label: "Хороший оператор", emoji: "🥈", color: "text-blue-400" }
      : pct >= 50 ? { label: "Нужна практика", emoji: "🥉", color: "text-orange-400" }
      : { label: "Мошенники победили", emoji: "💀", color: "text-red-400" };

    return (
      <div className="min-h-screen bg-cyber-dark flex flex-col">
        <header className="border-b border-cyber-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-cyber-green w-6 h-6" />
            <span className="text-white font-bold">Cyber<span className="text-cyber-green">Sim</span></span>
            <span className="text-gray-600 mx-1">|</span>
            <span className="text-green-400 font-semibold text-sm">📊 Итоги дежурства</span>
          </div>
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
            <ChevronLeft size={16} /> Дашборд
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-6"
          >
            <div className="text-6xl mb-3">{grade.emoji}</div>
            <div className={`text-2xl font-bold ${grade.color}`}>{grade.label}</div>
            <div className="text-white text-4xl font-bold mt-2">{score}/{total}</div>
            <div className="text-gray-400 text-sm">правильных решений</div>
          </motion.div>

          {/* Progress bar */}
          <div className="bg-cyber-card border border-cyber-border rounded-xl p-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Точность</span>
              <span className="font-bold text-white">{pct}%</span>
            </div>
            <div className="h-3 bg-cyber-dark rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${pct >= 70 ? "bg-cyber-green" : pct >= 50 ? "bg-yellow-400" : "bg-red-500"}`}
              />
            </div>
          </div>

          {/* Round-by-round */}
          <div className="space-y-2">
            <p className="text-gray-400 text-xs uppercase tracking-wide font-bold">Все звонки</p>
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-xl p-3 border ${r.correct ? "bg-green-900/15 border-green-800/40" : "bg-red-900/15 border-red-800/40"}`}>
                <span className="text-xl">{r.call.callerAvatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.call.callerName}</p>
                  <p className="text-gray-400 text-xs truncate">{r.call.request}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.correct
                    ? <CheckCircle size={18} className="text-green-400" />
                    : <XCircle size={18} className="text-red-400" />}
                  <span className={`text-xs font-bold ${r.call.isScammer ? "text-red-400" : "text-green-400"}`}>
                    {r.call.isScammer ? "МОШЕННИК" : "КЛИЕНТ"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-cyber-border grid grid-cols-2 gap-3">
          <button
            onClick={() => startGame()}
            className="bg-cyber-card border border-cyber-border text-white font-bold py-3 rounded-xl hover:border-cyber-green transition-colors"
          >
            Ещё раз
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-cyber-green text-black font-bold py-3 rounded-xl hover:bg-green-400 transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return null;
}
