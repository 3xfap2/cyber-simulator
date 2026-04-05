"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Award, ChevronLeft, Download } from "lucide-react";
import { certificatesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";

const LEAGUE_LABELS: Record<string, string> = {
  novice: "Новичок", defender: "Защитник", expert: "Эксперт", master: "Мастер",
};

export default function CertificatePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!user) router.push("/");
  }, [mounted]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await certificatesApi.generate();
      setCert(res.data);
      toast.success("Сертификат выдан!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !cert) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/certificate-template.png";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;

      // Draw template
      ctx.drawImage(img, 0, 0);

      // Overlay: username
      ctx.font = `bold ${Math.round(img.width * 0.045)}px Arial`;
      ctx.fillStyle = "#1a1a2e";
      ctx.textAlign = "center";
      ctx.fillText(cert.username, img.width / 2, img.height * 0.72);

      // Overlay: score + league
      ctx.font = `${Math.round(img.width * 0.028)}px Arial`;
      ctx.fillStyle = "#333";
      ctx.fillText(
        `${LEAGUE_LABELS[cert.level_achieved]} · ${cert.score} очков`,
        img.width / 2,
        img.height * 0.78
      );

      // Overlay: date
      ctx.font = `${Math.round(img.width * 0.022)}px Arial`;
      ctx.fillStyle = "#555";
      ctx.fillText(
        new Date(cert.issued_at).toLocaleDateString("ru-RU"),
        img.width / 2,
        img.height * 0.83
      );

      // Download
      const link = document.createElement("a");
      link.download = `certificate-${cert.username}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-cyber-dark">
      <header className="border-b border-cyber-border px-4 py-3 flex items-center gap-3 print:hidden">
        <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white">
          <ChevronLeft />
        </button>
        <Award className="text-yellow-400" size={20} />
        <span className="text-white font-bold">Сертификат</span>
      </header>

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-lg mx-auto px-4 py-8">
        {!cert ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-white text-2xl font-bold mb-2">Получи сертификат</h2>
            <p className="text-gray-400 mb-8">Подтверди свои навыки кибербезопасности официальным сертификатом с QR-кодом</p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {loading ? "Генерация..." : "Получить сертификат"}
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            {/* Certificate image template */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-yellow-500 mb-4 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/certificate-template.png"
                alt="Сертификат"
                className="w-full"
              />
              {/* Overlay with user info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-5 text-center">
                <div className="text-white text-xl font-bold">{cert.username}</div>
                <div className="text-yellow-300 text-sm mt-1">
                  {LEAGUE_LABELS[cert.level_achieved]} · {cert.score} очков
                </div>
                <div className="text-gray-300 text-xs mt-1 font-mono">{cert.certificate_id}</div>
                {cert.qr_code_url && (
                  <div className="flex justify-center mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cert.qr_code_url} alt="QR" className="w-16 h-16 rounded" />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 mx-auto bg-cyber-green text-black font-bold px-6 py-2 rounded-lg hover:bg-green-400 transition-colors"
            >
              <Download size={16} /> Скачать сертификат
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
