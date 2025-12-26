import { MOCK_CARDS } from "@/constants/mockData";
import { Flashcard } from "@/constants/types";
import * as FileSystem from "expo-file-system/legacy";

const DB_FILE = FileSystem.documentDirectory + "library.json";

export const JsonDatabase = {
  /**
   * 1. Check if DB exists.
   * 2. If NO: Seed with MOCK_CARDS and return them.
   * 3. If YES: Parse file (with Dates) and return.
   */
  async getCards(): Promise<Flashcard[]> {
    try {
      const info = await FileSystem.getInfoAsync(DB_FILE);

      if (!info.exists) {
        console.log("[DB] Seeding Database with FSRS Mock Data...");
        // Ensure mock data has 'due' set to NOW for immediate study
        const seedData = MOCK_CARDS.map((c) => ({ ...c, due: new Date() }));
        await FileSystem.writeAsStringAsync(DB_FILE, JSON.stringify(seedData));
        return seedData;
      }

      const content = await FileSystem.readAsStringAsync(DB_FILE);
      // IMPORTANT: Reviver to restore Date objects
      return JSON.parse(content, (key, value) => {
        if (["due", "last_review"].includes(key)) return new Date(value);
        return value;
      }) as Flashcard[];
    } catch (e) {
      console.error("[DB] Error reading:", e);
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
    await FileSystem.deleteAsync(DB_FILE, { idempotent: true });
  },
};
