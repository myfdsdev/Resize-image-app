import type { Metadata } from "next";
import { PdfStudio } from "@/components/pdf/PdfStudio";

export const metadata: Metadata = { title: "Images to PDF" };

export default function PdfPage() {
  return <PdfStudio />;
}
