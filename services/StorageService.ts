import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

const DB_NAME = "storage.db";

export interface OwnedDeck {
  id: string;
  file_hash: string;
  title: string;
  unlocked_at: string;
}

export interface LocalCard {
  id: string;
  deck_id: string;
  type: "word" | "phrase";
  front: string;
  back: string;
  token_map: string; // JSON string: { "word": "entry_id" }
  raw_data: string; // Full backend JSON string
}

class StorageService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    const dbDir = FileSystem.documentDirectory + "SQLite";
    if (!(await FileSystem.getInfoAsync(dbDir)).exists) {
      await FileSystem.makeDirectoryAsync(dbDir);
    }

    this.db = await SQLite.openDatabaseAsync(DB_NAME);

    // 1. DROP old table to force migration (since we are in dev)
    // In production, you would use ALTER TABLE or a migration versioning system
    // await this.db.execAsync("DROP TABLE IF EXISTS cards");

    // 2. Create Tables with NEW COLUMNS
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS owned_decks (
        id TEXT PRIMARY KEY NOT NULL,
        file_hash TEXT NOT NULL,
        title TEXT,
        unlocked_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY NOT NULL,
        deck_id TEXT NOT NULL,
        type TEXT NOT NULL,
        front TEXT NOT NULL,
        back TEXT, 
        dictionary_entry_id TEXT, -- Null for phrases
        context_phrase_id TEXT,   -- Null for phrases
        token_map TEXT,
        raw_data TEXT,
        FOREIGN KEY(deck_id) REFERENCES owned_decks(id) ON DELETE CASCADE
      );
    `);

    console.log("[Storage] Service Ready.");
  }

  // --- DECK OPERATIONS ---
  async lockAllDecks() {
    if (!this.db) await this.init();
    await this.db!.runAsync("DELETE FROM owned_decks");
    await this.db!.runAsync("DELETE FROM cards"); // Clear cards too
    console.log("[Storage] All decks and cards cleared.");
  }

  async isDeckUnlocked(deckId: string): Promise<boolean> {
    if (!this.db) await this.init();
    const result = await this.db!.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM owned_decks WHERE id = ?",
      [deckId]
    );
    return (result?.count ?? 0) > 0;
  }

  async unlockDeck(
    deckId: string,
    hash: string,
    title: string = "Unknown Deck"
  ) {
    if (!this.db) await this.init();
    await this.db!.runAsync(
      "INSERT OR REPLACE INTO owned_decks (id, file_hash, title, unlocked_at) VALUES (?, ?, ?, ?)",
      [deckId, hash, title, new Date().toISOString()]
    );
  }

  async getOwnedDecks(): Promise<OwnedDeck[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllAsync<OwnedDeck>(
      "SELECT * FROM owned_decks ORDER BY unlocked_at DESC"
    );
  }

  // --- CARD OPERATIONS ---

  /**
   * bulkSaveCards
   * Takes an array of PRE-MAPPED LocalCard objects and saves them efficiently.
   */
  async saveCardsForDeck(deckId: string, cards: LocalCard[]) {
    if (!this.db) await this.init();
    if (cards.length === 0) return;

    console.log(`[Storage] Saving ${cards.length} items (words/phrases)...`);

    try {
      // Clean slate for this deck
      await this.db!.runAsync("DELETE FROM cards WHERE deck_id = ?", [deckId]);

      for (const card of cards) {
        await this.db!.runAsync(
          `INSERT INTO cards (
             id, deck_id, type, front, back, 
             dictionary_entry_id, context_phrase_id, 
             token_map, raw_data
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            card.id,
            deckId,
            card.type,
            card.front,
            card.back,
            card.dictionary_entry_id ?? null,
            card.context_phrase_id ?? null,
            card.token_map,
            card.raw_data,
          ]
        );
      }
      console.log(`[Storage] Save complete.`);
    } catch (e) {
      console.error("[Storage] Failed to save cards:", e);
      throw e;
    }
  }

  async getCards(deckId: string): Promise<LocalCard[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllAsync<LocalCard>(
      "SELECT * FROM cards WHERE deck_id = ?",
      [deckId]
    );
  }

  /**
   * Forces data from the temporary -wal file into the main .db file.
   * Call this before exporting the database.
   */
  async forceCheckpoint() {
    if (!this.db) await this.init();
    await this.db!.execAsync("PRAGMA wal_checkpoint(FULL);");
    console.log("[Storage] Database checkpointed (WAL merged).");
  }

  // Debug helper: Check how many cards are actually inside
  async getCardCount(): Promise<number> {
    if (!this.db) await this.init();
    const res = await this.db!.getFirstAsync<{ c: number }>(
      "SELECT count(*) as c FROM cards"
    );
    return res?.c || 0;
  }

  /**
   * Drops tables to force a schema reset.
   * Useful when you've changed column definitions in code.
   */
  async resetDatabase() {
    if (!this.db) await this.init();
    try {
      await this.db!.execAsync("DROP TABLE IF EXISTS cards");
      await this.db!.execAsync("DROP TABLE IF EXISTS owned_decks");
      console.log("[Storage] Tables dropped. Re-initializing...");
      await this.init(); // Re-create empty tables immediately
    } catch (e) {
      console.error("[Storage] Reset failed:", e);
    }
  }
}

export const storageService = new StorageService();
