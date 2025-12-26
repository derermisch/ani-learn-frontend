import { fsrsService } from "@/services/FSRSService";
import { Deck, Flashcard } from "./types";

// Helper to generate base FSRS fields
const getBase = () => {
  const card = fsrsService.createNewCard();
  // Ensure card is Due NOW
  card.due = new Date();
  return card;
};

// --- DECKS ---
export const MOCK_DECKS: Deck[] = [
  {
    id: "1",
    title: "Naruto",
    description: "Ninja way",
    cover_image:
      "https://m.media-amazon.com/images/M/MV5BZmQ5NGFiNWEtMmMyMC00MDdiLTg4YjktOGY5Yzc2MDUxMTE1XkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_.jpg",
    creator_id: "admin",
    creator_name: "admin",
    is_public: true,
    episode: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "One Piece",
    description: "Pirate King",
    cover_image:
      "https://m.media-amazon.com/images/M/MV5BODcwNWE3OTMtMDc3MS00NDFjLWE1OTAtNDU3NjgxODMxY2UyXkEyXkFqcGdeQXVyNTAyODkwOQ@@._V1_.jpg",
    creator_id: "admin",
    creator_name: "admin",
    is_public: true,
    episode: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Steins Gate",
    description: "Time Travel",
    cover_image:
      "https://m.media-amazon.com/images/M/MV5BMjUxMzE4ZDctODNjMS00MzIwLThjNDktODkwYjc5YWU0MDc0XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_FMjpg_UX1000_.jpg",
    creator_id: "admin",
    creator_name: "admin",
    is_public: true,
    episode: 9,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// --- CARDS ---
export const MOCK_CARDS: Flashcard[] = [
  // --- NARUTO PHRASES ---
  {
    ...getBase(),
    id: "card_n_p1",
    deck_id: "1",
    type: "phrase",
    front: "Ore wa Hokage ni naru!",
    back: "I'm going to become Hokage!",
    pronunciation: "おれ は ほかげ に なる",
    related_ids: ["card_n_w1", "card_n_w2", "card_n_w3"],
    ui_status: "review",
  },
  {
    ...getBase(),
    id: "card_n_p2",
    deck_id: "1",
    type: "phrase",
    front: "Dattebayo!",
    back: "Believe it!",
    pronunciation: "だってばよ",
    related_ids: [],
    ui_status: "learning",
  },
  {
    ...getBase(),
    id: "card_n_p3",
    deck_id: "1",
    type: "phrase",
    front: "Hokage wa ore no yume da.",
    back: "The Hokage is my dream.",
    pronunciation: "ほかげ は おれ の ゆめ だ",
    related_ids: ["card_n_w2", "card_n_w1", "card_n_w4"],
    ui_status: "new",
  },
  // --- NARUTO WORDS ---
  {
    ...getBase(),
    id: "card_n_w1",
    deck_id: "1",
    type: "word",
    front: "Ore",
    back: "I / Me (Masculine)",
    pronunciation: "おれ",
    related_ids: ["card_n_p1", "card_n_p3"],
    ui_status: "mastered",
  },
  {
    ...getBase(),
    id: "card_n_w2",
    deck_id: "1",
    type: "word",
    front: "Hokage",
    back: "Fire Shadow (Village Leader)",
    pronunciation: "ほかげ",
    related_ids: ["card_n_p1", "card_n_p3"],
    ui_status: "review",
  },
  {
    ...getBase(),
    id: "card_n_w3",
    deck_id: "1",
    type: "word",
    front: "Naru",
    back: "To become",
    pronunciation: "なる",
    related_ids: ["card_n_p1"],
    ui_status: "learning",
  },
  {
    ...getBase(),
    id: "card_n_w4",
    deck_id: "1",
    type: "word",
    front: "Yume",
    back: "Dream",
    pronunciation: "ゆめ",
    related_ids: ["card_n_p3"],
    ui_status: "new",
  },
  // --- ONE PIECE ---
  {
    ...getBase(),
    id: "card_op_p1",
    deck_id: "2",
    type: "phrase",
    front: "Kaizoku ou ni ore wa naru!",
    back: "I'm going to become the Pirate King!",
    pronunciation: "かいぞくおう に おれ は なる",
    related_ids: ["card_op_w1"],
    ui_status: "new",
  },
  {
    ...getBase(),
    id: "card_op_w1",
    deck_id: "2",
    type: "word",
    front: "Kaizoku",
    back: "Pirate",
    pronunciation: "かいぞく",
    related_ids: ["card_op_p1"],
    ui_status: "new",
  },
];
