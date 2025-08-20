#!/usr/bin/env node
// Migration script to add voice settings to user_settings table
// Run this in Render shell: node migrate-voice-settings-new.js

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateVoiceSettings() {
  const client = await pool.connect();
  try {
    console.log('🔧 Starting voice settings migration...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Check if voice_settings column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND column_name = 'voice_settings'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Voice settings column already exists');
      return;
    }

    console.log('📝 Adding voice_settings column...');

    // Add voice_settings column
    await client.query(`
      ALTER TABLE user_settings 
      ADD COLUMN voice_settings JSONB DEFAULT '{
        "enabled": false,
        "streamerId": null,
        "whitelistedUsers": [],
        "voiceChannelId": null,
        "guildId": null
      }'::jsonb
    `);

    // Add comment explaining the voice settings
    await client.query(`
      COMMENT ON COLUMN user_settings.voice_settings IS 'Voice listening settings including streamer ID, whitelisted users, and voice channel configuration'
    `);

    console.log('✅ Voice settings migration completed successfully');
    console.log('');
    console.log('🎤 Voice features now available:');
    console.log('- /voice start    - Start listening to voice channel');
    console.log('- /voice stop     - Stop voice listening');
    console.log('- /voice status   - Check voice listening status');
    console.log('- /voice whitelist @user - Add/remove user from whitelist');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
console.log('🚀 Starting voice settings migration...');
migrateVoiceSettings()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
