#!/usr/bin/env node
// Test script to verify wake word detection
// Run this in Render shell: node test-wake-word.js

async function testWakeWord() {
  console.log('🎤 Testing Wake Word Detection...\n');

  // Test wake word detection logic
  const testPhrases = [
    'hey banter',
    'Hey Banter',
    'HEY BANTER',
    'hello hey banter there',
    'what did you say hey banter',
    'just talking normally',
    'banter hey',
    'hey there banter',
    'hey banter what time is it'
  ];

  console.log('🔍 Testing wake word detection:');
  testPhrases.forEach(phrase => {
    const hasWakeWord = phrase.toLowerCase().includes('hey banter');
    console.log(`   "${phrase}" -> ${hasWakeWord ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
  });

  console.log('\n📋 What should happen in voice:');
  console.log('1. Say "hey banter" clearly');
  console.log('2. Bot should detect wake word');
  console.log('3. Bot should generate response');
  console.log('4. Response should appear in Discord');
  
  console.log('\n🔍 Debug logs to look for:');
  console.log('   🎤 Voice transcription: "hey banter"');
  console.log('   🎤 DEBUG: Wake word check - "hey banter" includes "hey banter": true');
  console.log('   🔔 Wake word detected!');
  console.log('   🎤 DEBUG: Generating response to wake word...');
  
  console.log('\n⚠️  If wake word not detected:');
  console.log('- Check if transcription is working');
  console.log('- Check if "hey banter" is being transcribed correctly');
  console.log('- Check if audio quality is good enough');
  console.log('- Try speaking more clearly');
}

// Run the test
testWakeWord().catch(console.error);
