import { Deck } from "./types";

export const MOCK_DECKS: Deck[] = [
  {
    id: "1",
    title: "Naruto",
    description: "Ninja way",
    cover_image:
      "https://m.media-amazon.com/images/M/MV5BZmQ5NGFiNWEtMmMyMC00MDdiLTg4YjktOGY5Yzc2MDUxMTE1XkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_.jpg", // Naruto Poster
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
      "https://m.media-amazon.com/images/M/MV5BODcwNWE3OTMtMDc3MS00NDFjLWE1OTAtNDU3NjgxODMxY2UyXkEyXkFqcGdeQXVyNTAyODkwOQ@@._V1_.jpg", // One Piece Poster
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
      "https://m.media-amazon.com/images/M/MV5BMjUxMzE4ZDctODNjMS00MzIwLThjNDktODkwYjc5YWU0MDc0XkEyXkFqcGdeQXVyNjc3MjQzNTI@._V1_FMjpg_UX1000_.jpg", // Steins Gate Poster
    creator_id: "admin",
    creator_name: "admin",
    is_public: true,
    episode: 9,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
