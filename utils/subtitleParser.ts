import { ProcessingConfig } from "@/constants/types";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Reads a file as a raw string, handling potential BOM characters.
 */
const readRawFile = async (fileUri: string): Promise<string> => {
  const content = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Remove Byte Order Mark (BOM) if present, to match Python's utf-8 reading
  if (content.length > 0 && content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
};

/**
 * CALCULATE HASH
 * Matches the backend's PREPROCESSOR.calculate_hash logic.
 * Used for:
 * 1. Unlocking a deck (verifying ownership)
 * 2. Checking if a deck exists before creating it
 */
export const generateFileHash = async (
  fileUri: string,
  config: ProcessingConfig
): Promise<string> => {
  try {
    const rawContent = await readRawFile(fileUri);

    let textToHash = rawContent;

    // 1. Normalize (NFKC)
    if (config.normalization === "NFKC") {
      textToHash = textToHash.normalize("NFKC");
    }

    // 2. Strip Whitespace
    if (config.stripWhitespace) {
      textToHash = textToHash.replace(/\s+/g, "");
    }

    // 3. SHA256 Hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      textToHash
    );

    return hash;
  } catch (error: any) {
    console.error("❌ Hashing Error:", error);
    throw new Error("Failed to generate file hash");
  }
};
