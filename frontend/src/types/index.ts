export interface User {
  id: number;
  username: string;
  email: string;
  total_score: number;
  total_attacks_faced: number;
  total_attacks_blocked: number;
  current_hp: number;
  league: string;
  created_at: string;
}

export interface ScenarioOption {
  text: string;
  is_safe: boolean;
}

export interface Scenario {
  id: number;
  title: string;
  attack_type: string;
  interface_type: string;
  content: Record<string, any>;
  options: ScenarioOption[];
  red_flags: string[];
  hp_penalty: number;
  score_reward: number;
  order: number;
}

export interface Level {
  id: number;
  name: string;
  description: string;
  location: string;
  order: number;
  scenarios: Scenario[];
}

export interface AnswerResult {
  correct: boolean;
  correct_option: number;
  explanation: string;
  red_flags: string[];
  hp_change: number;
  score_change: number;
  current_hp: number;
  current_score: number;
  ai_explanation: string;
}

export interface UserStats {
  total_score: number;
  current_hp: number;
  league: string;
  total_attacks_faced: number;
  total_attacks_blocked: number;
  accuracy: number;
  completed_scenarios: number;
  total_scenarios: number;
  progress_percent: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  total_score: number;
  league: string;
  total_attacks_blocked: number;
}

export type League = 'novice' | 'defender' | 'expert' | 'master';

export const LEAGUE_LABELS: Record<string, string> = {
  novice: 'Новичок',
  defender: 'Защитник',
  expert: 'Эксперт',
  master: 'Мастер',
};

export const LEAGUE_COLORS: Record<string, string> = {
  novice: 'text-gray-400',
  defender: 'text-blue-400',
  expert: 'text-purple-400',
  master: 'text-yellow-400',
};

export const ATTACK_TYPE_LABELS: Record<string, string> = {
  phishing: 'Фишинг',
  skimming: 'Скимминг',
  brute_force: 'Подбор пароля',
  social_engineering: 'Соц. инженерия',
  vishing: 'Вишинг',
};
