import { isKanji } from "wanakana"; // Optional: npm install wanakana

export interface TextSegment {
  text: string;
  reading?: string;
  isKanji: boolean;
}

/**
 * Matches a word containing mixed Kanji/Kana to its reading.
 * e.g. parse("言い直す", "いいなおす")
 * -> [{t:"言", r:"い"}, {t:"い"}, {t:"直", r:"なお"}, {t:"す"}]
 */
export function parseFurigana(text: string, reading: string): TextSegment[] {
  // 1. Simple equality check
  if (text === reading) {
    return [{ text, isKanji: false }];
  }

  const result: TextSegment[] = [];
  let tPos = 0;
  let rPos = 0;

  while (tPos < text.length) {
    const char = text[tPos];

    // CASE A: It is Kana (Hiragana/Katakana)
    // We assume the kana in text matches the kana in reading 1-to-1
    if (!isKanji(char)) {
      // You can write a simple regex check if not using wanakana
      result.push({ text: char, isKanji: false });
      tPos++;
      rPos++;
      // Note: This logic assumes the Kana in "text" appears identically in "reading".
      // Usually safe for Okurigana.
      continue;
    }

    // CASE B: It is Kanji (Start of a Kanji block)
    // We need to find where this Kanji block ends.
    let kanjiBlock = "";
    while (tPos < text.length && isKanji(text[tPos])) {
      kanjiBlock += text[tPos];
      tPos++;
    }

    // Now look ahead to find the *next* Kana anchor in the text
    // to figure out where this Kanji reading ends in the reading string.
    let nextKanaChar = tPos < text.length ? text[tPos] : null;

    if (nextKanaChar) {
      // Find this anchor char in the reading string
      const anchorIndex = reading.indexOf(nextKanaChar, rPos);
      if (anchorIndex !== -1) {
        const kanjiReading = reading.substring(rPos, anchorIndex);
        result.push({ text: kanjiBlock, reading: kanjiReading, isKanji: true });
        rPos = anchorIndex; // Advance reading ptr to the anchor
      } else {
        // Fallback: If anchor not found, dump rest as one block (error case)
        result.push({
          text: kanjiBlock,
          reading: reading.substring(rPos),
          isKanji: true,
        });
        rPos = reading.length;
      }
    } else {
      // End of word - the rest of the reading belongs to this kanji block
      result.push({
        text: kanjiBlock,
        reading: reading.substring(rPos),
        isKanji: true,
      });
      rPos = reading.length;
    }
  }

  return result;
}
