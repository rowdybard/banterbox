#!/usr/bin/env node
// Manual registration script for the voice command
import fetch from 'node-fetch';

const voiceCommand = {
  name: 'voice',
  description: 'Manage voice listening settings',
  options: [
    {
      name: 'action',
      description: 'Action to perform',
      type: 3, // STRING
      required: true,
      choices: [
        { name: 'start', value: 'start' },
        { name: 'stop', value: 'stop' },
        { name: 'status', value: 'status' },
        { name: 'whitelist', value: 'whitelist' }
      ]
    },
    {
      name: 'user',
      description: 'User to add/remove from whitelist (for whitelist action)',
      type: 6, // USER
      required: false
    }
  ]
};

async function registerVoiceCommand() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    console.error('❌ Missing Discord credentials');
    console.error('Please set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN');
    return;
  }

  const url = `https://discord.com/api/v10/applications/${appId}/commands`;

  try {
    console.log('🔧 Registering voice command...');
    console.log('Command:', JSON.stringify(voiceCommand, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(voiceCommand),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register command: ${response.status} ${error}`);
    }

    const result = await response.json();
    console.log('✅ Voice command registered successfully!');
    console.log('Command ID:', result.id);
    console.log('Command name:', result.name);
    console.log('');
    console.log('🎤 You can now use:');
    console.log('/voice start    - Start listening to voice channel');
    console.log('/voice stop     - Stop voice listening');
    console.log('/voice status   - Check voice listening status');
    console.log('/voice whitelist @user - Add/remove user from whitelist');
    console.log('');
    console.log('⚠️  Note: Commands may take up to 1 hour to appear in Discord');
    
  } catch (error) {
    console.error('❌ Failed to register voice command:', error);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('1. Check DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN are set');
    console.error('2. Make sure bot has "applications.commands" permission');
    console.error('3. Verify bot is properly invited to the server');
  }
}

registerVoiceCommand();
