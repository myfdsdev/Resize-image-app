import type { Metadata } from "next";
import { CollageStudio } from "@/components/collage/CollageStudio";

export const metadata: Metadata = { title: "Collage" };

export default function CollagePage() {
  return <CollageStudio />;
}
