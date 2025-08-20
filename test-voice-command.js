#!/usr/bin/env node
// Test script to check voice command registration
import fetch from 'node-fetch';

async function testVoiceCommand() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    console.error('❌ Missing Discord credentials');
    return;
  }

  const url = `https://discord.com/api/v10/applications/${appId}/commands`;

  try {
    console.log('🔍 Checking voice command registration...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch commands: ${response.status} ${error}`);
    }

    const commands = await response.json();
    const voiceCommand = commands.find(cmd => cmd.name === 'voice');
    
    if (voiceCommand) {
      console.log('✅ Voice command is registered!');
      console.log('Command ID:', voiceCommand.id);
      console.log('Description:', voiceCommand.description);
      console.log('Options:', voiceCommand.options?.length || 0);
      
      if (voiceCommand.options) {
        voiceCommand.options.forEach(opt => {
          console.log(`  - ${opt.name}: ${opt.description}`);
          if (opt.choices) {
            console.log(`    Choices: ${opt.choices.map(c => c.name).join(', ')}`);
          }
        });
      }
    } else {
      console.log('❌ Voice command NOT found!');
      console.log('Available commands:');
      commands.forEach(cmd => {
        console.log(`  - /${cmd.name}: ${cmd.description}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to check commands:', error);
  }
}

testVoiceCommand();
