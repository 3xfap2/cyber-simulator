import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post("/api/auth/register", data),
  login: (data: { username: string; password: string }) =>
    api.post("/api/auth/login", data),
  me: () => api.get("/api/auth/me"),
};

export const scenariosApi = {
  getLevels: () => api.get("/api/scenarios/levels"),
  getLevel: (id: number) => api.get(`/api/scenarios/levels/${id}`),
  getLevelScenarios: (levelId: number, difficulty?: string) =>
    api.get(`/api/scenarios/levels/${levelId}/scenarios${difficulty ? `?difficulty=${difficulty}` : ""}`),
  getScenario: (id: number) => api.get(`/api/scenarios/${id}`),
};

export const progressApi = {
  submitAnswer: (scenarioId: number, selectedOption: number) =>
    api.post("/api/progress/answer", { scenario_id: scenarioId, selected_option: selectedOption }),
  getMyProgress: () => api.get("/api/progress/my"),
  getStats: () => api.get("/api/progress/stats"),
  getMistakes: () => api.get("/api/progress/mistakes"),
  getAiAnalysis: () => api.get("/api/progress/ai-analysis"),
};

export const leaderboardApi = {
  get: (limit = 20) => api.get(`/api/leaderboard/?limit=${limit}`),
};

export const certificatesApi = {
  generate: () => api.post("/api/certificates/generate"),
  verify: (certId: string) => api.get(`/api/certificates/verify/${certId}`),
};

export const achievementsApi = {
  getMy: () => api.get("/api/achievements/my"),
};

export const adminApi = {
  overview: () => api.get("/api/admin/overview"),
  attackStats: () => api.get("/api/admin/attack-stats"),
  users: () => api.get("/api/admin/users"),
};
