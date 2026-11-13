import { detectFormatSupport } from "@/lib/format-support";
import { processImage } from "./pipeline";
import type { ProcessJob, ProcessResult } from "./types";

type WorkerReply =
  | { ok: true; result: ProcessResult }
  | { ok: false; jobId: string; error: string };

/** Default number of images processed at the same time. Keeps memory bounded. */
export const DEFAULT_CONCURRENCY = 2;

class WorkerSlot {
  private worker: Worker | null = null;
  broken = false;

  private get(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("../../workers/process.worker.ts", import.meta.url), { type: "module" });
    }
    return this.worker;
  }

  run(job: ProcessJob, webpSupported: boolean): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      let w: Worker;
      try {
        w = this.get();
      } catch (e) {
        this.broken = true;
        reject(e);
        return;
      }
      const cleanup = () => {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
      };
      const onMessage = (e: MessageEvent<WorkerReply>) => {
        cleanup();
        if (e.data.ok) resolve(e.data.result);
        else reject(new Error(e.data.error));
      };
      const onError = (e: ErrorEvent) => {
        cleanup();
        this.broken = true;
        this.terminate();
        reject(new Error(e.message || "Worker crashed"));
      };
      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError);
      w.postMessage({ job, webpSupported });
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

export interface RunCallbacks {
  onStart?: (job: ProcessJob) => void;
  onDone: (job: ProcessJob, result: ProcessResult) => void;
  onError: (job: ProcessJob, message: string) => void;
  isCancelled?: () => boolean;
}

/**
 * Run jobs with limited concurrency. One failure never stops the batch:
 * each job reports its own success or error.
 */
export async function runJobs(jobs: ProcessJob[], cb: RunCallbacks, concurrency = DEFAULT_CONCURRENCY) {
  const support = detectFormatSupport();
  const slots = Array.from({ length: Math.max(1, concurrency) }, () => new WorkerSlot());
  let next = 0;

  const runOne = async (slot: WorkerSlot, job: ProcessJob): Promise<ProcessResult> => {
    if (support.offscreen && !slot.broken) {
      try {
        return await slot.run(job, support.webp);
      } catch (e) {
        // A worker-level crash falls back to the main thread; image errors are real errors.
        if (!slot.broken) throw e;
      }
    }
    return processImage(job, support.webp);
  };

  const loop = async (slot: WorkerSlot) => {
    while (next < jobs.length) {
      if (cb.isCancelled?.()) return;
      const job = jobs[next++];
      cb.onStart?.(job);
      try {
        const result = await runOne(slot, job);
        cb.onDone(job, result);
      } catch (e) {
        cb.onError(job, e instanceof Error ? e.message : "Processing failed");
      }
    }
  };

  try {
    await Promise.all(slots.map(loop));
  } finally {
    slots.forEach((s) => s.terminate());
  }
}
