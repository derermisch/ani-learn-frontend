import {
  Card,
  Deck,
  ProcessingConfig,
  Show,
  TaskProgress,
} from "@/constants/types";
import axios from "axios";

// --- CONFIGURATION ---
const SERVER_IP = "192.168.178.115"; // CHANGE TO YOUR PC IP
const PORT = "5000";
const API_URL = `http://${SERVER_IP}:${PORT}/api`;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// --- 1. SYSTEM & CONFIG ---
// export const getStats = async (): Promise<Stats> => {
//   try {
//     const res = await api.get("/stats");
//     return res.data;
//   } catch (e) {
//     console.log("Server Check Failed");
//     throw e;
//   }
// };

export const getProcessingConfig = async (): Promise<ProcessingConfig> => {
  try {
    const res = await api.get("/config/processing-rules");
    return res.data;
  } catch (e) {
    return {
      encoding: "utf-8",
      normalization: "NFKC",
      stripWhitespace: true,
    };
  }
};

// --- 2. BROWSING ---
export const getAllDecks = async (): Promise<Deck[]> => {
  try {
    const res = await api.get("/decks");
    return res.data.decks.map((d: any) => ({
      id: d.id,
      title: d.show_title || "Unknown Show",
      episode: d.episode,
      lang: d.language || "ja",
      cards: d.card_count || 0,
      creator_name: d.creator_name,
      cover_image: d.cover_image,
      is_public: d.is_public,
    }));
  } catch (e) {
    console.error("Fetch Decks Error", e);
    return [];
  }
};

export const getShows = async (): Promise<Show[]> => {
  try {
    const res = await api.get("/shows");
    return res.data.shows;
  } catch (e) {
    console.error("Fetch Shows Error", e);
    return [];
  }
};

// --- 3. DECK DETAILS & UNLOCK ---
export const getDeckDetails = async (deckId: string): Promise<Deck> => {
  const res = await api.get(`/decks/${deckId}`);
  const d = res.data;
  return {
    id: d.id,
    title: d.show_title || "Unknown Show",
    episode: d.episode,
    lang: d.language || "ja",
    cards: d.card_count || 0,
    creator_name: d.creator_name,
    cover_image: d.cover_image,
    is_public: d.is_public,
  };
};

/**
 * UPDATED: This now sends ONLY the hash, not the file.
 * The backend should compare this hash against the database.
 */
export const unlockDeckWithHash = async (
  deckId: string,
  hash: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    // Send username so backend knows who unlocked it
    const res = await api.post(`/decks/${deckId}/unlock`, {
      hash,
      username: "mobile_user",
    });
    return res.data;
  } catch (e: any) {
    if (e.response && e.response.data) {
      return e.response.data;
    }
    return { success: false, message: "Network error during verification" };
  }
};

export const getDeckCards = async (deckId: string): Promise<Card[]> => {
  try {
    const res = await api.get(`/decks/${deckId}/cards`);
    return res.data.cards;
  } catch (e) {
    console.error("Fetch Cards Error", e);
    return [];
  }
};

// --- 4. CREATION (Pipeline) ---
export const createDeck = async (formData: FormData) => {
  try {
    const response = await fetch(`${API_URL}/create-deck`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Upload failed");
    return result;
  } catch (error: any) {
    console.error("Upload Failed:", error);
    throw error;
  }
};

export const getTaskProgress = async (
  taskId: string,
): Promise<TaskProgress> => {
  try {
    const res = await api.get(`/progress/${taskId}`);
    return res.data;
  } catch (e: any) {
    if (e.response && e.response.status === 404) {
      return { status: "running", percent: 0, message: "Initializing task..." };
    }
    return { status: "error", percent: 0, message: "Connection lost" };
  }
};

// --- 5. USER ---
// export const registerUser = async (username: string) => {
//   const res = await api.post("/users", { username });
//   return res.data;
// };

export const stopProcessingTask = async (taskId: string) => {
  try {
    console.log(`🛑 Sending stop signal for task: ${taskId}`);
    await api.post(`/stop-task/${taskId}`);
    return true;
  } catch (error) {
    console.error("Failed to stop task:", error);
    return false;
  }
};

export const checkFileExistence = async (fileHash: string) => {
  try {
    const res = await api.post("/check-file", { hash: fileHash });
    return res.data;
  } catch (e) {
    return { found: false };
  }
};

export const getUserLibrary = async (): Promise<{
  decks: Deck[];
  words: string[];
}> => {
  try {
    const res = await api.get("/users/mobile_user/library");

    // Map backend format to frontend Deck type
    const decks = res.data.decks.map((d: any) => ({
      id: d.id,
      title: d.title || "Unknown Show",
      episode: d.episode,
      lang: d.language || "ja",
      cards: d.card_count || 0,
      creator_name: "You", // Or fetch creator
      cover_image: d.cover_image,
      is_public: true,
    }));

    return {
      decks,
      words: res.data.words || [],
    };
  } catch (e) {
    console.error("Fetch Library Error", e);
    return { decks: [], words: [] };
  }
};
