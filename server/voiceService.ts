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
  private discordService: any; // Reference to existing Discord service
  private isListening: boolean = false;
  private audioBuffer: Buffer[] = [];
  private lastTranscriptionTime: number = 0;
  private wakeWordDetected: boolean = false;
  private transcriptionBuffer: string = '';

  private constructor() {
    // Voice service will work with existing Discord service
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  /**
   * Set reference to Discord service
   */
  public setDiscordService(discordService: any): void {
    this.discordService = discordService;
  }

  /**
   * Start listening to voice channel
   */
  public async startListening(guildId: string, channelId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🎤 DEBUG: Starting voice listening for guild: ${guildId}, channel: ${channelId}, user: ${userId}`);
      
      if (!this.discordService) {
        console.error('❌ Discord service not available');
        return false;
      }

      // Get current voice settings for debugging
      const voiceSettings = await this.getVoiceSettings(userId);
      console.log(`🎤 DEBUG: Current voice settings:`, JSON.stringify(voiceSettings, null, 2));

      // Use existing Discord service to join voice channel
      const success = await this.discordService.joinVoiceChannel(guildId, channelId);
      
      if (success) {
        this.isListening = true;
        console.log(`✅ Started listening to voice channel: ${channelId}`);
        console.log(`🎤 DEBUG: Voice listening status: ${this.isListening}`);
        console.log(`🎤 DEBUG: Audio buffer size: ${this.audioBuffer.length}`);
        console.log(`🎤 DEBUG: Wake word detected: ${this.wakeWordDetected}`);
        return true;
      } else {
        console.error('❌ Failed to join voice channel');
        return false;
      }
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
      if (!this.discordService) {
        console.error('Discord service not available');
        return;
      }

      // Use existing Discord service to leave voice channel
      await this.discordService.leaveVoiceChannel(guildId);
      this.isListening = false;
      console.log('🔇 Stopped voice listening');
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
   * Simulate voice activity for testing (since we don't have actual audio yet)
   */
  public async simulateVoiceActivity(userId: string, guildId: string, message: string): Promise<void> {
    try {
      console.log(`🎤 Simulating voice activity: "${message}"`);
      
      // Check for wake word
      if (message.toLowerCase().includes('hey banter')) {
        this.wakeWordDetected = true;
        this.transcriptionBuffer = '';
        console.log('🔔 Wake word detected!');
        
        // Store the wake word interaction
        await this.storeVoiceContext(message, userId, guildId, true);
      } else if (this.wakeWordDetected) {
        // Continue collecting speech after wake word
        this.transcriptionBuffer += ' ' + message;
        
        // If we have enough speech or detect end of sentence, process it
        if (message.includes('.') || message.includes('?') || message.includes('!')) {
          await this.storeVoiceContext(this.transcriptionBuffer.trim(), userId, guildId, false);
          this.wakeWordDetected = false;
          this.transcriptionBuffer = '';
        }
      } else {
        // Store regular conversation context (without wake word)
        await this.storeVoiceContext(message, userId, guildId, false);
      }
    } catch (error) {
      console.error('❌ Error simulating voice activity:', error);
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
      console.log(`🎤 DEBUG: Updating voice settings for user: ${userId}`);
      console.log(`🎤 DEBUG: New settings:`, JSON.stringify(settings, null, 2));
      
      const userSettings = await storage.getUserSettings(userId);
      console.log(`🎤 DEBUG: Current user settings:`, JSON.stringify(userSettings?.voiceSettings, null, 2));
      
      const updatedSettings = {
        ...userSettings,
        voiceSettings: {
          ...userSettings?.voiceSettings,
          ...settings,
        },
      };

      await storage.updateUserSettings(userId, updatedSettings);
      console.log(`✅ Updated voice settings for user: ${userId}`);
      console.log(`🎤 DEBUG: Final voice settings:`, JSON.stringify(updatedSettings.voiceSettings, null, 2));
    } catch (error) {
      console.error('❌ Failed to update voice settings:', error);
    }
  }

  /**
   * Check if a user is whitelisted for voice listening
   */
  public async isUserWhitelisted(userId: string, guildId: string): Promise<boolean> {
    try {
      const voiceSettings = await this.getVoiceSettings(userId);
      console.log(`🎤 DEBUG: Checking whitelist for user: ${userId}`);
      console.log(`🎤 DEBUG: Voice settings:`, JSON.stringify(voiceSettings, null, 2));
      
      if (!voiceSettings) {
        console.log(`🎤 DEBUG: No voice settings found for user: ${userId}`);
        return false;
      }

      const isWhitelisted = voiceSettings.whitelistedUsers.includes(userId);
      console.log(`🎤 DEBUG: User ${userId} whitelisted: ${isWhitelisted}`);
      console.log(`🎤 DEBUG: Whitelisted users:`, voiceSettings.whitelistedUsers);
      
      return isWhitelisted;
    } catch (error) {
      console.error('❌ Error checking whitelist:', error);
      return false;
    }
  }

  /**
   * Get recent voice transcriptions for debugging
   */
  public async getRecentVoiceActivity(userId: string, guildId: string, limit: number = 10): Promise<any[]> {
    try {
      console.log(`🎤 DEBUG: Getting recent voice activity for user: ${userId}, guild: ${guildId}`);
      
      // Get the workspace user ID
      const guildLink = await storage.getGuildLink(guildId);
      const workspaceUserId = guildLink?.workspaceId || userId;
      
      if (!workspaceUserId) {
        console.log(`🎤 DEBUG: No workspace user ID found for guild: ${guildId}`);
        return [];
      }

      // This would query the context system for recent voice messages
      // For now, just return debug info
      console.log(`🎤 DEBUG: Would query context for workspace user: ${workspaceUserId}`);
      console.log(`🎤 DEBUG: Looking for 'voice_message' events`);
      
      return [];
    } catch (error) {
      console.error('❌ Error getting recent voice activity:', error);
      return [];
    }
  }
}
