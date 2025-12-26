import { Flashcard } from "@/constants/types";
import {
  Card,
  FSRS,
  Rating,
  RecordLog,
  ReviewLog,
  createEmptyCard,
  generatorParameters,
} from "ts-fsrs";

export class FSRSService {
  private scheduler: FSRS;

  constructor() {
    const params = generatorParameters({
      request_retention: 0.9,
      maximum_interval: 36500,
      enable_fuzz: true,
    });
    this.scheduler = new FSRS(params);
  }

  public createNewCard(): Card {
    return createEmptyCard(new Date());
  }

  public getSchedulingPreviews(card: Card): RecordLog {
    const now = new Date();
    return this.scheduler.repeat(card, now);
  }

  /**
   * Calculates the next interval based on BINARY feedback.
   */
  public processReview(
    currentCard: Flashcard,
    isPass: boolean
  ): { card: Flashcard; log: ReviewLog } {
    const now = new Date();

    // Pass -> Good, Fail -> Again
    const rating = isPass ? Rating.Good : Rating.Again;

    // Get all possible outcomes
    const schedulingInfo = this.scheduler.repeat(currentCard as Card, now);

    // Select the specific outcome
    const result = schedulingInfo[rating];

    // Merge FSRS updates into our Flashcard
    const updatedCard: Flashcard = {
      ...currentCard,
      ...result.card,
      id: currentCard.id,
    };

    return {
      card: updatedCard,
      log: result.log, // <--- FIX: Extract the inner 'log' object
    };
  }
}

export const fsrsService = new FSRSService();
