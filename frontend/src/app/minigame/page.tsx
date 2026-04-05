"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, Clock, ChevronLeft, Lightbulb, X, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store";

// ═══════════════════════════════════════════
// TILES
// ═══════════════════════════════════════════
const W = 1;
const F = 0;
const ZONE = { BANK: 2, ATM: 3, CAFE: 4, HOME: 5, EMAIL: 6, SOCIAL: 7 };

// 3 разные карты для 3 уровней
const MAPS = [
  // Уровень 1 — открытый город
  [
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,ZONE.EMAIL,F,F,F,F,F,F,F,F,ZONE.BANK,F,F,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,F,F,ZONE.ATM,F,F,F,F,F,ZONE.CAFE,F,F,F,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,ZONE.HOME,F,F,F,F,F,F,F,F,F,ZONE.SOCIAL,F,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  ],
  // Уровень 2 — с препятствиями
  [
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,ZONE.BANK,F,W,F,F,F,F,W,F,ZONE.EMAIL,F,F,W],
    [W,F,F,F,W,F,F,F,F,W,F,F,F,F,W],
    [W,F,F,F,W,F,F,F,F,W,F,F,F,F,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,F,F,F,W,F,ZONE.CAFE,F,W,F,F,F,F,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,ZONE.SOCIAL,F,F,F,F,F,F,F,F,ZONE.ATM,F,F,W],
    [W,F,F,F,F,F,ZONE.HOME,F,F,F,F,F,F,F,W],
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  ],
  // Уровень 3 — лабиринт
  [
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    [W,F,F,F,W,F,F,F,F,F,W,F,F,F,W],
    [W,F,ZONE.EMAIL,F,W,F,F,F,F,F,W,ZONE.BANK,F,F,W],
    [W,F,F,F,W,F,F,F,F,F,W,F,F,F,W],
    [W,W,F,W,W,F,W,W,W,F,W,F,W,W,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,F,W,ZONE.ATM,W,F,F,F,F,W,ZONE.CAFE,W,F,F,W],
    [W,F,F,F,F,F,F,F,F,W,F,F,F,F,W],
    [W,F,ZONE.HOME,F,W,W,F,F,W,W,F,ZONE.SOCIAL,F,F,W],
    [W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  ],
];

const LEVEL_NAMES = ["Новичок", "Защитник", "Эксперт"];
const LEVEL_EMOJIS = ["🌱", "🛡️", "💎"];

const ZONE_CFG: Record<number, { name: string; emoji: string; color: string }> = {
  [ZONE.BANK]:   { name: "Банк",       emoji: "🏦", color: "#1d4ed8" },
  [ZONE.ATM]:    { name: "Банкомат",   emoji: "🏧", color: "#b45309" },
  [ZONE.CAFE]:   { name: "Кафе Wi-Fi", emoji: "☕", color: "#059669" },
  [ZONE.HOME]:   { name: "Дом",        emoji: "🏠", color: "#7c3aed" },
  [ZONE.EMAIL]:  { name: "Почта",      emoji: "📧", color: "#dc2626" },
  [ZONE.SOCIAL]: { name: "Соцсети",    emoji: "📱", color: "#db2777" },
};

const TILE_SIZE = 56;
const PLAYER_START = { x: 7, y: 5 };
const GAME_DURATION = 180;

// ═══════════════════════════════════════════
// QUESTIONS  (per level × per zone, 3 each)
// ═══════════════════════════════════════════
type Question = { text: string; situation: string; options: string[]; correct: number; explanation: string };

// Redistributes correct answers so they aren't always index 1
function redistributeCorrect(raw: Record<number, Record<number, Question[]>>): Record<number, Record<number, Question[]>> {
  // Target positions cycle: 0, 2, 3, 0, 3, 2, 0, 3, 2 ...
  const POS = [0, 2, 3, 0, 3, 2, 0, 3, 2, 0, 2, 0, 3, 0, 2, 3, 2, 0];
  let qi = 0;
  const out: Record<number, Record<number, Question[]>> = {};
  for (const lk of Object.keys(raw)) {
    const l = Number(lk);
    out[l] = {};
    for (const zk of Object.keys(raw[l])) {
      const z = Number(zk);
      out[l][z] = raw[l][z].map((q: Question) => {
        const target = POS[qi % POS.length];
        qi++;
        const opts = Array.from(q.options);
        const correctText = opts[q.correct];
        const rest = opts.filter((_: string, i: number) => i !== q.correct);
        rest.splice(target, 0, correctText);
        return { ...q, options: rest, correct: target };
      });
    }
  }
  return out;
}

// QUESTIONS[levelIndex][zoneType]
const QUESTIONS: Record<number, Record<number, Question[]>> = redistributeCorrect({
  // ── Уровень 0: Новичок ─────────────────────────────────────
  0: {
    [ZONE.BANK]: [
      { situation: "📞 Входящий звонок", text: "«Служба безопасности Сбербанка. Зафиксирована подозрительная операция. Назовите CVV карты для её отмены.»", options: ["Называю CVV — операция срочная", "Кладу трубку, перезваниваю по номеру с карты", "Называю только первые 2 цифры", "Прошу сотрудника назвать мои данные первым"], correct: 1, explanation: "Банк НИКОГДА не запрашивает CVV по телефону. Любой звонок с любого номера может быть подделан." },
      { situation: "📱 SMS от «банка»", text: "«Ваш аккаунт заблокирован. Войдите: sber-online-secure.ru для разблокировки в течение 2 часов.»", options: ["Перехожу — надо срочно разблокировать", "Звоню в банк по номеру на обратной стороне карты", "Пишу в поддержку по ссылке из SMS", "Перехожу в режиме инкогнито"], correct: 1, explanation: "sber-online-secure.ru ≠ sberbank.ru. Банки не присылают ссылки на сторонние домены." },
      { situation: "📧 Email от «банка»", text: "Письмо с support@sberbank-info.com: «Обновите данные карты, иначе счёт заморожен через 24 часа.»", options: ["Обновляю данные — не хочу заморозки", "Проверяю домен: sberbank-info.com ≠ sberbank.ru", "Звоню по номеру из письма", "Пересылаю другу для проверки"], correct: 1, explanation: "Официальный email Сбербанка: @sberbank.ru. Любой другой домен — фишинг." },
    ],
    [ZONE.ATM]: [
      { situation: "🏧 Подозрительный банкомат", text: "Картоприёмник выглядит чуть объёмнее обычного. Над клавиатурой — маленькое отверстие. Что делаешь?", options: ["Вставляю карту — выглядит нормально", "Ухожу к другому банкомату, сообщаю в банк", "Прикрываю клавиатуру рукой — этого достаточно", "Снимаю минимальную сумму для проверки"], correct: 1, explanation: "Накладка на картоприёмник + камера = скиммер. Нужно уйти и позвонить в банк." },
      { situation: "🏧 Двойной ввод PIN", text: "Банкомат просит ввести PIN дважды «для подтверждения безопасности операции».", options: ["Ввожу дважды — банкомат же просит", "Отменяю операцию — это признак взлома", "Ввожу другой PIN второй раз", "Обращаюсь к охраннику"], correct: 1, explanation: "Настоящий банкомат никогда не просит PIN дважды. Это признак скиммера." },
      { situation: "💳 Незнакомец помогает", text: "«Не могу разобраться с банкоматом! Введите ваш PIN, я нажму кнопки». Что ответишь?", options: ["Помогу — человек растерян", "Откажу — PIN нельзя никому", "Введу PIN но буду смотреть за руками", "Позову сотрудника банка"], correct: 1, explanation: "PIN строго личный. «Помощь» незнакомцу с вашим PIN — социальная инженерия." },
    ],
    [ZONE.CAFE]: [
      { situation: "📶 Две одинаковые сети", text: "В кофейне: «CafeNet» (официальная по словам кассира) и «CafeNet_FREE». Какую выбираешь?", options: ["CafeNet_FREE — раз бесплатная значит лучше", "CafeNet — её назвал персонал кафе", "Обе для надёжности", "Любую — публичный WiFi всегда безопасен"], correct: 1, explanation: "Evil Twin — атака двойником. «CafeNet_FREE» может быть поддельной точкой хакера." },
      { situation: "🌐 Онлайн-банк в кафе", text: "Нужно срочно перевести деньги. Ты в кафе с открытым WiFi. Что делаешь?", options: ["Перевожу через WiFi — операция срочная", "Использую мобильный интернет для банка", "Включаю VPN и тогда перевожу", "Прошу соседа убедиться что сеть безопасна"], correct: 1, explanation: "В публичных сетях трафик могут перехватить. Мобильный интернет — безопасный вариант." },
      { situation: "🔐 Портал авторизации WiFi", text: "При подключении: «Введите логин и пароль ВКонтакте для доступа к интернету».", options: ["Ввожу — без этого нет интернета", "Закрываю — WiFi не требует пароль от соцсетей", "Ввожу поддельные данные", "Создаю временный аккаунт VK"], correct: 1, explanation: "Captive portal не требует пароль от соцсетей. Это кража учётных данных." },
    ],
    [ZONE.HOME]: [
      { situation: "📡 Пароль роутера", text: "Новый роутер с паролем admin/admin. Сосед говорит: «Да и так нормально».", options: ["Оставляю — всё работает", "Меняю пароль роутера сразу", "Меняю только пароль WiFi", "Спрошу у провайдера"], correct: 1, explanation: "admin/admin — первое что проверяет взломщик. Менять нужно сразу." },
      { situation: "👨 Сосед просит WiFi", text: "Сосед просит пароль от WiFi «на один день — у него не работает интернет».", options: ["Даю пароль — он же сосед", "Создаю гостевую сеть с отдельным паролем", "Отказываю — нельзя никому", "Даю на 24 часа и потом меняю"], correct: 1, explanation: "Гостевая сеть изолирует гостя от твоих устройств. И вежливо, и безопасно." },
      { situation: "🔔 Уведомление в браузере", text: "«Обнаружен вирус! Скачайте Dr.Web PRO БЕСПЛАТНО прямо сейчас!» — всплывает в браузере.", options: ["Скачиваю — вирус надо удалить", "Закрываю вкладку — это scareware", "Показываю другу", "Перезагружаю телефон"], correct: 1, explanation: "Scareware — запугивание для установки вредоносного ПО. Браузер не может обнаружить вирус." },
    ],
    [ZONE.EMAIL]: [
      { situation: "📨 Выигрыш в лотерею", text: "Email: «Вы выиграли iPhone 15! Для получения оплатите доставку 299 руб по ссылке.»", options: ["Оплачиваю — 299 руб не жалко за iPhone", "Удаляю — развод «приз за комиссию»", "Уточняю детали в ответе", "Ищу отзывы об этой акции"], correct: 1, explanation: "«Заплати за бесплатный приз» — классика. После оплаты исчезнут или попросят ещё." },
      { situation: "📎 Вложение .exe", text: "Письмо от HR: «Ваше резюме отобрано! Откройте Offer_2024.exe для деталей.»", options: ["Открываю — это оффер!", "Не открываю — .exe во вложении = вирус", "Открываю на рабочем компьютере", "Проверяю файл онлайн-антивирусом"], correct: 1, explanation: ".exe — исполняемый файл, не документ. HR никогда не присылает офферы в виде программ." },
      { situation: "📧 CEO Fraud", text: "Письмо от «директора» (director@company-mail.net): «Срочно переведи 500 000 руб поставщику.»", options: ["Перевожу — директор просит срочно", "Звоню директору напрямую для подтверждения", "Отвечаю на письмо с вопросами", "Перевожу половину для начала"], correct: 1, explanation: "CEO Fraud — подделка письма от руководства. Всегда верифицируй финансовые запросы голосом." },
      { situation: "✉️ SPF и DKIM", text: "Друг объяснил: SPF — список серверов которым разрешено слать почту от имени домена. DKIM — цифровая подпись письма. Пришло письмо от bank@sber.ru: SPF прошёл, DKIM сломан. Что это значит?", options: ["Письмо настоящее — домен верный", "Письмо могли изменить в пути — DKIM подпись нарушена", "Проблема у сервера банка — отвечаю как обычно", "DKIM не важен — главное SPF"], correct: 1, explanation: "SPF подтверждает сервер-отправитель. DKIM гарантирует неизменность письма с момента отправки. Сломанный DKIM = письмо модифицировано." },
    ],
    [ZONE.SOCIAL]: [
      { situation: "💬 Голосование в VK", text: "Незнакомец: «Проголосуй за мою дочку в конкурсе» + ссылка vk-vote-konkurs.ru", options: ["Голосую — жалко ребёнка", "Игнорирую — ссылка на сторонний сайт = фишинг", "Перехожу посмотреть но не голосую", "Пересылаю другу"], correct: 1, explanation: "Ссылки на сторонние сайты для «голосования» — фишинг для кражи аккаунта." },
      { situation: "📱 WhatsApp от «друга»", text: "«Артём» пишет: «Застрял в Казани, кошелёк украли. Переведи 5000, завтра верну!»", options: ["Перевожу — друг в беде", "Звоню Артёму на его настоящий номер", "Пишу вопрос который только он знает", "Перевожу 1000 для проверки"], correct: 1, explanation: "Аккаунт Артёма взломан. Мошенники пишут «не могу говорить» чтобы ты не позвонил." },
      { situation: "📸 Instagram DM", text: "@instagram.support.official: «Ваш аккаунт удалят через 24 часа. Подтвердите: insta-verify.ru»", options: ["Перехожу и подтверждаю", "Игнорирую — Instagram пишет только через системные уведомления", "Отвечаю в DM с вопросами", "Меняю пароль по ссылке"], correct: 1, explanation: "Instagram никогда не пишет предупреждения через DM случайных аккаунтов." },
    ],
  },

  // ── Уровень 1: Защитник ────────────────────────────────────
  1: {
    [ZONE.BANK]: [
      { situation: "🏦 Приложение банка", text: "В App Store нашёл приложение «Сбербанк Онлайн Pro» с 4.8★ и 10К скачиваний. Официальное приложение менее популярно.", options: ["Скачиваю Pro — рейтинг выше", "Скачиваю только с официального сайта банка", "Спрашиваю у знакомых", "Пишу в поддержку через это приложение"], correct: 1, explanation: "Мошеннические приложения накручивают рейтинг. Всегда скачивай по ссылке с официального сайта банка." },
      { situation: "💸 Перевод другу", text: "Друг прислал реквизиты карты в Telegram для перевода. Номер карты начинается с 9. Что не так?", options: ["Всё нормально — друг же", "Карты в России начинаются с 2 или 4 — это мошенник", "Переведу небольшую сумму для теста", "Попрошу другие реквизиты"], correct: 1, explanation: "Российские карты начинаются с 2 (Мир) или 4 (Visa). Карта с 9 — иностранная или несуществующая." },
      { situation: "🔔 Push от банка", text: "Push: «Подтвердите списание 47 000 руб → Магнит». Ты ничего не покупал. В уведомлении есть кнопка «Отменить».", options: ["Нажимаю «Отменить» в уведомлении", "Немедленно блокирую карту через приложение", "Жду — может ошибка", "Звоню в Магнит"], correct: 1, explanation: "Кнопка «Отменить» в поддельном push — ссылка на фишинговый сайт. Блокируй через официальное приложение." },
    ],
    [ZONE.ATM]: [
      { situation: "💳 Бесконтактный скиммер", text: "Незнакомец стоит вплотную сзади со смартфоном. Твоя карта поддерживает NFC.", options: ["Ничего страшного — NFC короткого радиуса", "Прикрываю кошелёк рукой и отхожу", "Прошу его отойти", "Продолжаю — всё нормально"], correct: 1, explanation: "NFC-скиммеры считывают данные с расстояния 5-10 см. Экранирующий чехол или прикрытие рукой защитит." },
      { situation: "🏧 QR на банкомате", text: "На банкомате наклейка: «Сканируй QR для быстрого снятия без карты». QR не брендированный.", options: ["Сканирую — удобно", "Не сканирую — QR могут подменить", "Спрашиваю охранника", "Проверяю QR в вирустотал"], correct: 1, explanation: "QR-наклейки на банкоматах — распространённый способ фишинга. Банки не предлагают снятие через сторонние QR." },
      { situation: "📱 Приложение-кошелёк", text: "Банкомат предлагает добавить карту в «CashWallet» для быстрых платежей.", options: ["Добавляю — удобно", "Отказываюсь — банкомат не должен предлагать сторонние приложения", "Смотрю рейтинг приложения", "Добавляю только номер без CVV"], correct: 1, explanation: "Настоящие банкоматы не устанавливают сторонние приложения. Это фишинговая атака через терминал." },
    ],
    [ZONE.CAFE]: [
      { situation: "🕵️ MITM в кафе", text: "Ты зашёл на свой банк (HTTPS), но браузер показывает предупреждение о сертификате. В кафе нормальный WiFi.", options: ["Нажимаю «Продолжить» — я уже на сайте", "Закрываю — предупреждение = атака на сертификат", "Обновляю страницу", "Меняю браузер"], correct: 1, explanation: "Предупреждение о сертификате в публичной сети = Man-in-the-Middle атака. Никогда не игнорируй его." },
      { situation: "📡 Скорость подозрительная", text: "WiFi в кафе очень медленный, хотя других посетителей нет. Менеджер говорит всё нормально.", options: ["Использую как обычно", "Включаю VPN перед любыми действиями", "Перезапускаю WiFi на телефоне", "Переключаюсь на 3G только для скачивания"], correct: 1, explanation: "Медленный канал может означать, что трафик перехватывается и анализируется. VPN шифрует соединение." },
      { situation: "🔓 HTTP в кафе", text: "Нужный тебе сайт открывается по HTTP (не HTTPS). Ты на публичном WiFi. Хочешь войти в аккаунт.", options: ["Вхожу — нужно срочно", "Не вхожу — HTTP не шифрует, пароль перехватят", "Вхожу в режиме инкогнито", "Вхожу с VPN — это поможет"], correct: 3, explanation: "VPN шифрует трафик между тобой и VPN-сервером, но сайт на HTTP всё равно получит пароль в открытом виде от VPN. Лучший вариант — не входить вообще или использовать только HTTPS." },
    ],
    [ZONE.HOME]: [
      { situation: "🔒 Обновление прошивки", text: "Роутер предлагает обновление прошивки через письмо от «провайдера» со ссылкой.", options: ["Обновляю по ссылке из письма", "Обновляю только через интерфейс роутера напрямую", "Звоню провайдеру", "Отключаю автообновление"], correct: 1, explanation: "Прошивку роутера обновляй только через его веб-интерфейс (192.168.0.1). Ссылки из писем — фишинг." },
      { situation: "📷 Умная камера", text: "Установил IP-камеру в квартире. Приложение работает. Пароль оставил стандартным admin:admin.", options: ["Всё окей — работает же", "Немедленно меняю пароль — стандартный взломают за секунды", "Закрываю доступ снаружи", "Обновляю приложение"], correct: 1, explanation: "Shodan.io индексирует тысячи камер с admin:admin. Хакеры смотрят в твою квартиру в реальном времени." },
      { situation: "🛡️ Антивирус предлагает", text: "Pop-up: «Ваш Windows 10 не защищён! Продлите лицензию McAfee за 990 руб.» (у тебя нет McAfee).", options: ["Продлеваю — безопасность важна", "Закрываю — это мошенничество", "Скачиваю бесплатный аналог", "Покупаю другой антивирус"], correct: 1, explanation: "Реклама антивирусов которых у тебя нет — стандартный scareware или кликджекинг для кражи платёжных данных." },
      { situation: "🔑 API-ключ на GitHub", text: "Разработчик случайно запушил в публичный GitHub-репозиторий файл с API-ключом: SECRET_KEY=sk-abc123. Что делать первым делом?", options: ["Удалить файл из репозитория и сделать commit", "Немедленно отозвать/перегенерировать ключ — он уже скомпрометирован", "Сделать репозиторий приватным", "Зашифровать файл и запушить снова"], correct: 1, explanation: "Git хранит всю историю. Даже удалённый файл остаётся в истории. Единственный выход — отозвать ключ у провайдера немедленно." },
    ],
    [ZONE.EMAIL]: [
      { situation: "📬 Spoofing адреса", text: "Письмо от boss@company.ru (твой директор): «Купи 5 подарочных карт iTunes по 5000 руб». Адрес выглядит настоящим.", options: ["Покупаю — директор просит", "Звоню директору лично — адрес можно подделать", "Отвечаю на письмо уточнить", "Покупаю 2 карты для начала"], correct: 1, explanation: "Email spoofing позволяет отправить письмо с любого адреса. Только голосовая верификация надёжна." },
      { situation: "🔗 Punycode домен", text: "Ссылка в письме ведёт на аррle.com (на вид). В браузере URL выглядит нормально.", options: ["Перехожу — apple же", "Проверяю в адресной строке: аррle.com — это xn--ррle-43d.com", "Ищу сайт через гугл", "Копирую ссылку в текстовый файл"], correct: 1, explanation: "Punycode-атака: кириллические «а» и «р» выглядят как латинские. Всегда проверяй URL в строке браузера." },
      { situation: "📄 PDF с макросом", text: "Письмо из налоговой (ФНС): «Уведомление об уплате налога — откройте PDF». PDF просит включить «защищённый режим».", options: ["Включаю защищённый режим", "Не включаю — PDF не должны просить разрешений", "Проверяю через VirusTotal", "Звоню в ФНС"], correct: 1, explanation: "Настоящие PDF не требуют включить 'защищённый режим'. Это социальная инженерия для запуска макроса/вируса." },
      { situation: "🔐 DKIM fail", text: "Почтовый клиент показывает: DKIM=fail, DMARC=none на письме от HR. Отправитель говорит «это баг нашего сервера». Письмо содержит ссылку на анкету.", options: ["Перехожу — HR же объяснил", "Не перехожу — DKIM fail означает что письмо могли подменить в пути", "Проверяю ссылку в VirusTotal", "Жду пока исправят баг"], correct: 1, explanation: "DKIM fail = письмо модифицировано или отправлено с неавторизованного сервера. DMARC=none значит домен не защищён политикой отклонения." },
    ],
    [ZONE.SOCIAL]: [
      { situation: "🤝 LinkedIn рекрутер", text: "Рекрутер из LinkedIn предлагает удалённую работу $5000/мес и просит скачать «корпоративный мессенджер».", options: ["Скачиваю — хорошая зарплата", "Отказываю — легитимные компании не просят скачивать ПО для собеседования", "Проверяю компанию в интернете", "Прошу прислать другую ссылку"], correct: 1, explanation: "Схема: поддельный рекрутер → вредоносное ПО под видом мессенджера. Популярна для кражи крипты." },
      { situation: "📲 Telegram Premium", text: "Канал с 50К подписчиков: «Получи Telegram Premium БЕСПЛАТНО! Войди через наш бот — он запросит номер телефона».", options: ["Ввожу номер — много подписчиков значит надёжно", "Не ввожу — бот может украсть аккаунт через SMS", "Проверяю бота через @botfather", "Ввожу другой номер"], correct: 1, explanation: "Мошеннический бот запрашивает код из SMS и захватывает твой аккаунт Telegram. Подписчики накручиваются." },
      { situation: "🎮 Steam трейд", text: "Незнакомец в Steam: «Обменяй свой нож CS2 (50К руб) на временный аккаунт с играми, вернёшь через час».", options: ["Соглашаюсь — час быстро пройдёт", "Отказываю — в Steam нет законного обмена аккаунтами", "Прошу гарантии через третье лицо", "Предлагаю деньгами"], correct: 1, explanation: "Схема «временный аккаунт» — классика в Steam. После трейда скин не вернут, аккаунт удалят." },
    ],
  },

  // ── Уровень 2: Эксперт ─────────────────────────────────────
  2: {
    [ZONE.BANK]: [
      { situation: "🏦 SIM-swap атака", text: "Ты не можешь войти в мобильный банк. SMS с кодом не приходит. Звонок на твой номер не проходит.", options: ["Жду — может сеть плохая", "Срочно звоню оператору и блокирую SIM — вероятна SIM-подмена", "Меняю SIM-карту", "Пишу в поддержку банка в приложении"], correct: 1, explanation: "SIM-swap: мошенник перевыпустил твою SIM. Теперь он получает все SMS с кодами. Немедленно блокируй." },
      { situation: "💰 Money mule схема", text: "Работодатель онлайн просит принять перевод на твою карту и переслать 90% на другой счёт за комиссию 10%.", options: ["Соглашаюсь — лёгкий заработок", "Отказываю — это схема отмывания денег, меня могут привлечь к ответственности", "Беру только комиссию", "Сначала проверю откуда деньги"], correct: 1, explanation: "Money mule — участие в отмывании денег. Даже «невинный» посредник несёт уголовную ответственность по ст. 174 УК РФ." },
      { situation: "🔐 Токен подтверждения", text: "Банковское приложение показывает: «Подтвердите операцию: перевод 120 000 руб на счёт ХXXXXX». Ты переводил 1200 руб другу.", options: ["Подтверждаю — может банк округляет", "Отклоняю и звоню в банк — суммы не совпадают", "Проверяю реквизиты в приложении", "Переустанавливаю приложение"], correct: 1, explanation: "Man-in-the-browser атака подменяет реквизиты прямо в приложении. Никогда не подтверждай операции с неверными суммами." },
    ],
    [ZONE.ATM]: [
      { situation: "💻 Jackpotting", text: "Банкомат самостоятельно начинает выдавать купюры на улице. Прохожий предлагает разделить деньги.", options: ["Беру деньги — они сами выпали", "Ухожу — это краденые деньги, я стану соучастником", "Сообщаю в банк", "Видеозаписываю для доказательства"], correct: 1, explanation: "Jackpotting — взлом банкомата. Деньги краденые. Забрать их — соучастие в преступлении." },
      { situation: "📱 Overlay-атака", text: "На экране банкомата появился новый интерфейс «Обновлённый дизайн». Раньше такого не было.", options: ["Пользуюсь — красивее стало", "Отхожу и сообщаю банку — это накладной экран с камерой", "Нажимаю отмена и пробую снова", "Снимаю минимальную сумму"], correct: 1, explanation: "Накладной экран записывает PIN и данные карты. Любое изменение внешнего вида банкомата — повод уйти." },
      { situation: "🔌 USB банкомат", text: "Обслуживающий «техник» в форме подключает USB-устройство к банкомату и просит не обращать внимания.", options: ["Не обращаю внимания", "Фотографирую и звоню в банк — техники не работают при клиентах", "Спрашиваю удостоверение", "Сообщаю охраннику"], correct: 1, explanation: "USB-устройства используются для установки malware на банкомат. Настоящие техники не работают при клиентах." },
    ],
    [ZONE.CAFE]: [
      { situation: "🌐 DNS-spoofing", text: "Ты набрал vk.com, страница открылась привычно, но просит заново войти и ввести номер телефона.", options: ["Ввожу — может сессия истекла", "Проверяю сертификат и IP — DNS мог быть подменён", "Открываю в другом браузере", "Использую закладку из браузера"], correct: 1, explanation: "DNS-spoofing в публичной сети перенаправляет на клон сайта. Всегда проверяй замок HTTPS и сертификат." },
      { situation: "📶 Rogue AP", text: "Ноутбук автоматически подключился к «McDonald's Free WiFi» — сеть с таким именем ты сохранял месяц назад.", options: ["Использую — удобно", "Отключаюсь — мог подключиться к Rogue AP с тем же именем", "Проверяю скорость интернета", "Включаю режим инкогнито"], correct: 1, explanation: "Rogue AP использует сохранённые имена сетей. Устройство подключается автоматически к поддельной точке." },
      { situation: "🔏 SSL Stripping", text: "Ты зашёл на bank.ru, адресная строка показывает bank.ru без замка. Раньше был замок HTTPS.", options: ["Вхожу — адрес правильный", "Не вхожу — SSL Stripping убрал шифрование", "Очищаю кэш и пробую снова", "Использую другой браузер"], correct: 1, explanation: "SSL Stripping атака убирает HTTPS, оставляя HTTP. Весь трафик идёт в открытом виде к хакеру." },
      { situation: "🔒 Чей SSL-сертификат?", text: "Банковский сайт открыт с замком HTTPS. Кликаешь на замок — сертификат выдан 'Let's Encrypt' для домена sberbank-online.ru.", options: ["Замок есть — значит безопасно", "Закрываю — Let's Encrypt выдаёт сертификаты любому домену, в том числе поддельному", "Проверяю дату выдачи", "Сравниваю с сертификатом прошлого месяца"], correct: 1, explanation: "HTTPS ≠ легитимность. Let's Encrypt автоматически выдаёт сертификат любому домену. Всегда проверяй: правильный ли домен, а не только наличие замка." },
    ],
    [ZONE.HOME]: [
      { situation: "🏠 IoT ботнет", text: "Интернет дома стал медленным. Роутер греется сильнее обычного. Никто ничего не скачивает.", options: ["Звоню провайдеру — их вина", "Проверяю устройства в сети — умные устройства могут быть в ботнете", "Перезагружаю роутер", "Меняю тариф"], correct: 1, explanation: "Взломанные IoT-устройства (камеры, лампочки) используются в DDoS-ботнетах. Роутер передаёт гигабайты трафика." },
      { situation: "📡 WPS уязвимость", text: "Сосед говорит что подключился к твоему WiFi не зная пароль, нажав кнопку WPS на роутере.", options: ["Это нормально — WPS удобен", "Отключаю WPS в настройках — он взламывается за часы", "Меняю пароль WiFi", "Прячу роутер"], correct: 1, explanation: "WPS имеет критическую уязвимость — брутфорс PIN за 4-10 часов. Всегда отключай WPS в настройках роутера." },
      { situation: "🖥️ Remote access троян", text: "Техподдержка провайдера попросила установить AnyDesk для «диагностики роутера».", options: ["Устанавливаю — они же провайдер", "Отказываю — провайдер не управляет роутером через твой компьютер", "Устанавливаю но слежу за действиями", "Даю доступ на 15 минут"], correct: 1, explanation: "Провайдер управляет роутером напрямую через свою сеть. AnyDesk на твоём ПК = полный доступ мошенника." },
      { situation: "🔑 OAuth токен в URL", text: "Приложение после авторизации перенаправляет тебя на: myapp.ru/callback?access_token=eyJhbG... Токен виден в адресной строке браузера.", options: ["Всё нормально — HTTPS же", "Это уязвимость: токены в URL попадают в логи серверов и историю браузера", "Проверяю токен на jwt.io", "Закрываю вкладку — токен исчезнет"], correct: 1, explanation: "Принцип безопасного API: токены передаются в заголовке Authorization: Bearer, не в URL. URL логируется серверами, proxy и попадает в историю браузера." },
    ],
    [ZONE.EMAIL]: [
      { situation: "⚡ Spear phishing", text: "Email: «Иван, видел твой проект на GitHub. Есть предложение — открой PDF с деталями». Отправитель знает твоё имя и проект.", options: ["Открываю — они знают меня", "Не открываю — персонализация делает фишинг убедительнее", "Проверяю отправителя", "Отвечаю с вопросом"], correct: 1, explanation: "Spear phishing — целевой фишинг с личными данными из OSINT (GitHub, LinkedIn). Убедительность = опасность." },
      { situation: "🕰️ Delayed payload", text: "Письмо пришло 2 недели назад, вложение открывал — всё было пусто. Сегодня антивирус нашёл троян.", options: ["Это ошибка антивируса", "Удаляю файл и проверяю систему — delayed payload активировался", "Перезагружаю компьютер", "Обновляю антивирус"], correct: 1, explanation: "Delayed payload — вредонос активируется через недели, обходя анализ. Карантин и полное сканирование обязательны." },
      { situation: "📮 BEC атака", text: "Бухгалтер прислал письмо: «Поставщик сменил реквизиты. Обновляй в следующих платежах». Письмо с корпоративного адреса.", options: ["Обновляю реквизиты", "Звоню поставщику напрямую по известному номеру для подтверждения", "Прошу бухгалтера подтвердить в чате", "Проверяю предыдущие письма от поставщика"], correct: 1, explanation: "BEC (Business Email Compromise) — взлом корпоративной почты для замены реквизитов. Только голосовое подтверждение надёжно." },
    ],
    [ZONE.SOCIAL]: [
      { situation: "🎭 Deepfake звонок", text: "Видеозвонок от «директора» в Telegram с просьбой срочно перевести деньги. Голос и лицо совпадают.", options: ["Перевожу — вижу его лично", "Прерываю звонок и перезваниваю директору на известный номер", "Прошу код-слово", "Перевожу часть суммы"], correct: 1, explanation: "Deepfake-видео в реальном времени уже доступны мошенникам. Только перезвон на известный номер подтвердит личность." },
      { situation: "🔍 OSINT против тебя", text: "Незнакомец в ВКонтакте знает твоё место работы, район проживания и имя собаки — спрашивает «безопасный» вопрос для сброса пароля.", options: ["Отвечаю — он и так всё знает", "Прекращаю общение — это сбор данных для взлома аккаунта", "Даю ложный ответ", "Спрашиваю откуда он знает"], correct: 1, explanation: "OSINT (разведка по открытым источникам) собирает данные из соцсетей для ответов на секретные вопросы." },
      { situation: "💎 NFT скам", text: "Популярный NFT-художник в Discord: «Минт бесплатный, плати только газ (~0.05 ETH). Осталось 3 места!»", options: ["Плачу — художник известный", "Отказываю — «бесплатный» минт с газом = Approval Phishing", "Проверяю смарт-контракт", "Плачу минимальный газ"], correct: 1, explanation: "Approval Phishing: подписывая транзакцию «газа», ты даёшь разрешение на вывод ВСЕГО содержимого кошелька." },
    ],
  },
});

// ═══════════════════════════════════════════
// HINTS
// ═══════════════════════════════════════════
const HINTS = [
  { emoji: "📧", title: "Фишинг в письмах", text: "Проверяй домен отправителя. sberbank-info.com ≠ sberbank.ru. Настоящие банки не просят обновить данные по ссылке." },
  { emoji: "📞", title: "Вишинг (звонки)", text: "Банк НИКОГДА не спрашивает CVV, пароль или код из SMS по телефону. Повесь трубку и перезвони сам по номеру с карты." },
  { emoji: "🏧", title: "Скимминг у банкомата", text: "Осматривай картоприёмник на накладки. Прикрывай клавиатуру при вводе PIN. Если что-то подозрительно — уйди." },
  { emoji: "📶", title: "Публичный Wi-Fi", text: "Не вводи пароли от банков в публичных сетях. Используй мобильный интернет для финансовых операций." },
  { emoji: "💬", title: "Соцсети и мессенджеры", text: "Аккаунт друга могут взломать. Всегда верифицируй просьбы о деньгах голосовым звонком на известный номер." },
  { emoji: "🔐", title: "Пароли и доступы", text: "Никому не сообщай PIN карты, пароли и коды из SMS. Это касается даже «сотрудников банка» и «технической поддержки»." },
];

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════
export default function MiniGamePage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [gameState, setGameState] = useState<"intro" | "playing" | "levelcomplete" | "gameover">("intro");
  const [currentLevel, setCurrentLevel] = useState(0); // 0-indexed
  const [playerPos, setPlayerPos] = useState(PLAYER_START);
  const [playerDir, setPlayerDir] = useState<"left" | "right">("right");
  const [hp, setHp] = useState(100);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [correctZones, setCorrectZones] = useState<Set<number>>(new Set());
  const [zoneQIdx, setZoneQIdx] = useState<Record<number, number>>({});
  const [activeQ, setActiveQ] = useState<{ zone: number; q: Question } | null>(null);
  const [hackerQ, setHackerQ] = useState<{ zone: number; q: Question } | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hackerFiredRef = useRef(false);
  // Refs so hacker interval can read latest values without resetting
  const activeQRef = useRef(activeQ);
  activeQRef.current = activeQ;
  const hackerQRef = useRef(hackerQ);
  hackerQRef.current = hackerQ;

  useEffect(() => { setMounted(true); }, []);

  const MAP = MAPS[currentLevel] ?? MAPS[0];
  const MAP_ROWS = MAP.length;
  const MAP_COLS = MAP[0].length;
  const TOTAL_ZONES = 6;

  // Timer — setTimeout pattern: fires once, re-triggers via timeLeft dep change
  useEffect(() => {
    if (gameState !== "playing") return;
    if (timeLeft <= 0) { setGameState("gameover"); return; }
    const t = setTimeout(() => setTimeLeft((p: number) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [gameState, timeLeft]);

  // HP death
  useEffect(() => {
    if (hp <= 0 && gameState === "playing") setGameState("gameover");
  }, [hp, gameState]);

  // Level complete when all 6 zones answered correctly
  useEffect(() => {
    if (correctZones.size >= TOTAL_ZONES && gameState === "playing") {
      setGameState("levelcomplete");
    }
  }, [correctZones, gameState]);

  // Hacker alert — fires ONCE per game, interval NOT reset on question open/close
  useEffect(() => {
    if (gameState !== "playing") return;
    hackerFiredRef.current = false;
    const ms = currentLevel === 0 ? 40000 : currentLevel === 1 ? 30000 : 22000;
    const t = setInterval(() => {
      if (!activeQRef.current && !hackerQRef.current && !hackerFiredRef.current) {
        hackerFiredRef.current = true;
        const levelQs = QUESTIONS[currentLevel] ?? QUESTIONS[0];
        const zones = Object.keys(levelQs).map(Number);
        const zone = zones[Math.floor(Math.random() * zones.length)];
        const qArr = levelQs[zone];
        const q = qArr[Math.floor(Math.random() * qArr.length)];
        setHackerQ({ zone, q });
      }
    }, ms);
    return () => clearInterval(t);
  }, [gameState, currentLevel]);

  const flash = (color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 400);
  };

  // Keyboard — e.code is layout-independent (works on Russian keyboard)
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (gameState !== "playing" || activeQ || hackerQ || showHints) return;
    const dirs: Record<string, { dx: number; dy: number; dir?: "left"|"right" }> = {
      ArrowUp: { dx: 0, dy: -1 }, ArrowDown: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0, dir: "left" }, ArrowRight: { dx: 1, dy: 0, dir: "right" },
      KeyW: { dx: 0, dy: -1 }, KeyS: { dx: 0, dy: 1 },
      KeyA: { dx: -1, dy: 0, dir: "left" }, KeyD: { dx: 1, dy: 0, dir: "right" },
    };
    const move = dirs[e.code];
    if (!move) return;
    e.preventDefault();
    if (move.dir) setPlayerDir(move.dir);
    setPlayerPos((prev: { x: number; y: number }) => {
      const nx = prev.x + move.dx;
      const ny = prev.y + move.dy;
      if (ny < 0 || ny >= MAP_ROWS || nx < 0 || nx >= MAP_COLS) return prev;
      const tile = MAP[ny][nx];
      if (tile === W) return prev;
      if (tile > 1) {
        const qArr = QUESTIONS[currentLevel][tile];
        if (qArr) {
          const idx = zoneQIdx[tile] ?? 0;
          setActiveQ({ zone: tile, q: qArr[idx % qArr.length] });
          setZoneQIdx((p: Record<number, number>) => ({ ...p, [tile]: (idx + 1) % qArr.length }));
        }
      }
      return { x: nx, y: ny };
    });
  }, [gameState, activeQ, hackerQ, showHints, MAP_ROWS, MAP_COLS, MAP, zoneQIdx, currentLevel]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const handleAnswer = (idx: number, q: Question, zone: number, isHacker: boolean) => {
    const correct = idx === q.correct;
    setLastCorrect(correct);
    if (correct) {
      setScore((s: number) => s + 150);
      setHp((h: number) => Math.min(100, h + 5));
      flash("rgba(0,255,136,0.2)");
      if (!isHacker) setCorrectZones((p: Set<number>) => new Set(Array.from(p).concat([zone])));
    } else {
      setHp((h: number) => Math.max(0, h - 20));
      flash("rgba(220,38,38,0.3)");
    }
  };

  const dismissQ = () => {
    setActiveQ(null);
    setHackerQ(null);
    hackerFiredRef.current = false;
    setLastCorrect(null);
  };

  const startNextLevel = () => {
    const next = currentLevel + 1;
    if (next >= 3) { setGameState("gameover"); return; }
    setCurrentLevel(next);
    setPlayerPos(PLAYER_START);
    setCorrectZones(new Set());
    setZoneQIdx({});
    setActiveQ(null);
    setHackerQ(null);
    setLastCorrect(null);
    hackerFiredRef.current = false;
    setGameState("playing");
  };

  const startGame = () => {
    setCurrentLevel(0);
    setPlayerPos(PLAYER_START);
    setHp(100);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCorrectZones(new Set());
    setZoneQIdx({});
    setActiveQ(null);
    setHackerQ(null);
    setLastCorrect(null);
    hackerFiredRef.current = false;
    setGameState("playing");
  };

  const hpColor = hp > 60 ? "#00ff88" : hp > 30 ? "#facc15" : "#ef4444";

  if (!mounted) return null;

  // ── INTRO ──────────────────────────────────────────────
  if (gameState === "intro") return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-4 relative">
      <button onClick={() => router.push("/dashboard")}
        className="absolute top-4 left-4 flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity">
        <span className="text-green-400">🛡️</span>
        <span className="text-white font-bold">Cyber<span className="text-green-400">Sim</span></span>
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
        <div className="bg-cyber-card border border-cyber-border rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-cyber-green via-blue-500 to-purple-500" />
          <div className="p-8 text-center">
            <motion.div animate={{ y: [0,-6,0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-6xl mb-3">🏙️</motion.div>
            <h1 className="text-white text-2xl font-black mb-1">Кибергород</h1>
            <p className="text-cyber-green text-sm mb-5">3 уровня сложности · Режим выживания</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {LEVEL_NAMES.map((name, i) => (
                <div key={i} className="bg-cyber-dark rounded-lg p-2 text-center">
                  <div className="text-xl">{LEVEL_EMOJIS[i]}</div>
                  <div className="text-xs text-gray-400 mt-1">{name}</div>
                </div>
              ))}
            </div>
            <div className="bg-cyber-dark rounded-xl p-4 text-left mb-5 space-y-1.5 text-sm text-gray-300">
              <p>🗺️ Найди все 6 зон на карте — войди в каждую</p>
              <p>✅ Ответь правильно → <span className="text-cyber-green">+150 очков, портал на следующий уровень</span></p>
              <p>❌ Ошибка → <span className="text-red-400">-20 HP</span></p>
              <p>🚨 Хакерская атака — отрази внезапный вопрос</p>
              <p>💡 Кнопка ? — подсказки по всем угрозам</p>
            </div>
            <div className="text-xs text-gray-500 mb-4">Управление: WASD или ↑↓←→</div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={startGame}
              className="w-full bg-cyber-green text-black font-black py-3 rounded-xl text-lg hover:bg-green-400 transition-colors">
              Защищать город! ⚔️
            </motion.button>
            <button onClick={() => router.push("/dashboard")} className="mt-3 text-gray-500 hover:text-gray-300 text-sm transition-colors block mx-auto">
              ← Вернуться на главную
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  // ── GAME OVER ───────────────────────────────────────────
  if (gameState === "gameover") {
    const rank = score >= 1500 ? { label: "Легенда", emoji: "👑", color: "text-yellow-400" }
               : score >= 900  ? { label: "Эксперт",  emoji: "💎", color: "text-purple-400" }
               : score >= 450  ? { label: "Защитник", emoji: "🛡️", color: "text-blue-400" }
               :                 { label: "Новичок",  emoji: "🌱", color: "text-gray-400" };
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full">
          <div className="bg-cyber-card border border-cyber-border rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-cyber-green" />
            <div className="p-8 text-center">
              <div className="text-5xl mb-2">{hp <= 0 ? "💀" : "🏆"}</div>
              <h2 className="text-white text-xl font-black mb-1">{hp <= 0 ? "Город пал..." : "Миссия выполнена!"}</h2>
              <p className="text-gray-400 text-sm mb-5">{hp <= 0 ? "HP опустился до нуля" : `Пройдено уровней: ${currentLevel + 1}/3`}</p>
              <div className="bg-cyber-dark rounded-xl p-4 mb-4">
                <div className="text-cyber-green text-4xl font-black">{score}</div>
                <div className="text-gray-400 text-sm">очков</div>
              </div>
              <div className={`text-xl font-bold mb-5 ${rank.color}`}>{rank.emoji} {rank.label}</div>
              <div className="grid grid-cols-2 gap-2 mb-5 text-sm">
                <div className="bg-cyber-dark rounded-lg p-3">
                  <div className="text-white font-bold">{Math.floor(score / 150)}</div>
                  <div className="text-gray-500 text-xs">Угроз отражено</div>
                </div>
                <div className="bg-cyber-dark rounded-lg p-3">
                  <div className="text-white font-bold">{currentLevel + 1}/3</div>
                  <div className="text-gray-500 text-xs">Уровней пройдено</div>
                </div>
              </div>
              <div className="space-y-2">
                <motion.button whileHover={{ scale: 1.02 }} onClick={startGame}
                  className="w-full bg-cyber-green text-black font-bold py-2.5 rounded-xl hover:bg-green-400 transition-colors">
                  Играть снова
                </motion.button>
                <button onClick={() => router.push("/dashboard")}
                  className="w-full border border-cyber-border text-gray-400 hover:text-white py-2.5 rounded-xl transition-colors text-sm">
                  На главную
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── LEVEL COMPLETE ──────────────────────────────────────
  if (gameState === "levelcomplete") return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 15 }} className="text-center max-w-sm w-full">
        <motion.div animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 3 }} className="text-8xl mb-4">🌀</motion.div>
        <h2 className="text-white text-3xl font-black mb-2">Уровень {currentLevel + 1} пройден!</h2>
        <p className="text-cyber-green mb-2">{LEVEL_EMOJIS[currentLevel]} {LEVEL_NAMES[currentLevel]} — завершено</p>
        <p className="text-gray-400 text-sm mb-6">Все угрозы нейтрализованы. Портал открыт!</p>
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 mb-6">
          <div className="text-cyber-green text-3xl font-black">{score}</div>
          <div className="text-gray-400 text-sm">очков набрано</div>
        </div>
        {currentLevel < 2 ? (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={startNextLevel}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black py-4 rounded-xl text-lg hover:from-purple-500 hover:to-blue-500 transition-all flex items-center justify-center gap-2">
            Уровень {currentLevel + 2}: {LEVEL_NAMES[currentLevel + 1]} {LEVEL_EMOJIS[currentLevel + 1]}
            <ChevronRight size={20} />
          </motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => setGameState("gameover")}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-black py-4 rounded-xl text-lg">
            👑 Финал! Посмотреть результат
          </motion.button>
        )}
      </motion.div>
    </div>
  );

  // ── PLAYING ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080810] flex flex-col select-none overflow-hidden">
      {/* Flash */}
      <AnimatePresence>
        {flashColor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none" style={{ backgroundColor: flashColor }} />
        )}
      </AnimatePresence>

      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/60 backdrop-blur-sm z-10 gap-2">
        <button onClick={() => setGameState("gameover")}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm shrink-0">
          <ChevronLeft size={16} /> Выход
        </button>

        {/* Level badge */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
          <span className="text-sm">{LEVEL_EMOJIS[currentLevel]}</span>
          <span className="text-xs text-gray-300 font-bold">Ур.{currentLevel + 1}</span>
        </div>

        {/* Zone progress */}
        <div className="flex items-center gap-1">
          {[ZONE.EMAIL, ZONE.BANK, ZONE.ATM, ZONE.CAFE, ZONE.HOME, ZONE.SOCIAL].map((z) => (
            <div key={z} className={`w-4 h-4 rounded-sm text-xs flex items-center justify-center transition-all ${correctZones.has(z) ? "bg-cyber-green" : "bg-white/10"}`}>
              {correctZones.has(z) ? "✓" : ""}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* HP */}
          <div className="flex items-center gap-1.5">
            <Heart size={13} style={{ color: hpColor }} />
            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div animate={{ width: `${hp}%` }} transition={{ duration: 0.3 }}
                className="h-full rounded-full" style={{ backgroundColor: hpColor }} />
            </div>
          </div>
          {/* Score */}
          <div className="flex items-center gap-1">
            <Star size={13} className="text-yellow-400" />
            <span className="text-white text-sm font-bold">{score}</span>
          </div>
          {/* Timer */}
          <div className={`flex items-center gap-1 ${timeLeft < 30 ? "text-red-400" : "text-gray-300"}`}>
            <Clock size={13} />
            <span className="text-sm font-mono font-bold">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          </div>
          {/* Hints button */}
          <button onClick={() => setShowHints(true)}
            className="w-7 h-7 rounded-full bg-yellow-600/30 border border-yellow-600/50 flex items-center justify-center hover:bg-yellow-600/50 transition-colors">
            <Lightbulb size={13} className="text-yellow-400" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
        <div className="relative border border-white/10 rounded-xl overflow-hidden shadow-2xl"
          style={{ width: MAP_COLS * TILE_SIZE, height: MAP_ROWS * TILE_SIZE }}>
          {/* Grid bg */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(0,255,136,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.03) 1px,transparent 1px)",
              backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`, backgroundColor: "#0a0a14",
            }} />

          {/* Tiles */}
          {MAP.map((row, y) => row.map((tile, x) => {
            if (tile === W) return (
              <div key={`${x}-${y}`} className="absolute"
                style={{ left: x*TILE_SIZE, top: y*TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, backgroundColor: "#0d0d20", borderRight: "1px solid #1a1a30", borderBottom: "1px solid #1a1a30" }} />
            );
            if (tile > 1) {
              const cfg = ZONE_CFG[tile];
              const cleared = correctZones.has(tile);
              return (
                <motion.div key={`${x}-${y}`}
                  animate={{ boxShadow: cleared
                    ? [`0 0 12px #00ff8860`, `0 0 20px #00ff8890`, `0 0 12px #00ff8860`]
                    : [`0 0 10px ${cfg.color}50`, `0 0 20px ${cfg.color}80`, `0 0 10px ${cfg.color}50`] }}
                  transition={{ repeat: Infinity, duration: cleared ? 1.5 : 2 }}
                  className="absolute flex flex-col items-center justify-center rounded-lg"
                  style={{ left: x*TILE_SIZE+3, top: y*TILE_SIZE+3, width: TILE_SIZE-6, height: TILE_SIZE-6,
                    backgroundColor: cleared ? "#00ff8820" : cfg.color + "25",
                    border: `1px solid ${cleared ? "#00ff88" : cfg.color}80` }}>
                  <span className="text-xl">{cleared ? "✅" : cfg.emoji}</span>
                  <span className="font-bold mt-0.5" style={{ color: cleared ? "#00ff88" : cfg.color, fontSize: "8px" }}>{cfg.name}</span>
                </motion.div>
              );
            }
            return null;
          }))}

          {/* Player */}
          <motion.div
            animate={{ x: playerPos.x * TILE_SIZE, y: playerPos.y * TILE_SIZE }}
            transition={{ type: "tween", duration: 0.09 }}
            className="absolute z-20 flex items-center justify-center"
            style={{ width: TILE_SIZE, height: TILE_SIZE }}>
            <motion.div animate={{ y: [0,-3,0] }} transition={{ repeat: Infinity, duration: 0.5 }}
              className="flex flex-col items-center">
              <span className="text-2xl" style={{ transform: playerDir === "left" ? "scaleX(-1)" : "none" }}>🧑</span>
              <motion.div animate={{ scaleX: [1,1.4,1], opacity: [0.5,0.2,0.5] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="w-5 h-1 rounded-full bg-cyber-green/40 -mt-1" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="text-center py-1 text-xs text-gray-600">
        WASD / стрелки · Войди во все {TOTAL_ZONES} зон чтобы открыть портал
      </div>

      {/* Hints panel */}
      <AnimatePresence>
        {showHints && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHints(false)}
              className="fixed inset-0 bg-black/60 z-40" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-cyber-card border-l border-cyber-border z-50 overflow-y-auto">
              <div className="sticky top-0 bg-cyber-card border-b border-cyber-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-yellow-400" />
                  <span className="text-white font-bold">Подсказки</span>
                </div>
                <button onClick={() => setShowHints(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {HINTS.map((h, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-cyber-dark border border-cyber-border rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{h.emoji}</span>
                      <span className="text-white text-sm font-bold">{h.title}</span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{h.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hacker Alert Modal */}
      <AnimatePresence>
        {hackerQ && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: -20 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 18 }}
              className="bg-red-950 border-2 border-red-500 rounded-2xl p-6 max-w-sm w-full">
              <div className="text-center mb-4">
                <motion.div animate={{ rotate: [0,-5,5,-3,3,0] }} transition={{ repeat: Infinity, duration: 0.6 }}
                  className="text-4xl mb-2">🚨</motion.div>
                <div className="text-red-400 font-black text-lg tracking-wide">ХАКЕРСКАЯ АТАКА!</div>
                <div className="text-red-300 text-xs mt-1">Отрази атаку чтобы защитить город</div>
              </div>
              {lastCorrect === null ? (
                <>
                  <div className="text-xs text-red-400 mb-1">{hackerQ.q.situation}</div>
                  <p className="text-white text-sm mb-4 leading-relaxed">{hackerQ.q.text}</p>
                  <div className="space-y-2">
                    {hackerQ.q.options.map((opt, i) => (
                      <motion.button key={i} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswer(i, hackerQ.q, hackerQ.zone, true)}
                        className="w-full text-left border border-red-800 bg-black/30 hover:border-red-400 rounded-xl px-3 py-2.5 text-sm text-white transition-all">
                        <span className="text-red-400 mr-2 font-mono">{String.fromCharCode(65+i)}.</span>{opt}
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <div className="text-4xl mb-2">{lastCorrect ? "✅" : "❌"}</div>
                  <div className={`font-black text-lg mb-2 ${lastCorrect ? "text-cyber-green" : "text-red-400"}`}>
                    {lastCorrect ? "Атака отражена! +150" : "Атака прошла! -20 HP"}
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed mb-4">{hackerQ.q.explanation}</p>
                  <button onClick={dismissQ}
                    className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors">
                    Продолжить →
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone Question Modal */}
      <AnimatePresence>
        {activeQ && !hackerQ && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-cyber-card border border-cyber-border rounded-2xl p-6 max-w-sm w-full">
              {lastCorrect === null ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{ZONE_CFG[activeQ.zone]?.emoji}</span>
                    <div>
                      <div className="text-white font-bold">{ZONE_CFG[activeQ.zone]?.name}</div>
                      <div className="text-xs text-gray-500">{activeQ.q.situation}</div>
                    </div>
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed mb-4">{activeQ.q.text}</p>
                  <div className="space-y-2">
                    {activeQ.q.options.map((opt, i) => (
                      <motion.button key={i} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswer(i, activeQ.q, activeQ.zone, false)}
                        className="w-full text-left border border-cyber-border bg-cyber-dark hover:border-cyber-green rounded-xl px-4 py-2.5 text-sm text-white transition-all">
                        <span className="text-gray-400 mr-2 font-mono">{String.fromCharCode(65+i)}.</span>{opt}
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <div className="text-4xl mb-3">{lastCorrect ? "✅" : "❌"}</div>
                  <div className={`font-black text-lg mb-2 ${lastCorrect ? "text-cyber-green" : "text-red-400"}`}>
                    {lastCorrect ? "+150 очков! +5 HP" : "-20 HP"}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">{activeQ.q.explanation}</p>
                  <button onClick={dismissQ}
                    className="w-full bg-cyber-green text-black font-bold py-2.5 rounded-xl hover:bg-green-400 transition-colors">
                    Продолжить →
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
