/**
 * This is for interaction with the storage db
 * The storage db has two tables:
 *  - owned_decks
 *  - cards
 */

import { Card, OwnedDeck } from "@/constants/types";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import { State } from "ts-fsrs";

const DB_NAME = "storage.db";

/**
 * SQLite crashes if `undefined` is passed as a parameter.
 * This helper converts all `undefined` values to `null`
 * so they are safe to bind in SQL queries.
 *
 * @param params - Array of SQL parameters
 * @returns Array with `undefined` replaced by `null`
 */
const toSqlParams = (params: any[]) => {
  return params.map((p) => (p === undefined ? null : p));
};

class StorageService {
  /** SQLite database instance once initialized */
  private db: SQLite.SQLiteDatabase | null = null;

  /** Guards against concurrent initialization attempts */
  private isInitializing = false;

  /**
   * Initializes the SQLite database.
   *
   * - Ensures the SQLite directory exists
   * - Opens the database connection
   * - Enables WAL mode
   * - Creates required tables if they do not exist
   *
   * Safe to call multiple times.
   */
  async init() {
    // already initialized
    if (this.db) return;
    // prevent concurrent inits
    if (this.isInitializing) return;

    this.isInitializing = true;
    try {
      const dbDir = FileSystem.documentDirectory + "SQLite";
      const dirInfo = await FileSystem.getInfoAsync(dbDir);

      // create db dir if not existing
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dbDir);
      }

      this.db = await SQLite.openDatabaseAsync(DB_NAME);

      // WAL -> Write Ahead Logging
      // Create tables if they dont exist
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

  /**
   * Ensures the database is initialized before use.
   *
   * @throws Error if initialization fails
   */
  private async ensureDb() {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("[Storage] DB failed to initialize.");
  }

  // --- DECK OPERATIONS ---

  /**
   * Removes all owned decks and all cards.
   * Effectively locks all decks and clears local progress.
   */
  async lockAllDecks() {
    await this.ensureDb();
    await this.db!.runAsync("DELETE FROM owned_decks");
    await this.db!.runAsync("DELETE FROM cards");
    console.log("[Storage] All decks and cards cleared.");
  }

  /**
   * Checks whether a deck is unlocked.
   *
   * @param deckId - Deck identifier
   * @returns True if the deck exists in `owned_decks`
   */
  async isDeckUnlocked(deckId: string): Promise<boolean> {
    await this.ensureDb();
    const result = await this.db!.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM owned_decks WHERE id = ?",
      [deckId],
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Unlocks (or re-unlocks) a deck.
   *
   * Uses `INSERT OR REPLACE` so calling this is idempotent.
   *
   * @param deckId - Deck identifier
   * @param hash - Hash of the deck file
   * @param title - Optional deck title
   */
  async unlockDeck(
    deckId: string,
    hash: string,
    title: string = "Unknown Deck",
  ) {
    await this.ensureDb();
    await this.db!.runAsync(
      "INSERT OR REPLACE INTO owned_decks (id, file_hash, title, unlocked_at) VALUES (?, ?, ?, ?)",
      toSqlParams([deckId, hash, title, new Date().toISOString()]),
    );
  }

  /**
   * Retrieves all unlocked decks.
   *
   * @returns Array of owned decks ordered by unlock date (newest first)
   */
  async getOwnedDecks(): Promise<OwnedDeck[]> {
    await this.ensureDb();
    return await this.db!.getAllAsync<OwnedDeck>(
      "SELECT * FROM owned_decks ORDER BY unlocked_at DESC",
    );
  }

  // --- CARD OPERATIONS ---

  /**
   * Saves all cards for a given deck.
   *
   * - Deletes existing cards for the deck
   * - Inserts new cards with FSRS default values
   * - Skips invalid cards defensively
   *
   * @param deckId - Deck identifier
   * @param cards - Partial card objects to persist
   */
  async saveCardsForDeck(deckId: string, cards: Partial<Card>[]) {
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
            card.back ?? "",
            card.dictionary_entry_id ?? null,
            card.context_phrase_id ?? null,
            card.token_map ?? "{}",
            card.raw_data ?? "{}",
            // FSRS Defaults
            State.New,
            now,
            0,
            0,
            0,
            0,
            0,
            0,
            null,
          ]),
        );
      }
      console.log(`[Storage] Saved ${cards.length} cards.`);
    } catch (e) {
      console.error("[Storage] Save failed:", e);
      throw e;
    }
  }

  /**
   * Retrieves all cards for a given deck.
   *
   * @param deckId - Deck identifier
   * @returns Array of cards belonging to the deck
   */
  async getCards(deckId: string): Promise<Card[]> {
    await this.ensureDb();
    return await this.db!.getAllAsync<Card>(
      "SELECT * FROM cards WHERE deck_id = ?",
      [deckId],
    );
  }

  /**
   * Updates FSRS scheduling statistics for a single card.
   *
   * Defensive defaults are applied to prevent invalid DB writes.
   *
   * @param card - Card with updated FSRS fields
   */
  async updateCardStats(card: Card) {
    await this.ensureDb();

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
      params,
    );
  }

  /**
   * Forces a full WAL checkpoint.
   *
   * Flushes the write-ahead log into the main database file.
   * Useful before backups or app shutdown.
   */
  async forceCheckpoint() {
    await this.ensureDb();
    await this.db!.execAsync("PRAGMA wal_checkpoint(FULL);");
    console.log("[Storage] Checkpointed.");
  }

  /**
   * Returns the total number of cards in the database.
   *
   * @returns Total card count
   */
  async getCardCount(): Promise<number> {
    await this.ensureDb();
    const res = await this.db!.getFirstAsync<{ c: number }>(
      "SELECT count(*) as c FROM cards",
    );
    return res?.c || 0;
  }

  /**
   * Drops all tables and recreates the database schema.
   *
   * This fully resets local storage.
   */
  async resetDatabase() {
    await this.ensureDb();
    try {
      await this.db!.execAsync("DROP TABLE IF EXISTS cards");
      await this.db!.execAsync("DROP TABLE IF EXISTS owned_decks");
      console.log("[Storage] Tables dropped.");
      this.db = null;
      await this.init();
    } catch (e) {
      console.error("[Storage] Reset failed:", e);
    }
  }
}

export const storageService = new StorageService();
