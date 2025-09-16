const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');

const router = express.Router();

// Initialize OpenAI (you can also use other AI providers)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  
  if (message.includes('contact') && (message.includes('get') || message.includes('find') || message.includes('show'))) {
    if (message.includes('all') || message.includes('list')) {
      return { tool: 'contacts_get-contacts', action: 'get_all_contacts' };
    }
    return { tool: 'contacts_get-contact', action: 'get_contact' };
  }
  
  if (message.includes('contact') && (message.includes('create') || message.includes('add') || message.includes('new'))) {
    return { tool: 'contacts_create-contact', action: 'create_contact' };
  }
  
  if (message.includes('calendar') || message.includes('appointment') || message.includes('event')) {
    return { tool: 'calendars_get-calendar-events', action: 'get_calendar_events' };
  }
  
  if (message.includes('conversation') || message.includes('message')) {
    if (message.includes('send')) {
      return { tool: 'conversations_send-a-new-message', action: 'send_message' };
    }
    return { tool: 'conversations_search-conversation', action: 'get_conversations' };
  }
  
  if (message.includes('opportunity') || message.includes('deal')) {
    return { tool: 'opportunities_search-opportunity', action: 'get_opportunities' };
  }
  
  if (message.includes('payment') || message.includes('transaction')) {
    return { tool: 'payments_list-transactions', action: 'get_transactions' };
  }
  
  return null;
}

// Main chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, ghlToken, locationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!ghlToken || !locationId) {
      return res.status(400).json({ error: 'GHL token and location ID are required' });
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
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'get_contact':
            // For demo, we'll get all contacts and let AI filter
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'get_calendar_events':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'get_conversations':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'get_opportunities':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'get_transactions':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          default:
            break;
        }
      } catch (ghlError) {
        console.error('GHL Error:', ghlError);
        ghlData = { error: 'Unable to fetch data from GoHighLevel' };
      }
    }
    
    // Create AI prompt with context
    const systemPrompt = `You are an AI assistant for GoHighLevel CRM. You help users interact with their GoHighLevel data through natural language.
    
Available actions:
- Get contacts, create contacts, update contacts
- View calendar events and appointments
- Access conversations and send messages
- Manage opportunities and deals
- View payment transactions

${ghlData ? `Here's the data from GoHighLevel: ${JSON.stringify(ghlData, null, 2)}` : ''}

Provide helpful, conversational responses. If you retrieved data, summarize it in a user-friendly way.`;

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0].message.content;

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
router.post('/test-connection', async (req, res) => {
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

module.exports = router;
