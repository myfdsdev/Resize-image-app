/// <reference lib="webworker" />
import { processImage } from "@/lib/image-processing/pipeline";
import type { ProcessJob } from "@/lib/image-processing/types";

type InMsg = { job: ProcessJob; webpSupported: boolean };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<InMsg>) => {
  const { job, webpSupported } = e.data;
  try {
    const result = await processImage(job, webpSupported);
    ctx.postMessage({ ok: true, result });
  } catch (err) {
    ctx.postMessage({
      ok: false,
      jobId: job.jobId,
      error: err instanceof Error ? err.message : "Processing failed",
    });
  }
};
