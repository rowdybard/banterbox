import { PostgresContextService } from "./postgresContextService.js";
import type { EventType, EventData } from "../shared/schema.js";

/**
 * Context Memory Service
 * Manages AI context memory for creating more coherent, contextual banter responses
 * Uses PostgreSQL for storage
 */
export class ContextService {
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
    return PostgresContextService.recordEvent(userId, eventType, eventData, guildId, importance, originalMessage);
  }

  /**
   * Gets relevant context for AI banter generation
   */
  static async getContextForBanter(
    userId: string,
    currentEventType: EventType,
    guildId?: string
  ): Promise<string> {
    return PostgresContextService.getContextForBanter(userId, currentEventType, guildId);
  }

  /**
   * Gets context prioritizing voice context for direct questions
   */
  static async getContextForDirectQuestions(
    userId: string,
    currentEventType: EventType,
    guildId?: string
  ): Promise<string> {
    return PostgresContextService.getContextForDirectQuestions(userId, currentEventType, guildId);
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
    return PostgresContextService.recordBanterSuccess(userId, eventType, eventData, banterText, guildId);
  }

  /**
   * Updates a context memory with the banter response
   */
  static async updateContextResponse(contextId: string, banterResponse: string): Promise<void> {
    return PostgresContextService.updateContextResponse(contextId, banterResponse);
  }

  /**
   * Cleans expired context memory
   */
  static async cleanExpiredContext(): Promise<number> {
    return PostgresContextService.cleanExpiredContext();
  }

  /**
   * Gets a summary of recent stream activity for status displays
   */
  static async getStreamActivitySummary(
    userId: string,
    guildId?: string
  ): Promise<{ totalEvents: number; recentActivity: string; topEventTypes: string[] }> {
    return PostgresContextService.getStreamActivitySummary(userId, guildId);
  }
}
