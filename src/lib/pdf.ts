import { PDFParse } from "pdf-parse";

/** Extracts the text layer from a PDF. Returns "" for scanned/image-only PDFs. */
export async function extractPdfText(data: Buffer): Promise<string> {
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
