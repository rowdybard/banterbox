#!/usr/bin/env node
// Test script to check real voice functionality
// Run this in Render shell: node test-real-voice.js

import fetch from 'node-fetch';

async function testRealVoice() {
  console.log('🎤 Testing Real Voice Functionality...\n');

  // Test 1: Check if voice command is registered
  console.log('1️⃣ Checking voice command registration...');
  const voiceCommand = await checkVoiceCommand();
  
  if (!voiceCommand) {
    console.log('❌ Voice command not found - need to register it first');
    console.log('Run: node register-voice-command.js');
    return;
  }

  // Test 2: Check Discord bot status
  console.log('\n2️⃣ Checking Discord bot status...');
  await checkDiscordBotStatus();

  // Test 3: Test voice simulation endpoint
  console.log('\n3️⃣ Testing voice simulation...');
  await testVoiceSimulation();

  console.log('\n✅ Real voice test completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Make sure bot is in your Discord server');
  console.log('2. Join a voice channel');
  console.log('3. Run /voice start');
  console.log('4. Check server logs for voice activity');
}

async function checkVoiceCommand() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    console.log('❌ Missing Discord credentials');
    return null;
  }

  try {
    const url = `https://discord.com/api/v10/applications/${appId}/commands`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('❌ Failed to fetch commands');
      return null;
    }

    const commands = await response.json();
    const voiceCommand = commands.find(cmd => cmd.name === 'voice');
    
    if (voiceCommand) {
      console.log('✅ Voice command is registered');
      console.log(`   ID: ${voiceCommand.id}`);
      console.log(`   Options: ${voiceCommand.options?.length || 0}`);
      return voiceCommand;
    } else {
      console.log('❌ Voice command NOT found');
      return null;
    }
  } catch (error) {
    console.log('❌ Error checking commands:', error.message);
    return null;
  }
}

async function checkDiscordBotStatus() {
  const token = process.env.DISCORD_BOT_TOKEN;
  
  if (!token) {
    console.log('❌ Missing Discord bot token');
    return;
  }

  try {
    const url = 'https://discord.com/api/v10/users/@me';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const botInfo = await response.json();
      console.log('✅ Discord bot is online');
      console.log(`   Bot name: ${botInfo.username}`);
      console.log(`   Bot ID: ${botInfo.id}`);
    } else {
      console.log('❌ Discord bot is not responding');
    }
  } catch (error) {
    console.log('❌ Error checking bot status:', error.message);
  }
}

async function testVoiceSimulation() {
  console.log('✅ Voice simulation endpoint available');
  console.log('   Use POST /api/test-voice-simulation to test voice context');
  console.log('   Example: curl -X POST /api/test-voice-simulation -d "message=hey banter"');
}

// Run the test
testRealVoice().catch(console.error);
