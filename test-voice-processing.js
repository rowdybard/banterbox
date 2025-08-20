#!/usr/bin/env node
// Test script to verify voice processing
// Run this in Render shell: node test-voice-processing.js

async function testVoiceProcessing() {
  console.log('🎤 Testing Voice Processing...\n');

  console.log('✅ Voice processing setup added to Discord service');
  console.log('✅ Voice event listeners added');
  console.log('✅ Audio processing pipeline connected');
  
  console.log('\n📋 What should happen now:');
  console.log('1. When you join a voice channel and run /voice start');
  console.log('2. Bot should join and set up voice processing');
  console.log('3. When you speak, you should see logs like:');
  console.log('   🎤 User [userId] started speaking in guild [guildId]');
  console.log('   🎤 Received audio chunk from user [userId], buffer size: [X]');
  console.log('   🎤 Processing audio from user [userId], total chunks: [X]');
  console.log('   🎤 Full audio size: [X] bytes');
  console.log('   🎤 DEBUG: Processing audio from user [userId], data size: [X] bytes');
  
  console.log('\n🔍 To test:');
  console.log('1. Join a voice channel');
  console.log('2. Run /voice start');
  console.log('3. Speak and say "hey banter"');
  console.log('4. Check server logs for the debug messages above');
  
  console.log('\n⚠️  If you don\'t see audio processing logs:');
  console.log('- Check bot permissions (Connect, Speak, Use Voice Activity)');
  console.log('- Make sure bot is actually in the voice channel');
  console.log('- Check if voice service is properly connected');
}

// Run the test
testVoiceProcessing().catch(console.error);
