// build-server.js
import esbuild from 'esbuild';
import { resolve } from 'node:path';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔨 Building server...');

// Build the client
console.log('🏗️ Building client...');
execSync('vite build', { stdio: 'inherit' });

// Build the server
console.log('⚙️ Building server...');
execSync('npx esbuild server/index.ts --bundle --platform=node --target=node18 --outfile=dist/server.js --external:pg-native', { stdio: 'inherit' });

console.log('✅ Build completed!');
