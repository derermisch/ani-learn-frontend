import { Card as FSRSCard } from "ts-fsrs";

export type CardType = "word" | "phrase";

export interface ProcessingConfig {
  encoding: string; // e.g., 'utf-8'
  normalization: string; // e.g., 'NFKC'
  stripWhitespace: boolean; // true
}

export interface Show {
  id: string;
  title: string;
  cover_image?: string;
  deck_count: number;
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

// We extend the base FSRS Card interface to include your app's specific content
export interface Flashcard extends FSRSCard {
  // App-Specific Content
  id: string; // FSRS uses 'number' by default sometimes, but we override to string for UUIDs
  deck_id: string;
  type: CardType;
  front: string; // Original (Japanese), if kanji av. then kanji
  front_furigana?: string;
  front_romaji?: string;
  back: string;
  // RELATIONSHIP LINK
  // If type='word'   -> IDs of phrases this word appears in
  // If type='phrase' -> IDs of words contained in this phrase
  related_ids: string[]; // Links between words/phrases
  img_url?: string;
  ui_status?: "new" | "learning" | "review" | "mastered";
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  creator_id: string;
  creator_name: string;
  is_public: boolean;
  episode: number;
  created_at: string;
  updated_at: string;
}
