"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronDown, ChevronUp, BookOpen, Shield,
  Mail, Phone, Wifi, Lock, AlertTriangle, CheckCircle,
  Eye, Globe, Key, Smartphone, CreditCard, Code,
} from "lucide-react";

// ─── Lecture data ────────────────────────────────────────────────────────────

const LECTURES = [
  {
    id: 1,
    title: "Фишинг, вишинг и социальная инженерия",
    description: "Как мошенники манипулируют людьми через письма, звонки и соцсети",
    icon: "🎣",
    readTime: "15 мин",
    color: "from-red-900/40 to-orange-900/30",
    border: "border-red-700/50",
    activeBorder: "border-red-500",
    accentColor: "text-red-400",
    bgAccent: "bg-red-900/20",
    sections: [
      {
        icon: <Mail size={18} />,
        title: "Что такое фишинг",
        content: `Фишинг — это атака, при которой злоумышленник притворяется доверенным источником (банком, коллегой, сервисом) чтобы заставить тебя раскрыть пароль, данные карты или перевести деньги.

Слово произошло от английского "fishing" — рыбалка. Мошенник "забрасывает удочку" и ждёт, пока жертва "клюнет".

Фишинг — причина №1 утечек данных в мире. Даже технически грамотные люди попадаются, если атака хорошо подготовлена.`,
        tips: [
          "Фишинг может прийти по email, SMS, в мессенджере, в соцсетях или по телефону",
          "Цель — получить твои данные или деньги, используя обман",
          "Каждый год фишинг обходится компаниям в миллиарды рублей",
        ],
        example: {
          label: "Пример из практики",
          text: `«ВЫ ВЫИГРАЛИ 1,000,000 РУБЛЕЙ!!! СРОЧНО!!!» — письмо с адреса prizy@vygrai-million.com в 3:47 ночи. Просят оплатить "комиссию" 5 000 руб. и прислать паспорт.`,
          verdict: "Это классический лохотрон. Вы не участвовали ни в какой лотерее. Удали письмо.",
          verdictOk: false,
        },
      },
      {
        icon: <Mail size={18} />,
        title: "Признаки фишингового письма",
        content: `Фишинговые письма стараются выглядеть как легитимные: копируют логотипы, используют корпоративный стиль. Но у них всегда есть уязвимые места, которые нужно научиться замечать.`,
        tips: [
          "Домен отправителя: c0mpany-help.ru (ноль вместо «o») — не тот же что company.ru",
          "Срочность и угрозы: «аккаунт заблокируют через 24 часа» — давление на панику",
          "Ссылка ведёт не туда: наведи мышь — адрес не совпадает с отображаемым текстом",
          "Запрос пароля/CVV/кода из SMS — легитимные сервисы так не делают",
          "SSL (замочек в браузере) не гарантирует легитимность — его получить легко",
          "Грамматические ошибки, странное время отправки (2:13 ночи)",
        ],
        example: {
          label: "Разбор реального случая",
          text: `Письмо от «IT Отдел <it-support@c0mpany-help.ru>» с темой «СРОЧНО: ваш аккаунт будет заблокирован». Ссылка ведёт на company-portal-verify.ru — не официальный домен.`,
          verdict: "Нужно проверить реальный адрес отправителя и сообщить в настоящий IT-отдел по внутреннему номеру.",
          verdictOk: true,
        },
      },
      {
        icon: <Smartphone size={18} />,
        title: "SMS-фишинг (смишинг)",
        content: `Смишинг — фишинг через SMS. Мошенники присылают сообщения якобы от банка, госорганов, службы доставки.

Главное отличие настоящего SMS от банка: оно приходит от именного отправителя (SBERBANK, TINKOFF, ALFABANK) — не от обычного мобильного номера типа +7 (999) 123-45-67.`,
        tips: [
          "Настоящий банк не присылает SMS с обычного мобильного номера",
          "Ссылки в SMS для «разблокировки карты» — всегда мошенничество",
          "Телефон, указанный в SMS, может быть поддельным — не звони на него",
          "При сомнениях — позвони по номеру на обратной стороне своей карты",
          "Банки не просят вводить данные карты по ссылке из SMS",
        ],
        example: {
          label: "Пример смишинга",
          text: `SMS от +7(999)123-45-67: «СРОЧНО!!! Ваша карта ЗАБЛОКИРОВАНА! Перейдите: http://bank-razblok-karta.ru» в 2:13 ночи.`,
          verdict: "Обычный номер + мошеннический домен + ночное время = смишинг. Игнорируй.",
          verdictOk: false,
        },
      },
      {
        icon: <Phone size={18} />,
        title: "Телефонный фишинг (вишинг)",
        content: `Вишинг (voice phishing) — мошенник звонит по телефону и представляется сотрудником банка, ФСБ, полиции, налоговой.

Опасность в том, что номер телефона можно подделать с помощью спуфинга — на экране у тебя покажется настоящий номер банка, хотя звонит мошенник.

Мошенники часто знают твоё имя, последние 4 цифры карты, историю операций — они купили эти данные из утечек баз данных.`,
        tips: [
          "Банк НИКОГДА не просит CVV-код и коды из SMS по телефону",
          "Знание твоих данных мошенником — не доказательство того, что это банк",
          "Номер телефона на экране можно подделать (спуфинг)",
          "Правильно: завершить звонок и перезвонить самому по номеру с официального сайта",
          "Код из SMS, который просят назвать — это OTP для перевода твоих денег мошеннику",
        ],
        example: {
          label: "Схема продвинутого вишинга",
          text: `Звонок с номера 8-800-100-30-00 (подделан): «Дмитрий из безопасности банка. По вашей карте *7823 операция 34 800 руб в Екатеринбурге. Назовите код из SMS для отмены.»`,
          verdict: "Код из SMS — это авторизация перевода. Назовёшь — деньги уйдут мошеннику. Завешай и перезвони банку сам.",
          verdictOk: false,
        },
      },
      {
        icon: <Eye size={18} />,
        title: "Социальная инженерия",
        content: `Социальная инженерия — манипуляция психологией человека. Злоумышленник не взламывает технические системы, а обманывает людей, эксплуатируя доверие, страх, срочность или авторитет.

Типичные приёмы:
— Имперсонация руководителя (BEC — Business Email Compromise)
— Создание срочности («нужно сделать прямо сейчас»)
— Изоляция («держи в конфиденциальности, никому не говори»)
— Авторитет («звоню из ФСБ / ЦБ РФ / службы безопасности»)`,
        tips: [
          "Любой срочный финансовый запрос через мессенджер — красный флаг",
          "Верифицируй запросы по отдельному каналу: позвони коллеге сам",
          "Реальный руководитель не попросит «держать в тайне» финансовую операцию",
          "Перевод на личную карту, а не через официальную бухгалтерию — подозрительно",
          "Давление и срочность — инструмент манипуляции, замедли реакцию",
        ],
        example: {
          label: "BEC-атака (взлом корпоративной почты)",
          text: `В мессенджере: «Привет, я сейчас на встрече, позвонить не могу. Срочно переведи 45 000 руб поставщику на карту 4276... — Директор Андрей Петров».`,
          verdict: "Позвони директору по известному тебе номеру и убедись лично. Никогда не переводи деньги без голосового подтверждения.",
          verdictOk: true,
        },
      },
      {
        icon: <Globe size={18} />,
        title: "Фишинг в социальных сетях",
        content: `Социальные сети — золотая жила для мошенников: там легко создать убедительный аккаунт, имитирующий официальные страницы.

Схемы:
— Розыгрыши призов («ты 1 000 000-й пользователь!»)
— Поддельные страницы банков и сервисов
— Блогеры-«благотворители» (просят реквизиты карты для «перевода денег»)
— Угрозы блокировки аккаунта от «поддержки» соцсети`,
        tips: [
          "Верификация (синяя галочка) — обязательный признак официального аккаунта",
          "ВКонтакте, Telegram, Сбербанк никогда не ведут на сторонние домены для призов",
          "Запрос CVV в личке = прямая кража с карты",
          "«Оплати доставку 150 руб за бесплатный приз» — сначала возьмут 150, потом попросят ещё",
          "Официальные уведомления от TikTok, Instagram — только внутри приложения",
        ],
        example: {
          label: "Telegram-канал псевдо-Сбербанка",
          text: `Канал «Сбербанк Официальный 🏦» без галочки верификации пишет: «Активируй 3000 бонусов на sberbank-loyalty-2024.ru — введи логин и пароль от Сбербанк Онлайн».`,
          verdict: "Нет галочки + сторонний домен = мошенники. Настоящий канал Сбербанка верифицирован и не ведёт на другие домены.",
          verdictOk: false,
        },
      },
    ],
  },
  {
    id: 2,
    title: "Безопасность в сети: Wi-Fi, пароли и API",
    description: "Технические угрозы — публичный Wi-Fi, брутфорс, скимминг и безопасность API",
    icon: "🔒",
    readTime: "15 мин",
    color: "from-blue-900/40 to-cyan-900/30",
    border: "border-blue-700/50",
    activeBorder: "border-blue-500",
    accentColor: "text-blue-400",
    bgAccent: "bg-blue-900/20",
    sections: [
      {
        icon: <Wifi size={18} />,
        title: "Публичный Wi-Fi — скрытые опасности",
        content: `Публичный Wi-Fi в кафе, торговых центрах и аэропортах удобен, но несёт серьёзные риски. Основные угрозы:

Evil Twin — злоумышленник создаёт точку доступа с таким же или похожим именем, как настоящая сеть кафе. Весь твой трафик идёт через его устройство.

Man-in-the-Middle (MitM) — перехват данных между тобой и сайтом. В незашифрованных сетях это делается без каких-либо сложных инструментов.`,
        tips: [
          "Всегда уточняй точное название Wi-Fi у персонала заведения",
          "Предпочитай мобильный интернет публичным сетям для важных дел",
          "Никогда не вводи пароли в открытых сетях без VPN",
          "Самый сильный сигнал — не значит лучшая сеть: атакующий может быть рядом",
          "Несколько сетей с похожими именами (CafeWifi_Free и CafeWifi_Free_2) — признак Evil Twin",
        ],
        example: {
          label: "Evil Twin атака",
          text: `В кафе три сети: CafeWifi_Free (3 деления), CafeWifi_Free_2 (5 делений — лучший сигнал), AndroidAP_4521 (4 деления). Все открытые без пароля.`,
          verdict: "Лучший сигнал у второй сети — возможно это Evil Twin. Спроси у бариста точное название. Лучше — используй мобильный интернет.",
          verdictOk: false,
        },
      },
      {
        icon: <Shield size={18} />,
        title: "HTTPS против HTTP — в чём разница",
        content: `HTTP — протокол передачи данных без шифрования. Всё что ты вводишь (логин, пароль) передаётся открытым текстом. Любой, кто находится в той же сети, может это перехватить.

HTTPS — то же самое, но с шифрованием (TLS/SSL). Данные зашифрованы и злоумышленник видит только "мусор".

Важно: замочек (SSL) в браузере не гарантирует, что сайт легитимный. Мошенники тоже могут получить бесплатный SSL-сертификат. Замочек означает только, что соединение зашифровано — не то, что сайт честный.`,
        tips: [
          "Никогда не вводи пароли на сайтах с HTTP (без S) — особенно в публичных сетях",
          "Замочек ≠ безопасный сайт. Проверяй именно домен, а не только замочек",
          "Корпоративные порталы и банки обязаны работать только через HTTPS",
          "Если сайт автоматически переключается с HTTPS на HTTP — уходи",
        ],
        example: {
          label: "HTTP в публичной сети",
          text: `Ты подключён к Wi-Fi в кафе. Открываешь http://mail.work-portal.ru/login — корпоративная почта работает по HTTP. Нужно срочно проверить письмо.`,
          verdict: "Не вводи пароль! По HTTP в публичной сети злоумышленник перехватит его за секунды. Используй VPN или мобильный интернет.",
          verdictOk: false,
        },
      },
      {
        icon: <Key size={18} />,
        title: "Пароли и двухфакторная аутентификация",
        content: `Брутфорс (Brute Force) — атака перебором паролей. Специальные программы пробуют тысячи паролей в секунду. Пароль "qwerty123" взламывается менее чем за минуту.

Правила сильного пароля:
— Минимум 12 символов
— Сочетание букв (верхний и нижний регистр), цифр, символов
— Не использовать слова из словаря, имена, даты рождения
— Разные пароли для разных сервисов

2FA (двухфакторная аутентификация) — второй уровень защиты. Даже если пароль украден, без второго фактора (код из SMS, приложение-аутентификатор) войти нельзя.`,
        tips: [
          "47 попыток за 10 минут с IP другой страны — это брутфорс атака",
          "Пароль qwerty123, 12345678, password — в топ-100 самых популярных",
          "Включи 2FA на всех важных аккаунтах: банк, почта, соцсети",
          "Приложение-аутентификатор (Google Authenticator) надёжнее SMS-кодов",
          "Используй менеджер паролей (Bitwarden, 1Password) для хранения",
        ],
        example: {
          label: "Реальная брутфорс атака",
          text: `Уведомление: «Зафиксировано 47 неудачных попыток входа за 10 минут с IP: 185.220.101.45 (Нидерланды). Текущий пароль: qwerty123».`,
          verdict: "Немедленно: смени пароль на случайный 14+ символов и включи 2FA. С 2FA брутфорс становится бессмысленным.",
          verdictOk: true,
        },
      },
      {
        icon: <CreditCard size={18} />,
        title: "Скимминг — поддельные сайты оплаты",
        content: `Онлайн-скимминг — поддельный сайт магазина, созданный чтобы украсть данные твоей карты при "оплате".

Злоумышленники создают сайты-двойники популярных магазинов (Ozon, Wildberries, AliExpress) с очень похожим дизайном. Ссылки на них распространяют через рекламу в соцсетях с огромными скидками.

Чем отличается от оригинала:
— Домен другой: ozon-sale-2024.ru вместо ozon.ru
— Часто появляются перед праздниками (Black Friday, 11.11)
— Слишком большие скидки (70-90%) как приманка`,
        tips: [
          "Всегда проверяй точный домен в адресной строке перед оплатой",
          "Заходи в магазины только через закладки или набирая адрес вручную",
          "Рекламные ссылки в соцсетях с огромными скидками — риск",
          "Используй виртуальную карту с лимитом для онлайн-покупок",
          "SSL-замочек есть у многих мошеннических сайтов — не полагайся на него",
        ],
        example: {
          label: "Скимминг-сайт под Ozon",
          text: `Реклама в соцсетях: «Ozon — чёрная пятница, скидки 80%!». Ссылка ведёт на https://ozon-sale-2024.ru/checkout. Страница оплаты выглядит как настоящий Ozon. Просит номер карты, срок и CVV.`,
          verdict: "Официальный Ozon — только ozon.ru. Домен ozon-sale-2024.ru принадлежит мошенникам. Закрой страницу.",
          verdictOk: false,
        },
      },
      {
        icon: <Code size={18} />,
        title: "Безопасность API и секретных ключей",
        content: `API-ключи, пароли от БД, секретные JWT-токены — это "ключи от королевства". Если они попадают в чужие руки, злоумышленник получает полный доступ к системе.

Главные ошибки разработчиков:
1. Хранение секретов в коде (Git-репозиторий) — боты сканируют GitHub 24/7
2. Передача токенов в URL — они попадают в историю браузера, логи серверов, Referer-заголовки
3. Отсутствие ротации скомпрометированных ключей

OAuth-фишинг — поддельная страница авторизации через Google/VK/Яндекс. Злоумышленник создаёт сайт с похожим доменом (g00gle.com) и параметром redirect_uri, указывающим на его сервер.`,
        tips: [
          "Секреты только в .env файлах (которые в .gitignore) или в хранилищах типа HashiCorp Vault",
          "Токены авторизации — только в HTTP-заголовке Authorization, никогда в URL",
          "Проверяй redirect_uri в OAuth: он должен указывать на домен легитимного приложения",
          "g00gle.com (с нулями) ≠ google.com. Читай домен по буквам",
          "Если ключ скомпрометирован — немедленно отзови и замени, история git хранит всё",
        ],
        example: {
          label: "OAuth-фишинг",
          text: `URL: https://accounts.g00gle.com/oauth/authorize?...&redirect_uri=https://attacker.ru/callback. Выглядит как страница Google авторизации. Есть SSL.`,
          verdict: "g00gle.com (нули!) ≠ google.com. redirect_uri ведёт на attacker.ru — токен уйдёт мошеннику. Закрой страницу.",
          verdictOk: false,
        },
      },
      {
        icon: <CheckCircle size={18} />,
        title: "Общие правила кибербезопасности",
        content: `Собери всё вместе — вот минимальный набор привычек, которые защитят тебя от большинства атак.`,
        tips: [
          "Проверяй домен отправителя и ссылки — по буквам, не беглым взглядом",
          "Никогда не называй по телефону CVV, коды из SMS — ни при каких обстоятельствах",
          "Включи 2FA на почту, банк, ключевые соцсети — это самое важное",
          "Используй разные пароли для разных сервисов + менеджер паролей",
          "В публичном Wi-Fi — только через VPN или мобильный интернет",
          "При сомнении — перезвони сам по официальному номеру, не по тому что прислали",
          "Срочность + давление = красный флаг. Замедлись и подумай",
          "Сообщай о подозрительных письмах в IT-отдел или службу безопасности",
        ],
        example: {
          label: "Чеклист перед любым действием",
          text: `Тебе прислали ссылку с просьбой срочно войти, перевести деньги или ввести данные карты. Что делать?`,
          verdict: "1. Проверь домен отправителя посимвольно. 2. Не переходи по ссылке — найди официальный сайт сам. 3. Верифицируй запрос по другому каналу связи. 4. Если всё равно сомневаешься — откажи.",
          verdictOk: true,
        },
      },
    ],
  },
];

// ─── Section component ────────────────────────────────────────────────────────

function LectureSection({
  section,
  index,
  accentColor,
  bgAccent,
}: {
  section: (typeof LECTURES)[0]["sections"][0];
  index: number;
  accentColor: string;
  bgAccent: string;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="border border-cyber-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`${accentColor}`}>{section.icon}</span>
          <span className="text-white font-semibold">{section.title}</span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 shrink-0" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-cyber-border space-y-4 pt-4">
              {/* Main text */}
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {section.content}
              </p>

              {/* Tips */}
              <div className={`${bgAccent} rounded-lg p-4`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${accentColor} mb-2`}>
                  Ключевые правила
                </p>
                <ul className="space-y-1.5">
                  {section.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                      <CheckCircle size={13} className={`${accentColor} mt-0.5 shrink-0`} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Example */}
              <div
                className={`rounded-lg p-4 border ${
                  section.example.verdictOk
                    ? "bg-green-900/20 border-green-700/40"
                    : "bg-red-900/20 border-red-700/40"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                  {section.example.label}
                </p>
                <p className="text-gray-300 text-sm italic mb-3">
                  {section.example.text}
                </p>
                <div className="flex items-start gap-2">
                  {section.example.verdictOk ? (
                    <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  )}
                  <p
                    className={`text-sm font-medium ${
                      section.example.verdictOk ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {section.example.verdict}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Lecture card / expanded ──────────────────────────────────────────────────

function LectureCard({ lecture }: { lecture: (typeof LECTURES)[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [read, setRead] = useState(false);

  const handleExpand = () => {
    setExpanded((v) => !v);
    if (!read) setRead(true);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: lecture.id * 0.08 }}
      className={`bg-gradient-to-r ${lecture.color} border ${
        expanded ? lecture.activeBorder : lecture.border
      } rounded-2xl overflow-hidden transition-all duration-300`}
    >
      {/* Header */}
      <button
        onClick={handleExpand}
        className="w-full p-6 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{lecture.icon}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-bold text-lg">{lecture.title}</h3>
                {read && (
                  <span className="text-xs bg-green-900/50 text-green-400 border border-green-700/40 px-2 py-0.5 rounded-full">
                    Прочитано
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">{lecture.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs ${lecture.accentColor} flex items-center gap-1`}>
                  <BookOpen size={12} /> {lecture.readTime} чтения
                </span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-400">{lecture.sections.length} разделов</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 mt-1">
            {expanded ? (
              <ChevronUp className="text-gray-400" size={20} />
            ) : (
              <ChevronDown className="text-gray-400" size={20} />
            )}
          </div>
        </div>

        {/* Section pills */}
        {!expanded && (
          <div className="flex flex-wrap gap-2 mt-4">
            {lecture.sections.map((s, i) => (
              <span
                key={i}
                className="text-xs bg-black/30 text-gray-400 px-2 py-0.5 rounded-full"
              >
                {s.title}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-6 pb-6 space-y-3"
          >
            <div className="h-px bg-white/10 mb-4" />
            {lecture.sections.map((section, i) => (
              <LectureSection
                key={i}
                section={section}
                index={i}
                accentColor={lecture.accentColor}
                bgAccent={lecture.bgAccent}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LecturesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-cyber-dark">
      <header className="border-b border-cyber-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <BookOpen className="text-cyber-green" size={20} />
        <span className="text-white font-bold">Учебные материалы</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-white text-2xl font-bold mb-2">Лекции</h1>
          <p className="text-gray-400 text-sm">
            Прочитай перед тестами — это поможет отвечать уверенно и понять логику каждого сценария.
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {[
            { label: "Лекций", value: "2", icon: <BookOpen size={14} /> },
            { label: "Тем", value: "12", icon: <Shield size={14} /> },
            { label: "Время", value: "30 мин", icon: <Eye size={14} /> },
          ].map((s, i) => (
            <div key={i} className="bg-cyber-card border border-cyber-border rounded-xl p-3 text-center">
              <div className="text-cyber-green flex justify-center mb-1">{s.icon}</div>
              <div className="text-white font-bold text-lg">{s.value}</div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Lectures */}
        <div className="space-y-4">
          {LECTURES.map((lecture) => (
            <LectureCard key={lecture.id} lecture={lecture} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-cyber-card border border-cyber-green/30 rounded-xl p-5 text-center"
        >
          <p className="text-gray-300 text-sm mb-3">
            Прочитал обе лекции? Отлично — переходи к тестам!
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-cyber-green text-black font-bold px-6 py-2 rounded-lg hover:bg-green-400 transition-colors text-sm"
          >
            Перейти к тестам →
          </button>
        </motion.div>
      </div>
    </div>
  );
}
