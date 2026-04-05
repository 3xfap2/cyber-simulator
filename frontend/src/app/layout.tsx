import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "CyberSim — Симулятор защиты личных данных",
  description: "Образовательный симулятор кибербезопасности от Банк Центр-Инвест",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#111827", color: "#e2e8f0", border: "1px solid #1f2937" },
          }}
        />
      </body>
    </html>
  );
}
