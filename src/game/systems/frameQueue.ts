// Runs queued jobs one per tick (a frame). Used where a job is heavy and a burst of them would freeze the game: the keychain
// thumbnails (ADR 0021) are built one per frame. Pure TS: the scene calls `tick` from its update.
export class FrameQueue {
  private jobs: { run: () => void }[] = [];

  /** `onError` hears about a job that threw (the queue keeps going). */
  constructor(private readonly onError: (error: unknown) => void = (e) => console.error(e)) {}

  get pending(): number {
    return this.jobs.length;
  }

  /** Queues a job. The returned function cancels it if it has not run yet. */
  add(run: () => void): () => void {
    const job = { run };
    this.jobs.push(job);
    return () => {
      this.jobs = this.jobs.filter((j) => j !== job);
    };
  }

  /** Runs the next job, if any. */
  tick(): void {
    const job = this.jobs.shift();
    if (!job) return;
    try {
      job.run();
    } catch (error) {
      this.onError(error);
    }
  }

  clear(): void {
    this.jobs = [];
  }
}
