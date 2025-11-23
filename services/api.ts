// services/api.ts
import { Card, Deck, Show, Stats, TaskProgress } from "@/constants/types";
import axios from "axios";

// --- CONFIGURATION ---
const SERVER_IP = "192.168.178.32"; // CHANGE TO YOUR PC IP
const PORT = "5000";
const API_URL = `http://${SERVER_IP}:${PORT}/api`;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// --- 1. DASHBOARD & STATS ---
export const getStats = async (): Promise<Stats> => {
  try {
    // Attempt to hit the server
    const res = await api.get("/stats");
    return res.data;
  } catch (e) {
    // Don't return { users: 0 } here.
    // THROW the error so the UI knows the server is dead.
    console.log("Server Check Failed");
    throw e;
  }
};

// --- 2. BROWSING ---
export const getAllDecks = async (): Promise<Deck[]> => {
  try {
    const res = await api.get("/decks");
    return res.data.decks;
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

// --- 3. DECK DETAILS (New) ---
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
    // We use fetch for multipart to avoid Android network issues
    const response = await fetch(`${API_URL}/create-deck`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Upload failed");
    return result; // Returns { message: "...", task_id: "..." }
  } catch (error: any) {
    console.error("Upload Failed:", error);
    throw error;
  }
};

export const getTaskProgress = async (
  taskId: string
): Promise<TaskProgress> => {
  try {
    const res = await api.get(`/progress/${taskId}`);
    return res.data;
  } catch (e: any) {
    // FIXED: Safe check for response existence
    if (e.response && e.response.status === 404) {
      return { status: "running", percent: 0, message: "Initializing task..." };
    }
    // If actual network error (server down, timeout)
    return { status: "error", percent: 0, message: "Connection lost" };
  }
};

// --- 5. USER ---
export const registerUser = async (username: string) => {
  const res = await api.post("/users", { username });
  return res.data;
};

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

export const checkFileExistence = async (
  fileHash: string | null,
  lines?: string[]
) => {
  try {
    const payload: any = {};
    if (fileHash) payload.hash = fileHash;

    // OPTIMIZATION: Only send a sample for the check
    // 50 lines is plenty to fingerprint a show uniquely
    if (lines && lines.length > 0) {
      // Take 50 lines from the middle to avoid generic intros/outros
      const start = Math.floor(lines.length * 0.2);
      const sample = lines.slice(start, start + 50);
      payload.lines = sample;
    }

    const res = await api.post("/check-file", payload);
    return res.data;
  } catch (e) {
    return { found: false };
  }
};
