"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronRight, ChevronLeft, CheckCircle, XCircle, AlertTriangle, Eye, RotateCcw } from "lucide-react";
import { API_URL } from "@/lib/api";

// ──────────────────────────────────────────────
// Case data
// ──────────────────────────────────────────────

interface CaseEvent {
  time: string;
  channel: string; // "email" | "call" | "sms" | "site" | "app"
  icon: string;
  from: string;
  content: string;
  redFlag?: string;
}

interface CaseQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface DetectiveCase {
  id: number;
  title: string;
  victim: string;
  outcome: string;
  events: CaseEvent[];
  questions: CaseQuestion[];
}

const CASES: DetectiveCase[] = [
  {
    id: 1,
    title: "Дело №1: Пропавшие сбережения",
    victim: "Елена Михайловна, 58 лет, пенсионер",
    outcome: "Жертва перевела 240 000 ₽ мошенникам за 4 часа",
    events: [
      {
        time: "09:14",
        channel: "call",
        icon: "📞",
        from: "Звонок: +7 (800) 550-24-XX «Сбербанк»",
        content: "«Здравствуйте! Вас беспокоит служба безопасности Сбербанка. На ваш счёт поступила подозрительная заявка на кредит на 500 000 рублей. Для её отмены необходимо подтвердить личность.»",
        redFlag: "Банки никогда не звонят с просьбой подтвердить личность по телефону",
      },
      {
        time: "09:22",
        channel: "sms",
        icon: "💬",
        from: "SMS от: SBERBANK",
        content: "«Для отмены мошеннической заявки назовите код из SMS оператору. Код: 847291»",
        redFlag: "Это SMS с кодом 2FA — оператор попросил его назвать вслух, чего делать нельзя",
      },
      {
        time: "09:31",
        channel: "call",
        icon: "📞",
        from: "Тот же звонок (продолжение)",
        content: "«Отлично! Для завершения защиты нам нужно временно перевести средства на «безопасный счёт». Это стандартная процедура — после проверки деньги вернутся автоматически.»",
        redFlag: "«Безопасный счёт» — классическая схема вывода денег. Банки так не делают",
      },
      {
        time: "10:47",
        channel: "app",
        icon: "📱",
        from: "Сбербанк Онлайн",
        content: "Жертва самостоятельно зашла в приложение и выполнила перевод 240 000 ₽ на счёт «для проверки», следуя инструкциям по телефону.",
        redFlag: "Перевод инициирован самой жертвой под давлением — ни один законный сотрудник банка не просит об этом",
      },
      {
        time: "13:05",
        channel: "call",
        icon: "📞",
        from: "Реальный Сбербанк: 900",
        content: "Жертва сама позвонила в банк и узнала: никаких заявок на кредит не было, предыдущий звонок — мошеннический.",
      },
    ],
    questions: [
      {
        question: "Какой тип атаки был использован?",
        options: [
          "Фишинг по email",
          "Вишинг (голосовое мошенничество)",
          "SQL-инъекция",
          "Атака через Wi-Fi",
        ],
        correct: 1,
        explanation: "Это вишинг — мошенничество через телефонный звонок. Злоумышленники представились сотрудниками банка и манипулировали жертвой голосом.",
      },
      {
        question: "Какая главная ошибка жертвы позволила атаке сработать?",
        options: [
          "Установила приложение из неизвестного источника",
          "Перешла по ссылке в письме",
          "Назвала код из SMS незнакомцу по телефону",
          "Использовала слабый пароль",
        ],
        correct: 2,
        explanation: "Код из SMS — это одноразовый пароль (2FA). Назвав его «оператору», жертва дала мошенникам доступ к своему аккаунту. Настоящий банк никогда не спрашивает этот код.",
      },
      {
        question: "Как правильно было поступить при первом звонке?",
        options: [
          "Дать код, раз звонят из банка",
          "Сразу положить трубку и позвонить на официальный номер банка",
          "Попросить прислать письмо на почту",
          "Написать в чат поддержки прямо во время звонка",
        ],
        correct: 1,
        explanation: "Нужно было положить трубку и самостоятельно набрать официальный номер банка (указан на карте и сайте). Перезванивать на входящий номер нельзя — мошенники могут его подделать.",
      },
    ],
  },
  {
    id: 2,
    title: "Дело №2: Взлом корпоративной почты",
    victim: "Алексей, 34 года, финансовый директор компании",
    outcome: "Компания лишилась 1 800 000 ₽ на счёте поставщика-двойника",
    events: [
      {
        time: "Пн, 11:03",
        channel: "email",
        icon: "📧",
        from: "От: supplier@romashka-opt.ru (реальный поставщик)",
        content: "«Добрый день! Напоминаем об оплате счёта №447 до пятницы. Сумма: 1 800 000 руб.»",
      },
      {
        time: "Пн, 14:22",
        channel: "email",
        icon: "📧",
        from: "От: supplier@romashka-0pt.ru (ноль вместо «о»)",
        content: "«Добрый день! Уточняем: наши банковские реквизиты изменились. Пожалуйста, используйте новые данные для перевода. Счёт прикреплён. С уважением, ООО Ромашка-Опт.»",
        redFlag: "Домен romashka-0pt.ru — «0» (ноль) вместо буквы «о». Письмо пришло с поддельного адреса",
      },
      {
        time: "Вт, 09:15",
        channel: "email",
        icon: "📧",
        from: "supplier@romashka-0pt.ru",
        content: "«Добрый день! Уточняем: оплата должна поступить до конца недели. Реквизиты в прикреплённом файле «Счёт_447_NEW.pdf»»",
        redFlag: "PDF-файл содержал реальный счёт с подменёнными реквизитами получателя",
      },
      {
        time: "Ср, 10:30",
        channel: "app",
        icon: "🏦",
        from: "Интернет-банк компании",
        content: "Финансовый директор провёл платёж 1 800 000 ₽ на реквизиты из «нового счёта», не сверив их с ранее известными реквизитами поставщика.",
        redFlag: "Не была проведена верификация: звонок поставщику для подтверждения новых реквизитов",
      },
      {
        time: "Чт, 16:00",
        channel: "call",
        icon: "📞",
        from: "Реальный поставщик ООО Ромашка-Опт",
        content: "«Алексей, добрый день! Хотели уточнить по оплате счёта №447 — вы подтвердили получение?» Обнаружена подмена реквизитов. Деньги уже ушли мошенникам.",
      },
    ],
    questions: [
      {
        question: "Как называется данный тип атаки?",
        options: [
          "Ransomware (вирус-шифровальщик)",
          "BEC (компрометация корпоративной почты) / Атака на смену реквизитов",
          "DDoS-атака",
          "Кейлоггер",
        ],
        correct: 1,
        explanation: "Это атака BEC (Business Email Compromise) — мошенники создали домен-двойник, имитирующий поставщика, и убедили перевести деньги на подставной счёт.",
      },
      {
        question: "Что нужно было проверить перед оплатой?",
        options: [
          "Наличие SSL-сертификата на сайте поставщика",
          "Позвонить поставщику по известному номеру и устно подтвердить смену реквизитов",
          "Проверить дату письма",
          "Удалить письмо как спам",
        ],
        correct: 1,
        explanation: "Любая смена банковских реквизитов должна подтверждаться звонком на заранее известный номер партнёра. Никогда не менять реквизиты только на основании email.",
      },
      {
        question: "Как мошенники замаскировали домен?",
        options: [
          "Использовали точно такой же домен",
          "Взломали почтовый ящик поставщика",
          "Заменили букву «о» на цифру «0» в домене",
          "Отправили письмо через мессенджер",
        ],
        correct: 2,
        explanation: "Визуально romashka-0pt.ru и romashka-opt.ru почти неразличимы. Это называется «тайпсквоттинг» — регистрация домена, похожего на оригинальный.",
      },
    ],
  },
  {
    id: 3,
    title: "Дело №3: Аккаунт украли прямо на глазах",
    victim: "Дарья, 22 года, студентка",
    outcome: "Мошенники захватили Telegram и разослали запросы денег всем контактам",
    events: [
      {
        time: "20:14",
        channel: "sms",
        icon: "💬",
        from: "SMS от: Telegram",
        content: "«Код входа: 52847. Не сообщайте его никому.»",
        redFlag: "Код пришёл без запроса самой жертвой — кто-то уже пытается войти в её аккаунт",
      },
      {
        time: "20:15",
        channel: "app",
        icon: "📱",
        from: "Telegram — личка от «подруги» Кати",
        content: "«Даш, привет! Помоги пожалуйста — участвую в конкурсе на лучшего блогера. Нужно проголосовать по ссылке, но там просит войти через Telegram. Не получается! Можешь войти за меня, просто пришли мне код который придёт?»",
        redFlag: "Аккаунт «подруги» уже был скомпрометирован. Мошенники использовали его для атаки на контакты",
      },
      {
        time: "20:16",
        channel: "app",
        icon: "📱",
        from: "Дарья → «Катя»",
        content: "«Окей, сейчас скину» — Дарья отправила код 52847 в чат, считая что помогает подруге.",
        redFlag: "Жертва добровольно передала код 2FA мошеннику",
      },
      {
        time: "20:17",
        channel: "app",
        icon: "🔴",
        from: "Telegram — системное уведомление",
        content: "«В ваш аккаунт выполнен вход с нового устройства (iPhone 13, Москва)». Дарья немедленно потеряла доступ — мошенники завершили все остальные сессии.",
      },
      {
        time: "20:18–21:30",
        channel: "app",
        icon: "📱",
        from: "Мошенник (в аккаунте Дарьи)",
        content: "Разосланы сообщения всем контактам Дарьи: «Привет! Срочно нужна помощь, можешь занять 5000 до завтра? Скину на карту сразу как смогу.»",
      },
    ],
    questions: [
      {
        question: "Как называется использованная схема захвата аккаунта?",
        options: [
          "Брутфорс (перебор паролей)",
          "Социальная инженерия через доверенный контакт (цепочка компрометации)",
          "SQL-инъекция в Telegram",
          "Фишинг по email",
        ],
        correct: 1,
        explanation: "Мошенники сначала взломали аккаунт подруги, затем использовали его доверие для получения кода 2FA. Такой «каскад» — один из самых эффективных методов социальной инженерии.",
      },
      {
        question: "Почему код из SMS нельзя передавать даже близким людям?",
        options: [
          "Это просто правило вежливости",
          "Код — это единственная защита аккаунта: передав его, вы отдаёте доступ к нему",
          "Код может содержать вирус",
          "Telegram запрещает это технически",
        ],
        correct: 1,
        explanation: "Код 2FA — это «ключ от двери». Не важно, кто просит его (даже близкий человек в мессенджере): если настоящий друг не может объяснить, зачем ему ваш код — это мошенник или взломанный аккаунт.",
      },
      {
        question: "Что стоило сделать сразу, получив код без запроса?",
        options: [
          "Переслать код другу, чтобы он проверил",
          "Игнорировать — само пройдёт",
          "Позвонить другу голосом, уточнить ситуацию, и ни в коем случае не передавать код",
          "Удалить SMS и переустановить Telegram",
        ],
        correct: 2,
        explanation: "Получение кода без запроса — сигнал тревоги. Нужно: позвонить голосом (не в чат!) другу и выяснить, что происходит. Если он ничего не просил — аккаунт взломан. Код не передавать.",
      },
    ],
  },
  {
    id: 4,
    title: "Дело №4: Публичный Wi-Fi — ловушка",
    victim: "Игорь, 29 лет, менеджер по продажам",
    outcome: "Перехвачен доступ к корпоративной CRM, утечка данных клиентов",
    events: [
      {
        time: "13:20",
        channel: "site",
        icon: "📶",
        from: "Wi-Fi: «CafeWifi_Free» (кафе «Уют»)",
        content: "Игорь подключился к открытой сети Wi-Fi в кафе. Рядом за другим столиком сидел злоумышленник с ноутбуком.",
        redFlag: "Открытая сеть без пароля — трафик не шифруется и может перехватываться",
      },
      {
        time: "13:25",
        channel: "site",
        icon: "🌐",
        from: "Браузер Chrome — CRM компании",
        content: "Игорь открыл корпоративную CRM по адресу http://crm.company.ru (без HTTPS). Ввёл логин и пароль.",
        redFlag: "HTTP без шифрования — логин и пароль передаются в открытом виде и могут быть перехвачены",
      },
      {
        time: "13:27",
        channel: "site",
        icon: "💻",
        from: "Устройство злоумышленника",
        content: "Злоумышленник с помощью сниффера Wireshark перехватил HTTP-трафик и получил логин и пароль Игоря в чистом виде.",
      },
      {
        time: "15:40",
        channel: "app",
        icon: "🔓",
        from: "CRM компании — журнал входов",
        content: "Зафиксирован вход под учётными данными Игоря с IP-адреса в другом городе. Выгружена база клиентов: 4 800 контактов.",
        redFlag: "Параллельный вход с другого устройства/IP — признак кражи учётных данных",
      },
    ],
    questions: [
      {
        question: "Какой метод атаки использовал злоумышленник?",
        options: [
          "Фишинговый email",
          "Перехват трафика (Man-in-the-Middle / сниффинг)",
          "Брутфорс пароля",
          "Вирус на компьютере жертвы",
        ],
        correct: 1,
        explanation: "Это атака MITM (Man-in-the-Middle) / перехват трафика. В открытой Wi-Fi сети злоумышленник «слушал» все HTTP-запросы и получил незашифрованные данные.",
      },
      {
        question: "Что стало главной уязвимостью в этой ситуации?",
        options: [
          "Слабый пароль от Wi-Fi",
          "Использование HTTP вместо HTTPS для корпоративной системы",
          "Устаревший браузер",
          "Отсутствие антивируса",
        ],
        correct: 1,
        explanation: "HTTPS шифрует трафик — даже если злоумышленник его перехватит, он увидит нечитаемый зашифрованный текст. HTTP передаёт всё открытым текстом.",
      },
      {
        question: "Как защититься при работе из публичного Wi-Fi?",
        options: [
          "Включить режим полёта на телефоне",
          "Использовать VPN и работать только с HTTPS-сайтами",
          "Выбрать Wi-Fi с паролем",
          "Не сохранять пароли в браузере",
        ],
        correct: 1,
        explanation: "VPN создаёт зашифрованный «туннель» для всего трафика. В сочетании с HTTPS это полностью защищает данные от перехвата, даже в открытых сетях.",
      },
    ],
  },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

type Screen = "intro" | "investigate" | "quiz" | "result" | "final";

interface QuizAnswer {
  question: number;
  selected: number;
  correct: boolean;
}

export default function DetectivePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("intro");
  const [caseIndex, setCaseIndex] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);
  const [showRedFlag, setShowRedFlag] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [allAnswers, setAllAnswers] = useState<QuizAnswer[]>([]);
  const [activeCases, setActiveCases] = useState<DetectiveCase[]>(CASES);
  const [aiLoading, setAiLoading] = useState(false);

  const currentCase = activeCases[caseIndex];
  const totalCases = activeCases.length;

  const handleStartInvestigation = () => {
    setScreen("investigate");
    setEventIndex(0);
    setShowRedFlag(false);
  };

  const startWithAI = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-detective-cases`);
      const data = await res.json();
      if (data.cases?.length > 0) setActiveCases(data.cases);
    } catch { /* fallback to static */ }
    finally {
      setAiLoading(false);
      setCaseIndex(0);
      setAllAnswers([]);
      setScreen("investigate");
      setEventIndex(0);
      setShowRedFlag(false);
    }
  };

  const handleNextEvent = () => {
    if (eventIndex < currentCase.events.length - 1) {
      setEventIndex((i: number) => i + 1);
      setShowRedFlag(false);
    } else {
      // Start quiz
      setQuizIndex(0);
      setSelectedAnswer(null);
      setAnswers([]);
      setScreen("quiz");
    }
  };

  const handleAnswerSelect = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;
    const q = currentCase.questions[quizIndex];
    const isCorrect = selectedAnswer === q.correct;
    const newAnswer = { question: quizIndex, selected: selectedAnswer, correct: isCorrect };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (quizIndex < currentCase.questions.length - 1) {
      setQuizIndex((i: number) => i + 1);
      setSelectedAnswer(null);
    } else {
      setAllAnswers((prev: QuizAnswer[]) => [...prev, ...newAnswers]);
      setScreen("result");
    }
  };

  const handleNextCase = () => {
    if (caseIndex < totalCases - 1) {
      setCaseIndex((i: number) => i + 1);
      setScreen("investigate");
      setEventIndex(0);
      setShowRedFlag(false);
      setAnswers([]);
    } else {
      setScreen("final");
    }
  };

  const handleRestart = () => {
    setCaseIndex(0);
    setScreen("intro");
    setEventIndex(0);
    setShowRedFlag(false);
    setQuizIndex(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setAllAnswers([]);
  };

  const caseScore = answers.filter(a => a.correct).length;
  const totalScore = allAnswers.filter(a => a.correct).length;
  const totalQuestions = CASES.reduce((sum, c) => sum + c.questions.length, 0);
  const finalPercent = totalQuestions > 0 ? Math.round(totalScore / totalQuestions * 100) : 0;

  const CHANNEL_COLORS: Record<string, string> = {
    email: "border-blue-500/40 bg-blue-950/30",
    call: "border-green-500/40 bg-green-950/30",
    sms: "border-yellow-500/40 bg-yellow-950/30",
    site: "border-purple-500/40 bg-purple-950/30",
    app: "border-cyan-500/40 bg-cyan-950/30",
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-white">
      {/* Header */}
      <header className="border-b border-cyber-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-cyber-green w-7 h-7" />
          <span className="text-white font-bold text-lg">Cyber<span className="text-cyber-green">Sim</span></span>
          <span className="text-gray-600 mx-2">|</span>
          <span className="text-yellow-400 font-semibold flex items-center gap-1">🔍 Режим Детектив</span>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Дашборд
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {screen === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <motion.div
                  animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 4, repeatDelay: 2 }}
                  className="text-7xl mb-4"
                >🔍</motion.div>
                <h1 className="text-3xl font-bold text-white mb-2">Режим Детектив</h1>
                <p className="text-gray-400">Расследуй реальные кибератаки. Изучи цепочку событий и найди ошибки жертвы.</p>
              </div>

              <div className="bg-cyber-card border border-cyber-border rounded-xl p-6 mb-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Eye size={18} className="text-yellow-400" /> Как это работает
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: "📁", text: `${totalCases} реальных дела — разные типы кибератак` },
                    { icon: "🕵️", text: "Изучи хронологию событий: письма, звонки, SMS, действия жертвы" },
                    { icon: "🚩", text: "Обнаруживай красные флаги — признаки атаки" },
                    { icon: "❓", text: "Ответь на 3 вопроса по каждому делу" },
                    { icon: "📊", text: "Получи оценку детектива по итогам всех дел" },
                  ].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartInvestigation}
                className="w-full bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-bold py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2"
              >
                🔍 Начать расследование
              </button>
              <button
                onClick={startWithAI}
                disabled={aiLoading}
                className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {aiLoading ? "⏳ Генерирую дела..." : "🤖 Режим ИИ — новые дела"}
              </button>
            </motion.div>
          )}

          {/* ── INVESTIGATE ── */}
          {screen === "investigate" && (
            <motion.div key={`investigate-${caseIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              {/* Case header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Дело {caseIndex + 1} из {totalCases}</span>
                  <span className="text-xs text-yellow-400">Изучение событий {eventIndex + 1}/{currentCase.events.length}</span>
                </div>
                <div className="h-1 bg-cyber-dark rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-yellow-500 rounded-full"
                    animate={{ width: `${((eventIndex + 1) / currentCase.events.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-4 mb-5">
                <h2 className="text-white font-bold text-lg">{currentCase.title}</h2>
                <p className="text-gray-400 text-sm mt-1">👤 {currentCase.victim}</p>
              </div>

              {/* Timeline */}
              <div className="relative mb-4">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-cyber-border" />
                <div className="space-y-3">
                  {currentCase.events.slice(0, eventIndex + 1).map((event: CaseEvent, i: number) => (
                    <motion.div
                      key={i}
                      initial={i === eventIndex ? { opacity: 0, y: 10 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative pl-14 ${i < eventIndex ? "opacity-60" : ""}`}
                    >
                      {/* Icon */}
                      <div className="absolute left-2 top-3 w-8 h-8 rounded-full bg-cyber-card border border-cyber-border flex items-center justify-center text-sm">
                        {event.icon}
                      </div>
                      <div className={`border rounded-xl p-4 ${CHANNEL_COLORS[event.channel] || "border-gray-700 bg-gray-900/30"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-gray-500">{event.time}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">{event.from}</p>
                        <p className="text-sm text-gray-200 leading-relaxed">"{event.content}"</p>

                        {/* Red flag reveal */}
                        {i === eventIndex && event.redFlag && (
                          <div className="mt-3">
                            {!showRedFlag ? (
                              <button
                                onClick={() => setShowRedFlag(true)}
                                className="text-xs text-red-400 border border-red-800/50 rounded-lg px-3 py-1.5 hover:bg-red-950/30 transition-colors flex items-center gap-1"
                              >
                                <AlertTriangle size={12} /> Показать красный флаг
                              </button>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="bg-red-950/40 border border-red-700/50 rounded-lg p-3 flex items-start gap-2"
                              >
                                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-300">{event.redFlag}</p>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNextEvent}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {eventIndex < currentCase.events.length - 1 ? (
                  <><ChevronRight size={18} /> Следующее событие</>
                ) : (
                  <><Eye size={18} /> Перейти к вопросам</>
                )}
              </button>
            </motion.div>
          )}

          {/* ── QUIZ ── */}
          {screen === "quiz" && (
            <motion.div key={`quiz-${caseIndex}-${quizIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Вопрос {quizIndex + 1} из {currentCase.questions.length}</span>
                  <span className="text-xs text-yellow-400">Дело {caseIndex + 1}</span>
                </div>
                <div className="h-1 bg-cyber-dark rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500 rounded-full"
                    animate={{ width: `${((quizIndex) / currentCase.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-yellow-400 text-xl">🔍</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Вопрос детектива</span>
                </div>
                <p className="text-white font-semibold text-lg leading-snug">
                  {currentCase.questions[quizIndex].question}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {currentCase.questions[quizIndex].options.map((opt: string, i: number) => {
                  const isSelected = selectedAnswer === i;
                  const isCorrect = i === currentCase.questions[quizIndex].correct;
                  const revealed = selectedAnswer !== null;

                  let cls = "border-cyber-border bg-cyber-card hover:border-yellow-500/60 cursor-pointer";
                  if (revealed && isCorrect) cls = "border-green-500 bg-green-950/30 cursor-default";
                  else if (revealed && isSelected && !isCorrect) cls = "border-red-500 bg-red-950/30 cursor-default";
                  else if (revealed) cls = "border-cyber-border bg-cyber-card opacity-50 cursor-default";

                  return (
                    <motion.button
                      key={i}
                      whileHover={!revealed ? { scale: 1.01 } : {}}
                      onClick={() => handleAnswerSelect(i)}
                      className={`w-full border-2 rounded-xl p-4 text-left transition-all flex items-center gap-3 ${cls}`}
                    >
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-sm font-bold ${
                        revealed && isCorrect ? "border-green-500 bg-green-500 text-black" :
                        revealed && isSelected && !isCorrect ? "border-red-500 bg-red-500 text-white" :
                        isSelected ? "border-yellow-400 bg-yellow-400/20 text-yellow-400" :
                        "border-gray-600 text-gray-500"
                      }`}>
                        {revealed && isCorrect ? <CheckCircle size={14} /> :
                         revealed && isSelected && !isCorrect ? <XCircle size={14} /> :
                         String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-sm text-gray-200">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>

              {selectedAnswer !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 mb-5 border ${
                    selectedAnswer === currentCase.questions[quizIndex].correct
                      ? "bg-green-950/30 border-green-700/50"
                      : "bg-red-950/30 border-red-700/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {selectedAnswer === currentCase.questions[quizIndex].correct
                      ? <CheckCircle size={16} className="text-green-400" />
                      : <XCircle size={16} className="text-red-400" />}
                    <span className={`text-sm font-bold ${selectedAnswer === currentCase.questions[quizIndex].correct ? "text-green-400" : "text-red-400"}`}>
                      {selectedAnswer === currentCase.questions[quizIndex].correct ? "Правильно!" : "Неверно"}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{currentCase.questions[quizIndex].explanation}</p>
                </motion.div>
              )}

              <button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null}
                className="w-full bg-cyber-green disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {quizIndex < currentCase.questions.length - 1 ? "Следующий вопрос" : "Завершить дело"} <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ── RESULT (after each case) ── */}
          {screen === "result" && (
            <motion.div key={`result-${caseIndex}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="text-6xl mb-3"
                >
                  {caseScore === currentCase.questions.length ? "🏆" : caseScore >= 2 ? "🔍" : "📋"}
                </motion.div>
                <h2 className="text-2xl font-bold text-white">Дело раскрыто!</h2>
                <p className="text-gray-400 mt-1">{currentCase.title}</p>
                <div className="mt-3">
                  <span className={`text-4xl font-bold ${caseScore === currentCase.questions.length ? "text-green-400" : caseScore >= 2 ? "text-yellow-400" : "text-red-400"}`}>
                    {caseScore}/{currentCase.questions.length}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">правильных ответов</span>
                </div>
              </div>

              {/* Итог дела */}
              <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-4 mb-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Что случилось с жертвой</p>
                <p className="text-red-300 text-sm font-medium">{currentCase.outcome}</p>
              </div>

              {/* Answer review */}
              <div className="space-y-3 mb-6">
                {answers.map((a, i) => (
                  <div key={i} className={`border rounded-xl p-3 flex items-start gap-3 ${a.correct ? "border-green-800/50 bg-green-950/20" : "border-red-800/50 bg-red-950/20"}`}>
                    {a.correct ? <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{currentCase.questions[i].question}</p>
                      {a.correct ? (
                        <p className="text-sm font-medium mt-0.5 text-green-300">
                          ✓ {currentCase.questions[i].options[a.selected]}
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-medium mt-0.5 text-red-400 line-through opacity-70">
                            ✗ {currentCase.questions[i].options[a.selected]}
                          </p>
                          <p className="text-sm font-medium text-green-300">
                            ✓ {currentCase.questions[i].options[currentCase.questions[i].correct]}
                          </p>
                        </>
                      )}
                      {!a.correct && (
                        <p className="text-xs text-gray-500 mt-1">{currentCase.questions[i].explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleNextCase}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {caseIndex < totalCases - 1 ? (
                  <><ChevronRight size={18} /> Следующее дело ({caseIndex + 2}/{totalCases})</>
                ) : (
                  <>🏁 Завершить расследование</>
                )}
              </button>
            </motion.div>
          )}

          {/* ── FINAL ── */}
          {screen === "final" && (
            <motion.div key="final" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 5, -5, 0] }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-7xl mb-4"
                >
                  {finalPercent >= 90 ? "🕵️" : finalPercent >= 70 ? "🔍" : finalPercent >= 50 ? "📋" : "🔰"}
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-1">Расследование завершено</h2>
                <p className="text-gray-400">Все {totalCases} дела изучены</p>
              </div>

              {/* Score */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-6 mb-6 text-center">
                <div className="text-5xl font-bold text-cyber-green mb-1">{finalPercent}%</div>
                <div className="text-gray-400 text-sm">{totalScore} из {totalQuestions} правильных ответов</div>
                <div className="mt-4">
                  <span className={`text-lg font-bold px-4 py-2 rounded-full ${
                    finalPercent >= 90 ? "bg-yellow-600/30 text-yellow-400" :
                    finalPercent >= 70 ? "bg-green-600/30 text-green-400" :
                    finalPercent >= 50 ? "bg-blue-600/30 text-blue-400" :
                    "bg-gray-700/30 text-gray-400"
                  }`}>
                    {finalPercent >= 90 ? "🕵️ Старший детектив" :
                     finalPercent >= 70 ? "🔍 Детектив" :
                     finalPercent >= 50 ? "📋 Стажёр" :
                     "🔰 Новобранец"}
                  </span>
                </div>
              </div>

              {/* Per-case breakdown */}
              <div className="space-y-2 mb-6">
                {activeCases.map((c: DetectiveCase, ci: number) => {
                  const cAnswers = allAnswers.slice(ci * 3, ci * 3 + 3);
                  const cCorrect = cAnswers.filter((a: { correct: boolean }) => a.correct).length;
                  return (
                    <div key={ci} className="bg-cyber-card border border-cyber-border rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{c.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{c.victim.split(",")[0]}</p>
                      </div>
                      <span className={`text-sm font-bold ${cCorrect === 3 ? "text-green-400" : cCorrect >= 2 ? "text-yellow-400" : "text-red-400"}`}>
                        {cCorrect}/3
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRestart}
                  className="flex-1 border border-cyber-border text-gray-300 hover:border-yellow-500 hover:text-yellow-400 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> Снова
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 bg-cyber-green hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-all"
                >
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
