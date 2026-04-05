"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  User,
  Shield,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  BarChart3,
  AlertTriangle,
  X,
  Brain,
  Flag,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trophy,
} from "lucide-react";
import { progressApi, achievementsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

const LEAGUE_CONFIG = {
  novice: { label: "Новичок", color: "text-gray-400", bgColor: "bg-gray-900/50", emoji: "🌱" },
  defender: { label: "Защитник", color: "text-blue-400", bgColor: "bg-blue-900/50", emoji: "🛡️" },
  expert: { label: "Эксперт", color: "text-purple-400", bgColor: "bg-purple-900/50", emoji: "⚔️" },
  master: { label: "Мастер", color: "text-yellow-400", bgColor: "bg-yellow-900/50", emoji: "👑" },
};

const ATTACK_TYPE_LABELS: Record<string, string> = {
  phishing: "Фишинг",
  vishing: "Вишинг",
  skimming: "Скимминг",
  social_engineering: "Соц. инженерия",
  brute_force: "Подбор пароля",
};

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: "Лёгкий", color: "text-green-400 bg-green-900/30" },
  medium: { label: "Средний", color: "text-yellow-400 bg-yellow-900/30" },
  hard: { label: "Тяжёлый", color: "text-red-400 bg-red-900/30" },
};

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [achievements, setAchievements] = useState<any[]>([]);

  // Mistakes modal state
  const [showMistakes, setShowMistakes] = useState(false);
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [mistakesLoading, setMistakesLoading] = useState(false);
  const [expandedMistake, setExpandedMistake] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.push("/"); return; }
    loadData();
  }, [mounted]);

  const loadData = async () => {
    try {
      const [statsRes, progressRes, achRes] = await Promise.allSettled([
        progressApi.getStats(),
        progressApi.getMyProgress(),
        achievementsApi.getMy(),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (progressRes.status === "fulfilled") setProgress(progressRes.value.data);
      if (achRes.status === "fulfilled") setAchievements(achRes.value.data);
      if ([statsRes, progressRes, achRes].some((r) => r.status === "rejected")) {
        toast.error("Часть данных не загрузилась");
      }
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const openMistakes = async () => {
    setShowMistakes(true);
    if (mistakes.length > 0 || aiAnalysis) return;
    setMistakesLoading(true);
    try {
      const [mistakesRes, analysisRes] = await Promise.all([
        progressApi.getMistakes(),
        progressApi.getAiAnalysis(),
      ]);
      setMistakes(mistakesRes.data);
      setAiAnalysis(analysisRes.data);
    } catch {
      toast.error("Ошибка загрузки разбора ошибок");
    } finally {
      setMistakesLoading(false);
    }
  };

  if (!mounted || !user || loading) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-cyber-green animate-pulse text-xl">Загрузка...</div>
      </div>
    );
  }

  const leagueInfo = LEAGUE_CONFIG[user.league as keyof typeof LEAGUE_CONFIG];
  const hpColor = (user.current_hp ?? 100) > 60 ? "bg-cyber-green" : (user.current_hp ?? 100) > 30 ? "bg-yellow-400" : "bg-cyber-red";

  // Calculate attack type stats
  const attackTypeStats = progress.reduce((acc: any, p: any) => {
    const type = p.scenario?.attack_type;
    if (!type) return acc;
    if (!acc[type]) acc[type] = { total: 0, correct: 0 };
    acc[type].total++;
    if (p.completed) acc[type].correct++;
    return acc;
  }, {});

  const totalAttempts = stats?.total_attacks_faced || 0;
  const totalBlocked = stats?.total_attacks_blocked || 0;
  const totalFailed = totalAttempts - totalBlocked;
  const successRate = totalAttempts > 0 ? Math.round((totalBlocked / totalAttempts) * 100) : 0;

  return (
    <div className="min-h-screen bg-cyber-dark">
      {/* Header */}
      <header className="border-b border-cyber-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <User className="text-cyber-green" size={20} />
          <span className="text-white font-bold">Личный кабинет</span>
        </div>
        <button
          onClick={openMistakes}
          className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 hover:border-red-500 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
          <AlertTriangle size={15} />
          Разбор ошибок
          {totalFailed > 0 && (
            <span className="bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{totalFailed}</span>
          )}
        </button>
      </header>

      {/* Mistakes Modal */}
      <AnimatePresence>
        {showMistakes && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMistakes(false)}
              className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-cyber-card border-l border-cyber-border z-50 overflow-y-auto"
            >
              {/* Modal header */}
              <div className="sticky top-0 bg-cyber-card border-b border-cyber-border px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-red-400" size={20} />
                  <span className="text-white font-bold text-lg">Разбор ошибок</span>
                  {!mistakesLoading && (
                    <span className="text-gray-400 text-sm">({mistakes.length})</span>
                  )}
                </div>
                <button onClick={() => setShowMistakes(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {mistakesLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="text-cyber-green animate-spin" size={32} />
                    <p className="text-gray-400 text-sm">ИИ анализирует твои ошибки...</p>
                  </div>
                ) : (
                  <>
                    {/* AI Analysis block */}
                    {aiAnalysis && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-900/40 to-blue-900/30 border border-purple-700/40 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="text-purple-400" size={18} />
                          <span className="text-purple-300 font-bold text-sm">AI-анализ от тренера</span>
                        </div>
                        {aiAnalysis.total_mistakes === 0 ? (
                          <p className="text-green-400 text-sm">Отличная работа! Пока ошибок нет. Продолжай в том же духе.</p>
                        ) : (
                          <>
                            {aiAnalysis.weakest_attack_type && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-400">Главная слабость:</span>
                                <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full border border-red-700/40">
                                  {ATTACK_TYPE_LABELS[aiAnalysis.weakest_attack_type] || aiAnalysis.weakest_attack_type}
                                </span>
                              </div>
                            )}
                            <p className="text-gray-200 text-sm leading-relaxed">{aiAnalysis.analysis}</p>
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* No mistakes */}
                    {mistakes.length === 0 && (
                      <div className="text-center py-12">
                        <CheckCircle size={40} className="text-cyber-green mx-auto mb-3" />
                        <p className="text-white font-bold">Ошибок нет!</p>
                        <p className="text-gray-500 text-sm mt-1">Ты справился со всеми сценариями верно</p>
                      </div>
                    )}

                    {/* Mistakes list */}
                    {mistakes.map((m: any, i: number) => {
                      const diff = DIFFICULTY_CONFIG[m.difficulty] || DIFFICULTY_CONFIG.medium;
                      const isOpen = expandedMistake === i;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="bg-cyber-dark border border-cyber-border rounded-xl overflow-hidden"
                        >
                          {/* Mistake header — clickable */}
                          <button
                            onClick={() => setExpandedMistake(isOpen ? null : i)}
                            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-white text-sm font-medium leading-tight line-clamp-2">{m.title}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-gray-500">
                                    {ATTACK_TYPE_LABELS[m.attack_type] || m.attack_type}
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${diff.color}`}>
                                    {diff.label}
                                  </span>
                                  {m.attempts > 1 && (
                                    <span className="text-xs text-gray-600">{m.attempts} попытки</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isOpen ? (
                              <ChevronUp size={16} className="text-gray-500 shrink-0" />
                            ) : (
                              <ChevronDown size={16} className="text-gray-500 shrink-0" />
                            )}
                          </button>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-1 border-t border-cyber-border space-y-3">
                                  {/* Explanation */}
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Что произошло</p>
                                    <p className="text-gray-300 text-sm leading-relaxed">{m.explanation}</p>
                                  </div>

                                  {/* Red flags */}
                                  {m.red_flags && m.red_flags.length > 0 && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                                        <Flag size={11} /> Признаки атаки которые нужно было заметить
                                      </p>
                                      <ul className="space-y-1">
                                        {m.red_flags.map((flag: string, fi: number) => (
                                          <li key={fi} className="flex items-start gap-2 text-sm">
                                            <span className="text-red-400 mt-0.5 shrink-0">•</span>
                                            <span className="text-gray-400">{flag}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* User profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cyber-card border border-cyber-border rounded-xl p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyber-green to-green-900 flex items-center justify-center text-3xl font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">{user.username}</h1>
              <div className={`flex items-center gap-2 mt-1 ${leagueInfo.color}`}>
                <span className="text-xl">{leagueInfo.emoji}</span>
                <span className="font-medium">{leagueInfo.label}</span>
              </div>
            </div>
          </div>

          {/* HP Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-cyber-green" />
                <span>Уровень защиты</span>
              </div>
              <span className="font-bold">{user.current_hp ?? 100}/100 HP</span>
            </div>
            <div className="h-4 bg-cyber-dark rounded-full overflow-hidden border border-cyber-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${user.current_hp ?? 100}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={`h-full rounded-full ${hpColor}`}
              />
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center justify-between bg-cyber-dark rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Award className="text-yellow-400" size={24} />
              <span className="text-gray-400">Общий счёт</span>
            </div>
            <span className="text-cyber-green text-3xl font-bold">{user.total_score ?? 0}</span>
          </div>
        </motion.div>

        {/* Overall statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-cyber-card border border-cyber-border rounded-xl p-6"
        >
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="text-cyber-green" size={20} />
            Общая статистика
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-cyber-dark rounded-lg p-4 text-center">
              <div className="text-cyber-green flex justify-center mb-2">
                <Target size={20} />
              </div>
              <div className="text-white text-2xl font-bold">{successRate}%</div>
              <div className="text-gray-500 text-xs mt-1">Точность</div>
            </div>

            <div className="bg-cyber-dark rounded-lg p-4 text-center">
              <div className="text-green-400 flex justify-center mb-2">
                <CheckCircle size={20} />
              </div>
              <div className="text-white text-2xl font-bold">{totalBlocked}</div>
              <div className="text-gray-500 text-xs mt-1">Атак отражено</div>
            </div>

            <div className="bg-cyber-dark rounded-lg p-4 text-center">
              <div className="text-red-400 flex justify-center mb-2">
                <XCircle size={20} />
              </div>
              <div className="text-white text-2xl font-bold">{totalFailed}</div>
              <div className="text-gray-500 text-xs mt-1">Ошибок допущено</div>
            </div>

            <div className="bg-cyber-dark rounded-lg p-4 text-center">
              <div className="text-yellow-400 flex justify-center mb-2">
                <TrendingUp size={20} />
              </div>
              <div className="text-white text-2xl font-bold">{stats?.progress_percent || 0}%</div>
              <div className="text-gray-500 text-xs mt-1">Прогресс</div>
            </div>
          </div>
        </motion.div>

        {/* Attack types breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-cyber-card border border-cyber-border rounded-xl p-6"
        >
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Shield className="text-cyber-green" size={20} />
            Статистика по типам атак
          </h2>

          <div className="space-y-3">
            {Object.entries(attackTypeStats).map(([type, data]: [string, any]) => {
              const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              const barColor = percentage >= 80 ? "bg-cyber-green" : percentage >= 50 ? "bg-yellow-400" : "bg-red-400";

              return (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{ATTACK_TYPE_LABELS[type] || type}</span>
                    <span className="text-gray-400 font-mono text-xs">
                      {data.correct}/{data.total} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-cyber-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(attackTypeStats).length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Пока нет пройденных сценариев</p>
            </div>
          )}
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-cyber-card border border-cyber-border rounded-xl p-6"
        >
          <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            Достижения
            <span className="text-gray-500 text-sm font-normal ml-1">
              {achievements.filter((a) => a.earned).length}/{achievements.length}
            </span>
          </h2>
          <p className="text-gray-500 text-xs mb-4">Выполняй задания — получай награды</p>

          <div className="grid grid-cols-2 gap-3">
            {achievements.map((ach: any) => {
              const rarityBorder: Record<string, string> = {
                common: "border-gray-700",
                rare: "border-blue-700",
                epic: "border-purple-700",
                legendary: "border-yellow-500",
              };
              const rarityLabel: Record<string, string> = {
                common: "text-gray-500",
                rare: "text-blue-400",
                epic: "text-purple-400",
                legendary: "text-yellow-400",
              };
              return (
                <motion.div
                  key={ach.id}
                  whileHover={{ scale: ach.earned ? 1.02 : 1 }}
                  className={`relative border rounded-xl p-3 transition-all ${
                    ach.earned
                      ? rarityBorder[ach.rarity] + " bg-cyber-dark"
                      : "border-cyber-border bg-cyber-dark/40 opacity-50"
                  }`}
                >
                  {ach.earned && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-cyber-green rounded-full flex items-center justify-center"
                    >
                      <span className="text-black text-xs font-black">✓</span>
                    </motion.div>
                  )}
                  <div className="text-2xl mb-1.5">{ach.earned ? ach.icon : "🔒"}</div>
                  <div className="text-white text-xs font-bold leading-tight">{ach.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5 leading-tight">{ach.desc}</div>
                  <div className={`text-xs mt-1.5 font-medium capitalize ${rarityLabel[ach.rarity]}`}>
                    {ach.rarity === "common" ? "Обычное" : ach.rarity === "rare" ? "Редкое" : ach.rarity === "epic" ? "Эпическое" : "Легендарное"}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {achievements.length === 0 && (
            <div className="text-center text-gray-500 py-6 text-sm">Пройди первый сценарий чтобы открыть достижения</div>
          )}
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-cyber-card border border-cyber-border rounded-xl p-6"
        >
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="text-cyber-green" size={20} />
            Последние попытки
          </h2>

          <div className="space-y-2">
            {progress.slice(0, 10).map((p: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between bg-cyber-dark rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {p.completed ? (
                    <CheckCircle size={16} className="text-cyber-green shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-white text-sm">{p.scenario?.title || "Неизвестный сценарий"}</div>
                    <div className="text-gray-500 text-xs">
                      {ATTACK_TYPE_LABELS[p.scenario?.attack_type] || p.scenario?.attack_type}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">{p.attempts || 1} попыток</div>
                </div>
              </motion.div>
            ))}
          </div>

          {progress.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">История попыток пуста</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
