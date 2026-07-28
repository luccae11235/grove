export interface EngagementState {
  engagedMs: number;
  maxScrollPercent: number;
  completed: boolean;
}

export class EngagementTracker {
  private engagedMs = 0;
  private maxScrollPercent = 0;
  private activeUntil = 0;
  private previousTick: number;

  constructor(
    startedAt: number,
    private readonly isVisible: () => boolean,
    private readonly isFocused: () => boolean,
  ) {
    this.previousTick = startedAt;
    this.noteActivity(startedAt);
  }

  noteActivity(at: number) {
    this.activeUntil = Math.max(this.activeUntil, at + 30_000);
  }

  noteScroll(percent: number) {
    this.maxScrollPercent = Math.max(
      this.maxScrollPercent,
      Math.min(100, Math.max(0, Math.round(percent))),
    );
  }

  tick(at: number): EngagementState {
    const elapsed = Math.max(0, Math.min(5_000, at - this.previousTick));
    if (this.isVisible() && this.isFocused() && this.previousTick < this.activeUntil) {
      this.engagedMs += elapsed;
    }
    this.previousTick = at;
    return this.snapshot();
  }

  snapshot(): EngagementState {
    return {
      engagedMs: Math.round(this.engagedMs),
      maxScrollPercent: this.maxScrollPercent,
      completed: this.engagedMs >= 10_000 && this.maxScrollPercent >= 90,
    };
  }
}
