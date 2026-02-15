import { test } from "node:test"
import assert from "node:assert/strict"
import JSZip from "jszip"
import { validateUploadedFile } from "@/lib/file-validation"
import { extractText } from "@/lib/extract"

test("validateUploadedFile accepts DOCX with MIME alias", async () => {
  const zip = new JSZip()
  zip.file("word/document.xml", "<w:document><w:body><w:p><w:t>John Doe Resume</w:t></w:p></w:body></w:document>")
  const content = await zip.generateAsync({ type: "uint8array" })
  const file = new File([content], "resume.docx", { type: "application/octet-stream" })
  const formData = new FormData()
  formData.set("file", file)

  const result = await validateUploadedFile(formData, "file")
  assert.equal(result.valid, true)
  assert.equal(
    result.fileType,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
})

test("validateUploadedFile rejects unsupported extension", async () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
  const file = new File([bytes], "resume.jpeg", { type: "image/jpeg" })
  const formData = new FormData()
  formData.set("file", file)

  const result = await validateUploadedFile(formData, "file")
  assert.equal(result.valid, false)
  assert.match(result.error || "", /Invalid file extension/)
})

test("extractText parses DOCX through provider service", async () => {
  const zip = new JSZip()
  zip.file(
    "word/document.xml",
    "<w:document><w:body><w:p><w:t>Jane Engineer</w:t></w:p><w:p><w:t>Work Experience</w:t></w:p></w:body></w:document>"
  )
  const content = await zip.generateAsync({ type: "uint8array" })
  const buffer = Buffer.from(content)

  const extracted = await extractText(
    buffer,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
  assert.ok(extracted.total_chars > 0)
  assert.match(extracted.text, /Jane Engineer/i)
  assert.match(extracted.mode_used, /docx/)
})

test("extractText parses plain text", async () => {
  const buffer = Buffer.from("John Doe\nWork Experience\nBuilt X")
  const extracted = await extractText(buffer, "text/plain")

  assert.equal(extracted.text.includes("John Doe"), true)
  assert.equal(extracted.mode_used, "plaintext")
})
