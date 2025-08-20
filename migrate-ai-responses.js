#!/usr/bin/env node

// Migration script to add the AI responses table for intelligent detection
import pkg from 'pg';
const { Pool } = pkg;

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('Please set DATABASE_URL to your database connection string');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateAiResponses() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running AI responses table migration...');
    
    // Check if ai_responses table already exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'ai_responses'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ ai_responses table already exists');
      return;
    }
    
    console.log('➕ Creating ai_responses table...');
    
    // Create the ai_responses table
    await client.query(`
      CREATE TABLE ai_responses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id),
        guild_id VARCHAR,
        context_memory_id VARCHAR REFERENCES context_memory(id),
        response_text TEXT NOT NULL,
        response_type VARCHAR NOT NULL,
        question_asked TEXT,
        confidence INTEGER DEFAULT 5,
        was_direct_question BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `);
    
    console.log('✅ ai_responses table created successfully');
    
    // Create indexes for efficient querying
    console.log('➕ Creating indexes...');
    
    await client.query(`
      CREATE INDEX idx_ai_responses_user ON ai_responses(user_id)
    `);
    
    await client.query(`
      CREATE INDEX idx_ai_responses_guild ON ai_responses(guild_id)
    `);
    
    await client.query(`
      CREATE INDEX idx_ai_responses_context ON ai_responses(context_memory_id)
    `);
    
    await client.query(`
      CREATE INDEX idx_ai_responses_created ON ai_responses(created_at)
    `);
    
    console.log('✅ Indexes created successfully');
    
    // Add cleanup function
    console.log('➕ Creating cleanup function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_ai_responses()
      RETURNS void AS $$
      BEGIN
        DELETE FROM ai_responses WHERE expires_at < NOW();
      END;
      $$ LANGUAGE plpgsql
    `);
    
    console.log('✅ Cleanup function created successfully');
    
    // Add table comment
    await client.query(`
      COMMENT ON TABLE ai_responses IS 'Stores AI responses for intelligent direct vs conversational detection. Enables the bot to understand when users are asking about previous responses vs making general conversation.'
    `);
    
    console.log('✅ Table comment added successfully');
    
    console.log('🎉 AI responses table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateAiResponses().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
