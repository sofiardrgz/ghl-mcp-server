const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validateGHLCredentials } = require('../middleware/auth');

const router = express.Router();

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// GoHighLevel MCP Server endpoint
const GHL_MCP_URL = 'https://services.leadconnectorhq.com/mcp/';

// Available GHL tools mapping
const GHL_TOOLS = {
  'get_contacts': 'contacts_get-contacts',
  'get_contact': 'contacts_get-contact',
  'create_contact': 'contacts_create-contact',
  'update_contact': 'contacts_update-contact',
  'get_calendar_events': 'calendars_get-calendar-events',
  'get_conversations': 'conversations_search-conversation',
  'send_message': 'conversations_send-a-new-message',
  'get_opportunities': 'opportunities_search-opportunity',
  'get_transactions': 'payments_list-transactions'
};

// Function to get Gemini AI response
async function getGeminiResponse(systemPrompt, userMessage) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `${systemPrompt}

User Question: ${userMessage}

Please provide a helpful, conversational response based on the context above.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Fallback response if Gemini fails
    if (error.message?.includes('quota')) {
      return "I'm temporarily experiencing high usage. Please try again in a moment.";
    }
    
    return "I'm having trouble processing your request right now. Please try rephrasing your question.";
  }
}

// Function to call GHL MCP
async function callGHLMCP(tool, input, headers) {
  try {
    const response = await axios.post(GHL_MCP_URL, {
      tool: tool,
      input: input
    }, { headers });
    
    return response.data;
  } catch (error) {
    console.error('GHL MCP Error:', error.response?.data || error.message);
    throw new Error(`GHL API Error: ${error.response?.data?.message || error.message}`);
  }
}

// Function to determine which GHL tool to use based on user intent
function determineGHLAction(userMessage) {
  const message = userMessage.toLowerCase();
  
  if (message.includes('contact') && (message.includes('get') || message.includes('find') || message.includes('show') || message.includes('list'))) {
    if (message.includes('all') || message.includes('list')) {
      return { tool: 'contacts_get-contacts', action: 'get_all_contacts' };
    }
    return { tool: 'contacts_get-contact', action: 'get_contact' };
  }
  
  if (message.includes('contact') && (message.includes('create') || message.includes('add') || message.includes('new'))) {
    return { tool: 'contacts_create-contact', action: 'create_contact' };
  }
  
  if (message.includes('calendar') || message.includes('appointment') || message.includes('event') || message.includes('schedule')) {
    return { tool: 'calendars_get-calendar-events', action: 'get_calendar_events' };
  }
  
  if (message.includes('conversation') || message.includes('message') || message.includes('chat')) {
    if (message.includes('send')) {
      return { tool: 'conversations_send-a-new-message', action: 'send_message' };
    }
    return { tool: 'conversations_search-conversation', action: 'get_conversations' };
  }
  
  if (message.includes('opportunity') || message.includes('deal') || message.includes('pipeline')) {
    return { tool: 'opportunities_search-opportunity', action: 'get_opportunities' };
  }
  
  if (message.includes('payment') || message.includes('transaction') || message.includes('order')) {
    return { tool: 'payments_list-transactions', action: 'get_transactions' };
  }
  
  return null;
}

// Main chat endpoint
router.post('/chat', validateGHLCredentials, async (req, res) => {
  try {
    const { message, ghlToken, locationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Determine if this requires a GHL action
    const ghlAction = determineGHLAction(message);
    
    let ghlData = null;
    
    if (ghlAction) {
      // Prepare headers for GHL MCP call
      const ghlHeaders = {
        'Authorization': `Bearer ${ghlToken}`,
        'locationId': locationId,
        'Content-Type': 'application/json'
      };
      
      // Call GHL MCP based on the determined action
      try {
        switch (ghlAction.action) {
          case 'get_all_contacts':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 50 }, ghlHeaders);
            break;
          case 'get_contact':
            // For demo, we'll get all contacts and let AI filter
            ghlData = await callGHLMCP('contacts_get-contacts', { limit: 10 }, ghlHeaders);
            break;
          case 'get_calendar_events':
            const today = new Date();
            const endDate = new Date();
            endDate.setDate(today.getDate() + 7); // Next 7 days
            
            ghlData = await callGHLMCP(ghlAction.tool, {
              startDate: today.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0]
            }, ghlHeaders);
            break;
          case 'get_conversations':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 10 }, ghlHeaders);
            break;
          case 'get_opportunities':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 20 }, ghlHeaders);
            break;
          case 'get_transactions':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 10 }, ghlHeaders);
            break;
          default:
            break;
        }
      } catch (ghlError) {
        console.error('GHL Error:', ghlError);
        ghlData = { error: 'Unable to fetch data from GoHighLevel', details: ghlError.message };
      }
    }
    
    // Create AI prompt with context
    const systemPrompt = `You are an AI assistant for GoHighLevel CRM. You help users interact with their GoHighLevel data through natural language.

Available actions you can help with:
- View and manage contacts
- Check calendar events and appointments  
- Access conversations and messages
- Monitor opportunities and deals
- Review payment transactions

${ghlData ? `Here's the data I retrieved from GoHighLevel:
${JSON.stringify(ghlData, null, 2)}

Please summarize this data in a helpful, user-friendly way. If there are many items, highlight the most important ones and provide a summary count.` : 'The user is asking a general question that doesn\'t require GoHighLevel data access.'}

Guidelines:
- Be conversational and helpful
- If you retrieved data, explain what you found in simple terms
- If there's an error, explain it clearly and suggest what the user can try
- Keep responses concise but informative
- Always be encouraging and professional`;

    // Get AI response from Gemini
    const aiResponse = await getGeminiResponse(systemPrompt, message);

    res.json({
      response: aiResponse,
      ghlData: ghlData,
      actionTaken: ghlAction?.action || 'general_conversation'
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Test GHL connection
router.post('/test-connection', validateGHLCredentials, async (req, res) => {
  try {
    const { ghlToken, locationId } = req.body;
    
    const headers = {
      'Authorization': `Bearer ${ghlToken}`,
      'locationId': locationId,
      'Content-Type': 'application/json'
    };
    
    // Test with a simple contacts call
    const testData = await callGHLMCP('contacts_get-contacts', { limit: 1 }, headers);
    
    res.json({
      success: true,
      message: 'Connection to GoHighLevel successful',
      sample: testData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Health check for Gemini API
router.get('/test-ai', async (req, res) => {
  try {
    const testResponse = await getGeminiResponse(
      "You are a helpful assistant.", 
      "Say hello and confirm you're working!"
    );
    
    res.json({
      success: true,
      message: 'Gemini AI is working',
      response: testResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
