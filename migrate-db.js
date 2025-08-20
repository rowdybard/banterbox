// Comprehensive database migration to add missing columns - Fixed schema issues
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

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running comprehensive database migration...');
    
    // 1. Add passwordHash column to users table
    const passwordHashCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (passwordHashCheck.rows.length === 0) {
      console.log('➕ Adding passwordHash column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN password_hash VARCHAR(255)
      `);
      console.log('✅ passwordHash column added successfully');
    } else {
      console.log('✅ passwordHash column already exists');
    }
    
    // 2. Add subscription_tier column to users table
    const subscriptionTierCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'subscription_tier'
    `);
    
    if (subscriptionTierCheck.rows.length === 0) {
      console.log('➕ Adding subscription_tier column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN subscription_tier TEXT DEFAULT 'free'
      `);
      console.log('✅ subscription_tier column added successfully');
    } else {
      console.log('✅ subscription_tier column already exists');
    }
    
    // 3. Add subscription_status column to users table
    const subscriptionStatusCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'subscription_status'
    `);
    
    if (subscriptionStatusCheck.rows.length === 0) {
      console.log('➕ Adding subscription_status column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN subscription_status TEXT DEFAULT 'active'
      `);
      console.log('✅ subscription_status column added successfully');
    } else {
      console.log('✅ subscription_status column already exists');
    }
    
    // 4. Add subscription_id column to users table
    const subscriptionIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'subscription_id'
    `);
    
    if (subscriptionIdCheck.rows.length === 0) {
      console.log('➕ Adding subscription_id column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN subscription_id VARCHAR(255)
      `);
      console.log('✅ subscription_id column added successfully');
    } else {
      console.log('✅ subscription_id column already exists');
    }
    
    // 5. Add trial_ends_at column to users table
    const trialEndsAtCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'trial_ends_at'
    `);
    
    if (trialEndsAtCheck.rows.length === 0) {
      console.log('➕ Adding trial_ends_at column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN trial_ends_at TIMESTAMP
      `);
      console.log('✅ trial_ends_at column added successfully');
    } else {
      console.log('✅ trial_ends_at column already exists');
    }
    
    // 6. Add current_period_end column to users table
    const currentPeriodEndCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'current_period_end'
    `);
    
    if (currentPeriodEndCheck.rows.length === 0) {
      console.log('➕ Adding current_period_end column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN current_period_end TIMESTAMP
      `);
      console.log('✅ current_period_end column added successfully');
    } else {
      console.log('✅ current_period_end column already exists');
    }
    
    // 7. Add favoritePersonalities column to user_settings table
    const favoritePersonalitiesCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' AND column_name = 'favorite_personalities'
    `);
    
    if (favoritePersonalitiesCheck.rows.length === 0) {
      console.log('➕ Adding favoritePersonalities column to user_settings table...');
      await client.query(`
        ALTER TABLE user_settings 
        ADD COLUMN favorite_personalities JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ favoritePersonalities column added successfully');
    } else {
      console.log('✅ favoritePersonalities column already exists');
    }
    
    // 8. Add favoriteVoices column to user_settings table
    const favoriteVoicesCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' AND column_name = 'favorite_voices'
    `);
    
    if (favoriteVoicesCheck.rows.length === 0) {
      console.log('➕ Adding favoriteVoices column to user_settings table...');
      await client.query(`
        ALTER TABLE user_settings 
        ADD COLUMN favorite_voices JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ favoriteVoices column added successfully');
    } else {
      console.log('✅ favoriteVoices column already exists');
    }
    
    // 9. Add originalMessage column to banter_items table
    const banterOriginalMessageCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'banter_items' AND column_name = 'original_message'
    `);
    
    if (banterOriginalMessageCheck.rows.length === 0) {
      console.log('➕ Adding originalMessage column to banter_items table...');
      await client.query(`
        ALTER TABLE banter_items 
        ADD COLUMN original_message TEXT
      `);
      console.log('✅ originalMessage column added to banter_items successfully');
    } else {
      console.log('✅ originalMessage column already exists in banter_items');
    }
    
    // 10. Create context_memory table if it doesn't exist
    const contextMemoryTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'context_memory'
    `);
    
    if (contextMemoryTableCheck.rows.length === 0) {
      console.log('➕ Creating context_memory table...');
      await client.query(`
        CREATE TABLE context_memory (
          id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
          user_id VARCHAR,
          guild_id VARCHAR,
          event_type VARCHAR NOT NULL,
          event_data JSONB,
          context_summary TEXT NOT NULL,
          original_message TEXT,
          banter_response TEXT,
          importance INTEGER DEFAULT 1,
          participants TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      console.log('✅ context_memory table created successfully');
    } else {
      console.log('✅ context_memory table already exists');
    }
    
    // 11. Add originalMessage column to context_memory table (if not already present)
    const contextOriginalMessageCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'context_memory' AND column_name = 'original_message'
    `);
    
    if (contextOriginalMessageCheck.rows.length === 0) {
      console.log('➕ Adding originalMessage column to context_memory table...');
      await client.query(`
        ALTER TABLE context_memory 
        ADD COLUMN original_message TEXT
      `);
      console.log('✅ originalMessage column added to context_memory successfully');
    } else {
      console.log('✅ originalMessage column already exists in context_memory');
    }
    
    // 12. Add banterResponse column to context_memory table
    const contextBanterResponseCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'context_memory' AND column_name = 'banter_response'
    `);
    
    if (contextBanterResponseCheck.rows.length === 0) {
      console.log('➕ Adding banterResponse column to context_memory table...');
      await client.query(`
        ALTER TABLE context_memory 
        ADD COLUMN banter_response TEXT
      `);
      console.log('✅ banterResponse column added to context_memory successfully');
    } else {
      console.log('✅ banterResponse column already exists in context_memory');
    }
    
    // 13. Create sessions table if it doesn't exist
    const sessionsTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'sessions'
    `);
    
    if (sessionsTableCheck.rows.length === 0) {
      console.log('➕ Creating sessions table...');
      await client.query(`
        CREATE TABLE sessions (
          sid VARCHAR NOT NULL COLLATE "default",
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        )
      `);
      console.log('✅ Sessions table created');
    } else {
      console.log('✅ Sessions table already exists');
    }
    
    // 14. Create unique index on sessions.sid if it doesn't exist
    const sessionsSidIndexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'sessions' AND indexname = 'idx_session_sid'
    `);
    
    if (sessionsSidIndexCheck.rows.length === 0) {
      console.log('➕ Creating unique index on sessions.sid...');
      await client.query(`
        CREATE UNIQUE INDEX idx_session_sid ON sessions (sid)
      `);
      console.log('✅ Sessions sid index created');
    } else {
      console.log('✅ Sessions sid index already exists');
    }
    
    // 15. Create index on sessions.expire if it doesn't exist
    const sessionsExpireIndexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'sessions' AND indexname = 'idx_session_expire'
    `);
    
    if (sessionsExpireIndexCheck.rows.length === 0) {
      console.log('➕ Creating index on sessions.expire...');
      await client.query(`
        CREATE INDEX idx_session_expire ON sessions (expire)
      `);
      console.log('✅ Sessions expire index created');
    } else {
      console.log('✅ Sessions expire index already exists');
    }
    
    // 16. Add participants column to context_memory table
    const contextParticipantsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'context_memory' AND column_name = 'participants'
    `);
    
    if (contextParticipantsCheck.rows.length === 0) {
      console.log('➕ Adding participants column to context_memory table...');
      await client.query(`
        ALTER TABLE context_memory 
        ADD COLUMN participants TEXT[] DEFAULT '{}'
      `);
      console.log('✅ participants column added to context_memory successfully');
    } else {
      console.log('✅ participants column already exists in context_memory');
    }

    // 16. Add last_plan_change_at column to users table
    const lastPlanChangeAtCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_plan_change_at'
    `);
    
    if (lastPlanChangeAtCheck.rows.length === 0) {
      console.log('➕ Adding last_plan_change_at column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN last_plan_change_at TIMESTAMP
      `);
      console.log('✅ last_plan_change_at column added successfully');
    } else {
      console.log('✅ last_plan_change_at column already exists');
    }

    // 17. Add plan_change_count column to users table
    const planChangeCountCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'plan_change_count'
    `);
    
    if (planChangeCountCheck.rows.length === 0) {
      console.log('➕ Adding plan_change_count column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN plan_change_count INTEGER DEFAULT 0
      `);
      console.log('✅ plan_change_count column added successfully');
    } else {
      console.log('✅ plan_change_count column already exists');
    }

    // 18. Add response_frequency column to user_settings table
    const responseFrequencyCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' AND column_name = 'response_frequency'
    `);
    
    if (responseFrequencyCheck.rows.length === 0) {
      console.log('➕ Adding response_frequency column to user_settings table...');
      await client.query(`
        ALTER TABLE user_settings 
        ADD COLUMN response_frequency INTEGER DEFAULT 50
      `);
      console.log('✅ response_frequency column added successfully');
    } else {
      console.log('✅ response_frequency column already exists');
    }

    // 19. Create missing tables if they don't exist
    const missingTables = [
      'user_api_keys',
      'billing_info', 
      'usage_tracking',
      'banter_items',
      'user_settings',
      'daily_stats',
      'twitch_settings',
      'link_codes',
      'guild_links',
      'guild_settings',
      'marketplace_voices',
      'marketplace_personalities',
      'user_downloads',
      'user_ratings',
      'content_reports',
      'discord_settings'
    ];

    for (const tableName of missingTables) {
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = '${tableName}'
      `);
      
      if (tableCheck.rows.length === 0) {
        console.log(`➕ Creating ${tableName} table...`);
        
        switch (tableName) {
          case 'user_api_keys':
            await client.query(`
              CREATE TABLE user_api_keys (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR NOT NULL,
                provider TEXT NOT NULL,
                api_key TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                last_used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'billing_info':
            await client.query(`
              CREATE TABLE billing_info (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR NOT NULL,
                customer_id VARCHAR,
                name VARCHAR,
                email VARCHAR,
                address JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'usage_tracking':
            await client.query(`
              CREATE TABLE usage_tracking (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR NOT NULL,
                date TEXT NOT NULL,
                banters_generated INTEGER DEFAULT 0,
                openai_tokens_used INTEGER DEFAULT 0,
                elevenlabs_characters_used INTEGER DEFAULT 0,
                audio_minutes_generated INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'banter_items':
            await client.query(`
              CREATE TABLE banter_items (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR,
                original_message TEXT,
                banter_text TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_data JSONB,
                audio_url TEXT,
                is_played BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'user_settings':
            await client.query(`
              CREATE TABLE user_settings (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR UNIQUE,
                voice_provider TEXT DEFAULT 'openai',
                voice_id TEXT,
                auto_play BOOLEAN DEFAULT true,
                volume INTEGER DEFAULT 75,
                response_frequency INTEGER DEFAULT 50,
                enabled_events JSONB DEFAULT '["chat"]',
                overlay_position TEXT DEFAULT 'bottom-center',
                overlay_duration INTEGER DEFAULT 12,
                overlay_animation TEXT DEFAULT 'fade',
                banter_personality TEXT DEFAULT 'context',
                custom_personality_prompt TEXT,
                favorite_personalities JSONB DEFAULT '[]',
                favorite_voices JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'daily_stats':
            await client.query(`
              CREATE TABLE daily_stats (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR,
                date TEXT NOT NULL,
                banters_generated INTEGER DEFAULT 0,
                banters_played INTEGER DEFAULT 0,
                chat_responses INTEGER DEFAULT 0,
                audio_generated INTEGER DEFAULT 0,
                viewer_engagement INTEGER DEFAULT 0,
                peak_hour INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'twitch_settings':
            await client.query(`
              CREATE TABLE twitch_settings (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR UNIQUE,
                access_token TEXT,
                refresh_token TEXT,
                channel_id VARCHAR,
                enabled_events JSONB DEFAULT '["chat"]',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'link_codes':
            await client.query(`
              CREATE TABLE link_codes (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                code VARCHAR UNIQUE NOT NULL,
                workspace_id VARCHAR NOT NULL,
                guild_id VARCHAR,
                is_used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'guild_links':
            await client.query(`
              CREATE TABLE guild_links (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                workspace_id VARCHAR NOT NULL,
                guild_id VARCHAR UNIQUE NOT NULL,
                guild_name VARCHAR,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'guild_settings':
            await client.query(`
              CREATE TABLE guild_settings (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                guild_id VARCHAR UNIQUE,
                enabled_events JSONB DEFAULT '["chat"]',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'marketplace_voices':
            await client.query(`
              CREATE TABLE marketplace_voices (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                description TEXT,
                category VARCHAR NOT NULL,
                tags TEXT[] DEFAULT '{}',
                voice_id VARCHAR NOT NULL,
                base_voice_id VARCHAR,
                settings JSONB NOT NULL,
                sample_text TEXT,
                sample_audio_url TEXT,
                author_id VARCHAR NOT NULL,
                author_name VARCHAR NOT NULL,
                is_verified BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                downloads INTEGER DEFAULT 0,
                upvotes INTEGER DEFAULT 0,
                downvotes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                moderation_status VARCHAR DEFAULT 'pending',
                moderation_notes TEXT,
                moderated_at TIMESTAMP,
                moderated_by VARCHAR,
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'marketplace_personalities':
            await client.query(`
              CREATE TABLE marketplace_personalities (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                description TEXT,
                prompt TEXT NOT NULL,
                category VARCHAR NOT NULL,
                tags TEXT[] DEFAULT '{}',
                author_id VARCHAR NOT NULL,
                author_name VARCHAR NOT NULL,
                is_verified BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                downloads INTEGER DEFAULT 0,
                upvotes INTEGER DEFAULT 0,
                downvotes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                moderation_status VARCHAR DEFAULT 'pending',
                moderation_notes TEXT,
                moderated_at TIMESTAMP,
                moderated_by VARCHAR,
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'user_downloads':
            await client.query(`
              CREATE TABLE user_downloads (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR NOT NULL,
                item_type VARCHAR NOT NULL,
                item_id VARCHAR NOT NULL,
                downloaded_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'user_ratings':
            await client.query(`
              CREATE TABLE user_ratings (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR NOT NULL,
                item_type VARCHAR NOT NULL,
                item_id VARCHAR NOT NULL,
                rating INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'content_reports':
            await client.query(`
              CREATE TABLE content_reports (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                reporter_id VARCHAR NOT NULL,
                item_type VARCHAR NOT NULL,
                item_id VARCHAR NOT NULL,
                reason VARCHAR NOT NULL,
                description TEXT,
                status VARCHAR DEFAULT 'pending',
                reviewed_at TIMESTAMP,
                reviewed_by VARCHAR,
                review_notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
            
          case 'discord_settings':
            await client.query(`
              CREATE TABLE discord_settings (
                id VARCHAR NOT NULL DEFAULT gen_random_uuid(),
                user_id VARCHAR UNIQUE,
                access_token TEXT,
                refresh_token TEXT,
                enabled_events JSONB DEFAULT '["chat"]',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id)
              )
            `);
            break;
        }
        
        console.log(`✅ ${tableName} table created successfully`);
      } else {
        console.log(`✅ ${tableName} table already exists`);
      }
    }
    
    console.log('✅ Sessions table configured');
    console.log('🎉 Comprehensive database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure your database is running and DATABASE_URL is correct');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Check that your DATABASE_URL hostname is correct');
    } else if (error.message.includes('password authentication failed')) {
      console.log('💡 Check that your DATABASE_URL username and password are correct');
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
