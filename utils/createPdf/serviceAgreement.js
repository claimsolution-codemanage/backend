import fs from "fs/promises";
import zlib from "zlib";
import {
  PDFDocument,
  PDFRawStream,
  PDFName,
  decodePDFRawStream,
  arrayAsString,
} from "pdf-lib";


export const editServiceAgreement = async (path, replacements = {}) => {
  // Read PDF file as bytes
  const existingPdfBytes = await fs.readFile(path);

  // Load PDF using pdf-lib
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Prepare replacement rules (Regex based)
  const rules = Object.entries(replacements).map(([key, value]) => ({
    pattern: new RegExp(`{{${key}}}`, "g"),
    replacement: String(value),
  }));

  // Iterate through all indirect objects in the PDF
  for (const [ref, object] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;

    // Skip image objects
    if (object.dict?.get(PDFName.of("Subtype")) === PDFName.of("Image")) continue;

    // Decode raw stream to text
    let decoded;
    try {
      decoded = decodePDFRawStream(object).decode();
    } catch {
      continue; // Skip if decoding fails
    }

    let text = arrayAsString(decoded);
    let modified = false;

    // Apply all replacements
    for (const rule of rules) {
      const newText = text.replace(rule.pattern, rule.replacement);
      if (newText !== text) {
        text = newText;
        modified = true;
      }
    }

    // Re-encode and reassign stream if modified
    if (modified) {
      const compressed = zlib.deflateSync(text);
      object.contents = compressed;
      object.dict.set(PDFName.of("Filter"), PDFName.of("FlateDecode"));
    }
  }

  // Save modified PDF to buffer
  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
};