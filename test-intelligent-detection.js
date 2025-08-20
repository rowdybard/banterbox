// Test script for the enhanced intelligent detection system with OpenAI integration
const axios = require('axios');

// Test cases for the intelligent detection system
const testCases = [
  // Direct questions about previous responses
  "what did you just say?",
  "what was your response to that?",
  "what did you think about the car discussion?",
  "can you repeat what you said about the weather?",
  "what was your opinion on that topic?",
  
  // Conversational messages (should not be detected as direct questions)
  "how's your day going?",
  "nice weather today",
  "what's up?",
  "hello there",
  "thanks for the help",
  
  // Edge cases
  "what did you mean by that?",
  "can you explain that?",
  "what was that about?",
  "what just happened?",
  "what did you say about cars?"
];

async function testIntelligentDetection() {
  console.log('🧪 Testing Enhanced Intelligent Detection System with OpenAI\n');
  console.log('=' .repeat(60));
  
  // You'll need to set up authentication for this to work
  const baseURL = 'http://localhost:3000'; // Adjust to your server URL
  const authToken = 'your-auth-token-here'; // You'll need to get this from your auth system
  
  for (const testMessage of testCases) {
    try {
      console.log(`\n📝 Testing: "${testMessage}"`);
      console.log('-'.repeat(40));
      
      const response = await axios.post(`${baseURL}/api/test-intelligent-detection`, {
        message: testMessage
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = response.data;
      
      console.log(`✅ Success: ${result.success}`);
      console.log(`🎯 Is Direct Question: ${result.detectionResult.isDirectQuestion}`);
      console.log(`📊 Confidence: ${result.detectionResult.confidence}/10`);
      console.log(`⏱️  Analysis Time: ${result.analysisTime}`);
      console.log(`🧠 Reasoning: ${result.explanation}`);
      
      if (result.detectionResult.relatedResponses.length > 0) {
        console.log(`🔗 Related Responses: ${result.detectionResult.relatedResponses.length} found`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Test completed!');
  console.log('\n📋 System Features:');
  console.log('✅ OpenAI-powered semantic analysis');
  console.log('✅ Rule-based pattern matching');
  console.log('✅ Context-aware response tracking');
  console.log('✅ Confidence-based decision making');
  console.log('✅ Fallback to rule-based if OpenAI fails');
}

// Instructions for running the test
console.log(`
🚀 Enhanced Intelligent Detection System Test

This test demonstrates the new OpenAI-powered intelligent detection system.

SETUP REQUIRED:
1. Make sure your server is running
2. Update the baseURL in this script to match your server
3. Get a valid auth token from your authentication system
4. Ensure you have recent AI responses in your database for context

FEATURES TESTED:
- OpenAI semantic analysis
- Rule-based pattern matching
- Context awareness
- Confidence scoring
- Response time measurement

To run: node test-intelligent-detection.js
`);

// Uncomment the line below to run the test
// testIntelligentDetection();
