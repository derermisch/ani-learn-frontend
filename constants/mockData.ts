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
    front: "昔妖狐ありけり",
    related_ids: ["card_n_w1"],
    back: "Long ago, there lived a fox spirit.",
    ui_status: "learning",
  },
  // --- NARUTO WORDS ---
  {
    ...getBase(),
    id: "card_n_w1",
    deck_id: "1",
    type: "word",
    front: "昔",
    front_furigana: "むかし",
    front_romaji: "mukashi",
    related_ids: ["card_n_p1"],
    back: "the old days; the past; former times; a long time ago",
    ui_status: "learning",
    img_url:
      "https://static.wikia.nocookie.net/narutofanmakers/images/a/af/Kyuubi_demon_form.png/revision/latest?cb=20100413224034",
  },
];
