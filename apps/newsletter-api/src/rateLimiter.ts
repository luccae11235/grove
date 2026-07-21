interface Bucket {
  count: number;
  resetsAt: number;
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maximum: number,
    private readonly windowMilliseconds: number,
    private readonly now: () => number = Date.now,
  ) {}

  consume(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = this.now();
    const current = this.buckets.get(key);
    if (!current || current.resetsAt <= now) {
      this.buckets.set(key, { count: 1, resetsAt: now + this.windowMilliseconds });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count >= this.maximum) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)),
      };
    }
    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
