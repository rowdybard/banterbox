-- Add AI Responses table for intelligent direct vs conversational detection
CREATE TABLE IF NOT EXISTS ai_responses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id),
  guild_id VARCHAR, -- For Discord context
  context_memory_id VARCHAR REFERENCES context_memory(id), -- Link to context memory
  response_text TEXT NOT NULL, -- The actual AI response
  response_type VARCHAR NOT NULL, -- 'factual', 'personality', 'contextual'
  question_asked TEXT, -- The question that triggered this response
  confidence INTEGER DEFAULT 5, -- 1-10 scale for response confidence
  was_direct_question BOOLEAN DEFAULT false, -- Whether this was a direct question
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL -- Auto-cleanup after 24 hours
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_responses_user ON ai_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_guild ON ai_responses(guild_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_context ON ai_responses(context_memory_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_created ON ai_responses(created_at);

-- Add a scheduled cleanup job (optional - can be handled by application)
-- This will automatically delete expired responses
CREATE OR REPLACE FUNCTION cleanup_expired_ai_responses()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_responses WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a comment explaining the table purpose
COMMENT ON TABLE ai_responses IS 'Stores AI responses for intelligent direct vs conversational detection. Enables the bot to understand when users are asking about previous responses vs making general conversation.';
