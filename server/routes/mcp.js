const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validateGHLCredentials } = require('../middleware/auth');

const router = express.Router();

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// GoHighLevel MCP Server endpoint
const GHL_MCP_URL = 'https://services.leadconnectorhq.com/mcp/';

// Function to get Gemini AI response
async function getGeminiResponse(systemPrompt, userMessage) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${systemPrompt}\n\n${userMessage}`);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    return "I'm having trouble processing your request right now. Please try again.";
  }
}

// Function to call GHL MCP
async function callGHLMCP(tool, input, headers) {
  try {
    const requestData = {
      jsonrpc: "2.0",
      id: Date.now().toString(),
      method: "tools/call",
      params: { name: tool, arguments: input }
    };

    const response = await axios.post(GHL_MCP_URL, requestData, {
      headers: {
        'Authorization': headers.Authorization,
        'locationId': headers.locationId,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });

    return response.data;
  } catch (error) {
    console.error('GHL MCP Error:', error.response?.data || error.message);
    throw new Error(`GHL API Error: ${error.response?.status} - ${error.response?.statusText}`);
  }
}

// AI-powered intent detection using Gemini
async function determineGHLActionWithAI(userMessage) {
  try {
    const intentAnalysis = await getGeminiResponse(
      `Analyze this user message and determine what GoHighLevel action they want. 
Return ONLY JSON like {"tool": "contacts_get-contacts", "action": "get_all_contacts"}`,
      userMessage
    );

    const cleaned = intentAnalysis.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ======================= MAIN CHAT ENDPOINT =======================
router.post('/chat', async (req, res) => {
  try {
    const { message, ghlToken, locationId } = req.body;

    const ghlAction = await determineGHLActionWithAI(message);
    let ghlData = null;

    if (ghlAction && ghlAction.tool) {
      const ghlHeaders = {
        'Authorization': `Bearer ${ghlToken}`,
        'locationId': locationId
      };

      try {
        switch (ghlAction.action) {
          case 'get_all_contacts':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 50, includeTags: true, includeCustomFields: true }, ghlHeaders);
            break;
          case 'get_contact':
            ghlData = await callGHLMCP(ghlAction.tool, { limit: 10, includeTags: true }, ghlHeaders);
            break;
          case 'create_contact':
            const extractedContactInfo = await getGeminiResponse(
              `Extract contact info from this message. Return ONLY JSON.
Fields: firstName, lastName, name, email, phone`,
              message
            );
            let contactData = {};
            try {
              contactData = JSON.parse(extractedContactInfo.replace(/```json|```/g, "").trim());
            } catch {
              ghlData = { error: "I need name + email or phone to create a contact." };
              break;
            }
            ghlData = await callGHLMCP(ghlAction.tool, contactData, ghlHeaders);
            break;
          case 'get_calendar_events':
            const today = new Date();
            const endDate = new Date();
            endDate.setDate(today.getDate() + 7);
            ghlData = await callGHLMCP(ghlAction.tool, { startDate: today.toISOString().split("T")[0], endDate: endDate.toISOString().split("T")[0] }, ghlHeaders);
            break;
          case 'search_conversation':
          case 'get_messages':
          case 'send_message':
          case 'get_location':
          case 'get_custom_fields':
          case 'search_opportunity':
          case 'get_pipelines':
          case 'get_opportunity':
          case 'update_opportunity':
          case 'list_transactions':
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

    const systemPrompt = `You are a GoHighLevel CRM assistant. Use provided data if available, otherwise be helpful.`;
    const aiResponse = await getGeminiResponse(systemPrompt, `${message}\n\nGHL Data:\n${JSON.stringify(ghlData || {}, null, 2)}`);

    res.json({ response: aiResponse, ghlData, actionTaken: ghlAction?.action || 'general_conversation' });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======================= OTHER ROUTES =======================
router.post('/test-connection', validateGHLCredentials, async (req, res) => {
  try {
    const { ghlToken, locationId } = req.body;
    const headers = { 'Authorization': `Bearer ${ghlToken}`, 'locationId': locationId };
    const testData = await callGHLMCP('contacts_get-contacts', {}, headers);
    res.json({ success: true, message: 'Connection successful', sample: testData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/test-ai', async (req, res) => {
  try {
    const testResponse = await getGeminiResponse("You are a helpful assistant.", "Say hello and confirm you're working!");
    res.json({ success: true, message: 'Gemini AI is working', response: testResponse });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/debug-ghl', async (req, res) => {
  try {
    const { ghlToken, locationId } = req.body;
    const response = await axios.post(GHL_MCP_URL, { tool: 'contacts_get-contacts', input: {} }, {
      headers: { 'Authorization': `Bearer ${ghlToken}`, 'locationId': locationId, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }
    });
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.json({ success: false, error: error.message, status: error.response?.status, data: error.response?.data });
  }
});

router.post('/test-exact-ghl', async (req, res) => {
  try {
    const { ghlToken, locationId } = req.body;
    const response = await axios.post(GHL_MCP_URL, {
      jsonrpc: "2.0", id: "test-request-1", method: "tools/call",
      params: { name: "contacts_get-contacts", arguments: {} }
    }, {
      headers: { 'Authorization': `Bearer ${ghlToken}`, 'locationId': locationId, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }
    });
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.json({ success: false, error: error.message, status: error.response?.status, data: error.response?.data });
  }
});

router.post('/debug-contact-data', validateGHLCredentials, async (req, res) => {
  try {
    const { ghlToken, locationId } = req.body;
    const headers = { 'Authorization': `Bearer ${ghlToken}`, 'locationId': locationId };
    const contactData = await callGHLMCP('contacts_get-contacts', { limit: 3, includeTags: true, includeCustomFields: true }, headers);
    res.json({ success: true, message: 'Contact data structure', data: contactData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
