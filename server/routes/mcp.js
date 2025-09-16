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

// Function to get Gemini AI response - FIXED MODEL NAME
async function getGeminiResponse(systemPrompt, userMessage) {
  try {
    // Use the current model name
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return "There's an issue with the AI model configuration. Please contact support.";
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

// AI-powered intent detection using Gemini
async function determineGHLActionWithAI(userMessage) {
  try {
    const intentAnalysis = await getGeminiResponse(
      `Analyze this user message and determine what GoHighLevel action they want to perform. Return ONLY a JSON object with the action details.

Available actions:
- contacts_get-contacts (get all contacts, list contacts, show contacts)
- contacts_get-contact (find specific contact, get contact details)
- contacts_create-contact (create new contact, add contact)
- contacts_update-contact (update contact, edit contact)
- contacts_upsert-contact (upsert contact)
- contacts_add-tags (add tags to contact)
- contacts_remove-tags (remove tags from contact)
- contacts_get-all-tasks (get contact tasks)
- calendars_get-calendar-events (get calendar, appointments, events, schedule)
- calendars_get-appointment-notes (get appointment notes)
- conversations_search-conversation (search conversations, get conversations)
- conversations_get-messages (get messages from conversation)
- conversations_send-a-new-message (send message, send text)
- opportunities_search-opportunity (get opportunities, deals, pipeline)
- opportunities_get-pipelines (get pipelines)
- opportunities_get-opportunity (get specific opportunity)
- opportunities_update-opportunity (update opportunity)
- payments_list-transactions (get payments, transactions)
- payments_get-order-by-id (get specific order)
- locations_get-location (get location details)
- locations_get-custom-fields (get custom fields)

Return format: {"tool": "exact_tool_name", "action": "descriptive_action_name"}

Examples:
- "show me all contacts" → {"tool": "contacts_get-contacts", "action": "get_all_contacts"}
- "create contact named John" → {"tool": "contacts_create-contact", "action": "create_contact"}
- "get my calendar" → {"tool": "calendars_get-calendar-events", "action": "get_calendar_events"}

If no clear GHL action is detected, return: {"tool": null, "action": null}`,
      userMessage
    );

    // Parse the AI response
    const cleanedResponse = intentAnalysis.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsedIntent = JSON.parse(cleanedResponse);
    
    if (parsedIntent.tool && parsedIntent.action) {
      return parsedIntent;
    }
    return null;
  } catch (error) {
    console.error('AI intent detection failed:', error);
    // Fallback to simple keyword detection for critical functions
    const message = userMessage.toLowerCase();
    if (message.includes('contact') && (message.includes('all') || message.includes('list') || message.includes('show'))) {
      return { tool: 'contacts_get-contacts', action: 'get_all_contacts' };
    }
    return null;
  }
}

// Main chat endpoint
router.post('/chat', validateGHLCredentials, async (req, res) => {
  try {
    const { message, ghlToken, locationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Determine if this requires a GHL action using AI
    const ghlAction = await determineGHLActionWithAI(message);
    
    let ghlData = null;
    
    if (ghlAction) {
      // Prepare headers for GHL MCP call
      const ghlHeaders = {
        'Authorization': `Bearer ${ghlToken}`,
        'locationId': locationId
      };
      
      // Call GHL MCP based on the determined action - ENHANCED FOR DETAILED DATA
      try {
        switch (ghlAction.action) {
          // Contact Actions - Enhanced to get full contact details
          case 'get_all_contacts':
            ghlData = await callGHLMCP(ghlAction.tool, { 
              limit: 50,
              includeAttributions: true,
              includeCustomFields: true,
              includeSource: true,
              includeTags: true,
              includeTimestamps: true
            }, ghlHeaders);
            break;
          case 'get_contact':
            ghlData = await callGHLMCP(ghlAction.tool, { 
              limit: 10,
              includeAttributions: true,
              includeCustomFields: true,
              includeSource: true,
              includeTags: true,
              includeTimestamps: true
            }, ghlHeaders);
            break;
          case 'create_contact':
            // For contact creation, we need the AI to extract contact details from the user message
            // Let's pass the user message to AI first to extract contact data
            const extractedContactInfo = await getGeminiResponse(
              `Extract contact information from this user message and return ONLY a JSON object with the contact fields. 
              
              Available fields: firstName, lastName, name, email, phone, address1, city, state, postalCode, country, website, timezone
              
              Rules:
              - Return ONLY valid JSON, no other text
              - Use "name" field if first/last names aren't clear
              - If no specific info provided, ask the user for required details
              - Required: at least name or firstName, and preferably email or phone
              
              Example output: {"firstName": "John", "lastName": "Doe", "email": "john@example.com", "phone": "+1234567890"}`,
              message
            );

            try {
              // Try to parse the extracted contact info
              let contactData = {};
              try {
                // Clean up the AI response to ensure it's valid JSON
                const cleanedResponse = extractedContactInfo.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                contactData = JSON.parse(cleanedResponse);
              } catch (parseError) {
                // If AI didn't return JSON, ask for more specific info
                ghlData = { 
                  error: 'To create a contact, I need more specific information. Please provide details like: "Create a contact named John Doe with email john@example.com and phone 555-1234"' 
                };
                break;
              }

              // Validate we have minimum required info
              if (!contactData.name && !contactData.firstName && !contactData.lastName) {
                ghlData = { 
                  error: 'I need at least a name to create a contact. Please specify the contact name.' 
                };
                break;
              }

              // Call the GHL MCP tool with the extracted contact data
              ghlData = await callGHLMCP(ghlAction.tool, contactData, ghlHeaders);
            } catch (error) {
              ghlData = { 
                error: 'Failed to create contact. Please provide contact details like name, email, and phone number.' 
              };
            }
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
              endDate: endDate.toISOString().split('T')[0],
              includeDetails: true
            }, ghlHeaders);
            break;
          case 'get_appointment_notes':
            ghlData = await callGHLMCP(ghlAction.tool, {}, ghlHeaders);
            break;
            
          // Conversation Actions
          case 'search_conversations':
            ghlData = await callGHLMCP(ghlAction.tool, { 
              limit: 10,
              includeMessages: true,
              includeMetadata: true
            }, ghlHeaders);
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
            ghlData = await callGHLMCP(ghlAction.tool, { 
              limit: 20,
              includeSource: true,
              includeCustomFields: true,
              includeMetadata: true
            }, ghlHeaders);
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
            ghlData = await callGHLMCP(ghlAction.tool, { 
              limit: 10,
              includeMetadata: true
            }, ghlHeaders);
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
    
    // Create AI prompt with context - ENHANCED FOR CONTACT CREATION AND DETAILED ANALYSIS
    const systemPrompt = `You are an AI assistant for GoHighLevel CRM. You help users interact with their GoHighLevel data through natural language and provide detailed analysis.

Available actions you can help with:
CONTACTS: View, create, update, upsert contacts; manage tasks and tags; analyze contact sources and attribution
- CREATE CONTACTS: Extract contact details from user messages and create new contacts
- UPDATE CONTACTS: Modify existing contact information
- ANALYZE CONTACTS: Provide detailed reports on contact sources, attribution, and patterns

CALENDAR: Get events and appointment details/notes  
CONVERSATIONS: Search conversations, get messages, send new messages
LOCATIONS: Get location details and custom field definitions
OPPORTUNITIES: Search deals, get pipelines, view/update specific opportunities
PAYMENTS: List transactions and get specific order details

CONTACT CREATION GUIDANCE:
When users want to create contacts, extract these fields from their message:
- firstName, lastName (or use "name" field if not separated)
- email, phone (at least one contact method preferred)  
- address1, city, state, postalCode, country
- website, timezone
- Any custom fields mentioned

ANALYTICAL CAPABILITIES:
- Contact source analysis (manual upload, API, import, form submission, etc.)
- Attribution tracking (who created contacts, when, how)
- Date-based filtering and reporting
- Custom field analysis
- Tag-based segmentation
- Pipeline performance analysis

${ghlData ? `Here's the data I retrieved from GoHighLevel:
${JSON.stringify(ghlData, null, 2)}

IMPORTANT ANALYSIS INSTRUCTIONS:
- Look for attribution fields like "source", "createdBy", "dateAdded", "attributions", "contactSource", "leadSource"
- Check for timestamps like "dateCreated", "dateUpdated", "createdAt", "updatedAt"
- Identify manual uploads by looking for sources like "manual", "upload", "csv_import", "bulk_import"
- Count and categorize contacts by their source/attribution
- Provide specific numbers and percentages when possible
- If attribution data is limited, explain what data is available and suggest how to get more detailed information
- For contact creation results, confirm what was created and provide the contact ID if available

Please analyze this data and provide detailed insights. If you see contact attribution/source information, break it down by categories.` : 'The user is asking a general question that doesn\'t require GoHighLevel data access.'}

Guidelines:
- Be analytical and specific with numbers
- When creating contacts, confirm the creation and provide details
- When analyzing contact sources, provide breakdowns and counts
- If you find attribution data, categorize contacts by their source
- Explain data patterns and provide actionable insights
- If attribution data is missing, suggest specific fields to look for
- Always be encouraging and professional
- Focus on providing business intelligence and actionable reports
- For contact creation, guide users on required information if data is incomplete`;

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

// Health check for Gemini API - UPDATED MODEL
router.get('/test-ai', async (req, res) => {
  try {
    const testResponse = await getGeminiResponse(
      "You are a helpful assistant.", 
      "Say hello and confirm you're working!"
    );
    
    res.json({
      success: true,
      message: 'Gemini AI is working with gemini-1.5-flash model',
      response: testResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      model: 'gemini-1.5-flash'
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

// Debug endpoint to see exact contact data structure
router.post('/debug-contact-data', validateGHLCredentials, async (req, res) => {
  try {
    const { ghlToken, locationId } = req.body;
    
    const headers = {
      'Authorization': `Bearer ${ghlToken}`,
      'locationId': locationId
    };
    
    // Get a small sample of contacts with all possible fields
    const contactData = await callGHLMCP('contacts_get-contacts', { 
      limit: 3,
      includeAttributions: true,
      includeCustomFields: true,
      includeSource: true,
      includeTags: true,
      includeTimestamps: true,
      includeMetadata: true
    }, headers);
    
    res.json({
      success: true,
      message: 'Contact data structure for debugging',
      data: contactData,
      analysis: {
        totalContacts: contactData?.contacts?.length || 0,
        availableFields: contactData?.contacts?.[0] ? Object.keys(contactData.contacts[0]) : [],
        sampleContact: contactData?.contacts?.[0] || null
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
