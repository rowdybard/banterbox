#!/usr/bin/env node
// Check bot permissions and voice requirements
// Run this in Render shell: node check-bot-permissions.js

import fetch from 'node-fetch';

async function checkBotPermissions() {
  console.log('🔍 Checking Bot Permissions...\n');

  // Check 1: Bot application info
  console.log('1️⃣ Checking bot application info...');
  await checkBotApplication();

  // Check 2: Required permissions for voice
  console.log('\n2️⃣ Required permissions for voice functionality...');
  checkRequiredPermissions();

  // Check 3: Bot invite URL
  console.log('\n3️⃣ Bot invite URL...');
  generateInviteURL();

  console.log('\n✅ Permission check completed!');
}

async function checkBotApplication() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    console.log('❌ Missing Discord credentials');
    return;
  }

  try {
    const url = 'https://discord.com/api/v10/applications/@me';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const appInfo = await response.json();
      console.log('✅ Bot application info:');
      console.log(`   Name: ${appInfo.name}`);
      console.log(`   ID: ${appInfo.id}`);
      console.log(`   Public Bot: ${appInfo.bot_public || false}`);
      console.log(`   Requires Code Grant: ${appInfo.bot_require_code_grant || false}`);
    } else {
      console.log('❌ Failed to get bot application info');
    }
  } catch (error) {
    console.log('❌ Error checking bot application:', error.message);
  }
}

function checkRequiredPermissions() {
  console.log('🎤 Required permissions for voice functionality:');
  console.log('');
  console.log('📋 Bot Permissions (in Discord Developer Portal):');
  console.log('   ✅ Send Messages');
  console.log('   ✅ Use Slash Commands');
  console.log('   ✅ Connect (for voice channels)');
  console.log('   ✅ Speak (for voice channels)');
  console.log('   ✅ Use Voice Activity (for voice detection)');
  console.log('   ✅ Read Message History');
  console.log('   ✅ View Channels');
  console.log('');
  console.log('📋 Server Permissions (when bot joins server):');
  console.log('   ✅ Send Messages');
  console.log('   ✅ Use Slash Commands');
  console.log('   ✅ Connect to voice channels');
  console.log('   ✅ Speak in voice channels');
  console.log('   ✅ Use Voice Activity');
  console.log('   ✅ Read message history');
  console.log('   ✅ View channels');
  console.log('');
  console.log('⚠️  Important: Make sure the bot has these permissions in your server!');
}

function generateInviteURL() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  
  if (!appId) {
    console.log('❌ Missing DISCORD_APPLICATION_ID');
    return;
  }

  // Permissions needed for voice functionality
  const permissions = [
    'SendMessages',           // 2048
    'UseSlashCommands',       // 2147483648
    'Connect',                // 1048576
    'Speak',                  // 2097152
    'UseVAD',                 // 33554432
    'ReadMessageHistory',     // 65536
    'ViewChannel',            // 1024
  ];

  const permissionBits = permissions.reduce((total, perm) => {
    const bits = {
      'SendMessages': 2048,
      'UseSlashCommands': 2147483648,
      'Connect': 1048576,
      'Speak': 2097152,
      'UseVAD': 33554432,
      'ReadMessageHistory': 65536,
      'ViewChannel': 1024,
    };
    return total + (bits[perm] || 0);
  }, 0);

  const inviteURL = `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=${permissionBits}&scope=bot%20applications.commands`;
  
  console.log('🔗 Bot Invite URL with voice permissions:');
  console.log(`   ${inviteURL}`);
  console.log('');
  console.log('📝 Steps to fix permissions:');
  console.log('   1. Copy the invite URL above');
  console.log('   2. Open it in a browser');
  console.log('   3. Select your server');
  console.log('   4. Make sure all permissions are checked');
  console.log('   5. Authorize the bot');
  console.log('   6. Check server settings -> Integrations -> BanterBox');
  console.log('   7. Verify all permissions are enabled');
}

// Run the check
checkBotPermissions().catch(console.error);
