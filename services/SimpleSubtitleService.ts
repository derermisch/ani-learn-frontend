import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

export interface SubtitleProcessResult {
  hash: string;
  lines: string[];
  rawText: string;
}

export interface ProcessingOptions {
  useNFKC?: boolean; // Default: true
}

class SimpleSubtitleService {
  /**
   * Replicates backend 'calculate_hash' logic:
   * 1. Optional NFKC Normalization (Default: ON)
   * 2. Lowercase
   * 3. Alphanumeric Super-Strip (Unicode aware)
   * 4. SHA256
   */
  async calculateHash(
    text: string,
    options: ProcessingOptions = {},
  ): Promise<string> {
    const { useNFKC = true } = options;

    // 1. Unicode Normalization (NFKC)
    let processed = useNFKC ? text.normalize("NFKC") : text;

    // 2. Lowercase
    processed = processed.toLowerCase();

    // 3. Super-Strip: Keep only Unicode Letters (\p{L}) and Numbers (\p{N})
    processed = processed.replace(/[^\p{L}\p{N}]/gu, "");

    // 4. SHA256
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      processed,
    );

    return hash;
  }

  /**
   * ROBUST SRT PARSER
   * Splits by blank lines (blocks) instead of strict line-by-line state.
   */
  parseSrtLines(fileContent: string): string[] {
    // 1. Remove BOM (Byte Order Mark) if present (common in Windows files)
    const cleanContent = fileContent.replace(/^\uFEFF/, "");

    // 2. Normalize newlines to \n
    const normalized = cleanContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 3. Split into Blocks (separated by double newlines)
    const blocks = normalized.split(/\n\s*\n/);
    const cleanLines: string[] = [];

    for (const block of blocks) {
      // Split block into lines and remove empty ones
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);

      if (lines.length === 0) continue;

      // SRT Block Structure:
      // Line 0: Index (Number)
      // Line 1: Timestamp (00:00:00 --> 00:00:00)
      // Line 2+: Text

      // Find the line with the timestamp arrow "-->"
      const timestampIndex = lines.findIndex((l) => l.includes("-->"));

      // If we found a timestamp, everything AFTER it is text
      if (timestampIndex !== -1) {
        const textLines = lines.slice(timestampIndex + 1);

        textLines.forEach((l) => {
          // Remove HTML tags often found in SRTs (<i>, <b>, <font>, etc.)
          const noTags = l.replace(/<[^>]*>/g, "");
          // Only add if there is actual text left
          if (noTags) cleanLines.push(noTags);
        });
      }
    }

    return cleanLines;
  }

  async processFile(
    uri: string,
    options: ProcessingOptions = {},
  ): Promise<SubtitleProcessResult> {
    try {
      console.log("[SimpleSubtitle] Reading file:", uri);

      // 1. Read File
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 2. Parse Lines
      const lines = this.parseSrtLines(content);
      console.log(`[SimpleSubtitle] Parsed ${lines.length} lines.`);

      if (lines.length === 0) {
        // Dump the first 100 chars to debug why it failed
        console.warn("File content preview:", content.substring(0, 100));
        throw new Error("No readable text found in subtitle file.");
      }

      // 3. Join for Hashing
      // Matches backend: raw_content_joined = "\n".join(lines)
      const contentToHash = lines.join("\n");

      // 4. Calculate Hash
      const hash = await this.calculateHash(contentToHash, options);

      return {
        hash,
        lines,
        rawText: contentToHash.slice(0, 500),
      };
    } catch (e) {
      console.error("Simple Subtitle Processing Failed:", e);
      throw e;
    }
  }
}

export const simpleSubtitleService = new SimpleSubtitleService();
