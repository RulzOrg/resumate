-- Chat Messages Table
-- Persists ChatPanel conversations for resume editing sessions

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
  optimized_resume_id UUID NOT NULL REFERENCES optimized_resumes(id) ON DELETE CASCADE,

  -- Message data
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'complete',

  -- Edit operations (assistant messages with proposed changes)
  edit_result JSONB,
  edit_status VARCHAR(20) CHECK (edit_status IN ('pending', 'applied', 'dismissed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_resume_created
  ON chat_messages(optimized_resume_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages(user_id);

-- Comments
COMMENT ON TABLE chat_messages IS 'Chat conversation history for ChatPanel resume editing';
COMMENT ON COLUMN chat_messages.role IS 'Message sender: user or assistant';
COMMENT ON COLUMN chat_messages.status IS 'Message state: pending, streaming, complete, error';
COMMENT ON COLUMN chat_messages.edit_result IS 'ChatEditResult JSON: operations, diffs, explanation, confidence';
COMMENT ON COLUMN chat_messages.edit_status IS 'What the user did with proposed edits: pending, applied, dismissed';

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER trigger_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_messages_updated_at();
