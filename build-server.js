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
execSync('npx esbuild server/index.ts --bundle --platform=node --target=node18 --format=cjs --outfile=dist/server/index.cjs --external:pg-native --external:ffmpeg-static --external:@replit/vite-plugin-cartographer --external:@mapbox/node-pre-gyp --external:@babel/preset-typescript --external:lightningcss --external:@babel/core --external:vite', { stdio: 'inherit' });

console.log('✅ Build completed!');
