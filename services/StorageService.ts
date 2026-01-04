import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import { State } from "ts-fsrs";

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
  dictionary_entry_id?: string;
  context_phrase_id?: string;
  token_map: string;
  raw_data: string;

  // FSRS Fields
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  last_review?: string;
}

// HELPER: SQLite crashes if you pass 'undefined'. This converts undefined -> null.
const toSqlParams = (params: any[]) => {
  return params.map((p) => (p === undefined ? null : p));
};

class StorageService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing = false;

  async init() {
    if (this.db) return; // Already initialized
    if (this.isInitializing) return; // Prevent concurrent inits

    this.isInitializing = true;
    try {
      const dbDir = FileSystem.documentDirectory + "SQLite";
      const dirInfo = await FileSystem.getInfoAsync(dbDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir);
      }

      this.db = await SQLite.openDatabaseAsync(DB_NAME);

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
          dictionary_entry_id TEXT,
          context_phrase_id TEXT,
          token_map TEXT,
          raw_data TEXT,
          
          -- FSRS Columns
          state INTEGER DEFAULT 0,
          due TEXT NOT NULL,
          stability REAL DEFAULT 0,
          difficulty REAL DEFAULT 0,
          elapsed_days INTEGER DEFAULT 0,
          scheduled_days INTEGER DEFAULT 0,
          reps INTEGER DEFAULT 0,
          lapses INTEGER DEFAULT 0,
          last_review TEXT,

          FOREIGN KEY(deck_id) REFERENCES owned_decks(id) ON DELETE CASCADE
        );
      `);

      console.log("[Storage] Service Ready.");
    } catch (e) {
      console.error("[Storage] Init failed:", e);
    } finally {
      this.isInitializing = false;
    }
  }

  private async ensureDb() {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("[Storage] DB failed to initialize.");
  }

  // --- DECK OPERATIONS ---

  async lockAllDecks() {
    await this.ensureDb();
    await this.db!.runAsync("DELETE FROM owned_decks");
    await this.db!.runAsync("DELETE FROM cards");
    console.log("[Storage] All decks and cards cleared.");
  }

  async isDeckUnlocked(deckId: string): Promise<boolean> {
    await this.ensureDb();
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
    await this.ensureDb();
    await this.db!.runAsync(
      "INSERT OR REPLACE INTO owned_decks (id, file_hash, title, unlocked_at) VALUES (?, ?, ?, ?)",
      toSqlParams([deckId, hash, title, new Date().toISOString()])
    );
  }

  async getOwnedDecks(): Promise<OwnedDeck[]> {
    await this.ensureDb();
    return await this.db!.getAllAsync<OwnedDeck>(
      "SELECT * FROM owned_decks ORDER BY unlocked_at DESC"
    );
  }

  // --- CARD OPERATIONS ---

  async saveCardsForDeck(deckId: string, cards: Partial<LocalCard>[]) {
    await this.ensureDb();
    if (cards.length === 0) return;

    try {
      await this.db!.runAsync("DELETE FROM cards WHERE deck_id = ?", [deckId]);

      const now = new Date().toISOString();

      // We explicitly check EVERY field to ensure no 'undefined' slips through
      for (const card of cards) {
        if (!card.id || !card.type || !card.front) {
          console.warn("[Storage] Skipping invalid card:", card);
          continue;
        }

        await this.db!.runAsync(
          `INSERT INTO cards (
             id, deck_id, type, front, back, 
             dictionary_entry_id, context_phrase_id, 
             token_map, raw_data,
             state, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, last_review
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          toSqlParams([
            card.id,
            deckId,
            card.type,
            card.front,
            card.back ?? "", // Safe Default
            card.dictionary_entry_id ?? null,
            card.context_phrase_id ?? null,
            card.token_map ?? "{}",
            card.raw_data ?? "{}",
            // FSRS Defaults
            State.New, // state = 0
            now, // due
            0, // stability
            0, // difficulty
            0, // elapsed
            0, // scheduled
            0, // reps
            0, // lapses
            null, // last_review
          ])
        );
      }
      console.log(`[Storage] Saved ${cards.length} cards.`);
    } catch (e) {
      console.error("[Storage] Save failed:", e);
      throw e;
    }
  }

  async getCards(deckId: string): Promise<LocalCard[]> {
    await this.ensureDb();
    return await this.db!.getAllAsync<LocalCard>(
      "SELECT * FROM cards WHERE deck_id = ?",
      [deckId]
    );
  }

  async updateCardStats(card: LocalCard) {
    await this.ensureDb();

    // Defensive: Fallback to defaults if any FSRS stat is somehow undefined
    const params = toSqlParams([
      card.state ?? 0,
      card.due ?? new Date().toISOString(),
      card.stability ?? 0,
      card.difficulty ?? 0,
      card.elapsed_days ?? 0,
      card.scheduled_days ?? 0,
      card.reps ?? 0,
      card.lapses ?? 0,
      card.last_review ?? null,
      card.id,
    ]);

    await this.db!.runAsync(
      `UPDATE cards SET 
         state = ?, due = ?, stability = ?, difficulty = ?, 
         elapsed_days = ?, scheduled_days = ?, reps = ?, lapses = ?, last_review = ?
       WHERE id = ?`,
      params
    );

    // Optional: Log success only in dev to reduce noise
    // console.log(`[Storage] Updated stats for card ${card.id}`);
  }

  async forceCheckpoint() {
    await this.ensureDb();
    await this.db!.execAsync("PRAGMA wal_checkpoint(FULL);");
    console.log("[Storage] Checkpointed.");
  }

  async getCardCount(): Promise<number> {
    await this.ensureDb();
    const res = await this.db!.getFirstAsync<{ c: number }>(
      "SELECT count(*) as c FROM cards"
    );
    return res?.c || 0;
  }

  async resetDatabase() {
    await this.ensureDb();
    try {
      await this.db!.execAsync("DROP TABLE IF EXISTS cards");
      await this.db!.execAsync("DROP TABLE IF EXISTS owned_decks");
      console.log("[Storage] Tables dropped.");
      // Force init to recreate schemas immediately
      this.db = null;
      await this.init();
    } catch (e) {
      console.error("[Storage] Reset failed:", e);
    }
  }
}

export const storageService = new StorageService();
