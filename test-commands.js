#!/usr/bin/env node
// Test script to check Discord commands
import fetch from 'node-fetch';

async function testCommands() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    console.error('Missing Discord credentials');
    return;
  }

  const url = `https://discord.com/api/v10/applications/${appId}/commands`;

  try {
    console.log('Fetching registered commands...');
    
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
    console.log('✅ Currently registered commands:');
    commands.forEach(cmd => {
      console.log(`- /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('❌ Failed to fetch commands:', error);
  }
}

testCommands();
