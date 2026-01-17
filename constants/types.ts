import { Card as FSRSCard } from "ts-fsrs";

export type CardType = "word" | "phrase";

export interface ProcessingConfig {
  encoding: string;
  normalization: string;
  stripWhitespace: boolean;
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

export interface OwnedDeck {
  id: string;
  file_hash: string;
  title: string;
  unlocked_at: string;
}

export interface Card extends FSRSCard {
  id: string;
  deck_id: string;
  type: "word" | "phrase";
  front: string;
  back: string;
  dictionary_entry_id?: string;
  context_phrase_id?: string;
  token_map: string;
  raw_data: string;
  img_url?: string;
  context_card: Card | undefined;
}
