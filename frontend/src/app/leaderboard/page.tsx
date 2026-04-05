"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, ChevronLeft, Shield } from "lucide-react";
import { leaderboardApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const LEAGUE_COLORS: Record<string, string> = {
  novice: "text-gray-400", defender: "text-blue-400", expert: "text-purple-400", master: "text-yellow-400",
};
const LEAGUE_LABELS: Record<string, string> = {
  novice: "Новичок", defender: "Защитник", expert: "Эксперт", master: "Мастер",
};
const RANK_ICONS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.push("/"); return; }
    leaderboardApi.get(20).then((r) => setEntries(r.data)).finally(() => setLoading(false));
  }, [mounted]);

  return (
    <div className="min-h-screen bg-cyber-dark">
      <header className="border-b border-cyber-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white">
          <ChevronLeft />
        </button>
        <Trophy className="text-yellow-400" size={20} />
        <span className="text-white font-bold">Рейтинг игроков</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center text-cyber-green animate-pulse">Загрузка...</div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  entry.username === user?.username
                    ? "border-cyber-green bg-green-900/10"
                    : "border-cyber-border bg-cyber-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">
                    {RANK_ICONS[entry.rank] || <span className="text-gray-500 text-sm">#{entry.rank}</span>}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{entry.username}</span>
                      {entry.username === user?.username && <span className="text-xs text-cyber-green">(вы)</span>}
                    </div>
                    <span className={`text-xs ${LEAGUE_COLORS[entry.league]}`}>{LEAGUE_LABELS[entry.league]}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-cyber-green font-bold">{entry.total_score}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                    <Shield size={10} /> {entry.total_attacks_blocked}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
