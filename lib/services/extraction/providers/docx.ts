import JSZip from "jszip"
import type { ExtractionProvider, ExtractProviderInput, ExtractProviderResult } from "./base"
import { normalizeExtractionType } from "./base"

const WORD_XML_PATH_PREFIXES = [
  "word/document.xml",
  "word/header",
  "word/footer",
  "word/footnotes.xml",
  "word/endnotes.xml",
]

export class DocxProvider implements ExtractionProvider {
  readonly name = "docx-parser"

  supports(fileType: string): boolean {
    const normalized = normalizeExtractionType(fileType)
    return (
      normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      normalized === "application/msword"
    )
  }

  async extract(input: ExtractProviderInput): Promise<ExtractProviderResult> {
    const normalized = normalizeExtractionType(input.fileType)
    if (normalized === "application/msword") {
      const legacyText = extractLegacyDocText(input.fileBuffer)
      return {
        text: legacyText,
        pageCount: 1,
        warnings: [
          "Legacy .doc format detected; extraction quality may be lower. DOCX is recommended.",
        ],
        mode: "doc-legacy-fallback",
        confidence: legacyText.length >= 50 ? 0.35 : 0.2,
      }
    }

    const zip = await JSZip.loadAsync(input.fileBuffer)
    const xmlPaths = Object.keys(zip.files).filter((path) =>
      WORD_XML_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))
    )

    if (!xmlPaths.length) {
      throw new Error("DOCX content is missing required Word XML parts")
    }

    const parts = await Promise.all(xmlPaths.map(async (path) => zip.file(path)?.async("string") || ""))
    const mergedText = parts
      .map(extractTextFromWordXml)
      .join("\n")
      .trim()

    if (!mergedText) {
      throw new Error("DOCX parser produced empty output")
    }

    return {
      text: mergedText,
      pageCount: 1,
      warnings: [],
      mode: "docx-xml-parser",
      confidence: 0.85,
    }
  }
}

function extractTextFromWordXml(xml: string): string {
  if (!xml) {
    return ""
  }

  return normalizeWhitespace(
    xml
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<w:t[^>]*>/g, "")
      .replace(/<\/w:t>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  )
}

function extractLegacyDocText(buffer: Buffer): string {
  const content = buffer.toString("latin1")
  const printable = content.match(/[A-Za-z0-9@._,\-:/() ]{3,}/g) || []
  return normalizeWhitespace(printable.join(" "))
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}
