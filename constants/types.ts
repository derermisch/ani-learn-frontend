// constants/types.ts

export interface Show {
  id: string;
  title: string;
  cover_image?: string;
  description?: string;
}

export interface Deck {
  id: string;
  episode: string | number; // Backend might return int, UI usually treats as string
  language: string;
  card_count: number;
  is_public: boolean;
  // Joined fields from $lookup
  show_title: string;
  cover_image?: string;
  creator_name: string;
}

export interface Card {
  id: string;
  phrase: string;
  translation?: string;
  // You can add token details here later
}

export interface Stats {
  users: number;
  shows: number;
  decks: number;
  cards: number;
}

export interface TaskProgress {
  status: "running" | "completed" | "error";
  percent: number;
  message: string;
}
