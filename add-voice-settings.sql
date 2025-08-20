-- Add voice settings to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{
  "enabled": false,
  "streamerId": null,
  "whitelistedUsers": [],
  "voiceChannelId": null,
  "guildId": null
}'::jsonb;

-- Add comment explaining the voice settings
COMMENT ON COLUMN user_settings.voice_settings IS 'Voice listening settings including streamer ID, whitelisted users, and voice channel configuration';

-- Add voice_message event type to context_memory if it doesn't exist
-- (This is handled by the application, but we can add a comment)
COMMENT ON TABLE context_memory IS 'Stores conversation history including voice transcriptions for context-aware AI responses';
