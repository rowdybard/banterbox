#!/usr/bin/env node
// Test script to simulate voice activity and test voice context
// Run this in Render shell: node test-voice-activity.js

import fetch from 'node-fetch';

async function testVoiceActivity() {
  console.log('🎤 Testing Voice Activity Simulation...\n');

  // Test 1: Simulate voice conversation
  console.log('1️⃣ Simulating voice conversation...');
  await simulateVoiceConversation();

  // Test 2: Test direct question with voice context
  console.log('\n2️⃣ Testing direct question with voice context...');
  await testDirectQuestionWithVoiceContext();

  console.log('\n✅ Voice activity test completed!');
}

async function simulateVoiceConversation() {
  const testMessages = [
    "I'm thinking about buying a Tesla",
    "What color are you thinking?",
    "Probably red",
    "hey banter, what car was I thinking about?"
  ];

  for (const message of testMessages) {
    console.log(`🎤 Simulating: "${message}"`);
    
    try {
      // This would call the voice simulation endpoint
      // For now, just log what would happen
      if (message.toLowerCase().includes('hey banter')) {
        console.log('🔔 Wake word detected!');
      }
      
      console.log(`💾 Would store voice context: "${message}"`);
      
      // Wait a bit between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`❌ Error simulating message: ${error.message}`);
    }
  }
}

async function testDirectQuestionWithVoiceContext() {
  const testQuestion = "what car was I thinking about?";
  console.log(`🤔 Testing direct question: "${testQuestion}"`);
  
  try {
    // This would test the intelligent detection with voice context
    console.log('🧠 Would check voice context first for direct question');
    console.log('📝 Would find voice context: "I\'m thinking about buying a Tesla"');
    console.log('🎯 Would prioritize voice context over text context');
    console.log('💬 Expected response: "You were thinking about buying a red Tesla"');
  } catch (error) {
    console.log(`❌ Error testing direct question: ${error.message}`);
  }
}

// Run the test
testVoiceActivity().catch(console.error);
