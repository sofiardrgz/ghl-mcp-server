const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validateGHLCredentials } = require('../middleware/auth');

const router = express.Router();

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// GoHighLevel MCP Server endpoint
const GHL_MCP_URL = 'https://services.leadconnectorhq.com/mcp/';

// Available GHL tools mapping - ALL 21 TOOLS
const GHL_TOOLS = {
  // Calendar Tools
  'get_calendar_events': 'calendars_get-calendar-events',
  'get_appointment_notes': 'calendars_get-appointment-notes',
  
  // Contact Tools
  'get_all_tasks': 'contacts_get-all-tasks',
  'add_tags': 'contacts_add-tags',
  'remove_tags': 'contacts_remove-tags',
  'get_contact': 'contacts_get-contact',
  'update_contact': 'contacts_update-contact',
  'upsert_contact': 'contacts_upsert-contact',
  'create_contact': 'contacts_create-contact',
  'get_contacts': 'contacts_get-contacts',
  
  // Conversation Tools
  'search_conversation': 'conversations_search-conversation',
  'get_messages': 'conversations_get-messages',
  'send_message': 'conversations_send-a-new-message',
  
  // Location Tools
  'get_location': 'locations_get-location',
  'get_custom_fields': 'locations_get-custom-fields',
  
  // Opportunity Tools
  'search_opportunity': 'opportunities_search-opportunity',
  'get_pipelines': 'opportunities_get-pipelines',
  'get_opportunity': 'opportunities_get-opportunity',
  'update_opportunity': 'opportunities_update-opportunity',
  
  // Payment Tools
  'get_order': 'payments_get-order-by-id',
  'list_transactions': 'payments_list-transactions'
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

// Function to call GHL MCP - FIXED WITH JSON-RPC 2.0 FORMAT
async function callGHLMCP(tool, input, headers) {
  try {
    console.log('Calling GHL MCP with:', { tool, input });
    
    // Use JSON-RPC 2.0 format instead of simple format
    const requestData = {
      jsonrpc: "2.0",
      id: Date.now().toString(), // Unique request ID
      method: "tools/call",
      params: {
        name: tool,
        arguments: input
      }
    };
    
    const response = await axios.post(GHL_MCP_URL, requestData, { 
      headers: {
        'Authorization': headers.Authorization,
        'locationId': headers.locationId,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });
    
    console.log('GHL MCP Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('GHL MCP Error Details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(`GHL API Error: ${error.response?.status} - ${error.response?.statusText}`);
  }
}

// Function to determine which GHL tool to use based on user intent - ENHANCED WITH ALL 21 TOOLS
function determineGHLAction(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Calendar & Appointments
  if (message.includes('calendar') || message.includes('appointment') || message.includes('event') || message.includes('schedule')) {
    if (message.includes('note') || message.includes('detail')) {
      return { tool: 'calendars_get-appointment-notes', action: 'get_appointment_notes' };
    }
    return { tool: 'calendars_get-calendar-events', action: 'get_calendar_events' };
  }
  
  // Contact Management
  if (message.includes('contact')) {
    // Tasks
    if (message.includes('task')) {
      return { tool: 'contacts_get-all-tasks', action: 'get_all_tasks' };
    }
    // Tags
    if (message.includes('add') && message.includes('tag')) {
      return { tool: 'contacts_add-tags', action: 'add_tags' };
    }
    if (message.includes('remove') && message.includes('tag')) {
      return { tool: 'contacts_remove-tags', action: 'remove_tags' };
    }
    // CRUD Operations
    if (message.includes('create') || message.includes('add') || message.includes('new')) {
      return { tool: 'contacts_create-contact', action: 'create_contact' };
    }
    if (message.includes('update') || message.includes('edit') || message.includes('modify')) {
      return { tool: 'contacts_update-contact', action: 'update_contact' };
    }
    if (message.includes('upsert')) {
      return { tool: 'contacts_upsert-contact', action: 'upsert_contact' };
    }
    // Get contacts
    if (message.includes('all') || message.includes('list')) {
      return { tool: 'contacts_get-contacts', action: 'get_all_contacts' };
    }
    if (message.includes('find') || message.includes('get') || message.includes('show')) {
      return { tool: 'contacts_get-contact', action: 'get_contact' };
    }
  }
  
  // Conversations & Messages
  if (message.includes('conversation') || message.includes('message') || message.includes('chat')) {
    if (message.includes('send')) {
      return { tool: 'conversations_send-a-new-message', action: 'send_message' };
    }
    if (message.includes('message') && (message.includes('get') || message.includes('show'))) {
      return { tool: 'conversations_get-messages', action: 'get_messages' };
    }
    return { tool: 'conversations_search-conversation', action: 'search_conversations' };
  }
  
  // Location & Custom Fields
  if (message.includes('location')) {
    if (message.includes('custom') || message.includes('field')) {
      return { tool: 'locations_get-custom-fields', action: 'get_custom_fields' };
    }
    return { tool: 'locations_get-location', action: 'get_location' };
  }
  
  // Opportunities & Deals
  if (message.includes('opportunity') || message.includes('deal') || message.includes('pipeline')) {
    if (message.includes('pipeline')) {
      return { tool: 'opportunities_get-pipelines', action: 'get_pipelines' };
    }
    if (message.includes('update') || message.includes('edit')) {
      return { tool: 'opportunities_update-opportunity', action: 'update_opportunity' };
    }
    if (message.includes('specific') || message.includes('detail')) {
      return { tool: 'opportunities_get-opportunity', action: 'get_opportunity' };
    }
    return { tool: 'opportunities_search-opportunity', action: 'search_opportunities' };
  }
  
  // Payments & Orders
  if (message.includes('payment') || message.includes('transaction') || message.includes('order')) {
    if (message.includes('order') && (message.includes('specific') || message.includes('detail'))) {
      return { tool: 'payments_get-order-by-id', action: 'get_order' };
    }
    return { tool: 'payments_list-transactions', action: 'list_transactions' };
  }
  
  // Custom Fields (can be standalone)
  if (message.includes('custom') && message.includes('field')) {
    return { tool: 'locations_get-custom-fields', action: 'get_custom_fields' };
  }
  
  // Tasks (can be standalone)
  if (message.includes('task')) {
    return { tool: 'contacts_get-all-tasks', action: 'get_all_tasks' };
  }
  
  // Tags (can be standalone)
  if (message.includes('tag')) {
    if (message.includes('add')) {
      return { tool: 'contacts_add-tags', action: 'add_tags' };
    }
    if (message.includes('remove')) {
      return { tool: 'contacts_remove-tags', action: 'remove_tags' };
    }
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
        'locationId': locationId
      };
      
      // Call GHL MCP based on the determined action - ENHANCED FOR ALL 21 TOOLS
      try {
        switch (ghlAction.action) {
          // Contact Actions
          case 'get_all_contacts':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 50 }, ghlHeaders);
            break;
          case 'get_contact':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 10 }, ghlHeaders);
            break;
          case 'create_contact':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'update_contact':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'upsert_contact':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'get_all_tasks':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'add_tags':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'remove_tags':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
            
          // Calendar Actions
          case 'get_calendar_events':
            const today = new Date();
            const endDate = new Date();
            endDate.setDate(today.getDate() + 7); // Next 7 days
            
            ghlData = await callGHLMCP(ghlAction.tool, {
              startDate: today.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0]
            }, ghlHeaders);
            break;
          case 'get_appointment_notes':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
            
          // Conversation Actions
          case 'search_conversations':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 10 }, ghlHeaders);
            break;
          case 'get_messages':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'send_message':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
            
          // Location Actions
          case 'get_location':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'get_custom_fields':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
            
          // Opportunity Actions
          case 'search_opportunities':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 20 }, ghlHeaders);
            break;
          case 'get_pipelines':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'get_opportunity':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
          case 'update_opportunity':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
            
          // Payment Actions
          case 'list_transactions':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 10 }, ghlHeaders);
            break;
          case 'get_order':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
            
          default:
            break;
        }
      } catch (ghlError) {
        console.error('GHL Error:', ghlError);
        ghlData = { error: 'Unable to fetch data from GoHighLevel', details: ghlError.message };
      }
    }
    
    // Create AI prompt with context - UPDATED FOR ALL 21 TOOLS
    const systemPrompt = `You are an AI assistant for GoHighLevel CRM. You help users interact with their GoHighLevel data through natural language.

Available actions you can help with:
CONTACTS: View, create, update, upsert contacts; manage tasks and tags
CALENDAR: Get events and appointment details/notes  
CONVERSATIONS: Search conversations, get messages, send new messages
LOCATIONS: Get location details and custom field definitions
OPPORTUNITIES: Search deals, get pipelines, view/update specific opportunities
PAYMENTS: List transactions and get specific order details

${ghlData ? `Here's the data I retrieved from GoHighLevel:
${JSON.stringify(ghlData, null, 2)}

Please summarize this data in a helpful, user-friendly way. If there are many items, highlight the most important ones and provide a summary count.` : 'The user is asking a general question that doesn\'t require GoHighLevel data access.'}

Guidelines:
- Be conversational and helpful
- If you retrieved data, explain what you found in simple terms
- If there's an error, explain it clearly and suggest what the user can try
- Keep responses concise but informative
- Always be encouraging and professional
- You can now handle complex requests like updating contacts, managing tags, sending messages, etc.`;

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

// Test GHL connection - FIXED VERSION
router.post('/test-connection', validateGHLCredentials, async (req, res) => {
  try {
    const { ghlToken, locationId } = req.body;
    
    const headers = {
      'Authorization': `Bearer ${ghlToken}`,
      'locationId': locationId
    };
    
    // Test with the exact format from GHL docs
    const testData = await callGHLMCP('contacts_get-contacts', {}, headers);
    
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

// Debug endpoint to test raw GHL call - FIXED VERSION
router.post('/debug-ghl', async (req, res) => {
  try {
    const { ghlToken, locationId } = req.body;
    
    const response = await axios.post('https://services.leadconnectorhq.com/mcp/', {
      tool: 'contacts_get-contacts',
      input: {}
    }, {
      headers: {
        'Authorization': `Bearer ${ghlToken}`,
        'locationId': locationId,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'  // CRITICAL FIX
      }
    });
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      status: error.response?.status,
      data: error.response?.data 
    });
  }
});

// Test endpoint that uses correct JSON-RPC 2.0 format
router.post('/test-exact-ghl', async (req, res) => {
  try {
    const { ghlToken, locationId, contactId } = req.body;
    
    // Use correct JSON-RPC 2.0 format
    const response = await axios.post('https://services.leadconnectorhq.com/mcp/', {
      jsonrpc: "2.0",
      id: "test-request-1",
      method: "tools/call",
      params: {
        name: "contacts_get-contacts",
        arguments: {}
      }
    }, {
      headers: {
        'Authorization': `Bearer ${ghlToken}`,
        'locationId': locationId,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });
    
    res.json({ 
      success: true, 
      data: response.data,
      message: "GHL API call successful using JSON-RPC 2.0 format"
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      message: "Failed using JSON-RPC 2.0 format"
    });
  }
});

module.exports = router;
