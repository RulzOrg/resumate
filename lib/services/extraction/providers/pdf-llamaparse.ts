import type { ExtractionProvider, ExtractProviderInput, ExtractProviderResult } from "./base"
import { normalizeExtractionType } from "./base"

const LLAMAPARSE_API_URL = "https://api.cloud.llamaindex.ai/api/parsing"
const POLL_INTERVAL_MS = 2000
const MAX_WAIT_MS = 60000

export class PdfLlamaParseProvider implements ExtractionProvider {
  readonly name = "pdf-llamaparse"

  supports(fileType: string): boolean {
    return normalizeExtractionType(fileType) === "application/pdf"
  }

  async extract(input: ExtractProviderInput): Promise<ExtractProviderResult> {
    const apiKey = process.env.LLAMACLOUD_API_KEY
    if (!apiKey) {
      throw new Error("LLAMACLOUD_API_KEY is not configured")
    }

    const formData = new FormData()
    const blob = new Blob([input.fileBuffer], { type: "application/pdf" })
    formData.append("file", blob, input.fileName || "resume.pdf")

    const uploadResponse = await fetch(`${LLAMAPARSE_API_URL}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const details = await uploadResponse.text()
      throw new Error(`LlamaParse upload failed: ${uploadResponse.status} - ${details}`)
    }

    const uploadResult = (await uploadResponse.json()) as { id?: string }
    if (!uploadResult.id) {
      throw new Error("LlamaParse upload did not return a job id")
    }

    const start = Date.now()
    while (Date.now() - start < MAX_WAIT_MS) {
      const statusResponse = await fetch(`${LLAMAPARSE_API_URL}/job/${uploadResult.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!statusResponse.ok) {
        throw new Error(`LlamaParse status failed: ${statusResponse.status}`)
      }

      const statusResult = (await statusResponse.json()) as {
        status?: string
        pages?: number
        error?: string
      }

      if (statusResult.status === "SUCCESS") {
        const resultResponse = await fetch(`${LLAMAPARSE_API_URL}/job/${uploadResult.id}/result/text`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!resultResponse.ok) {
          throw new Error(`LlamaParse text fetch failed: ${resultResponse.status}`)
        }

        const text = await resultResponse.text()
        return {
          text: text.trim(),
          pageCount: statusResult.pages || 1,
          warnings: [],
          mode: "llamaparse",
          confidence: 0.95,
        }
      }

      if (statusResult.status === "ERROR" || statusResult.status === "FAILED") {
        throw new Error(statusResult.error || "LlamaParse job failed")
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }

    throw new Error("LlamaParse job timed out")
  }
}
