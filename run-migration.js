#!/usr/bin/env node

// Simple script to run the database migration
import { execSync } from 'child_process';

console.log('🔄 Running database migration...');

try {
  execSync('npm run db:migrate', { stdio: 'inherit' });
  console.log('✅ Database migration completed successfully!');
} catch (error) {
  console.error('❌ Database migration failed:', error);
  process.exit(1);
}
