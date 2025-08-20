#!/usr/bin/env node
// Script to list all registered Discord commands
import fetch from 'node-fetch';

async function listCommands() {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    console.error('❌ Missing Discord credentials');
    console.error('Please set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN');
    return;
  }

  const url = `https://discord.com/api/v10/applications/${appId}/commands`;

  try {
    console.log('🔍 Fetching registered commands...');
    
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
    
    if (commands.length === 0) {
      console.log('❌ No commands registered');
      return;
    }

    console.log(`✅ Found ${commands.length} registered commands:`);
    console.log('');
    
    commands.forEach((cmd, index) => {
      console.log(`${index + 1}. /${cmd.name}`);
      console.log(`   Description: ${cmd.description}`);
      console.log(`   ID: ${cmd.id}`);
      
      if (cmd.options && cmd.options.length > 0) {
        console.log(`   Options:`);
        cmd.options.forEach(opt => {
          console.log(`     - ${opt.name}: ${opt.description}`);
          if (opt.choices) {
            console.log(`       Choices: ${opt.choices.map(c => c.name).join(', ')}`);
          }
        });
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch commands:', error);
  }
}

listCommands();
