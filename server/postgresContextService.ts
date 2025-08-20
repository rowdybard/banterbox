import { db } from './db.js';
import { contextMemory } from '@shared/schema.js';
import { eq, and, desc, lt, or, isNull } from 'drizzle-orm';
import type { EventType, EventData } from '@shared/schema.js';

/**
 * PostgreSQL-based Context Memory Service
 * Manages AI context memory using PostgreSQL for creating more coherent, contextual banter responses
 */
export class PostgresContextService {
  /**
   * Records a new event in context memory for future AI reference
   */
  static async recordEvent(
    userId: string,
    eventType: EventType,
    eventData: EventData,
    guildId?: string,
    importance: number = 1,
    originalMessage?: string
  ): Promise<string> {
    try {
      // Generate context summary based on event type
      const contextSummary = this.generateContextSummary(eventType, eventData);

      // 72-hour context window for experimental long-term memory
      const hoursToRetain = 72;
      const expiresAt = new Date(Date.now() + hoursToRetain * 60 * 60 * 1000);

      // Extract participants from event data
      const participants: string[] = [];
      if (eventData.displayName) participants.push(eventData.displayName);
      if (eventData.username) participants.push(eventData.username);

      const [contextRecord] = await db
        .insert(contextMemory)
        .values({
          userId,
          guildId: guildId || null,
          eventType,
          eventData,
          contextSummary,
          originalMessage: originalMessage || null,
          banterResponse: null,
          importance: Math.min(10, Math.max(1, importance)), // Clamp between 1-10
          participants,
          expiresAt,
        })
        .returning();

      console.log(`Context memory recorded with ID: ${contextRecord.id}`);

      // Clean expired context occasionally
      if (Math.random() < 0.1) {
        // 10% chance
        await this.cleanExpiredContext();
      }

      return contextRecord.id;
    } catch (error) {
      console.error('Error recording context memory:', error);
      return 'error';
    }
  }

  /**
   * Gets relevant context for AI banter generation
   */
  static async getContextForBanter(
    userId: string,
    currentEventType: EventType,
    guildId?: string
  ): Promise<string> {
    return this.getContextForBanterInternal(userId, currentEventType, guildId, false);
  }

  /**
   * Gets context prioritizing voice context for direct questions
   */
  static async getContextForDirectQuestions(
    userId: string,
    currentEventType: EventType,
    guildId?: string
  ): Promise<string> {
    return this.getContextForBanterInternal(userId, currentEventType, guildId, true);
  }

  /**
   * Internal method for getting context with voice priority option
   */
  private static async getContextForBanterInternal(
    userId: string,
    currentEventType: EventType,
    guildId?: string,
    prioritizeVoice: boolean = false
  ): Promise<string> {
    try {
      console.log(`Getting context for user ${userId}, event type ${currentEventType}, guild ${guildId}`);
      
      // Get recent context for the user, filtering by expiration
      const recentContext = await db
        .select()
        .from(contextMemory)
        .where(
          and(
            eq(contextMemory.userId, userId),
            lt(new Date(), contextMemory.expiresAt) // Fixed: get records that haven't expired yet
          )
        )
        .orderBy(desc(contextMemory.createdAt))
        .limit(50);

      // If prioritizing voice context, filter and sort voice context first
      let processedContext = recentContext;
      if (prioritizeVoice) {
        const voiceContext = recentContext.filter(ctx => 
          ctx.eventType === 'voice_message' || 
          (ctx.eventData && typeof ctx.eventData === 'object' && 'source' in ctx.eventData && ctx.eventData.source === 'voice')
        );
        
        const textContext = recentContext.filter(ctx => 
          ctx.eventType !== 'voice_message' && 
          (!ctx.eventData || typeof ctx.eventData !== 'object' || !('source' in ctx.eventData) || ctx.eventData.source !== 'voice')
        );

        // Prioritize voice context by putting it first
        processedContext = [...voiceContext, ...textContext];
        console.log(`Prioritized context: ${voiceContext.length} voice items, ${textContext.length} text items`);
      }

      // Revolutionary Smart Context Logic - Only use context when it makes sense
      const shouldUseContext = this.shouldUseContextForEvent(currentEventType, processedContext.length);
      
      if (!shouldUseContext) {
        console.log('Smart context logic: Skipping context for this event type');
        return '';
      }
      
      // Filter by guildId if specified
      const guildContext = guildId 
        ? processedContext.filter(ctx => ctx.guildId === guildId)
        : processedContext.filter(ctx => !ctx.guildId);
      
      // Get global context (no guildId) if we have guildId specified
      const globalContext = guildId 
        ? processedContext.filter(ctx => !ctx.guildId)
        : [];
      
      // Combine and sort by creation date - limit to prevent overwhelming
      const combinedContext = [...guildContext, ...globalContext]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4); // Reduced from 8 to 4 for less overwhelming context
      
      console.log(`Found ${combinedContext.length} total recent context items`);
      
      // Get similar event context
      const similarContext = processedContext
        .filter(ctx => ctx.eventType === currentEventType)
        .filter(ctx => {
          if (guildId) {
            return ctx.guildId === guildId || !ctx.guildId;
          } else {
            return !ctx.guildId;
          }
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2); // Reduced from 5 to 2 for less overwhelming context
      
      console.log(`Found ${similarContext.length} similar context items`);
      
      if (combinedContext.length === 0 && similarContext.length === 0) {
        console.log('No context found, returning empty string');
        return '';
      }
      
      let contextString = '';
      
      // Smart Context Formatting - Less repetitive and more varied
      if (combinedContext.length > 0) {
        // Only include context if it's recent and varied
        const recentMessages = combinedContext
          .filter(ctx => ctx.originalMessage && ctx.originalMessage.length > 5)
          .slice(0, 3); // Take up to 3 recent messages
        
        if (recentMessages.length > 0) {
          contextString += 'Recent conversation:\n';
          recentMessages.forEach((ctx, index) => {
            const message = ctx.originalMessage!.substring(0, 100); // Limit message length
            contextString += `- ${message}\n`;
          });
          contextString += '\n';
        }
      }
      
      // Only add similar context occasionally and with variety
      if (similarContext.length > 0 && Math.random() < 0.2) { // Reduced from 0.3 to 0.2
        const uniqueResponses = similarContext
          .filter(ctx => ctx.banterResponse && ctx.banterResponse.length > 10)
          .slice(0, 1); // Only show 1 similar response
        
        if (uniqueResponses.length > 0) {
          contextString += `Previous response example:\n`;
          uniqueResponses.forEach(ctx => {
            const response = ctx.banterResponse!.substring(0, 80); // Limit response length
            contextString += `- "${response}"\n`;
          });
          contextString += '\n';
        }
      }
      
      // Smart Context Instruction - Encourage variety
      if (contextString) {
        contextString += 'Use this context for natural conversation flow, but keep responses fresh and varied. Don\'t repeat the same phrases or references too often.';
      }
      
      return contextString;
    } catch (error) {
      console.error('Error getting context for banter:', error);
      return '';
    }
  }

  /**
   * Records a successful banter interaction to improve future context
   */
  static async recordBanterSuccess(
    userId: string,
    eventType: EventType,
    eventData: EventData,
    banterText: string,
    guildId?: string
  ): Promise<void> {
    try {
      // Find the most recent context entry for this user and event type
      const [recentContext] = await db
        .select()
        .from(contextMemory)
        .where(
          and(
            eq(contextMemory.userId, userId),
            eq(contextMemory.eventType, eventType),
            or(
              guildId ? eq(contextMemory.guildId, guildId) : isNull(contextMemory.guildId)
            )
          )
        )
        .orderBy(desc(contextMemory.createdAt))
        .limit(1);

      if (recentContext) {
        // Update the context with the banter response
        await db
          .update(contextMemory)
          .set({ banterResponse: banterText })
          .where(eq(contextMemory.id, recentContext.id));
        
        console.log(`Updated context ${recentContext.id} with banter response`);
      }
    } catch (error) {
      console.error('Error recording banter success:', error);
    }
  }

  /**
   * Updates a context memory with the banter response
   */
  static async updateContextResponse(contextId: string, banterResponse: string): Promise<void> {
    try {
      await db
        .update(contextMemory)
        .set({ banterResponse })
        .where(eq(contextMemory.id, contextId));
      
      console.log(`Updated context ${contextId} with response`);
    } catch (error) {
      console.error('Error updating context response:', error);
    }
  }

  /**
   * Cleans expired context memory
   */
  static async cleanExpiredContext(): Promise<number> {
    try {
      const result = await db
        .delete(contextMemory)
        .where(lt(contextMemory.expiresAt, new Date()));
      
      const deletedCount = result.rowCount || 0;
      console.log(`Cleaned ${deletedCount} expired context records`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning expired context:', error);
      return 0;
    }
  }

  /**
   * Gets a summary of recent stream activity for status displays
   */
  static async getStreamActivitySummary(
    userId: string,
    guildId?: string
  ): Promise<{ totalEvents: number; recentActivity: string; topEventTypes: string[] }> {
    try {
      // Get recent context for the user
      const recentContext = await db
        .select()
        .from(contextMemory)
        .where(
          and(
            eq(contextMemory.userId, userId),
            or(
              guildId ? eq(contextMemory.guildId, guildId) : isNull(contextMemory.guildId)
            ),
            lt(new Date(), contextMemory.expiresAt) // Fixed: get records that haven't expired yet
          )
        )
        .orderBy(desc(contextMemory.createdAt))
        .limit(20);

      const totalEvents = recentContext.length;
      
      // Get top event types
      const eventTypeCounts = recentContext.reduce((acc, ctx) => {
        acc[ctx.eventType] = (acc[ctx.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topEventTypes = Object.entries(eventTypeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type);

      // Generate recent activity summary
      const recentActivity = recentContext
        .slice(0, 5)
        .map(ctx => `${ctx.eventType}: ${ctx.contextSummary}`)
        .join(', ');

      return {
        totalEvents,
        recentActivity: recentActivity || 'No recent activity',
        topEventTypes
      };
    } catch (error) {
      console.error('Error getting stream activity summary:', error);
      return {
        totalEvents: 0,
        recentActivity: 'Error loading activity',
        topEventTypes: []
      };
    }
  }

  /**
   * Generates a human-readable context summary for AI consumption
   */
  private static generateContextSummary(eventType: EventType, eventData: EventData): string {
    switch (eventType) {
      case 'discord_message':
        return `User ${eventData.displayName || eventData.username} sent a message`;
      case 'discord_member_join':
        return `User ${eventData.displayName || eventData.username} joined the server`;
      case 'discord_reaction':
        return `User ${eventData.displayName || eventData.username} reacted with ${eventData.emoji}`;
      case 'voice_message':
        return `Voice message from ${eventData.displayName || eventData.username}: "${eventData.message}"`;
      case 'chat':
        return `Chat message from ${eventData.displayName || eventData.username}`;
      case 'subscription':
        return `New subscription from ${eventData.displayName || eventData.username}`;
      case 'donation':
        return `Donation from ${eventData.displayName || eventData.username}`;
      case 'raid':
        return `Raid from ${eventData.displayName || eventData.username}`;
      default:
        return `Event: ${eventType}`;
    }
  }

  /**
   * Determines if context should be used for a given event type
   */
  private static shouldUseContextForEvent(eventType: EventType, contextCount: number): boolean {
    // Don't use context for very frequent events to avoid overwhelming
    if (eventType === 'discord_message' && contextCount > 20) {
      return Math.random() < 0.3; // 30% chance
    }
    
    // Always use context for important events
    if (['subscription', 'donation', 'raid'].includes(eventType)) {
      return true;
    }
    
    // Use context for other events with some randomness
    return Math.random() < 0.7; // 70% chance
  }
}
