"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Users, Target, Award, ChevronLeft, TrendingUp, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

const LEAGUE_COLORS: Record<string, string> = {
  novice: "text-gray-400", defender: "text-blue-400", expert: "text-purple-400", master: "text-yellow-400",
};
const LEAGUE_LABELS: Record<string, string> = {
  novice: "Новичок", defender: "Защитник", expert: "Эксперт", master: "Мастер",
};

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [attackStats, setAttackStats] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "attacks" | "users">("overview");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.push("/"); return; }
    loadAll();
  }, [mounted]);

  const loadAll = async () => {
    try {
      const [ov, atk, usr] = await Promise.all([
        adminApi.overview(),
        adminApi.attackStats(),
        adminApi.users(),
      ]);
      setOverview(ov.data);
      setAttackStats(atk.data);
      setUsers(usr.data);
    } catch (e: any) {
      if (e.response?.status === 403) {
        toast.error("Доступ запрещён — только для администратора");
        router.push("/dashboard");
      } else {
        toast.error("Ошибка загрузки данных");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-cyber-green animate-pulse text-xl">Загрузка...</div>
      </div>
    );
  }

  const maxFailRate = Math.max(...attackStats.map((a) => a.fail_rate), 1);

  return (
    <div className="min-h-screen bg-cyber-dark">
      <header className="border-b border-cyber-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <Shield className="text-cyber-red" size={20} />
          <span className="text-white font-bold">Панель администратора</span>
        </div>
        <span className="text-xs text-gray-500 bg-red-900/30 border border-red-800 px-2 py-1 rounded">ADMIN</span>
      </header>

      {/* Tabs */}
      <div className="border-b border-cyber-border px-6">
        <div className="flex gap-1 -mb-px">
          {(["overview", "attacks", "users"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-cyber-green text-cyber-green"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {{ overview: "Обзор", attacks: "Карта атак", users: "Пользователи" }[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && overview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Пользователей", value: overview.total_users, icon: <Users size={18} />, color: "text-blue-400" },
                { label: "Игровых сессий", value: overview.total_plays, icon: <Target size={18} />, color: "text-purple-400" },
                { label: "Верных ответов", value: overview.total_correct, icon: <Shield size={18} />, color: "text-cyber-green" },
                { label: "Процент ошибок", value: `${overview.fail_rate}%`, icon: <AlertTriangle size={18} />, color: "text-cyber-red" },
                { label: "Сертификатов выдано", value: overview.total_certs, icon: <Award size={18} />, color: "text-yellow-400" },
                { label: "Сложнейшая атака", value: overview.most_failed_attack, icon: <TrendingUp size={18} />, color: "text-orange-400" },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-cyber-card border border-cyber-border rounded-xl p-5"
                >
                  <div className={`mb-2 ${card.color}`}>{card.icon}</div>
                  <div className="text-white text-xl font-bold">{card.value}</div>
                  <div className="text-gray-500 text-xs mt-1">{card.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Success vs Fail donut (CSS) */}
            {overview.total_plays > 0 && (
              <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">Общее соотношение ответов</h3>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a2a1a" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="#00ff88" strokeWidth="3"
                        strokeDasharray={`${(overview.total_correct / overview.total_plays) * 100} 100`}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="#ff3333" strokeWidth="3"
                        strokeDasharray={`${((overview.total_plays - overview.total_correct) / overview.total_plays) * 100} 100`}
                        strokeDashoffset={`-${(overview.total_correct / overview.total_plays) * 100}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{Math.round(100 - overview.fail_rate)}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-cyber-green" />
                      <span className="text-gray-300">Верно: <span className="text-white font-bold">{overview.total_correct}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-cyber-red" />
                      <span className="text-gray-300">Ошибки: <span className="text-white font-bold">{overview.total_plays - overview.total_correct}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-gray-600" />
                      <span className="text-gray-300">Всего: <span className="text-white font-bold">{overview.total_plays}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── ATTACK HEATMAP ── */}
        {tab === "attacks" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-cyber-card border border-cyber-border rounded-xl p-5 mb-4">
              <h3 className="text-white font-semibold mb-1">Тепловая карта провалов по типам атак</h3>
              <p className="text-gray-500 text-xs mb-5">Чем выше процент — тем сложнее атака для пользователей</p>
              <div className="space-y-4">
                {attackStats.map((a, i) => (
                  <motion.div
                    key={a.attack_type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{a.label}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="text-red-400 font-bold">{a.fail_rate}% ошибок</span>
                        <span>{a.total} попыток</span>
                      </div>
                    </div>
                    <div className="h-6 bg-cyber-dark rounded-lg overflow-hidden flex">
                      {/* correct portion */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: a.total > 0 ? `${(a.correct / a.total) * 100}%` : "0%" }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full bg-cyber-green/70 flex items-center justify-end pr-1"
                      >
                        {a.correct > 0 && <span className="text-xs text-black font-bold">{a.correct}</span>}
                      </motion.div>
                      {/* fail portion */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: a.total > 0 ? `${(a.fails / a.total) * 100}%` : "0%" }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full bg-cyber-red/80 flex items-center justify-end pr-1"
                      >
                        {a.fails > 0 && <span className="text-xs text-white font-bold">{a.fails}</span>}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-5 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-cyber-green/70" /> Верно</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-cyber-red/80" /> Ошибка</div>
              </div>
            </div>

            {/* Danger ranking */}
            <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Рейтинг опасности атак</h3>
              <div className="space-y-3">
                {attackStats.map((a, i) => {
                  const danger = a.fail_rate >= 60 ? "🔴 Высокая" : a.fail_rate >= 30 ? "🟡 Средняя" : "🟢 Низкая";
                  return (
                    <div key={a.attack_type} className="flex items-center justify-between py-2 border-b border-cyber-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-sm w-4">#{i + 1}</span>
                        <span className="text-white text-sm">{a.label}</span>
                      </div>
                      <span className="text-xs">{danger}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-cyber-card border border-cyber-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-cyber-border flex items-center justify-between">
                <h3 className="text-white font-semibold">Все пользователи ({users.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cyber-border">
                      {["#", "Пользователь", "Лига", "Очки", "Точность", "HP", "Дата"].map((h) => (
                        <th key={h} className="text-left text-xs text-gray-500 px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-cyber-border/50 hover:bg-cyber-dark/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 text-white font-medium">{u.username}</td>
                        <td className={`px-4 py-3 text-xs font-medium ${LEAGUE_COLORS[u.league]}`}>
                          {LEAGUE_LABELS[u.league]}
                        </td>
                        <td className="px-4 py-3 text-cyber-green font-bold">{u.total_score}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-cyber-dark rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyber-green rounded-full"
                                style={{ width: `${u.accuracy}%` }}
                              />
                            </div>
                            <span className="text-gray-400 text-xs">{u.accuracy}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <div className="w-8 h-1.5 bg-cyber-dark rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${u.current_hp > 60 ? "bg-cyber-green" : u.current_hp > 30 ? "bg-yellow-400" : "bg-cyber-red"}`}
                                style={{ width: `${u.current_hp}%` }}
                              />
                            </div>
                            <span className="text-gray-400 text-xs">{u.current_hp}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{u.created_at}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="text-center text-gray-500 py-10">Нет пользователей</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
