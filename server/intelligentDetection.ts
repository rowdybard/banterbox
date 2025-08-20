import { db } from "./db";
import { aiResponses, contextMemory, type InsertAiResponse, type AiResponse } from "@shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    
    try {
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
      const analysis = await this.analyzeMessage(currentMessage, recentResponses, recentContext);
      
      return {
        isDirectQuestion: analysis.isDirectQuestion,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        relatedResponses: analysis.relatedResponses,
        shouldAlwaysRespond: analysis.isDirectQuestion || analysis.confidence > 7
      };
    } catch (error) {
      console.error('Database error in intelligent detection, falling back to rule-based:', error);
      
      // Fallback to rule-based detection only
      const fallbackAnalysis = this.analyzeMessageRuleBased(currentMessage);
      
      return {
        isDirectQuestion: fallbackAnalysis.isDirectQuestion,
        confidence: fallbackAnalysis.confidence,
        reasoning: fallbackAnalysis.reasoning + " (Fallback mode - database unavailable)",
        relatedResponses: [],
        shouldAlwaysRespond: fallbackAnalysis.isDirectQuestion
      };
    }
  }

  /**
   * Analyzes a message against recent AI responses and conversation context
   * Uses both rule-based analysis and OpenAI for intelligent understanding
   */
  private static async analyzeMessage(
    message: string, 
    recentResponses: AiResponse[], 
    recentContext: any[]
  ): Promise<{
    isDirectQuestion: boolean;
    confidence: number;
    reasoning: string;
    relatedResponses: AiResponse[];
  }> {
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
    
    // Use OpenAI for intelligent analysis
    let openaiAnalysis = null;
    try {
      openaiAnalysis = await this.performOpenAIAnalysis(message, recentResponses, recentContext);
      
      // Combine OpenAI analysis with rule-based analysis
      if (openaiAnalysis) {
        if (openaiAnalysis.isDirectQuestion) {
          confidence += 3; // OpenAI agrees it's a direct question
          reasoning += `OpenAI analysis: ${openaiAnalysis.reasoning} `;
        } else {
          confidence -= 2; // OpenAI disagrees, reduce confidence
          reasoning += `OpenAI analysis: ${openaiAnalysis.reasoning} `;
        }
      }
    } catch (error) {
      console.error('OpenAI analysis failed, using rule-based only:', error);
      reasoning += "OpenAI analysis failed, using rule-based detection only. ";
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
   * Performs OpenAI analysis to determine if a message is a direct question about previous responses
   */
  private static async performOpenAIAnalysis(
    message: string,
    recentResponses: AiResponse[],
    recentContext: any[]
  ): Promise<{
    isDirectQuestion: boolean;
    reasoning: string;
    confidence: number;
  } | null> {
    try {
      // Prepare context for OpenAI
      const contextSummary = this.prepareContextForOpenAI(recentResponses, recentContext);
      
      const prompt = `You are an AI assistant that analyzes whether a user message is asking about previous AI responses or just making general conversation.

CONTEXT - Recent AI Responses (last 2 hours):
${contextSummary}

CURRENT MESSAGE: "${message}"

TASK: Determine if this message is a direct question about what the AI previously said or discussed.

ANALYSIS CRITERIA:
- Is the user asking about a specific response the AI gave?
- Is the user referencing something the AI mentioned or discussed?
- Is the user asking for clarification about previous AI statements?
- Is the user asking "what did you just say?" or similar?
- Is the user asking about the AI's opinion on something previously discussed?

RESPONSE FORMAT:
{
  "isDirectQuestion": true/false,
  "reasoning": "Detailed explanation of why this is or isn't a direct question",
  "confidence": 1-10
}

Only respond with valid JSON.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use faster, cheaper model for analysis
        messages: [
          {
            role: "system",
            content: "You are a precise analyzer that determines if user messages are asking about previous AI responses. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.1, // Low temperature for consistent analysis
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const analysis = JSON.parse(content);
      
      return {
        isDirectQuestion: analysis.isDirectQuestion,
        reasoning: analysis.reasoning,
        confidence: analysis.confidence || 5
      };

    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return null;
    }
  }

  /**
   * Prepares context summary for OpenAI analysis
   */
  private static prepareContextForOpenAI(recentResponses: AiResponse[], recentContext: any[]): string {
    if (recentResponses.length === 0 && recentContext.length === 0) {
      return "No recent conversation context available.";
    }

    let summary = "Recent AI Responses:\n";
    
    // Add recent AI responses
    recentResponses.slice(0, 5).forEach((response, index) => {
      const timeAgo = this.getTimeAgo(response.createdAt);
      summary += `${index + 1}. [${timeAgo}] "${response.responseText}"\n`;
      if (response.questionAsked) {
        summary += `   (In response to: "${response.questionAsked}")\n`;
      }
    });

    // Add recent context if available
    if (recentContext.length > 0) {
      summary += "\nRecent Conversation Context:\n";
      recentContext.slice(0, 3).forEach((ctx, index) => {
        const timeAgo = this.getTimeAgo(ctx.createdAt);
        summary += `${index + 1}. [${timeAgo}] "${ctx.originalMessage || ctx.contextSummary}"\n`;
      });
    }

    return summary;
  }

  /**
   * Gets human-readable time ago string
   */
  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  /**
   * Rule-based message analysis (fallback when database is unavailable)
   */
  private static analyzeMessageRuleBased(message: string): {
    isDirectQuestion: boolean;
    confidence: number;
    reasoning: string;
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
    
    // Calculate confidence based on multiple factors
    let confidence = 0;
    let reasoning = "";
    
    if (patternMatch) {
      confidence += 4; // Base confidence for pattern match
      reasoning += "Message matches direct question patterns. ";
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
      reasoning: reasoning.trim()
    };
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
      console.log(`Recorded AI response for intelligent detection: ${data.responseText.substring(0, 50)}...`);
    } catch (error) {
      console.error('Error recording AI response (table may not exist yet):', error);
      // Don't throw - this is expected when the table doesn't exist yet
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
