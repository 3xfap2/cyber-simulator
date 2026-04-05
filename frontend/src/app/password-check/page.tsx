"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, ChevronLeft, Copy, RefreshCw, CheckCircle } from "lucide-react";

// ─── Password analysis engine ─────────────────────────────────────────────────

const COMMON_PATTERNS = [
  "password", "пароль", "qwerty", "йцукен", "123456", "111111", "abc123",
  "iloveyou", "admin", "letmein", "monkey", "dragon", "master", "hello",
  "sunshine", "princess", "welcome", "shadow", "superman", "batman",
];

const KEYBOARD_ROWS = [
  "qwertyuiop", "asdfghjkl", "zxcvbnm",
  "йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю",
  "1234567890",
];

function detectPatterns(pwd: string): string[] {
  const lower = pwd.toLowerCase();
  const found: string[] = [];

  // Common words
  if (COMMON_PATTERNS.some((p) => lower.includes(p))) {
    found.push("Содержит распространённое слово или пароль из списка утечек");
  }

  // Sequences (abc, 123, xyz)
  let seqCount = 0;
  for (let i = 0; i < pwd.length - 2; i++) {
    const diff1 = pwd.charCodeAt(i + 1) - pwd.charCodeAt(i);
    const diff2 = pwd.charCodeAt(i + 2) - pwd.charCodeAt(i + 1);
    if (Math.abs(diff1) === 1 && diff1 === diff2) seqCount++;
  }
  if (seqCount >= 2) found.push("Содержит последовательные символы (abc, 123)");

  // Keyboard walk
  const flat = KEYBOARD_ROWS.join("");
  for (let i = 0; i < pwd.length - 2; i++) {
    const sub = pwd.slice(i, i + 3).toLowerCase();
    if (flat.includes(sub)) { found.push("Клавиатурная дорожка (qwer, asdf)"); break; }
  }

  // Repeating characters
  if (/(.)\1{2,}/.test(pwd)) found.push("Повторяющиеся символы (aaa, 111)");

  // Only one character type
  if (/^[a-zA-Zа-яА-Я]+$/.test(pwd)) found.push("Только буквы — нет цифр или символов");
  if (/^\d+$/.test(pwd)) found.push("Только цифры");

  // Looks like a date
  if (/\b(19|20)\d{2}\b/.test(pwd) || /\b\d{2}[.\-/]\d{2}[.\-/]\d{2,4}\b/.test(pwd)) {
    found.push("Похоже на дату рождения");
  }

  // Short
  if (pwd.length < 8) found.push("Слишком короткий — минимум 8 символов");

  return found;
}

function calcEntropy(pwd: string): number {
  let charset = 0;
  if (/[a-z]/.test(pwd)) charset += 26;
  if (/[A-Z]/.test(pwd)) charset += 26;
  if (/[а-яё]/.test(pwd)) charset += 33;
  if (/[А-ЯЁ]/.test(pwd)) charset += 33;
  if (/\d/.test(pwd)) charset += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) charset += 32;
  if (charset === 0) return 0;
  return Math.round(pwd.length * Math.log2(charset));
}

function entropyToTime(bits: number): string {
  // Assuming 10 billion guesses/sec (GPU cluster)
  const guesses = Math.pow(2, bits);
  const perSec = 1e10;
  const seconds = guesses / perSec / 2; // average half keyspace

  if (seconds < 1) return "мгновенно";
  if (seconds < 60) return `${Math.round(seconds)} сек`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ч`;
  if (seconds < 86400 * 30) return `${Math.round(seconds / 86400)} дней`;
  if (seconds < 86400 * 365) return `${Math.round(seconds / 86400 / 30)} месяцев`;
  if (seconds < 86400 * 365 * 1000) return `${Math.round(seconds / 86400 / 365)} лет`;
  if (seconds < 86400 * 365 * 1e6) return `${(seconds / 86400 / 365 / 1000).toFixed(0)} тыс. лет`;
  return "миллиарды лет";
}

interface PasswordAnalysis {
  entropy: number;
  strength: 0 | 1 | 2 | 3 | 4; // 0=empty, 1=very weak, 2=weak, 3=medium, 4=strong
  label: string;
  color: string;
  barColor: string;
  crackTime: string;
  patterns: string[];
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  hasCyrillic: boolean;
  length: number;
}

function analyzePassword(pwd: string): PasswordAnalysis {
  const entropy = calcEntropy(pwd);
  const patterns = pwd ? detectPatterns(pwd) : [];
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd);
  const hasCyrillic = /[а-яёА-ЯЁ]/.test(pwd);

  let strength: 0 | 1 | 2 | 3 | 4 = 0;
  if (!pwd) strength = 0;
  else if (entropy < 28) strength = 1;
  else if (entropy < 40) strength = 2;
  else if (entropy < 60) strength = 3;
  else strength = 4;

  // Penalize for patterns
  if (patterns.length >= 2 && strength > 1) strength = (strength - 1) as 1 | 2 | 3;

  const labels = ["", "Очень слабый", "Слабый", "Средний", "Надёжный"];
  const colors = ["", "text-red-500", "text-orange-400", "text-yellow-400", "text-green-400"];
  const barColors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];

  return {
    entropy,
    strength,
    label: labels[strength],
    color: colors[strength],
    barColor: barColors[strength],
    crackTime: pwd ? entropyToTime(entropy) : "—",
    patterns,
    hasLower, hasUpper, hasDigit, hasSymbol, hasCyrillic,
    length: pwd.length,
  };
}

// ─── Password generator ───────────────────────────────────────────────────────

function generatePassword(length = 16): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{}";
  const all = lower + upper + digits + symbols;
  let pwd = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  for (let i = 4; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  // shuffle
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }
  return pwd.join("");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PasswordCheckPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [genLength, setGenLength] = useState(16);

  const analysis = useMemo(() => analyzePassword(password), [password]);

  const handleCopy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGenerate = () => {
    setPassword(generatePassword(genLength));
    setShowPassword(true);
  };

  const charChecks = [
    { label: "Строчные буквы (a-z)", ok: analysis.hasLower },
    { label: "Заглавные буквы (A-Z)", ok: analysis.hasUpper },
    { label: "Цифры (0-9)", ok: analysis.hasDigit },
    { label: "Символы (!@#$...)", ok: analysis.hasSymbol },
    { label: "Длина ≥ 12 символов", ok: analysis.length >= 12 },
    { label: "Длина ≥ 16 символов", ok: analysis.length >= 16 },
  ];

  const tips = [
    "Используй фразу из 4+ случайных слов: «Кот-Луна-Вилка-2024!»",
    "Не используй одинаковые пароли для разных сайтов",
    "Включи двухфакторную аутентификацию (2FA) везде где можно",
    "Используй менеджер паролей (Bitwarden, 1Password, KeePass)",
    "Никогда не сохраняй пароли в заметках или браузере на общем ПК",
    "Меняй пароли после известных утечек (проверь haveibeenpwned.com)",
  ];

  return (
    <div className="min-h-screen bg-cyber-dark">
      {/* Header */}
      <header className="border-b border-cyber-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-cyber-green w-7 h-7" />
          <span className="text-white font-bold text-lg">Cyber<span className="text-cyber-green">Sim</span></span>
          <span className="text-gray-600 mx-2">|</span>
          <span className="text-cyan-400 font-semibold">🔐 Анализатор паролей</span>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Дашборд
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-cyber-card border border-cyber-border rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-1">Проверь свой пароль</h2>
          <p className="text-gray-500 text-xs mb-4">Пароль анализируется локально — никуда не отправляется</p>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введи пароль для проверки..."
              className="w-full bg-cyber-dark border border-cyber-border rounded-xl px-4 py-3 pr-20 text-white placeholder-gray-600 outline-none focus:border-cyber-green transition-colors font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {password && (
                <button onClick={handleCopy} className="text-gray-500 hover:text-cyber-green transition-colors">
                  {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              )}
              <button onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-white transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Strength bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-sm font-bold ${analysis.color}`}>
                {password ? analysis.label : "Введи пароль"}
              </span>
              {password && (
                <span className="text-xs text-gray-500 font-mono">{analysis.length} симв. · {analysis.entropy} бит</span>
              )}
            </div>
            <div className="h-2.5 bg-cyber-dark rounded-full overflow-hidden flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <motion.div key={i}
                  className={`flex-1 rounded-full transition-all duration-500 ${analysis.strength >= i ? analysis.barColor : "bg-gray-800"}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Analysis panels */}
        {password && (
          <AnimatePresence>
            <motion.div key="analysis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-4">

              {/* Crack time */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Время взлома (GPU-кластер, 10 млрд попыток/сек)</p>
                <p className={`text-2xl font-bold ${analysis.color}`}>{analysis.crackTime}</p>
              </div>

              {/* Character checks */}
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-4 col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Состав пароля</p>
                <div className="grid grid-cols-2 gap-2">
                  {charChecks.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.ok ? "bg-green-500" : "bg-gray-800 border border-gray-700"}`}>
                        {c.ok && <span className="text-[8px] text-black font-bold">✓</span>}
                      </div>
                      <span className={`text-xs ${c.ok ? "text-gray-300" : "text-gray-600"}`}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patterns / warnings */}
              {analysis.patterns.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-2 bg-red-950/30 border border-red-800/40 rounded-xl p-4">
                  <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-bold">⚠ Обнаружены проблемы</p>
                  <ul className="space-y-1.5">
                    {analysis.patterns.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-300">
                        <span className="shrink-0 mt-0.5">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {analysis.strength === 4 && analysis.patterns.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-2 bg-green-950/30 border border-green-800/40 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="text-green-400 shrink-0" size={20} />
                  <p className="text-sm text-green-300">Отличный пароль! Высокая энтропия, нет очевидных паттернов.</p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Generator */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-cyber-card border border-cyber-border rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <RefreshCw size={16} className="text-cyber-green" /> Генератор надёжного пароля
          </h3>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-gray-400 shrink-0">Длина: <span className="text-white font-bold">{genLength}</span></span>
            <input
              type="range" min={8} max={32} value={genLength}
              onChange={(e) => setGenLength(Number(e.target.value))}
              className="flex-1 accent-cyber-green"
            />
          </div>

          <button
            onClick={handleGenerate}
            className="w-full bg-cyber-green hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Сгенерировать пароль
          </button>

          {password && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Нажми <Copy size={10} className="inline" /> рядом с паролем чтобы скопировать
            </p>
          )}
        </motion.div>

        {/* Tips */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-cyber-card border border-cyber-border rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">💡 Золотые правила паролей</h3>
          <ul className="space-y-3">
            {tips.map((tip, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 text-sm text-gray-300">
                <span className="text-cyber-green shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                {tip}
              </motion.li>
            ))}
          </ul>
        </motion.div>

      </div>
    </div>
  );
}
