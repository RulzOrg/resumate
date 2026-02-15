export function isStructuredEditorV1Enabled(): boolean {
  return process.env.USE_STRUCTURED_EDITOR_V1 === "true"
}
