import type { Metadata } from "next";
import { AiStudio } from "@/components/ai/AiStudio";

export const metadata: Metadata = { title: "AI Tools" };

export default function AiPage() {
  return <AiStudio />;
}
