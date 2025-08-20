#!/usr/bin/env node
// Test script to verify voice imports are working
// Run this in Render shell: node test-voice-imports.js

async function testVoiceImports() {
  console.log('🎤 Testing Voice Imports...\n');

  try {
    // Test importing voice modules
    const { 
      joinVoiceChannel, 
      VoiceConnection, 
      getVoiceConnection, 
      createAudioPlayer, 
      createAudioResource,
      AudioPlayerStatus, 
      NoSubscriberBehavior, 
      entersState, 
      VoiceConnectionStatus 
    } = await import('@discordjs/voice');

    console.log('✅ All voice imports successful:');
    console.log('   - joinVoiceChannel:', typeof joinVoiceChannel);
    console.log('   - VoiceConnection:', typeof VoiceConnection);
    console.log('   - getVoiceConnection:', typeof getVoiceConnection);
    console.log('   - createAudioPlayer:', typeof createAudioPlayer);
    console.log('   - createAudioResource:', typeof createAudioResource);
    console.log('   - AudioPlayerStatus:', typeof AudioPlayerStatus);
    console.log('   - NoSubscriberBehavior:', typeof NoSubscriberBehavior);
    console.log('   - entersState:', typeof entersState);
    console.log('   - VoiceConnectionStatus:', typeof VoiceConnectionStatus);

    console.log('\n✅ Voice imports test passed!');
    console.log('🎤 Voice processing should now work correctly.');
    
  } catch (error) {
    console.error('❌ Voice imports test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testVoiceImports().catch(console.error);
