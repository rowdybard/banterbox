import { Client, GatewayIntentBits, VoiceChannel, VoiceConnection, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } from '@discordjs/voice';
import { OpenAI } from 'openai';
import { ContextService } from './contextService';
import { storage } from './storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface VoiceSettings {
  enabled: boolean;
  streamerId: string;
  whitelistedUsers: string[];
  voiceChannelId?: string;
  guildId?: string;
}

export class VoiceService {
  private static instance: VoiceService;
  private client: Client;
  private connections: Map<string, VoiceConnection> = new Map();
  private isListening: boolean = false;
  private audioBuffer: Buffer[] = [];
  private lastTranscriptionTime: number = 0;
  private wakeWordDetected: boolean = false;
  private transcriptionBuffer: string = '';

  private constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
      ],
    });
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  /**
   * Initialize the voice service
   */
  public async initialize(): Promise<void> {
    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      console.log('✅ Voice service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize voice service:', error);
    }
  }

  /**
   * Start listening to voice channel
   */
  public async startListening(guildId: string, channelId: string, userId: string): Promise<boolean> {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        console.error('Guild not found:', guildId);
        return false;
      }

      const channel = guild.channels.cache.get(channelId) as VoiceChannel;
      if (!channel || channel.type !== 2) { // 2 = voice channel
        console.error('Voice channel not found:', channelId);
        return false;
      }

      // Join the voice channel
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      this.connections.set(guildId, connection);
      this.isListening = true;

      console.log(`🎤 Started listening to voice channel: ${channel.name}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to start voice listening:', error);
      return false;
    }
  }

  /**
   * Stop listening to voice channel
   */
  public async stopListening(guildId: string): Promise<void> {
    try {
      const connection = this.connections.get(guildId);
      if (connection) {
        connection.destroy();
        this.connections.delete(guildId);
        this.isListening = false;
        console.log('🔇 Stopped voice listening');
      }
    } catch (error) {
      console.error('❌ Failed to stop voice listening:', error);
    }
  }

  /**
   * Process audio data for wake word detection and transcription
   */
  public async processAudio(audioData: Buffer, userId: string, guildId: string): Promise<void> {
    try {
      // Add to buffer
      this.audioBuffer.push(audioData);

      // Check if we have enough audio for processing (e.g., 3 seconds)
      if (this.audioBuffer.length >= 30) { // Assuming 10 chunks per second
        const audioChunk = Buffer.concat(this.audioBuffer);
        this.audioBuffer = [];

        // Transcribe the audio chunk
        const transcription = await this.transcribeAudio(audioChunk);
        
        if (transcription) {
          console.log(`🎤 Voice transcription: "${transcription}"`);
          
          // Check for wake word
          if (transcription.toLowerCase().includes('hey banter')) {
            this.wakeWordDetected = true;
            this.transcriptionBuffer = '';
            console.log('🔔 Wake word detected!');
            
            // Store the wake word interaction
            await this.storeVoiceContext(transcription, userId, guildId, true);
          } else if (this.wakeWordDetected) {
            // Continue collecting speech after wake word
            this.transcriptionBuffer += ' ' + transcription;
            
            // If we have enough speech or detect end of sentence, process it
            if (transcription.includes('.') || transcription.includes('?') || transcription.includes('!')) {
              await this.storeVoiceContext(this.transcriptionBuffer.trim(), userId, guildId, false);
              this.wakeWordDetected = false;
              this.transcriptionBuffer = '';
            }
          } else {
            // Store regular conversation context (without wake word)
            await this.storeVoiceContext(transcription, userId, guildId, false);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing audio:', error);
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
    try {
      const response = await openai.audio.transcriptions.create({
        file: new Blob([audioBuffer], { type: 'audio/wav' }),
        model: 'whisper-1',
        language: 'en',
      });

      return response.text;
    } catch (error) {
      console.error('❌ Whisper transcription failed:', error);
      return null;
    }
  }

  /**
   * Store voice context in the context system
   */
  private async storeVoiceContext(
    transcription: string, 
    userId: string, 
    guildId: string, 
    isWakeWord: boolean
  ): Promise<void> {
    try {
      // Get the workspace user ID
      const guildLink = await storage.getGuildLink(guildId);
      const workspaceUserId = guildLink?.workspaceId || userId;

      if (workspaceUserId) {
        const eventData = {
          username: userId,
          message: transcription,
          source: 'voice',
          isWakeWord: isWakeWord,
        };

        await ContextService.recordEvent(
          workspaceUserId,
          'voice_message',
          eventData,
          guildId,
          3, // High importance for voice context
          transcription
        );

        console.log(`💾 Stored voice context: "${transcription.substring(0, 50)}..."`);
      }
    } catch (error) {
      console.error('❌ Failed to store voice context:', error);
    }
  }

  /**
   * Check if voice service is listening
   */
  public isVoiceListening(): boolean {
    return this.isListening;
  }

  /**
   * Get voice settings for a user
   */
  public async getVoiceSettings(userId: string): Promise<VoiceSettings | null> {
    try {
      const userSettings = await storage.getUserSettings(userId);
      return userSettings?.voiceSettings || null;
    } catch (error) {
      console.error('❌ Failed to get voice settings:', error);
      return null;
    }
  }

  /**
   * Update voice settings for a user
   */
  public async updateVoiceSettings(userId: string, settings: Partial<VoiceSettings>): Promise<void> {
    try {
      const userSettings = await storage.getUserSettings(userId);
      const updatedSettings = {
        ...userSettings,
        voiceSettings: {
          ...userSettings?.voiceSettings,
          ...settings,
        },
      };

      await storage.updateUserSettings(userId, updatedSettings);
      console.log(`✅ Updated voice settings for user: ${userId}`);
    } catch (error) {
      console.error('❌ Failed to update voice settings:', error);
    }
  }
}
