"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { API_URL } from "@/lib/api";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type AppName = "email" | "vk" | "telegram" | "browser" | "sms";
type OpenApp = "email" | "vk" | "telegram" | "browser" | "guide" | null;
type GameState = "intro" | "playing" | "ended";

interface AppEvent {
  id: number;
  app: AppName;
  sender: string;
  subject: string;
  preview: string;
  isPhishing: boolean;
  baitLabel: string;
  safeLabel: string;
  explanation: string;
}

interface FeedbackEntry {
  id: number;
  msg: string;
  isCorrect: boolean;
}

// ─────────────────────────────────────────────
// All 20 events
// ─────────────────────────────────────────────

const ALL_EVENTS: AppEvent[] = [
  // --- PHISHING (12) ---
  {
    id: 1,
    app: "email",
    sender: "prize@lucky-win2024.ru",
    subject: "🎉 Вы выиграли iPhone 15 Pro!",
    preview: "Поздравляем! Вы были выбраны победителем. Нажмите, чтобы получить приз.",
    isPhishing: true,
    baitLabel: "Получить приз →",
    safeLabel: "Удалить",
    explanation: "Это фишинг! Настоящие компании не раздают iPhone по электронной почте случайным людям.",
  },
  {
    id: 2,
    app: "browser",
    sender: "antivirus-alert.xyz",
    subject: "⚠️ Обнаружен вирус на вашем компьютере!",
    preview: "Ваш ПК заражён! Немедленно установите защиту. Осталось 60 секунд.",
    isPhishing: true,
    baitLabel: "Установить защиту →",
    safeLabel: "Закрыть",
    explanation: "Это скэйрвер! Браузер не может обнаруживать вирусы на вашем ПК. Это ловушка.",
  },
  {
    id: 3,
    app: "telegram",
    sender: "Pavel Durov [Official]",
    subject: "Бесплатный Telegram Premium для вас!",
    preview: "Специальное предложение от основателя Telegram. Активируйте Premium прямо сейчас.",
    isPhishing: true,
    baitLabel: "Активировать Premium →",
    safeLabel: "Игнорировать",
    explanation: "Это мошенничество! Павел Дуров не пишет лично пользователям с такими предложениями.",
  },
  {
    id: 4,
    app: "vk",
    sender: "Служба безопасности VK",
    subject: "Подозрительная активность на вашем аккаунте",
    preview: "Ваш аккаунт будет заблокирован. Подтвердите данные в течение 24 часов.",
    isPhishing: true,
    baitLabel: "Подтвердить аккаунт →",
    safeLabel: "Закрыть",
    explanation: "Это фишинг! Служба безопасности VK не присылает такие сообщения через личку.",
  },
  {
    id: 5,
    app: "email",
    sender: "hr@noreply-company.ru",
    subject: "Вложение: Договор.exe",
    preview: "Здравствуйте, прилагаем договор для подписи. Откройте файл для ознакомления.",
    isPhishing: true,
    baitLabel: "Открыть Договор.exe",
    safeLabel: "Удалить",
    explanation: "Это вредоносный файл! Настоящие договоры никогда не бывают в формате .exe.",
  },
  {
    id: 6,
    app: "browser",
    sender: "casino-winners.club",
    subject: "Разрешить уведомления от casino-winners.club?",
    preview: "Сайт хочет отправлять вам уведомления о выигрышах и акциях.",
    isPhishing: true,
    baitLabel: "Разрешить уведомления",
    safeLabel: "Заблокировать",
    explanation: "Никогда не разрешайте уведомления сомнительным сайтам — они засыплют вас спамом и фишингом!",
  },
  {
    id: 7,
    app: "telegram",
    sender: "LotteryBot_Official",
    subject: "🏆 Вы выиграли 50 000 рублей!",
    preview: "Ваш номер выиграл в лотерее! Для получения приза введите данные карты.",
    isPhishing: true,
    baitLabel: "Получить выигрыш →",
    safeLabel: "Заблокировать бота",
    explanation: "Это смишинг через Telegram! Боты-мошенники имитируют лотереи для кражи данных карт.",
  },
  {
    id: 8,
    app: "email",
    sender: "security@sberbank-secure.ru",
    subject: "Срочно: обновите данные для продолжения обслуживания",
    preview: "Уважаемый клиент, ваш аккаунт будет заморожен. Обновите данные карты.",
    isPhishing: true,
    baitLabel: "Обновить данные →",
    safeLabel: "Удалить",
    explanation: "Фишинг! Домен sberbank-secure.ru — подделка. Настоящий домен Сбера — sberbank.ru.",
  },
  {
    id: 9,
    app: "vk",
    sender: "Техническая поддержка VK",
    subject: "Верификация аккаунта",
    preview: "Ваш аккаунт помечен как ненастоящий. Пройдите верификацию, иначе аккаунт будет удалён.",
    isPhishing: true,
    baitLabel: "Пройти верификацию →",
    safeLabel: "Закрыть",
    explanation: "Мошенники создают фейковые аккаунты поддержки. Настоящая поддержка VK никогда не пишет в ЛС.",
  },
  {
    id: 10,
    app: "sms",
    sender: "+7 (999) 123-45-67",
    subject: "Банк: подозрительная операция",
    preview: "Операция на 15 000 руб заблокирована. Это вы? Позвоните: 8-800-555-35-35",
    isPhishing: true,
    baitLabel: "Позвонить по номеру",
    safeLabel: "Игнорировать",
    explanation: "Вишинг! Банк никогда не просит перезвонить по номеру из SMS. Звоните только на официальный номер с карты.",
  },
  {
    id: 11,
    app: "browser",
    sender: "update-flash.com",
    subject: "Adobe Flash устарел! Требуется обновление",
    preview: "Ваш Flash Player устарел и уязвим. Скачайте последнюю версию прямо сейчас.",
    isPhishing: true,
    baitLabel: "Обновить Flash →",
    safeLabel: "Закрыть",
    explanation: "Adobe Flash отключён с 2020 года. Любое предложение обновить Flash — это вредоносное ПО!",
  },
  {
    id: 12,
    app: "email",
    sender: "resume@job-portal.ru",
    subject: "Ваше резюме просмотрено (PDF)",
    preview: "Работодатель открыл ваше резюме. Прилагаем отзыв во вложении.",
    isPhishing: true,
    baitLabel: "📄 Открыть резюме.pdf.exe",
    safeLabel: "Удалить",
    explanation: "Это вредоносный файл! Расширение .pdf.exe — классический трюк. Настоящий PDF так не выглядит.",
  },
  {
    id: 21,
    app: "browser",
    sender: "accounts.g00gle.com",
    subject: "Google запрашивает разрешение",
    preview: "Приложение 'Corp Drive Sync' хочет получить доступ к вашей почте и файлам. Разрешить?",
    isPhishing: true,
    baitLabel: "Разрешить доступ →",
    safeLabel: "Отклонить",
    explanation: "OAuth-фишинг! Домен g00gle.com (с нулями) — подделка. Настоящий Google использует accounts.google.com. Всегда проверяйте URL в адресной строке при OAuth-авторизации.",
  },
  {
    id: 22,
    app: "browser",
    sender: "secure-api-portal.ru",
    subject: "🔑 Введите ваш API-ключ для подключения",
    preview: "Для интеграции с сервисом введите ваш персональный API-ключ. Это безопасно.",
    isPhishing: true,
    baitLabel: "Ввести API-ключ →",
    safeLabel: "Закрыть",
    explanation: "Это фишинг API-ключа! Легитимные сервисы никогда не просят вас вводить ключи на сторонних сайтах. Скомпрометированный API-ключ даёт злоумышленнику полный доступ к вашему аккаунту.",
  },
  // --- SAFE (8) ---
  {
    id: 13,
    app: "email",
    sender: "alexey.petrov@gmail.com",
    subject: "Привет! Фото с выходных",
    preview: "Привет! Посылаю фото с нашего похода. Было круто, правда?",
    isPhishing: false,
    baitLabel: "",
    safeLabel: "Открыть",
    explanation: "Это безопасное письмо от реального друга. Всегда проверяйте адрес отправителя — здесь он выглядит настоящим.",
  },
  {
    id: 14,
    app: "vk",
    sender: "Дмитрий Козлов",
    subject: "Новое сообщение",
    preview: "Дим, ты идёшь в пятницу на встречу? Все уже подтвердили.",
    isPhishing: false,
    baitLabel: "",
    safeLabel: "Открыть",
    explanation: "Обычное сообщение от друга ВКонтакте. Ничего подозрительного — знакомый отправитель, обычный текст.",
  },
  {
    id: 15,
    app: "telegram",
    sender: "Канал: Технологии",
    subject: "Новый пост: Обзор iPhone 16",
    preview: "Опубликован полный обзор нового iPhone 16. Читайте на нашем канале.",
    isPhishing: false,
    baitLabel: "",
    safeLabel: "Открыть",
    explanation: "Обычное уведомление от подписанного канала. Такие уведомления безопасны.",
  },
  {
    id: 16,
    app: "email",
    sender: "noreply@ozon.ru",
    subject: "Ваш заказ №1234567 оплачен",
    preview: "Спасибо за покупку! Заказ принят в обработку. Сумма: 2 490 руб.",
    isPhishing: false,
    baitLabel: "",
    safeLabel: "Открыть",
    explanation: "Это настоящий чек от OZON. Домен ozon.ru официальный. Чеки об оплате обычно безопасны.",
  },
  {
    id: 17,
    app: "browser",
    sender: "Windows Update",
    subject: "Доступно обновление Windows 11",
    preview: "Накопительное обновление KB5031354 готово к установке. Рекомендуется установить.",
    isPhishing: false,
    baitLabel: "",
    safeLabel: "Открыть",
    explanation: "Настоящее уведомление Windows Update. Обновления системы важны для безопасности!",
  },
  {
    id: 18,
    app: "email",
    sender: "boss@yourcompany.ru",
    subject: "Вопрос по проекту",
    preview: "Добрый день! Не забудь отправить отчёт до пятницы. Жду.",
    isPhishing: false,
    baitLabel: "",
    safeLabel: "Открыть",
    explanation: "Обычное рабочее письмо от руководителя. Домен корпоративный, содержание нормальное.",
  },
  {
    id: 19,
    app: "browser",
    sender: "Google Chrome",
    subject: "Сохранить пароль для accounts.google.com?",
    preview: "Встроенный менеджер паролей Chrome предлагает сохранить ваш пароль.",
    isPhishing: false,
    baitLabel: "",
    safeLabel: "Сохранить",
    explanation: "Встроенный менеджер паролей Chrome — безопасный инструмент. Это не фишинг.",
  },
  {
    id: 20,
    app: "vk",
    sender: "ВКонтакте",
    subject: "🎂 Сегодня день рождения у Марии Сидоровой!",
    preview: "Не забудьте поздравить вашего друга с днём рождения!",
    isPhishing: false,
    baitLabel: "",
    safeLabel: "Открыть",
    explanation: "Стандартное уведомление ВКонтакте о дне рождения друга. Абсолютно безопасно.",
  },
];

// ─────────────────────────────────────────────
// Reference guide data
// ─────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    icon: "🎣",
    title: "Фишинг — мошеннические письма",
    points: [
      "Проверяйте домен отправителя: sberbank-secure.ru ≠ sberbank.ru",
      "Срочность и угрозы — главный признак обмана",
      "Никогда не переходите по ссылкам из писем — вводите адрес вручную",
      "Настоящие банки не просят данные карты по email",
    ],
  },
  {
    icon: "📞",
    title: "Вишинг — телефонные мошенники",
    points: [
      "Банк никогда не просит назвать CVV или код из SMS",
      "Положите трубку и перезвоните по номеру на карте",
      "Не доверяйте номерам из SMS — они могут быть поддельными",
      "«Ваш счёт заблокирован» — типичный сценарий вишинга",
    ],
  },
  {
    icon: "💬",
    title: "Смишинг — мошенничество через SMS",
    points: [
      "SMS с ссылками от незнакомых номеров — не переходите",
      "Выигрыш в лотерее, которую вы не покупали — фейк",
      "Бот в Telegram, предлагающий деньги — мошенник",
      "Проверяйте официальные приложения, а не ссылки из SMS",
    ],
  },
  {
    icon: "🏧",
    title: "Скимминг — банкоматы",
    points: [
      "Осматривайте картоприёмник: накладка — признак скиммера",
      "Прикрывайте клавиатуру рукой при вводе PIN",
      "Используйте банкоматы в охраняемых местах",
      "Подключите SMS-уведомления о транзакциях",
    ],
  },
  {
    icon: "🔐",
    title: "Пароли — правила создания",
    points: [
      "Минимум 12 символов: буквы, цифры, символы",
      "Уникальный пароль для каждого сервиса",
      "Используйте менеджер паролей (Bitwarden, KeePass)",
      "Включите двухфакторную аутентификацию везде, где возможно",
    ],
  },
  {
    icon: "📶",
    title: "Wi-Fi — публичные сети",
    points: [
      "Не используйте публичный Wi-Fi для банковских операций",
      "VPN защищает трафик в публичных сетях",
      "Отключите автоподключение к Wi-Fi сетям",
      "Фейковые точки доступа могут иметь названия как «Airport_Free»",
    ],
  },
  {
    icon: "🦠",
    title: "Вредоносное ПО — типы угроз",
    points: [
      "Вирус-шифровальщик (ransomware) блокирует файлы, требуя выкуп",
      "Трояны маскируются под легальные программы",
      "Никогда не запускайте .exe файлы из писем",
      "Регулярно обновляйте антивирус и систему",
    ],
  },
  {
    icon: "🛡️",
    title: "Защита — базовые правила",
    points: [
      "Обновляйте ОС и приложения вовремя — это закрывает уязвимости",
      "Делайте резервные копии важных данных",
      "Будьте скептичны: если предложение слишком хорошо — это ловушка",
      "Сообщайте о фишинге: report@cert.ru",
    ],
  },
  {
    icon: "✉️",
    title: "SPF, DKIM, DMARC — защита почты",
    points: [
      "SPF — список серверов, которым разрешено отправлять письма от домена",
      "DKIM — цифровая подпись письма, подтверждающая, что оно не изменено",
      "DMARC — политика, объединяющая SPF и DKIM: что делать с нарушителями",
      "Если письмо не прошло DKIM/SPF — оно могло быть подделано или изменено",
      "Злоумышленники подделывают «От кого» (From), но SPF/DKIM это выявляет",
    ],
  },
  {
    icon: "🔑",
    title: "API-безопасность — ключи и токены",
    points: [
      "Никогда не храните API-ключи в коде — используйте переменные окружения (.env)",
      "Токены OAuth/JWT передавайте только в заголовке Authorization, не в URL",
      "Принцип наименьших привилегий: запрашивайте только нужные разрешения",
      "Отзывайте скомпрометированные ключи немедленно через панель управления сервиса",
      "SSL-сертификат ≠ безопасность: проверяйте не только замок, но и домен",
    ],
  },
];

// ─────────────────────────────────────────────
// Helper: shuffle array
// ─────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────
// App icon map
// ─────────────────────────────────────────────

const APP_ICONS: Record<string, string> = {
  email: "📧",
  vk: "📱",
  telegram: "💬",
  browser: "🌐",
  sms: "📲",
};

const APP_LABELS: Record<string, string> = {
  email: "Почта",
  vk: "ВКонтакте",
  telegram: "Telegram",
  browser: "Браузер",
  sms: "SMS",
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface NotificationCardProps {
  event: AppEvent;
  onBait: (id: number) => void;
  onSafe: (id: number) => void;
}

function NotificationCard({ event, onBait, onSafe }: NotificationCardProps) {
  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="bg-gray-700 border border-gray-500 rounded-xl shadow-2xl p-3 w-72 mb-2"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{APP_ICONS[event.app]}</span>
        <span className="text-gray-300 text-xs font-semibold uppercase tracking-wide">
          {APP_LABELS[event.app]}
        </span>
      </div>
      <div className="text-gray-200 text-xs font-bold mb-0.5 truncate">
        {event.subject}
      </div>
      <div className="text-gray-400 text-xs mb-0.5 font-mono truncate">
        {event.sender}
      </div>
      <div className="text-gray-300 text-xs mb-2 line-clamp-2">
        {event.preview}
      </div>
      <div className="flex gap-2">
        {event.isPhishing ? (
          <>
            <button
              onClick={() => onBait(event.id)}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1.5 rounded-lg font-semibold transition-colors truncate"
            >
              {event.baitLabel}
            </button>
            <button
              onClick={() => onSafe(event.id)}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1.5 rounded-lg font-semibold transition-colors"
            >
              {event.safeLabel}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onSafe(event.id)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1.5 rounded-lg font-semibold transition-colors"
            >
              {event.safeLabel}
            </button>
            <button
              onClick={() => onBait(event.id)}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1.5 rounded-lg font-semibold transition-colors"
            >
              Закрыть
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// App window content
// ─────────────────────────────────────────────

function EmailAppContent() {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-700 p-2 border-b border-gray-600 text-sm font-bold text-gray-200">
        📧 Входящие (3 непрочитанных)
      </div>
      <div className="flex-1 overflow-y-auto">
        {[
          { from: "alexey.petrov@gmail.com", subj: "Фото с выходных", time: "10:32", unread: true },
          { from: "boss@yourcompany.ru", subj: "Вопрос по проекту", time: "09:15", unread: true },
          { from: "noreply@ozon.ru", subj: "Заказ №1234567 оплачен", time: "Вчера", unread: false },
          { from: "newsletter@habr.com", subj: "Дайджест недели", time: "Вчера", unread: false },
        ].map((m, i) => (
          <div
            key={i}
            className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-600 transition-colors ${m.unread ? "bg-gray-750" : ""}`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-xs ${m.unread ? "text-white font-bold" : "text-gray-400"} truncate max-w-[160px]`}>
                {m.from}
              </span>
              <span className="text-gray-500 text-xs ml-2 shrink-0">{m.time}</span>
            </div>
            <div className={`text-xs mt-0.5 ${m.unread ? "text-gray-200" : "text-gray-500"}`}>
              {m.subj}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared AI chat hook
// ─────────────────────────────────────────────

interface ChatMsg { role: "user" | "assistant"; content: string; }

function useAIChat(app: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, app, history: messages }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Произошла ошибка соединения..." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, app]);

  return { messages, input, setInput, loading, send };
}

// ─────────────────────────────────────────────
// Reusable chat UI
// ─────────────────────────────────────────────

interface ChatUIProps {
  botName: string;
  botAvatar: string;
  headerColor: string;
  bubbleColor: string;
  app: string;
  greeting: string;
}

function ChatUI({ botName, botAvatar, headerColor, bubbleColor, app, greeting }: ChatUIProps) {
  const { messages, input, setInput, loading, send } = useAIChat(app);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-full flex flex-col">
      <div className={`${headerColor} p-2 border-b border-opacity-50 border-white text-sm font-bold text-white flex items-center gap-2`}>
        <span>{botAvatar}</span>
        <div>
          <div>{botName}</div>
          <div className="text-xs font-normal opacity-70">⚠️ Подозрительный контакт — учебная симуляция</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-900">
        <div className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs shrink-0">{botAvatar}</div>
          <div className={`${bubbleColor} text-white text-xs rounded-xl px-3 py-2 max-w-[75%]`}>{greeting}</div>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs shrink-0">{botAvatar}</div>
            )}
            <div className={`text-xs rounded-xl px-3 py-2 max-w-[75%] ${m.role === "user" ? "bg-blue-600 text-white" : `${bubbleColor} text-white`}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs shrink-0">{botAvatar}</div>
            <div className={`${bubbleColor} text-white text-xs rounded-xl px-3 py-2`}>
              <span className="animate-pulse">●●●</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-gray-700 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Написать сообщение…"
          className="flex-1 bg-gray-700 text-white text-xs rounded-full px-3 py-1.5 outline-none placeholder-gray-500"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VK App
// ─────────────────────────────────────────────

function VKAppContent() {
  const [openChat, setOpenChat] = useState<string | null>(null);
  const contacts = [
    { name: "Дмитрий Козлов", msg: "Ты идёшь в пятницу?", time: "11:02", avatar: "ДК", ai: false },
    { name: "Мария Сидорова", msg: "Спасибо за поздравление! 🎂", time: "10:45", avatar: "МС", ai: false },
    { name: "🚨 VK Служба поддержки", msg: "Ваш аккаунт под угрозой! Нажмите...", time: "09:30", avatar: "⚡", ai: true },
  ];

  if (openChat) {
    return (
      <div className="h-full flex flex-col">
        <button onClick={() => setOpenChat(null)} className="bg-blue-900 text-blue-300 text-xs px-3 py-1.5 text-left hover:bg-blue-800 border-b border-blue-700">
          ← Назад
        </button>
        <div className="flex-1 min-h-0">
          <ChatUI
            botName="VK Служба поддержки"
            botAvatar="⚡"
            headerColor="bg-blue-900"
            bubbleColor="bg-blue-800"
            app="vk"
            greeting="Добрый день! Мы обнаружили подозрительную активность на вашем аккаунте ВКонтакте. Для его защиты нам нужно верифицировать вашу личность."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-blue-800 p-2 border-b border-blue-700 text-sm font-bold text-white">📱 ВКонтакте — Сообщения</div>
      <div className="flex-1 overflow-y-auto">
        {contacts.map((m, i) => (
          <div key={i} onClick={() => m.ai ? setOpenChat(m.name) : undefined}
            className={`p-3 border-b border-gray-700 flex gap-3 transition-colors ${m.ai ? "cursor-pointer hover:bg-red-900/30 bg-red-950/20" : "cursor-default"}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.ai ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}>
              {m.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="text-sm text-white font-semibold truncate">{m.name}</span>
                <span className="text-gray-500 text-xs ml-2 shrink-0">{m.time}</span>
              </div>
              <div className={`text-xs truncate ${m.ai ? "text-red-400" : "text-gray-400"}`}>{m.msg}</div>
            </div>
            {m.ai && <span className="text-red-500 text-xs self-center">💬</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Telegram App
// ─────────────────────────────────────────────

function TelegramAppContent() {
  const [openChat, setOpenChat] = useState<string | null>(null);
  const chats = [
    { name: "Канал: Технологии", msg: "Обзор iPhone 16 — читать →", time: "12:00", avatar: "📡", ai: false },
    { name: "Рабочий чат", msg: "Завтра митинг в 10:00", time: "11:30", avatar: "💼", ai: false },
    { name: "🚨 LotteryBot_Official", msg: "Вы выиграли 50 000 руб! Получить →", time: "10:15", avatar: "🎰", ai: true },
  ];

  if (openChat) {
    return (
      <div className="h-full flex flex-col">
        <button onClick={() => setOpenChat(null)} className="bg-sky-900 text-sky-300 text-xs px-3 py-1.5 text-left hover:bg-sky-800 border-b border-sky-700">
          ← Назад
        </button>
        <div className="flex-1 min-h-0">
          <ChatUI
            botName="LotteryBot_Official"
            botAvatar="🎰"
            headerColor="bg-sky-900"
            bubbleColor="bg-sky-800"
            app="telegram"
            greeting="🎉 Поздравляем! Ваш номер был выбран в ежемесячном розыгрыше! Для получения 50 000 рублей нам нужно подтвердить вашу личность."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-sky-800 p-2 border-b border-sky-700 text-sm font-bold text-white">💬 Telegram — Чаты</div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((m, i) => (
          <div key={i} onClick={() => m.ai ? setOpenChat(m.name) : undefined}
            className={`p-3 border-b border-gray-700 flex gap-3 transition-colors ${m.ai ? "cursor-pointer hover:bg-red-900/30 bg-red-950/20" : "cursor-default"}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${m.ai ? "bg-red-600" : "bg-sky-600"}`}>
              {m.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="text-sm text-white font-semibold truncate">{m.name}</span>
                <span className="text-gray-500 text-xs ml-2 shrink-0">{m.time}</span>
              </div>
              <div className={`text-xs truncate ${m.ai ? "text-red-400" : "text-gray-400"}`}>{m.msg}</div>
            </div>
            {m.ai && <span className="text-red-500 text-xs self-center">💬</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Browser — Search Game
// ─────────────────────────────────────────────

interface SearchResult {
  id: number;
  favicon: string;
  title: string;
  url: string;
  snippet: string;
  isPhishing: boolean;
  phishingReason: string;
}

function BrowserAppContent() {
  const [searchInput, setSearchInput] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [foundIds, setFoundIds] = useState<Set<number>>(new Set());
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [error, setError] = useState(false);

  const phishingTotal = results.filter((r) => r.isPhishing).length;
  const foundCount = results.filter((r) => r.isPhishing && foundIds.has(r.id)).length;

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setSearchInput(q);
    setSearched(true);
    setLoading(true);
    setError(false);
    setFoundIds(new Set());
    setShowCongrats(false);
    setWrongId(null);
    setResults([]);
    try {
      const res = await fetch(`${API_URL}/api/search-game?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setResults(data.results);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClick = useCallback((result: SearchResult) => {
    if (foundIds.has(result.id)) return;
    if (result.isPhishing) {
      const next = new Set(foundIds);
      next.add(result.id);
      setFoundIds(next);
      const allFound = results.filter((r) => r.isPhishing).every((r) => next.has(r.id));
      if (allFound) setTimeout(() => setShowCongrats(true), 400);
    } else {
      setWrongId(result.id);
      setTimeout(() => setWrongId(null), 700);
    }
  }, [foundIds, results]);

  const visible = results.filter((r) => !r.isPhishing || !foundIds.has(r.id));

  return (
    <div className="h-full flex flex-col relative">
      {/* Address bar */}
      <div className="bg-gray-700 p-2 border-b border-gray-600 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 bg-gray-600 rounded px-3 py-1 text-xs text-gray-300 font-mono truncate">
            {searched ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : "https://www.google.com"}
          </div>
        </div>
      </div>

      {!searched ? (
        /* Home page */
        <div className="flex-1 bg-white flex flex-col items-center justify-center gap-4 p-4">
          <div className="text-blue-600 text-4xl font-bold tracking-tight">Google</div>
          <div className="w-full max-w-xs flex items-center border border-gray-300 hover:border-gray-400 rounded-full px-4 py-2.5 gap-2 shadow-sm">
            <span className="text-gray-400 text-sm">🔍</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch(searchInput)}
              placeholder="Поиск в Google"
              className="flex-1 text-sm text-gray-700 outline-none bg-transparent"
              autoFocus
            />
          </div>
          <div className="flex gap-3 text-xs">
            <button onClick={() => doSearch(searchInput)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-xs transition-colors">Поиск Google</button>
            <button onClick={() => doSearch("госуслуги")} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded text-xs transition-colors">Мне повезёт!</button>
          </div>
          <p className="text-gray-400 text-xs mt-2 text-center max-w-xs">
            Попробуй: <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => doSearch("банк")}>банк</span>,{" "}
            <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => doSearch("работа")}>работа</span>,{" "}
            <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => doSearch("купить")}>купить</span>,{" "}
            <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => doSearch("вконтакте")}>вконтакте</span>,{" "}
            <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => doSearch("госуслуги")}>госуслуги</span>
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Search bar */}
          <div className="px-4 py-2 border-b border-gray-200 flex gap-2 flex-shrink-0">
            <div className="flex-1 flex items-center border border-gray-300 rounded-full px-3 py-1.5 gap-2">
              <span className="text-gray-400 text-sm">🔍</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch(searchInput)}
                className="flex-1 text-sm text-gray-700 outline-none"
              />
            </div>
            <button onClick={() => doSearch(searchInput)} className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors">Найти</button>
          </div>

          {/* Game hint */}
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0 flex items-center justify-between">
            <p className="text-amber-800 text-xs font-medium">
              🎯 Найди и нажми на <span className="font-bold">{phishingTotal}</span> фишинговых сайта
            </p>
            <span className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
              {foundCount}/{phishingTotal} найдено
            </span>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            <p className="text-xs text-gray-500 mb-3">Около {results.length} результатов (0,42 сек.)</p>
            <AnimatePresence>
              {visible.map((r) => {
                const isWrong = wrongId === r.id;
                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                    animate={isWrong ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                    onClick={() => handleClick(r)}
                    className={`cursor-pointer rounded-lg px-3 py-2.5 mb-1 transition-colors select-none ${
                      isWrong ? "bg-red-50 border border-red-200" : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm">{r.favicon}</span>
                      <span className="text-xs text-gray-500 truncate">{r.url}</span>
                    </div>
                    <div className="text-blue-700 text-sm font-medium hover:underline truncate leading-tight">{r.title}</div>
                    <div className="text-gray-600 text-xs leading-relaxed line-clamp-2 mt-0.5">{r.snippet}</div>
                    {isWrong && (
                      <p className="text-red-500 text-xs mt-1 font-medium">✗ Это настоящий сайт — не фишинг!</p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Congratulations overlay */}
      <AnimatePresence>
        {showCongrats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            >
              <div className="text-5xl mb-3">🏆</div>
              <h3 className="text-gray-900 font-bold text-lg mb-1">Все фишинговые сайты найдены!</h3>
              <p className="text-gray-500 text-sm mb-4">Ты распознал {phishingTotal} из {results.length} результатов как мошеннические</p>

              {/* Found phishing list */}
              <div className="text-left space-y-2 mb-5">
                {results.filter((r) => r.isPhishing).map((r) => (
                  <div key={r.id} className="bg-red-50 border border-red-100 rounded-lg p-2">
                    <p className="text-red-700 text-xs font-bold truncate">🎣 {r.url}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{r.phishingReason}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setSearched(false); setShowCongrats(false); setSearchInput(""); }}
                className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm"
              >
                Попробовать другой запрос
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GuideContent() {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h2 className="text-lg font-bold text-cyan-400 mb-4">📖 Памятка по кибербезопасности</h2>
      {GUIDE_SECTIONS.map((section, i) => (
        <div key={i} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{section.icon}</span>
            <h3 className="text-sm font-bold text-white">{section.title}</h3>
          </div>
          <ul className="space-y-1">
            {section.points.map((point, j) => (
              <li key={j} className="text-xs text-gray-300 flex gap-2">
                <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// App Window wrapper
// ─────────────────────────────────────────────

interface AppWindowProps {
  appName: OpenApp;
  onClose: () => void;
}

function AppWindow({ appName, onClose }: AppWindowProps) {
  const titleMap: Record<string, string> = {
    email: "📧 Почта",
    vk: "📱 ВКонтакте",
    telegram: "💬 Telegram",
    browser: "🌐 Браузер",
    guide: "📖 Памятка",
  };

  const renderContent = () => {
    if (appName === "email") return <EmailAppContent />;
    if (appName === "vk") return <VKAppContent />;
    if (appName === "telegram") return <TelegramAppContent />;
    if (appName === "browser") return <BrowserAppContent />;
    if (appName === "guide") return <GuideContent />;
    return null;
  };

  if (!appName) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="absolute inset-8 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl flex flex-col z-20 overflow-hidden"
      style={{ maxHeight: "calc(100% - 64px)" }}
    >
      <div className="bg-gray-750 border-b border-gray-600 px-3 py-2 flex items-center justify-between bg-gray-700">
        <span className="text-sm font-semibold text-gray-200">
          {appName ? titleMap[appName] : ""}
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs flex items-center justify-center transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function HomeGamePage() {
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState>("intro");
  const [hp, setHp] = useState<number>(5);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [activeEvents, setActiveEvents] = useState<AppEvent[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [openApp, setOpenApp] = useState<OpenApp>(null);
  const [handledCount, setHandledCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);

  const eventQueue = useRef<AppEvent[]>([]);
  const nextFeedbackId = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Clock display ──
  const [clockTime, setClockTime] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Game timer ──
  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          setGameState("ended");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // ── HP check ──
  useEffect(() => {
    if (hp <= 0 && gameState === "playing") {
      setGameState("ended");
    }
  }, [hp, gameState]);

  const showFeedback = useCallback((msg: string, isCorrect: boolean) => {
    const id = nextFeedbackId.current++;
    setFeedbacks((prev: FeedbackEntry[]) => [...prev, { id, msg, isCorrect }]);
    setTimeout(() => {
      setFeedbacks((prev: FeedbackEntry[]) => prev.filter((f) => f.id !== id));
    }, 2500);
  }, []);

  // ── Spawn logic ──
  const spawnNext = useCallback(() => {
    if (eventQueue.current.length === 0) return;
    setActiveEvents((prev: AppEvent[]) => {
      if (prev.length >= 3) return prev;
      const next = eventQueue.current.shift();
      if (!next) return prev;
      // auto-dismiss after 20s
      setTimeout(() => {
        setActiveEvents((p: AppEvent[]) => {
          const exists = p.find((e) => e.id === next.id);
          if (exists) {
            // missed — counts as wrong for phishing
            if (next.isPhishing) {
              setScore((s: number) => s - 25);
              showFeedback("⏱️ Время вышло! Угроза проигнорирована. -25 очков", false);
            }
            setHandledCount((c: number) => c + 1);
          }
          return p.filter((e) => e.id !== next.id);
        });
      }, 20000);
      return [...prev, next];
    });

    const delay = 10000 + Math.random() * 5000; // ~10–15 секунд
    spawnRef.current = setTimeout(spawnNext, delay);
  }, [showFeedback]);

  // ── Start game ──
  const startGame = useCallback((events?: AppEvent[]) => {
    const pool = events && events.length > 0 ? events : ALL_EVENTS;
    const shuffled = shuffleArray(pool);
    eventQueue.current = shuffled;
    setHp(5);
    setScore(0);
    setTimeLeft(300);
    setActiveEvents([]);
    setFeedbacks([]);
    setHandledCount(0);
    setCorrectCount(0);
    setOpenApp(null);
    setGameState("playing");

    const delay = 5000 + Math.random() * 5000;
    spawnRef.current = setTimeout(spawnNext, delay);
  }, [spawnNext]);

  const [aiLoading, setAiLoading] = useState(false);

  const startGameWithAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/generate-homegame-events`);
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        startGame(data.events as AppEvent[]);
      } else {
        startGame();
      }
    } catch {
      startGame();
    } finally {
      setAiLoading(false);
    }
  }, [startGame]);

  useEffect(() => {
    return () => {
      if (spawnRef.current) clearTimeout(spawnRef.current);
    };
  }, []);

  // ── Handle bait click ──
  const handleBait = useCallback((id: number) => {
    const ev = activeEvents.find((e) => e.id === id);
    if (!ev) return;
    setActiveEvents((prev: AppEvent[]) => prev.filter((e) => e.id !== id));
    setHandledCount((c: number) => c + 1);

    if (ev.isPhishing) {
      // clicked phishing bait — wrong
      setScore((s: number) => s - 50);
      setHp((h: number) => h - 1);
      showFeedback(`⚠️ Попался! ${ev.explanation} -50 очков`, false);
    } else {
      // opened safe item — correct
      setScore((s: number) => s + 20);
      setCorrectCount((c: number) => c + 1);
      showFeedback(`✅ Верно! ${ev.explanation} +20 очков`, true);
    }
  }, [activeEvents]);

  // ── Handle safe action ──
  const handleSafe = useCallback((id: number) => {
    const ev = activeEvents.find((e) => e.id === id);
    if (!ev) return;
    setActiveEvents((prev: AppEvent[]) => prev.filter((e) => e.id !== id));
    setHandledCount((c: number) => c + 1);

    if (ev.isPhishing) {
      // correctly dismissed phishing
      setScore((s: number) => s + 100);
      setCorrectCount((c: number) => c + 1);
      showFeedback(`✅ Молодец! Это фишинг! ${ev.explanation} +100 очков`, true);
    } else {
      // correctly handled safe item (open or close)
      setScore((s: number) => s + 20);
      setCorrectCount((c: number) => c + 1);
      showFeedback(`✅ Верно! ${ev.explanation} +20 очков`, true);
    }
  }, [activeEvents]);

  // ── Format time ──
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ── Grade calculation ──
  const getGrade = () => {
    if (handledCount === 0) return "D";
    const pct = correctCount / handledCount;
    if (pct >= 0.9) return "A";
    if (pct >= 0.7) return "B";
    if (pct >= 0.5) return "C";
    return "D";
  };

  const gradeColor: Record<string, string> = {
    A: "text-green-400",
    B: "text-blue-400",
    C: "text-yellow-400",
    D: "text-red-400",
  };

  const gradeLabel: Record<string, string> = {
    A: "Отлично! Ты настоящий эксперт по безопасности.",
    B: "Хорошо! Есть куда расти.",
    C: "Удовлетворительно. Изучи памятку.",
    D: "Плохо. Тебя легко обмануть!",
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0c1a3a 50%, #0f172a 100%)",
      }}
    >
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(56,189,248,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* CyberSim logo — top left */}
      <button
        onClick={() => router.push("/dashboard")}
        className="absolute top-3 left-4 z-50 flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        <span className="text-green-400 text-base">🛡️</span>
        <span className="text-white font-bold text-sm">Cyber<span className="text-green-400">Sim</span></span>
      </button>

      {/* ── INTRO SCREEN ── */}
      <AnimatePresence>
        {gameState === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="relative z-10 flex flex-col items-center gap-8 text-center px-4 max-w-lg"
          >
            <div className="text-6xl mb-2">🏠</div>
            <h1 className="text-3xl font-bold text-cyan-400">Домашний Компьютер</h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              Добро пожаловать домой. Твой компьютер — твоя крепость. Или нет?
            </p>
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 text-left space-y-2 w-full">
              <p className="text-cyan-300 font-semibold text-sm mb-2">📋 Как играть:</p>
              <p className="text-gray-300 text-sm">• Появляются уведомления — определи: фишинг или нет?</p>
              <p className="text-gray-300 text-sm">• Фишинг → нажми <span className="text-gray-400 font-mono">"Удалить/Закрыть"</span> (+100 очков)</p>
              <p className="text-gray-300 text-sm">• Безопасное → нажми <span className="text-blue-400 font-mono">"Открыть"</span> (+20 очков)</p>
              <p className="text-gray-300 text-sm">• Попался на уловку → -50 очков, -1 ❤️</p>
              <p className="text-gray-300 text-sm">• 5 жизней, 5 минут. Успей!</p>
              <p className="text-gray-300 text-sm">• 📖 Памятка всегда доступна на панели задач</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => startGame()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-cyan-900"
              >
                Начать рабочий день
              </button>
              <button
                onClick={startGameWithAI}
                disabled={aiLoading}
                className="bg-purple-700 hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-10 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <><span className="animate-spin">⏳</span> ИИ генерирует новые события...</>
                ) : (
                  <>🤖 Режим ИИ — уникальные события</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PLAYING SCREEN ── */}
      <AnimatePresence>
        {gameState === "playing" && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 w-full h-screen flex flex-col"
          >
            {/* Monitor frame */}
            <div className="flex-1 relative mx-auto my-4 w-full max-w-5xl">
              <div className="h-full border-4 border-gray-600 rounded-lg bg-gray-900 relative overflow-hidden shadow-2xl">
                {/* Desktop icons */}
                {!openApp && (
                  <div className="absolute top-6 left-6 flex flex-col gap-4 z-10">
                    {(
                      [
                        { id: "email", icon: "📧", label: "Почта" },
                        { id: "vk", icon: "📱", label: "ВКонтакте" },
                        { id: "telegram", icon: "💬", label: "Telegram" },
                        { id: "browser", icon: "🌐", label: "Браузер" },
                        { id: "guide", icon: "📖", label: "Памятка" },
                      ] as { id: string; icon: string; label: string }[]
                    ).map((app) => (
                      <button
                        key={app.id}
                        onClick={() => setOpenApp(app.id as OpenApp)}
                        className="flex flex-col items-center gap-1 w-16 group"
                      >
                        <div className="w-12 h-12 bg-gray-700/80 border border-gray-600 rounded-xl flex items-center justify-center text-2xl group-hover:bg-gray-600/90 group-hover:border-cyan-500 transition-all shadow-lg">
                          {app.icon}
                        </div>
                        <span className="text-gray-300 text-xs font-medium group-hover:text-white transition-colors drop-shadow text-center leading-tight">
                          {app.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* App windows */}
                <AnimatePresence>
                  {openApp && (
                    <AppWindow
                      key={openApp}
                      appName={openApp}
                      onClose={() => setOpenApp(null)}
                    />
                  )}
                </AnimatePresence>

                {/* Notifications panel */}
                <div className="absolute bottom-4 right-4 flex flex-col-reverse items-end z-30">
                  <AnimatePresence>
                    {activeEvents.map((ev) => (
                      <NotificationCard
                        key={ev.id}
                        event={ev}
                        onBait={handleBait}
                        onSafe={handleSafe}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {/* Feedback overlays */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40 pointer-events-none">
                  <AnimatePresence>
                    {feedbacks.map((fb) => (
                      <motion.div
                        key={fb.id}
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ duration: 0.25 }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-xl max-w-sm text-center ${
                          fb.isCorrect
                            ? "bg-green-800 border border-green-500 text-green-100"
                            : "bg-red-900 border border-red-500 text-red-100"
                        }`}
                      >
                        {fb.msg}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Taskbar */}
            <div className="bg-gray-800 border-t border-gray-600 px-4 py-2 flex items-center gap-3 shrink-0">
              {/* Start button */}
              <button className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded font-bold transition-colors">
                ⊞ Пуск
              </button>

              {/* Active app indicator */}
              {openApp && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-gray-600 border border-gray-500 text-white">
                  <span>{APP_ICONS[openApp as string]}</span>
                  <span className="hidden sm:inline">{APP_LABELS[openApp as string]}</span>
                </div>
              )}

              <div className="flex-1" />

              {/* HP shields */}
              <div className="flex gap-1 items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg transition-all ${i < hp ? "text-green-400" : "text-red-900 opacity-40"}`}
                  >
                    🛡️
                  </span>
                ))}
              </div>

              {/* Score */}
              <div className="text-green-400 font-mono text-sm font-bold min-w-[80px] text-right">
                {score >= 0 ? "+" : ""}{score}
              </div>

              {/* Timer */}
              <div
                className={`font-mono text-sm font-bold min-w-[50px] text-right ${
                  timeLeft <= 30 ? "text-red-400 animate-pulse" : "text-cyan-400"
                }`}
              >
                {formatTime(timeLeft)}
              </div>

              {/* Clock */}
              <div className="text-gray-400 text-xs font-mono min-w-[45px] text-right border-l border-gray-600 pl-3">
                {clockTime}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── END SCREEN ── */}
      <AnimatePresence>
        {gameState === "ended" && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center gap-6 text-center px-4 max-w-md w-full"
          >
            <div className="bg-gray-800 border border-gray-600 rounded-2xl p-8 shadow-2xl w-full">
              {hp <= 0 ? (
                <div className="text-5xl mb-3">💀</div>
              ) : (
                <div className="text-5xl mb-3">🏁</div>
              )}

              <h1 className="text-2xl font-bold text-white mb-1">
                {hp <= 0 ? "Провал!" : "Время вышло!"}
              </h1>

              <div className={`text-6xl font-black mb-2 ${gradeColor[getGrade()]}`}>
                {getGrade()}
              </div>
              <p className="text-gray-300 text-sm mb-6">{gradeLabel[getGrade()]}</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 rounded-xl p-3">
                  <div className="text-green-400 font-mono text-xl font-bold">{score}</div>
                  <div className="text-gray-400 text-xs mt-1">Очков</div>
                </div>
                <div className="bg-gray-700 rounded-xl p-3">
                  <div className="text-cyan-400 font-mono text-xl font-bold">
                    {correctCount}/{handledCount}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">Верных</div>
                </div>
                <div className="bg-gray-700 rounded-xl p-3">
                  <div className="text-orange-400 font-mono text-xl font-bold flex items-center justify-center gap-1">
                    {hp}
                    <span className="text-base">🛡️</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-1">Жизней</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => startGame()}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  🔄 Сыграть снова
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 rounded-xl transition-colors"
                >
                  ← Вернуться на главную
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
