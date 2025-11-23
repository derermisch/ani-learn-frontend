import * as FileSystem from "expo-file-system/legacy";

/**
 * ---------------------------------------------------------
 * HELPER: CLEAN TAGS
 * ---------------------------------------------------------
 */
const cleanLine = (text: string): string => {
  if (!text) return "";
  let cleaned = text;

  // 1. Remove ASS tags { ... }
  cleaned = cleaned.replace(/\{.*?\}/g, "");

  // 2. Remove HTML-like tags < ... >
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // 3. Replace ASS newlines \N or \n with a space
  cleaned = cleaned.replace(/\\N/gi, " ");
  cleaned = cleaned.replace(/\\n/gi, " ");

  return cleaned.trim();
};

/**
 * ---------------------------------------------------------
 * PARSER: .SRT & .VTT
 * ---------------------------------------------------------
 */
const parseSrtVtt = (content: string): string[] => {
  // Robust split for \r\n, \n, AND \r
  const lines = content.split(/\r\n|\n|\r/);
  const extracted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (trimmed === "WEBVTT") continue;
    if (/^\d+$/.test(trimmed)) continue; // Skip index numbers
    if (trimmed.includes("-->")) continue; // Skip timestamps

    const clean = cleanLine(trimmed);
    if (clean) extracted.push(clean);
  }
  return extracted;
};

/**
 * ---------------------------------------------------------
 * PARSER: .ASS / .SSA
 * ---------------------------------------------------------
 */
const parseAss = (content: string): string[] => {
  const lines = content.split(/\r\n|\n|\r/);
  const extracted: string[] = [];
  let eventsSection = false;
  let textColumnIndex = 9;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "[Events]") {
      eventsSection = true;
      continue;
    }
    if (!eventsSection) continue;

    if (trimmed.startsWith("Format:")) {
      const parts = trimmed
        .substring(7)
        .split(",")
        .map((s) => s.trim());
      const idx = parts.indexOf("Text");
      if (idx !== -1) textColumnIndex = idx;
      continue;
    }

    if (trimmed.startsWith("Dialogue:")) {
      const rawContent = trimmed.substring(9).trim();
      let commaCount = 0;
      let textStartPos = 0;

      for (let i = 0; i < rawContent.length; i++) {
        if (rawContent[i] === ",") {
          commaCount++;
          if (commaCount === textColumnIndex) {
            textStartPos = i + 1;
            break;
          }
        }
      }

      if (textStartPos > 0) {
        const rawText = rawContent.substring(textStartPos);
        const clean = cleanLine(rawText);
        if (clean) extracted.push(clean);
      }
    }
  }
  return extracted;
};

/**
 * ---------------------------------------------------------
 * MAIN PROCESSOR
 * ---------------------------------------------------------
 */
export const processSubtitleFile = async (
  fileUri: string,
  fileName: string
) => {
  try {
    console.log(`📂 Processing ${fileName}...`);

    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: "utf8",
    });

    // BOM Removal
    const cleanContent =
      content.length > 0 && content.charCodeAt(0) === 0xfeff
        ? content.slice(1)
        : content;

    const lowerName = fileName.toLowerCase();
    let extractedLines: string[] = [];

    if (lowerName.endsWith(".ass") || lowerName.endsWith(".ssa")) {
      extractedLines = parseAss(cleanContent);
    } else {
      extractedLines = parseSrtVtt(cleanContent);
    }

    if (extractedLines.length === 0) {
      throw new Error("No dialogue found in subtitle file.");
    }

    const finalPlainText = extractedLines.join("\n");

    // Save temp file (The backend will calculate the hash from this file upload later)
    const tempFileName = `processed_${Date.now()}.txt`;
    const tempUri = `${FileSystem.cacheDirectory}${tempFileName}`;
    await FileSystem.writeAsStringAsync(tempUri, finalPlainText, {
      encoding: "utf8",
    });

    return {
      uri: tempUri,
      lineCount: extractedLines.length,
      preview: extractedLines.slice(0, 5),
      allLines: extractedLines, // The backend uses this to calculate the hash for the check
    };
  } catch (error: any) {
    console.error("❌ Parser Error:", error);
    throw new Error(error.message || "Failed to parse file");
  }
};
