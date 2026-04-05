"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Lock, Eye, AlertTriangle } from "lucide-react";
import { api, authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await authApi.login({ username: form.username, password: form.password });
        const token = res.data.access_token;
        localStorage.setItem("token", token);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const me = await authApi.me();
        setAuth(me.data, token);
        toast.success("Добро пожаловать!");
        router.push("/dashboard");
      } else {
        await authApi.register(form);
        toast.success("Аккаунт создан! Войдите.");
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: "linear-gradient(#00ff88 1px, transparent 1px), linear-gradient(90deg, #00ff88 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      {/* Floating icons */}
      <div className="absolute top-20 left-20 text-cyber-green opacity-20 animate-pulse">
        <Shield size={60} />
      </div>
      <div className="absolute bottom-20 right-20 text-cyber-red opacity-20 animate-pulse">
        <AlertTriangle size={60} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="inline-block"
          >
            <Shield className="w-16 h-16 text-cyber-green mx-auto mb-4" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">
            Cyber<span className="text-cyber-green">Sim</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Научись защищаться от кибератак</p>
          <p className="text-gray-600 text-xs mt-1">Банк Центр-Инвест</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { icon: <Shield size={16} />, label: "3 уровня" },
            { icon: <AlertTriangle size={16} />, label: "9 атак" },
            { icon: <Lock size={16} />, label: "Сертификат" },
          ].map((f, i) => (
            <div key={i} className="bg-cyber-card border border-cyber-border rounded-lg p-2 text-center">
              <div className="text-cyber-green flex justify-center mb-1">{f.icon}</div>
              <span className="text-xs text-gray-400">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-cyber-card border border-cyber-border rounded-xl p-6">
          <div className="flex mb-6 bg-cyber-dark rounded-lg p-1">
            {["Войти", "Регистрация"].map((tab, i) => (
              <button
                key={i}
                onClick={() => setIsLogin(i === 0)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  isLogin === (i === 0)
                    ? "bg-cyber-green text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Имя пользователя</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-cyber-dark border border-cyber-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-green transition-colors"
                placeholder="agent_007"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-cyber-dark border border-cyber-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-green transition-colors"
                  placeholder="agent@mail.ru"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Пароль</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-cyber-dark border border-cyber-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-green transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyber-green text-black font-bold py-2.5 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
            >
              {loading ? "Загрузка..." : isLogin ? "Войти" : "Создать аккаунт"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
