"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronDown, ExternalLink, Shield } from "lucide-react";
import { useAuthStore } from "@/lib/store";

const GUIDES = [
  {
    id: "phishing",
    icon: "🎣",
    title: "Фишинг и поддельные сайты",
    source: "Лаборатория Касперского",
    color: "border-red-500",
    accent: "text-red-400",
    bg: "bg-red-900/10",
    tips: [
      "Всегда проверяй адрес сайта в адресной строке — мошенники используют домены типа sberr.ru или gosuslugi-login.com.",
      "Проверяй наличие HTTPS (замочек) — но помни, что фишинговые сайты тоже могут иметь SSL-сертификат.",
      "Не переходи по ссылкам из писем — вводи адрес сайта вручную в браузере.",
      "Проверяй письмо на SPF/DKIM — легитимные банки и госорганы всегда имеют настроенную почтовую аутентификацию.",
      "Если письмо создаёт ощущение срочности («аккаунт заблокируют через 24 часа») — это классический приём давления. Позвони напрямую в организацию.",
      "Используй антифишинговые расширения браузера: Kaspersky Protection, Google Safe Browsing.",
    ],
  },
  {
    id: "passwords",
    icon: "🔐",
    title: "Надёжные пароли и брутфорс",
    source: "Минцифры РФ + Лаборатория Касперского",
    color: "border-blue-500",
    accent: "text-blue-400",
    bg: "bg-blue-900/10",
    tips: [
      "Минимальная длина надёжного пароля — 12 символов. Используй сочетание букв верхнего/нижнего регистра, цифр и спецсимволов.",
      "Не используй один пароль на нескольких сайтах — компрометация одного сервиса не должна открывать доступ к другим.",
      "Используй менеджер паролей: Kaspersky Password Manager, Bitwarden, 1Password.",
      "Включай двухфакторную аутентификацию (2FA) везде где это возможно — особенно для почты, банков, Госуслуг.",
      "Не используй в пароле личные данные: дату рождения, имя, номер телефона — они легко угадываются.",
      "Меняй пароль сразу при подозрении на компрометацию, а не «позже».",
    ],
  },
  {
    id: "social",
    icon: "🎭",
    title: "Социальная инженерия",
    source: "Лаборатория Касперского",
    color: "border-purple-500",
    accent: "text-purple-400",
    bg: "bg-purple-900/10",
    tips: [
      "Никто из легитимных организаций (банк, ФСБ, налоговая) никогда не попросит тебя назвать CVV карты или код из SMS.",
      "Схема «сотрудник банка» — классика: мошенник знает твоё имя, последние цифры карты и создаёт доверие. Это не значит что он настоящий.",
      "Если тебя торопят принять решение — это красный флаг. Легитимные организации дают время подумать.",
      "Перед тем как выполнить просьбу «коллеги» или «руководителя» в мессенджере — позвони ему голосом по известному тебе номеру.",
      "Дипфейки голоса и видео — реальная угроза. Подозрительный звонок с просьбой перевода денег — всегда проверяй лично.",
      "Не публикуй в открытом доступе рабочие данные, расписание, имена коллег — это сырьё для атак социальной инженерии.",
    ],
  },
  {
    id: "vishing",
    icon: "📞",
    title: "Вишинг (телефонное мошенничество)",
    source: "Минцифры РФ",
    color: "border-orange-500",
    accent: "text-orange-400",
    bg: "bg-orange-900/10",
    tips: [
      "Номер звонящего можно подделать (спуфинг) — даже если определитель показывает «Сбербанк», это может быть мошенник.",
      "Банк никогда не звонит с просьбой назвать полный номер карты, CVV или коды подтверждения из SMS.",
      "При подозрительном звонке — положи трубку и сам перезвони в банк по номеру на обороте карты или официальном сайте.",
      "Подключи услугу «Мобильный антивирус» или «Защита от мошенников» у своего оператора.",
      "Установи приложение «Антиспам» — Яндекс, Kaspersky или GetContact помогают идентифицировать мошеннические номера.",
      "Никогда не устанавливай приложения по просьбе «сотрудника банка» — это инструмент удалённого доступа к твоему устройству.",
    ],
  },
  {
    id: "skimming",
    icon: "💳",
    title: "Скимминг и безопасность карт",
    source: "Лаборатория Касперского + Минцифры РФ",
    color: "border-yellow-500",
    accent: "text-yellow-400",
    bg: "bg-yellow-900/10",
    tips: [
      "Перед использованием банкомата осмотри картридер — накладки для скимминга часто шатаются или выглядят чужеродно.",
      "Прикрывай рукой клавиатуру при вводе PIN-кода — скиммеры часто используют мини-камеру.",
      "Используй бесконтактную оплату (NFC) вместо вставки карты — данные при этом труднее перехватить.",
      "Подключи SMS/push-уведомления о каждой операции по карте — это позволит мгновенно заметить несанкционированное списание.",
      "Установи лимиты на операции в интернете и за рубежом в мобильном приложении банка.",
      "Для онлайн-покупок используй виртуальную карту с ограниченным балансом.",
    ],
  },
  {
    id: "publicwifi",
    icon: "📶",
    title: "Публичный Wi-Fi",
    source: "Лаборатория Касперского",
    color: "border-cyan-500",
    accent: "text-cyan-400",
    bg: "bg-cyan-900/10",
    tips: [
      "Публичный Wi-Fi без пароля — потенциальная ловушка. Не вводи пароли и платёжные данные в таких сетях.",
      "Атака «evil twin»: мошенник создаёт точку доступа с именем «Free_Airport_WiFi» — всё что ты делаешь проходит через его устройство.",
      "Используй VPN при подключении к публичным сетям — это шифрует весь твой трафик.",
      "Проверяй точное имя сети у персонала заведения — не подключайся к «похожим» именам.",
      "Включи в настройках устройства «Не подключаться автоматически к открытым сетям».",
      "Для важных операций (банк, госуслуги) используй мобильный интернет, а не публичный Wi-Fi.",
    ],
  },
];

export default function GuidesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [openId, setOpenId] = useState<string | null>("phishing");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!user) router.push("/");
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-cyber-dark">
      <header className="border-b border-cyber-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft />
        </button>
        <BookOpen className="text-cyber-green" size={20} />
        <span className="text-white font-bold">Гайды по защите</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <p className="text-gray-400 text-sm mb-6">
          Рекомендации Минцифры РФ и Лаборатории Касперского — проверенные способы защиты в реальных ситуациях.
        </p>

        {GUIDES.map((guide, i) => (
          <motion.div
            key={guide.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`border rounded-xl overflow-hidden ${guide.color} bg-cyber-card`}
          >
            {/* Header row */}
            <button
              onClick={() => setOpenId(openId === guide.id ? null : guide.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{guide.icon}</span>
                <div>
                  <div className="text-white font-semibold">{guide.title}</div>
                  <div className={`text-xs mt-0.5 ${guide.accent}`}>{guide.source}</div>
                </div>
              </div>
              <ChevronDown
                size={18}
                className={`text-gray-400 transition-transform duration-200 ${openId === guide.id ? "rotate-180" : ""}`}
              />
            </button>

            {/* Tips */}
            <AnimatePresence initial={false}>
              {openId === guide.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`overflow-hidden ${guide.bg}`}
                >
                  <ul className="px-5 py-4 space-y-3 border-t border-cyber-border">
                    {guide.tips.map((tip, j) => (
                      <li key={j} className="flex gap-3 text-sm text-gray-300">
                        <Shield size={14} className={`mt-0.5 shrink-0 ${guide.accent}`} />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Sources */}
        <div className="pt-4 border-t border-cyber-border">
          <p className="text-gray-500 text-xs mb-2">Источники:</p>
          <div className="space-y-1">
            {[
              { label: "Минцифры РФ — Цифровая грамотность", url: "https://www.gosuslugi.ru/cybersecurity" },
              { label: "Лаборатория Касперского — Для пользователей", url: "https://www.kaspersky.ru/resource-center" },
              { label: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/" },
            ].map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyber-green transition-colors"
              >
                <ExternalLink size={11} /> {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
