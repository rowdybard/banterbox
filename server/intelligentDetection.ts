import { db } from "./db";
import { aiResponses, contextMemory, type InsertAiResponse, type AiResponse } from "@shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

export interface DetectionContext {
  userId: string;
  guildId?: string;
  currentMessage: string;
  recentResponses?: AiResponse[];
  conversationHistory?: string[];
}

export interface DetectionResult {
  isDirectQuestion: boolean;
  confidence: number;
  reasoning: string;
  relatedResponses: AiResponse[];
  shouldAlwaysRespond: boolean;
}

export class IntelligentDetectionService {
  /**
   * Intelligently detects if a message is a direct question about previous AI responses
   * Uses full context including recent AI responses and conversation history
   */
  static async detectDirectQuestion(context: DetectionContext): Promise<DetectionResult> {
    const { userId, guildId, currentMessage } = context;
    
    // Get recent AI responses (last 10 responses, within 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentResponses = await db.select()
      .from(aiResponses)
      .where(
        and(
          eq(aiResponses.userId, userId),
          guildId ? eq(aiResponses.guildId, guildId) : sql`${aiResponses.guildId} IS NULL`,
          gte(aiResponses.createdAt, twoHoursAgo)
        )
      )
      .orderBy(desc(aiResponses.createdAt))
      .limit(10);

    // Get recent conversation context
    const recentContext = await db.select()
      .from(contextMemory)
      .where(
        and(
          eq(contextMemory.userId, userId),
          guildId ? eq(contextMemory.guildId, guildId) : sql`${contextMemory.guildId} IS NULL`,
          gte(contextMemory.createdAt, twoHoursAgo)
        )
      )
      .orderBy(desc(contextMemory.createdAt))
      .limit(5);

    // Analyze the current message against recent context
    const analysis = this.analyzeMessage(currentMessage, recentResponses, recentContext);
    
    return {
      isDirectQuestion: analysis.isDirectQuestion,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      relatedResponses: analysis.relatedResponses,
      shouldAlwaysRespond: analysis.isDirectQuestion || analysis.confidence > 7
    };
  }

  /**
   * Analyzes a message against recent AI responses and conversation context
   */
  private static analyzeMessage(
    message: string, 
    recentResponses: AiResponse[], 
    recentContext: any[]
  ): {
    isDirectQuestion: boolean;
    confidence: number;
    reasoning: string;
    relatedResponses: AiResponse[];
  } {
    const lowerMessage = message.toLowerCase();
    
    // Direct question patterns that reference previous responses
    const directQuestionPatterns = [
      // Explicit references to what was said
      /what (did|do) (you|banterbox) (just |recently |)say/i,
      /what (did|do) (you|banterbox) (just |recently |)respond/i,
      /what (did|do) (you|banterbox) (just |recently |)answer/i,
      /what (did|do) (you|banterbox) (just |recently |)tell/i,
      /what (did|do) (you|banterbox) (just |recently |)mention/i,
      
      // References to previous responses
      /what was (your|that|the) (response|answer|reply)/i,
      /what did (you|banterbox) (respond|answer|reply) (with|to)/i,
      /what was (your|that|the) (last|previous) (response|answer|reply)/i,
      
      // References to specific topics discussed
      /what (did|do) (you|banterbox) (just |recently |)talk about/i,
      /what (did|do) (you|banterbox) (just |recently |)discuss/i,
      /what (did|do) (you|banterbox) (just |recently |)mention/i,
      /what (did|do) (you|banterbox) (just |recently |)bring up/i,
      
      // References to specific events or context
      /what (did|do) (you|banterbox) (just |recently |)say about/i,
      /what (did|do) (you|banterbox) (just |recently |)think about/i,
      /what (did|do) (you|banterbox) (just |recently |)feel about/i,
      
      // General context questions
      /what (just |recently |)happened/i,
      /what was (that|this|it) about/i,
      /what did (you|banterbox) mean (by that|when you said)/i,
      /can you (repeat|explain|clarify) (that|what you said)/i,
      
      // Specific response references
      /what was (your|that|the) (joke|comment|remark)/i,
      /what did (you|banterbox) (joke|comment|remark) about/i,
      /what was (your|that|the) (opinion|thought|view)/i,
      /what did (you|banterbox) (think|feel|believe) about/i,
    ];

    // Check if message matches direct question patterns
    const patternMatch = directQuestionPatterns.some(pattern => pattern.test(lowerMessage));
    
    // Find related responses based on content similarity
    const relatedResponses = this.findRelatedResponses(message, recentResponses);
    
    // Calculate confidence based on multiple factors
    let confidence = 0;
    let reasoning = "";
    
    if (patternMatch) {
      confidence += 4; // Base confidence for pattern match
      reasoning += "Message matches direct question patterns. ";
    }
    
    if (relatedResponses.length > 0) {
      confidence += 3; // Additional confidence for finding related responses
      reasoning += `Found ${relatedResponses.length} related previous responses. `;
    }
    
    // Check for specific references to recent content
    const hasSpecificReferences = this.hasSpecificReferences(message, recentResponses, recentContext);
    if (hasSpecificReferences) {
      confidence += 2;
      reasoning += "Message contains specific references to recent content. ";
    }
    
    // Check for temporal indicators
    const hasTemporalIndicators = /(just|recently|before|earlier|last|previous)/i.test(lowerMessage);
    if (hasTemporalIndicators) {
      confidence += 1;
      reasoning += "Message contains temporal indicators suggesting reference to recent events. ";
    }
    
    // Check for question format
    const isQuestionFormat = /\?$/.test(message.trim());
    if (isQuestionFormat) {
      confidence += 1;
      reasoning += "Message is formatted as a question. ";
    }
    
    // Determine if it's a direct question based on confidence
    const isDirectQuestion = confidence >= 5;
    
    if (!isDirectQuestion) {
      reasoning += "Overall confidence too low to classify as direct question. ";
    }
    
    return {
      isDirectQuestion,
      confidence: Math.min(confidence, 10),
      reasoning: reasoning.trim(),
      relatedResponses
    };
  }

  /**
   * Finds responses that are related to the current message
   */
  private static findRelatedResponses(message: string, responses: AiResponse[]): AiResponse[] {
    const lowerMessage = message.toLowerCase();
    const related: AiResponse[] = [];
    
    for (const response of responses) {
      let relevance = 0;
      
      // Check if message references the response content
      const responseWords = response.responseText.toLowerCase().split(/\s+/);
      const messageWords = lowerMessage.split(/\s+/);
      
      // Count word overlap
      const commonWords = messageWords.filter(word => 
        word.length > 3 && responseWords.includes(word)
      );
      relevance += commonWords.length * 0.5;
      
      // Check for specific phrases from responses
      const responsePhrases = this.extractKeyPhrases(response.responseText);
      for (const phrase of responsePhrases) {
        if (lowerMessage.includes(phrase.toLowerCase())) {
          relevance += 2;
        }
      }
      
      // Check if response was to a direct question
      if (response.wasDirectQuestion) {
        relevance += 1;
      }
      
      // Check temporal proximity (more recent = more relevant)
      const hoursAgo = (Date.now() - response.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 0.5) relevance += 2; // Within 30 minutes
      else if (hoursAgo < 1) relevance += 1; // Within 1 hour
      
      if (relevance >= 1) {
        related.push(response);
      }
    }
    
    return related.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Extracts key phrases from text for matching
   */
  private static extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      if (words.length >= 3) {
        // Extract 3-5 word phrases
        for (let i = 0; i <= words.length - 3; i++) {
          const phrase = words.slice(i, i + 3).join(' ');
          if (phrase.length > 10) {
            phrases.push(phrase);
          }
        }
      }
    }
    
    return phrases.slice(0, 10); // Limit to top 10 phrases
  }

  /**
   * Checks if message contains specific references to recent content
   */
  private static hasSpecificReferences(
    message: string, 
    responses: AiResponse[], 
    context: any[]
  ): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Check for references to specific topics from responses
    for (const response of responses) {
      const responseWords = response.responseText.toLowerCase().split(/\s+/);
      const uniqueWords = [...new Set(responseWords)].filter(word => word.length > 4);
      
      for (const word of uniqueWords) {
        if (lowerMessage.includes(word)) {
          return true;
        }
      }
    }
    
    // Check for references to context memory
    for (const ctx of context) {
      if (ctx.originalMessage && lowerMessage.includes(ctx.originalMessage.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Records an AI response for future detection
   */
  static async recordResponse(data: InsertAiResponse): Promise<void> {
    try {
      await db.insert(aiResponses).values({
        ...data,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    } catch (error) {
      console.error('Error recording AI response:', error);
    }
  }

  /**
   * Cleans up expired AI responses
   */
  static async cleanupExpiredResponses(): Promise<void> {
    try {
      await db.delete(aiResponses)
        .where(sql`${aiResponses.expiresAt} < NOW()`);
    } catch (error) {
      console.error('Error cleaning up expired AI responses:', error);
    }
  }
}
