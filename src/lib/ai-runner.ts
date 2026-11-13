import "server-only";
import { ApiError, createFalClient } from "@fal-ai/client";
import { aiMockEnabled } from "./ai-keys";
import { AI_TOOLS, buildAiInput, friendlyAiError, type AiToolId } from "./ai-tools";

export type JobState =
  | { status: "queued" | "running" }
  | { status: "done"; url: string; width?: number; height?: number }
  | { status: "error"; error: string };

function client(key: string) {
  return createFalClient({ credentials: key });
}

function toFriendly(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | undefined;
    const detail = typeof body?.detail === "string" ? body.detail : e.message;
    return friendlyAiError(e.status, detail);
  }
  return friendlyAiError(undefined, e instanceof Error ? e.message : undefined);
}

// ---------- Mock (development only) ----------

// Shared across route bundles (each API route may load its own copy of this module).
const g = globalThis as unknown as { _pixforgeMockJobs?: Map<string, { dataUrl: string; polls: number; tool: AiToolId }> };
const mockJobs = (g._pixforgeMockJobs ??= new Map());

async function mockSubmit(tool: AiToolId, image: Blob) {
  const buf = Buffer.from(await image.arrayBuffer());
  const id = `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  mockJobs.set(id, { dataUrl: `data:${image.type || "image/jpeg"};base64,${buf.toString("base64")}`, polls: 0, tool });
  if (mockJobs.size > 50) mockJobs.delete(mockJobs.keys().next().value!);
  return id;
}

function mockStatus(id: string): JobState {
  const job = mockJobs.get(id);
  if (!job) return { status: "error", error: "Request not found" };
  job.polls++;
  if (job.polls < 2) return { status: "running" };
  if (job.tool === "upscale" && job.dataUrl.length < 200) return { status: "error", error: "Mock failure" };
  return { status: "done", url: job.dataUrl };
}

// ---------- Real ----------

/** Uploads the image (and mask) to fal storage with a short lifetime, then queues the job. */
export async function submitAiJob(key: string, tool: AiToolId, image: Blob, mask?: Blob): Promise<{ requestId: string } | { error: string }> {
  if (aiMockEnabled()) return { requestId: await mockSubmit(tool, image) };
  const fal = client(key);
  try {
    const lifecycle = { lifecycle: { expiresIn: "1h" as const } };
    const imageUrl = await fal.storage.upload(image, lifecycle);
    const maskUrl = mask ? await fal.storage.upload(mask, lifecycle) : undefined;
    const { request_id } = await fal.queue.submit(AI_TOOLS[tool].endpoint, {
      input: buildAiInput(tool, imageUrl, maskUrl),
    });
    return { requestId: request_id };
  } catch (e) {
    return { error: toFriendly(e) };
  }
}

export async function getAiJob(key: string, tool: AiToolId, requestId: string): Promise<JobState> {
  if (aiMockEnabled()) return mockStatus(requestId);
  const fal = client(key);
  const endpoint = AI_TOOLS[tool].endpoint;
  try {
    const status = await fal.queue.status(endpoint, { requestId });
    if (status.status === "IN_QUEUE") return { status: "queued" };
    if (status.status === "IN_PROGRESS") return { status: "running" };
    const result = await fal.queue.result(endpoint, { requestId });
    const data = result.data as { image?: { url?: string; width?: number; height?: number } };
    if (!data?.image?.url) return { status: "error", error: "The AI returned no image." };
    return { status: "done", url: data.image.url, width: data.image.width, height: data.image.height };
  } catch (e) {
    return { status: "error", error: toFriendly(e) };
  }
}
