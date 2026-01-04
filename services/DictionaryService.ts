// CHANGE THIS LINE: Add "/legacy"
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

const DB_NAME = "dictionary.db";

class DictionaryService {
  private db: SQLite.SQLiteDatabase | null = null;
  public isReady = false;

  async init() {
    if (this.isReady) return;

    // 1. Check if DB exists in writable directory (DocumentDirectory)
    // Note: We use the legacy API because it's simple for basic file checks
    const dbDir = FileSystem.documentDirectory + "SQLite";
    const dbUri = dbDir + "/" + DB_NAME;

    // Ensure SQLite folder exists
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir);
    }

    const fileInfo = await FileSystem.getInfoAsync(dbUri);

    // 2. If not exists, copy from Assets
    if (!fileInfo.exists) {
      console.log("[Dictionary] Copying DB from assets...");
      const asset = Asset.fromModule(require("@/assets/dictionary.db"));
      await asset.downloadAsync(); // Ensure asset is available

      await FileSystem.copyAsync({
        from: asset.localUri!,
        to: dbUri,
      });
      console.log("[Dictionary] DB copied.");
    }

    // 3. Open Database
    this.db = await SQLite.openDatabaseAsync(DB_NAME);
    this.isReady = true;
    console.log("[Dictionary] Service Ready.");
  }

  // Updated return type signature
  async lookup(word: string): Promise<{ id: string; data: any }[]> {
    if (!this.db) await this.init();

    // 1. Get Entry IDs
    const mappings = await this.db!.getAllAsync<{ entry_id: string }>(
      "SELECT entry_id FROM mapping WHERE word = ?",
      [word]
    );

    if (mappings.length === 0) return [];

    // 2. Get Actual Data
    const placeholders = mappings.map(() => "?").join(",");
    const ids = mappings.map((m) => m.entry_id);

    // 3. Fetch entries (Now selecting 'id' AND 'data')
    const entries = await this.db!.getAllAsync<{ id: string; data: string }>(
      `SELECT id, data FROM entries WHERE id IN (${placeholders})`,
      ids
    );

    // 4. Map to { id, data } structure
    return entries.map((e) => ({
      id: e.id,
      data: JSON.parse(e.data),
    }));
  }

  /**
   * Fetch a specific entry by its unique ID (e.g. "entry12345")
   * Used for displaying the back of Word cards.
   */
  async getEntryById(entryId: string): Promise<any | null> {
    if (!this.db) await this.init();

    const result = await this.db!.getFirstAsync<{ data: string }>(
      "SELECT data FROM entries WHERE id = ?",
      [entryId]
    );

    if (!result) return null;
    return JSON.parse(result.data);
  }
}

export const dictionaryService = new DictionaryService();
