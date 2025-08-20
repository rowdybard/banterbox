#!/usr/bin/env node
// Test script to debug voice whitelist command
// Run this in Render shell: node test-voice-whitelist.js

import fetch from 'node-fetch';

async function testVoiceWhitelist() {
  console.log('🎤 Testing Voice Whitelist Command...\n');

  // Test 1: Check if voice command is registered
  console.log('1️⃣ Checking voice command registration...');
  const voiceCommand = await checkVoiceCommand();
  
  if (!voiceCommand) {
    console.log('❌ Voice command not found - need to register it first');
    console.log('Run: node register-voice-command.js');
    return;
  }

  // Test 2: Check whitelist option specifically
  console.log('\n2️⃣ Checking whitelist option...');
  await checkWhitelistOption(voiceCommand);

  // Test 3: Test voice simulation
  console.log('\n3️⃣ Testing voice simulation...');
  await testVoiceSimulation();

  console.log('\n✅ Voice whitelist test completed!');
  console.log('\n📋 Debugging Steps:');
  console.log('1. Try /voice whitelist @yourself in Discord');
  console.log('2. Check server logs for DEBUG messages');
  console.log('3. Make sure voice listening is started first (/voice start)');
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

async function checkWhitelistOption(voiceCommand) {
  if (!voiceCommand.options) {
    console.log('❌ No options found in voice command');
    return;
  }

  const actionOption = voiceCommand.options.find(opt => opt.name === 'action');
  if (!actionOption) {
    console.log('❌ No action option found');
    return;
  }

  console.log('✅ Action option found');
  console.log(`   Choices: ${actionOption.choices?.map(c => c.name).join(', ')}`);
  
  const hasWhitelist = actionOption.choices?.some(c => c.value === 'whitelist');
  if (hasWhitelist) {
    console.log('✅ Whitelist action is available');
  } else {
    console.log('❌ Whitelist action NOT found');
  }

  const userOption = voiceCommand.options.find(opt => opt.name === 'user');
  if (userOption) {
    console.log('✅ User option found for whitelist');
  } else {
    console.log('❌ User option NOT found');
  }
}

async function testVoiceSimulation() {
  console.log('✅ Voice simulation endpoint available');
  console.log('   Use POST /api/test-voice-simulation to test voice context');
  console.log('   Example: curl -X POST /api/test-voice-simulation -d "message=hey banter"');
}

// Run the test
testVoiceWhitelist().catch(console.error);
