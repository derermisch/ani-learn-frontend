export interface ProcessingConfig {
  encoding: string; // e.g., 'utf-8'
  normalization: string; // e.g., 'NFKC'
  stripWhitespace: boolean; // true
}

export interface Deck {
  id: string;
  title: string;
  episode: string;
  lang: string;
  cards: number;
  cover_image?: string;
  creator_name?: string;
  is_public?: boolean;
  // Added specific fields for details view
  description?: string;
  created_at?: string;
}

export interface Show {
  id: string;
  title: string;
  cover_image?: string;
  deck_count: number;
}

export interface Card {
  id: string;
  phrase: string;
  translation: string;
  tokens: any[]; // Simplified for now
}

export interface Stats {
  users: number;
  shows: number;
  decks: number;
  cards: number;
}

export interface TaskProgress {
  status: "running" | "completed" | "error" | "cancelled";
  percent: number;
  message: string;
}
