import { MOCK_CARDS } from "@/constants/mockData";
import { Flashcard } from "@/constants/types";
import { fsrsService } from "@/services/FSRSService"; // Need service to generate FSRS fields
import * as FileSystem from "expo-file-system/legacy";

// Import the raw JSON data
// Note: Ensure "@/data/japanese_deck.json" exists and contains the data you specified
const JAPANESE_DATA = require("@/data/japanese_deck.json");

const DB_FILE = FileSystem.documentDirectory + "library.json";

export const JsonDatabase = {
  /**
   * 1. Check if DB exists.
   * 2. If NO: Seed with MOCK_CARDS + JSON File Data.
   * 3. If YES: Parse file (with Dates) and return.
   */
  async getCards(): Promise<Flashcard[]> {
    try {
      const info = await FileSystem.getInfoAsync(DB_FILE);

      if (!info.exists) {
        console.log("[DB] File not found. Seeding Database...");

        // --- 1. PREPARE MOCK DATA ---
        // Ensure mock dates are fresh objects (in case they were static strings)
        const seedMock = MOCK_CARDS.map((c) => ({
          ...c,
          due: new Date(),
        }));

        // --- 2. PREPARE JSON DATA ---
        // Combine phrases and words arrays from the JSON file
        const rawJsonItems = [
          ...(JAPANESE_DATA.phrases || []),
          ...(JAPANESE_DATA.words || []),
        ];

        // Transform raw JSON items into valid Flashcards
        const seedJson = rawJsonItems.map((item: any) => {
          // Generate base FSRS fields (id, stability, difficulty, etc.)
          const base = fsrsService.createNewCard();

          return {
            ...base, // Apply FSRS defaults
            ...item, // Overwrite with JSON data (id, front, back, etc.)

            // Explicitly set the fields you requested
            due: new Date(), // Set due to NOW for immediate study
            ui_status: "new", // Default UI status

            // Ensure type safety for optional fields
            related_ids: item.related_ids || [],
          } as Flashcard;
        });

        // --- 3. MERGE & SAVE ---
        const combinedData = [...seedMock, ...seedJson];

        console.log(
          `[DB] Seeding ${combinedData.length} cards (${seedMock.length} Mock + ${seedJson.length} JSON)`
        );

        await FileSystem.writeAsStringAsync(
          DB_FILE,
          JSON.stringify(combinedData)
        );
        return combinedData;
      }

      // --- READ EXISTING DB ---
      const content = await FileSystem.readAsStringAsync(DB_FILE);

      // IMPORTANT: Reviver to restore Date objects
      return JSON.parse(content, (key, value) => {
        if (["due", "last_review"].includes(key)) return new Date(value);
        return value;
      }) as Flashcard[];
    } catch (e) {
      console.error("[DB] Error reading/seeding cards:", e);
      return [];
    }
  },

  async updateCard(updatedCard: Flashcard) {
    try {
      const allCards = await this.getCards();
      const index = allCards.findIndex((c) => c.id === updatedCard.id);

      if (index !== -1) {
        allCards[index] = updatedCard;
        await FileSystem.writeAsStringAsync(DB_FILE, JSON.stringify(allCards));
        console.log(
          `[DB] Saved card ${updatedCard.id} - Next due: ${updatedCard.due}`
        );
      }
    } catch (e) {
      console.error("[DB] Save failed:", e);
    }
  },

  // Debug helper
  async resetDatabase() {
    console.log("[DB] Deleting library.json...");
    await FileSystem.deleteAsync(DB_FILE, { idempotent: true });
  },
};
