"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Target, Trophy, Star, ChevronRight, LogOut,
  Award, User, BookOpen, Settings, Gamepad2, ClipboardList, GraduationCap,
} from "lucide-react";
import { scenariosApi, progressApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

const LEAGUE_COLORS: Record<string, string> = {
  novice: "text-gray-400",
  defender: "text-blue-400",
  expert: "text-purple-400",
  master: "text-yellow-400",
};
const LEAGUE_LABELS: Record<string, string> = {
  novice: "Новичок",
  defender: "Защитник",
  expert: "Эксперт",
  master: "Мастер",
};
const LOCATION_ICONS: Record<string, string> = {
  office: "🏢",
  home: "🏠",
  public_wifi: "📶",
  social: "📱",
};

type Section = "games" | "tests";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [levels, setLevels] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState<Section>("tests");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.push("/"); return; }
    loadData();
  }, [mounted]);

  const loadData = async () => {
    try {
      const [levelsRes, statsRes, progressRes] = await Promise.allSettled([
        scenariosApi.getLevels(),
        progressApi.getStats(),
        progressApi.getMyProgress(),
      ]);

      if (levelsRes.status === "fulfilled") setLevels(levelsRes.value.data);
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
        updateUser({
          total_score: statsRes.value.data.total_score,
          current_hp: statsRes.value.data.current_hp,
          league: statsRes.value.data.league,
        });
      }
      if (progressRes.status === "fulfilled") setProgress(progressRes.value.data);
    } catch {
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); router.push("/"); };

  if (!mounted || !user || loading) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-cyber-green animate-pulse text-xl">Загрузка...</div>
      </div>
    );
  }

  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.scenario_id));
  const hpColor = user.current_hp > 60 ? "bg-cyber-green" : user.current_hp > 30 ? "bg-yellow-400" : "bg-cyber-red";

  return (
    <div className="min-h-screen bg-cyber-dark">
      {/* ── Header ── */}
      <header className="border-b border-cyber-border px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Shield className="text-cyber-green w-7 h-7" />
          <span className="text-white font-bold text-lg">Cyber<span className="text-cyber-green">Sim</span></span>
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/profile")} className="text-gray-400 hover:text-cyber-green transition-colors text-sm flex items-center gap-1">
            <User size={16} /> Профиль
          </button>
          {(user.is_admin || user.username === "admin") && (
            <button onClick={() => router.push("/admin")} className="text-red-400 hover:text-red-300 transition-colors text-sm flex items-center gap-1">
              <Settings size={16} /> Админ
            </button>
          )}
          <button onClick={() => router.push("/guides")} className="text-gray-400 hover:text-cyber-green transition-colors text-sm flex items-center gap-1">
            <BookOpen size={16} /> Гайды
          </button>
          <button onClick={() => router.push("/leaderboard")} className="text-gray-400 hover:text-cyber-green transition-colors text-sm flex items-center gap-1">
            <Trophy size={16} /> Рейтинг
          </button>
          <button onClick={handleLogout} className="text-gray-400 hover:text-cyber-red transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── User stats card ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-cyber-card border border-cyber-border rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-bold">{user.username}</h2>
              <span className={`text-sm font-medium ${LEAGUE_COLORS[user.league]}`}>
                ★ {LEAGUE_LABELS[user.league]}
              </span>
            </div>
            <div className="text-right">
              <div className="text-cyber-green text-2xl font-bold">{user.total_score}</div>
              <div className="text-gray-400 text-xs">очков</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Уровень защиты</span>
              <span>{user.current_hp}/100 HP</span>
            </div>
            <div className="h-3 bg-cyber-dark rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${user.current_hp}%` }}
                transition={{ duration: 1 }}
                className={`h-full rounded-full ${hpColor} hp-bar-fill`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Атак отражено", value: stats?.total_attacks_blocked || 0, icon: <Shield size={14} /> },
              { label: "Точность", value: `${stats?.accuracy || 0}%`, icon: <Target size={14} /> },
              { label: "Прогресс", value: `${stats?.progress_percent || 0}%`, icon: <Star size={14} /> },
            ].map((s, i) => (
              <div key={i} className="bg-cyber-dark rounded-lg p-3 text-center">
                <div className="text-cyber-green flex justify-center mb-1">{s.icon}</div>
                <div className="text-white font-bold">{s.value}</div>
                <div className="text-gray-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Section switcher ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          {/* Тесты */}
          <button
            onClick={() => setSection("tests")}
            className={`relative rounded-2xl p-6 border-2 transition-all duration-300 text-left overflow-hidden group ${
              section === "tests"
                ? "border-cyber-green bg-cyber-green/10 shadow-[0_0_24px_rgba(0,255,136,0.15)]"
                : "border-cyber-border bg-cyber-card hover:border-cyber-green/50"
            }`}
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity`}
              style={{ backgroundImage: "linear-gradient(135deg, #00ff88 25%, transparent 25%)", backgroundSize: "10px 10px" }} />
            <ClipboardList className={`w-8 h-8 mb-3 ${section === "tests" ? "text-cyber-green" : "text-gray-500"}`} />
            <h3 className={`text-xl font-bold mb-1 ${section === "tests" ? "text-white" : "text-gray-400"}`}>Тесты</h3>
            <p className="text-gray-500 text-sm">4 уровня · сценарии кибератак · очки и лига</p>
            <div className="flex items-center gap-2 mt-3">
              {levels.slice(0, 4).map((l) => (
                <span key={l.id} className="text-lg">{LOCATION_ICONS[l.location]}</span>
              ))}
            </div>
            {section === "tests" && (
              <motion.div layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-cyber-green rounded-b-2xl" />
            )}
          </button>

          {/* Игры */}
          <button
            onClick={() => setSection("games")}
            className={`relative rounded-2xl p-6 border-2 transition-all duration-300 text-left overflow-hidden group ${
              section === "games"
                ? "border-purple-500 bg-purple-500/10 shadow-[0_0_24px_rgba(168,85,247,0.15)]"
                : "border-cyber-border bg-cyber-card hover:border-purple-500/50"
            }`}
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity`}
              style={{ backgroundImage: "radial-gradient(circle, #a855f7 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
            <Gamepad2 className={`w-8 h-8 mb-3 ${section === "games" ? "text-purple-400" : "text-gray-500"}`} />
            <h3 className={`text-xl font-bold mb-1 ${section === "games" ? "text-white" : "text-gray-400"}`}>Игры</h3>
            <p className="text-gray-500 text-sm">9 режимов · игры · анализатор · детектив</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-lg">🏙️</span>
              <span className="text-lg">⚔️</span>
              <span className="text-lg">🖥️</span>
              <span className="text-lg">📞</span>
              <span className="text-lg">🔍</span>
              <span className="text-lg">🔐</span>
              <span className="text-lg">👣</span>
              <span className="text-lg">🚨</span>
              <span className="text-lg">🎭</span>
            </div>
            {section === "games" && (
              <motion.div layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 rounded-b-2xl" />
            )}
          </button>
        </motion.div>

        {/* ── Section content ── */}
        <AnimatePresence mode="wait">

          {/* ── ТЕСТЫ ── */}
          {section === "tests" && (
            <motion.div
              key="tests"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Lectures banner */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push("/lectures")}
                className="mb-5 cursor-pointer bg-gradient-to-r from-indigo-900/50 to-purple-900/30 border border-indigo-600/40 hover:border-indigo-400 rounded-xl p-4 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📖</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">Учебные материалы</span>
                      <span className="text-xs bg-indigo-600/70 text-indigo-200 px-2 py-0.5 rounded-full">2 лекции</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">Прочитай перед тестами — фишинг, вишинг, Wi-Fi, API</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  <GraduationCap size={16} />
                  <ChevronRight size={14} />
                </div>
              </motion.div>

              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <ClipboardList size={18} className="text-cyber-green" /> Выбери уровень
              </h3>
              <div className="space-y-4">
                {levels.map((level, i) => {
                  const levelScenarioCount = level.scenarios?.length || 0;
                  const completedCount = level.scenarios?.filter((s: any) => completedIds.has(s.id)).length || 0;
                  const percent = levelScenarioCount > 0 ? Math.round(completedCount / levelScenarioCount * 100) : 0;
                  return (
                    <motion.div
                      key={level.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => router.push(`/game/${level.id}`)}
                      className="bg-cyber-card border border-cyber-border rounded-xl p-5 cursor-pointer hover:border-cyber-green transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">{LOCATION_ICONS[level.location]}</span>
                          <div>
                            <h4 className="text-white font-bold">Уровень {level.order}: {level.name}</h4>
                            <p className="text-gray-400 text-sm mt-1">{level.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="h-1.5 w-24 bg-cyber-dark rounded-full overflow-hidden">
                                <div className="h-full bg-cyber-green rounded-full transition-all" style={{ width: `${percent}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{completedCount}/{levelScenarioCount} сценариев</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-600 group-hover:text-cyber-green transition-colors" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Certificate */}
              {stats && stats.progress_percent >= 50 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                  <button
                    onClick={() => router.push("/certificate")}
                    className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-yellow-500 hover:to-yellow-400 transition-all"
                  >
                    <Award size={20} /> Получить сертификат
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── ИГРЫ ── */}
          {section === "games" && (
            <motion.div
              key="games"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <Gamepad2 size={18} className="text-purple-400" /> Выбери игру
              </h3>
              <div className="space-y-4">

                {/* Кибергород */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => router.push("/minigame")}
                  className="bg-gradient-to-r from-purple-900/40 to-blue-900/30 border border-purple-700/50 rounded-xl p-5 cursor-pointer hover:border-purple-500 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: "linear-gradient(45deg, #8b5cf6 25%, transparent 25%), linear-gradient(-45deg, #8b5cf6 25%, transparent 25%)", backgroundSize: "8px 8px" }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl">🏙️</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Кибергород</h4>
                          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">ВЫЖИВАНИЕ</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Режим выживания — защити город от хакеров</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-purple-300">🗺️ 6 зон</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-purple-300">⏱️ 3 минуты</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-purple-300">🎮 WASD</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                  </div>
                </motion.div>

                {/* Полые Сети */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => router.push("/hollowgame")}
                  className="bg-gradient-to-r from-gray-900/80 to-slate-900/60 border border-gray-700/50 rounded-xl p-5 cursor-pointer hover:border-gray-500 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-3xl">⚔️</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Полые Сети</h4>
                          <span className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full font-bold">2D ПЛАТФОРМЕР</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Сразись с хакерами в тёмных глубинах киберпространства</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-300">🗡️ 3 уровня</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-gray-300">👾 Боссы</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-gray-300">🎮 WASD + J/K</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-gray-300 transition-colors" />
                  </div>
                </motion.div>

                {/* Рабочий стол */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => router.push("/homegame")}
                  className="bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border border-blue-800/40 rounded-xl p-5 cursor-pointer hover:border-blue-500 transition-all group relative overflow-hidden"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2.5 }} className="text-3xl">🖥️</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Рабочий стол</h4>
                          <span className="text-xs bg-blue-700 text-white px-2 py-0.5 rounded-full font-bold">СИМУЛЯТОР</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Выяви фишинг сидя за домашним компьютером</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-blue-300">📧 Почта и соцсети</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-blue-300">⏱️ 5 минут</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-blue-300">📖 Памятка</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </motion.div>

                {/* Оператор банка */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => router.push("/bankgame")}
                  className="bg-gradient-to-r from-green-950/50 to-emerald-950/30 border border-green-800/40 rounded-xl p-5 cursor-pointer hover:border-green-500 transition-all group relative overflow-hidden"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 3, repeatDelay: 1 }} className="text-3xl">📞</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Оператор банка</h4>
                          <span className="text-xs bg-green-700 text-white px-2 py-0.5 rounded-full font-bold">НОВИНКА</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Распознай мошенников среди входящих звонков</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-green-300">📋 8 звонков</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-green-300">⏱️ 35с на решение</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-green-300">🏆 Ранг оператора</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-green-400 transition-colors" />
                  </div>
                </motion.div>

                {/* Режим Детектив */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={() => router.push("/detective")}
                  className="bg-gradient-to-r from-amber-950/50 to-yellow-950/30 border border-amber-800/40 rounded-xl p-5 cursor-pointer hover:border-amber-500 transition-all group relative overflow-hidden"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-3xl">🔍</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Режим Детектив</h4>
                          <span className="text-xs bg-amber-700 text-white px-2 py-0.5 rounded-full font-bold">НОВИНКА</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Расследуй цепочку кибератаки и найди ошибки</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-amber-300">📁 4 дела</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-amber-300">🚩 Красные флаги</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-amber-300">🕵️ Ранг детектива</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </motion.div>

                {/* Анализатор паролей */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => router.push("/password-check")}
                  className="bg-gradient-to-r from-cyan-950/50 to-teal-950/30 border border-cyan-800/40 rounded-xl p-5 cursor-pointer hover:border-cyan-500 transition-all group relative overflow-hidden"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-3xl">🔐</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Анализатор паролей</h4>
                          <span className="text-xs bg-cyan-700 text-white px-2 py-0.5 rounded-full font-bold">ИНСТРУМЕНТ</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Проверь надёжность и время взлома своего пароля</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-cyan-300">⚡ Энтропия и паттерны</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-cyan-300">🎲 Генератор паролей</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </motion.div>

                {/* Цифровой след */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  onClick={() => router.push("/digitalfootprint")}
                  className="bg-gradient-to-r from-pink-950/50 to-rose-950/30 border border-pink-800/40 rounded-xl p-5 cursor-pointer hover:border-pink-500 transition-all group relative overflow-hidden"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-3xl">👣</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Цифровой след</h4>
                          <span className="text-xs bg-pink-700 text-white px-2 py-0.5 rounded-full font-bold">НОВИНКА</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Узнай что хакер соберёт по твоим действиям в сети</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-pink-300">🎭 6 ситуаций</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-pink-300">🕵️ Профиль хакера</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-pink-300">💡 Советы</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-pink-400 transition-colors" />
                  </div>
                </motion.div>

                {/* Побег от хакера */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => router.push("/hackerescape")}
                  className="bg-gradient-to-r from-red-950/60 to-orange-950/30 border border-red-800/40 rounded-xl p-5 cursor-pointer hover:border-red-500 transition-all group relative overflow-hidden"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-3xl">🚨</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Побег от хакера</h4>
                          <span className="text-xs bg-red-700 text-white px-2 py-0.5 rounded-full font-bold">НОВИНКА</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Успей защитить аккаунты до взлома — 2 минуты</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-red-300">⏱️ 120 секунд</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-red-300">🔐 6 задач</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-red-300">💀 Escape room</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-red-400 transition-colors" />
                  </div>
                </motion.div>

                {/* Взломай меня */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                  onClick={() => router.push("/hackme")}
                  className="bg-gradient-to-r from-violet-950/60 to-fuchsia-950/30 border border-violet-800/40 rounded-xl p-5 cursor-pointer hover:border-violet-500 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: "linear-gradient(60deg, #7c3aed 25%, transparent 25%), linear-gradient(-60deg, #7c3aed 25%, transparent 25%)", backgroundSize: "6px 6px" }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.span animate={{ rotateY: [0, 180, 360] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="text-3xl">🎭</motion.span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold">Взломай меня</h4>
                          <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-bold">НОВИНКА</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Сыграй за хакера, потом защитись — двойная роль</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-violet-300">🕵️ 5 сценариев</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-violet-300">⚔️ Хакер vs Защитник</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-violet-300">🧠 Смена роли</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-violet-400 transition-colors" />
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
