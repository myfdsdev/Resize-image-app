import type { Metadata } from "next";
import { CropStudio } from "@/components/crop/CropStudio";

export const metadata: Metadata = { title: "Crop & Rotate" };

export default function CropPage() {
  return <CropStudio />;
}
