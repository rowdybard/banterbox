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

      console.log(`🔍 Context Record Debug: Recording context for userId=${userId}, eventType=${eventType}, originalMessage="${originalMessage?.substring(0, 50)}..."`);
      
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

      console.log(`🔍 Context Record Debug: Context memory recorded with ID: ${contextRecord.id} for userId: ${userId}`);

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
    guildId?: string,
    currentMessage?: string
  ): Promise<string> {
    return this.getContextForBanterInternal(userId, currentEventType, guildId, currentMessage);
  }

  /**
   * Internal method for getting context
   */
  private static async getContextForBanterInternal(
    userId: string,
    currentEventType: EventType,
    guildId?: string,
    currentMessage?: string
  ): Promise<string> {
    try {
      console.log(`🔍 Context Internal Debug: Getting context for user ${userId}, event type ${currentEventType}, guild ${guildId}`);
      console.log(`🔍 Context Internal Debug: Current message: "${currentMessage}"`);
      
      // Get recent context for the user, filtering by expiration
      console.log(`🔍 Context Internal Debug: Querying database for userId=${userId}`);
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
      
      console.log(`🔍 Context Internal Debug: Found ${recentContext.length} context records for user ${userId}`);
      if (recentContext.length > 0) {
        console.log(`🔍 Context Internal Debug: Most recent context:`, {
          id: recentContext[0].id,
          eventType: recentContext[0].eventType,
          originalMessage: recentContext[0].originalMessage?.substring(0, 50) + '...',
          createdAt: recentContext[0].createdAt
        });
      }

      let processedContext = recentContext;

      // Smart Context Logic - Use OpenAI to determine if context is needed
      let shouldUseContext = true;
      
      console.log(`🔍 Context Internal Debug: processedContext.length=${processedContext.length}, currentMessage="${currentMessage}"`);
      
      if (currentMessage && processedContext.length > 0) {
        // Use OpenAI to analyze if this message needs context
        shouldUseContext = await this.shouldUseContextWithAI(currentMessage, processedContext);
        console.log(`🔍 Context Internal Debug: AI context decision: ${shouldUseContext ? 'USE context' : 'SKIP context'} for message: "${currentMessage}"`);
      } else {
        // Fallback to rule-based logic
        shouldUseContext = this.shouldUseContextForEvent(currentEventType, processedContext.length);
        console.log(`🔍 Context Internal Debug: Rule-based context decision: ${shouldUseContext ? 'USE context' : 'SKIP context'}`);
      }
      
      if (!shouldUseContext) {
        console.log('🔍 Context Internal Debug: Smart context logic: Skipping context for this event type');
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
   * Uses OpenAI to determine if context should be used for a specific message
   */
  private static async shouldUseContextWithAI(currentMessage: string, recentContext: any[]): Promise<boolean> {
    try {
      // Import OpenAI dynamically to avoid circular dependencies
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create a summary of recent context
      const contextSummary = recentContext
        .slice(0, 3) // Take last 3 context items
        .map(ctx => ctx.originalMessage || ctx.contextSummary)
        .filter(Boolean)
        .join(' | ');

      const prompt = `Analyze if this message needs context from recent conversation.

Current message: "${currentMessage}"

Recent context: "${contextSummary}"

Determine if the current message:
1. References or asks about something from the recent context
2. Is a follow-up question or clarification
3. Needs context to be properly understood or answered
4. Is a direct question about previous conversation

Respond with ONLY "YES" if context is needed, or "NO" if context is not needed.

Examples:
- "what did I just say?" → YES (needs context)
- "what car did I mention?" → YES (needs context)  
- "hello there" → NO (doesn't need context)
- "how are you?" → NO (doesn't need context)
- "what was that about?" → YES (needs context)

Response:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0.1,
      });

      const result = response.choices[0]?.message?.content?.trim().toUpperCase();
      return result === 'YES';
    } catch (error) {
      console.error('Error using AI for context decision:', error);
      // Fallback to rule-based logic
      return this.shouldUseContextForEvent('discord_message', recentContext.length);
    }
  }

  /**
   * Determines if context should be used for a given event type
   */
  private static shouldUseContextForEvent(eventType: EventType, contextCount: number): boolean {
    // Always use context for important events
    if (['subscription', 'donation', 'raid'].includes(eventType)) {
      return true;
    }
    
    // For Discord messages, be more permissive with context
    if (eventType === 'discord_message') {
      // Use context more often, especially if we have recent context
      if (contextCount > 0) {
        return Math.random() < 0.8; // 80% chance if we have context
      }
      return Math.random() < 0.6; // 60% chance even without recent context
    }
    
    // Use context for other events with high probability
    return Math.random() < 0.8; // 80% chance
  }
}
