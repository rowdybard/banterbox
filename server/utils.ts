/**
 * Shared utility functions to avoid circular dependencies
 */

/**
 * Detects if a message is a direct question about recent events or what BanterBox said
 */
export function isDirectQuestion(message: string): boolean {
  if (!message) return false;
  
  const lowerMessage = message.toLowerCase();
  
  // Direct question patterns about recent events
  const directQuestionPatterns = [
    /what just happened/i,
    /what happened/i,
    /what did you say/i,
    /what did banterbox say/i,
    /what was that/i,
    /what did i miss/i,
    /what's going on/i,
    /what's happening/i,
    /can you repeat that/i,
    /what did you mean/i,
    /what was the last thing/i,
    /what did we just talk about/i,
    /what was the conversation about/i,
    /what did someone say/i,
    /who said what/i,
    /what was the message/i,
    /what did they say/i,
    /what was the response/i,
    /what did you respond/i,
    /what was your answer/i,
    /what did we discuss/i,
    /what was the topic/i,
    /what were we talking about/i,
    /what did you just say/i,
    /what was that about/i,
    /what did you mean by that/i,
    /can you explain that/i,
    /what was the context/i,
    /what did you respond to/i,
    /what was the question/i,
    /what did someone ask/i,
    /what was the last response/i,
    /what did you just respond/i,
    /what was the previous message/i,
    /what did you say before/i,
    /what was the earlier conversation/i
  ];
  
  // Check if message matches any direct question pattern
  return directQuestionPatterns.some(pattern => pattern.test(lowerMessage));
}
