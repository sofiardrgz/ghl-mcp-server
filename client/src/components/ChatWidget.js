import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, MessageCircle, X, CheckCircle, AlertCircle } from 'lucide-react';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ghlConfig, setGhlConfig] = useState({
    token: '',
    locationId: ''
  });
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ghl-config');
    if (saved) {
      const config = JSON.parse(saved);
      setGhlConfig(config);
      if (config.token && config.locationId) {
        testConnection(config);
      }
    }
  }, []);

  const saveConfig = () => {
    localStorage.setItem('ghl-config', JSON.stringify(ghlConfig));
    testConnection(ghlConfig);
    setShowSettings(false);
  };

  const testConnection = async (config = ghlConfig) => {
    try {
      const response = await fetch('/api/mcp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ghlToken: config.token,
          locationId: config.locationId
        })
      });
      
      const result = await response.json();
      setIsConnected(result.success);
      
      if (!result.success) {
        addMessage('system', `Connection failed: ${result.error}`);
      } else {
        addMessage('system', 'Successfully connected to GoHighLevel! You can now ask questions about your data.');
      }
    } catch (error) {
      setIsConnected(false);
      console.error('Connection test failed:', error);
      addMessage('system', 'Connection test failed. Please check your credentials.');
    }
  };

  const addMessage = (sender, content, data = null) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      content,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!isConnected) {
      addMessage('system', 'Please configure your GoHighLevel connection first.');
      setShowSettings(true);
      return;
    }

    const userMessage = inputMessage;
    setInputMessage('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const response = await fetch('/api/mcp/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          ghlToken: ghlConfig.token,
          locationId: ghlConfig.locationId
        })
      });

      const result = await response.json();

      if (result.error) {
        addMessage('system', `Error: ${result.error}`);
      } else {
        addMessage('assistant', result.response, result.ghlData);
      }
    } catch (error) {
      addMessage('system', 'Sorry, I encountered an error processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatGHLData = (data) => {
    if (!data || data.error) return null;

    // Handle contacts data
    if (data.contacts && Array.isArray(data.contacts)) {
      return (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
          <strong>Contacts Found: {data.contacts.length}</strong>
          {data.contacts.slice(0, 3).map((contact, idx) => (
            <div key={idx} className="mt-1 text-xs">
              • {contact.name || contact.firstName} {contact.lastName || ''} 
              {contact.email && ` (${contact.email})`}
              {contact.phone && ` - ${contact.phone}`}
            </div>
          ))}
          {data.contacts.length > 3 && (
            <div className="text-gray-500 text-xs mt-1">
              ...and {data.contacts.length - 3} more contacts
            </div>
          )}
        </div>
      );
    }

    // Handle events/appointments
    if (data.events && Array.isArray(data.events)) {
      return (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
          <strong>Events Found: {data.events.length}</strong>
          {data.events.slice(0, 3).map((event, idx) => (
            <div key={idx} className="mt-1 text-xs">
              • {event.title} - {new Date(event.startTime).toLocaleDateString()}
            </div>
          ))}
          {data.events.length > 3 && (
            <div className="text-gray-500 text-xs mt-1">
              ...and {data.events.length - 3} more events
            </div>
          )}
        </div>
      );
    }

    // Handle opportunities
    if (data.opportunities && Array.isArray(data.opportunities)) {
      return (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
          <strong>Opportunities Found: {data.opportunities.length}</strong>
          {data.opportunities.slice(0, 3).map((opp, idx) => (
            <div key={idx} className="mt-1 text-xs">
              • {opp.name} - ${opp.monetaryValue || 'N/A'}
            </div>
          ))}
          {data.opportunities.length > 3 && (
            <div className="text-gray-500 text-xs mt-1">
              ...and {data.opportunities.length - 3} more opportunities
            </div>
          )}
        </div>
      );
    }

    // Handle generic data
    if (typeof data === 'object' && Object.keys(data).length > 0) {
      return (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
          <pre className="whitespace-pre-wrap overflow-x-auto text-xs max-h-32 overflow-y-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">GoHighLevel Settings</h3>
              <button onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Private Integration Token (PIT)
                </label>
                <input
                  type="password"
                  value={ghlConfig.token}
                  onChange={(e) => setGhlConfig({...ghlConfig, token: e.target.value})}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from GHL Settings → Private Integrations
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Location ID
                </label>
                <input
                  type="text"
                  value={ghlConfig.locationId}
                  onChange={(e) => setGhlConfig({...ghlConfig, locationId: e.target.value})}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Your GHL location ID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in your GHL location settings
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={saveConfig}
                  className="flex-1 bg-[#0FB981] text-white py-2 px-4 rounded-md hover:bg-[#0FB981]/90 text-sm"
                  disabled={!ghlConfig.token || !ghlConfig.locationId}
                >
                  Save & Test Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#0FB981] hover:bg-[#0FB981]/90 text-white rounded-full p-4 shadow-lg transition-all transform hover:scale-105"
        >
          <MessageCircle size={24} />
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl w-80 h-96 flex flex-col">
          {/* Header */}
          <div className="bg-[#0FB981] text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <img 
                src="https://storage.googleapis.com/msgsndr/Wj3JvHTBsQKqvP85ShhE/media/68abc9cbd023bc5d3a871163.png" 
                alt="Logo" 
                className="w-6 h-6 rounded"
              />
              <h3 className="font-semibold">AI Assistant</h3>
              {isConnected ? (
                <CheckCircle size={16} className="text-green-300" />
              ) : (
                <AlertCircle size={16} className="text-yellow-300" />
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSettings(true)}
                className="hover:bg-[#0FB981]/80 p-1 rounded transition-colors"
                title="Settings"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-[#0FB981]/80 p-1 rounded transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages">
            {messages.length === 0 && (
              <div className="text-gray-500 text-center text-sm">
                <p className="mb-2">👋 Hello! I can help you with your GoHighLevel data.</p>
                <div className="text-xs">
                  <p className="font-medium mb-1">Try asking:</p>
                  <ul className="space-y-1">
                    <li>"Show me all my contacts"</li>
                    <li>"What appointments do I have today?"</li>
                    <li>"Get my recent conversations"</li>
                    <li>"Show me my opportunities"</li>
                  </ul>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-[#0FB981] text-white'
                      : message.sender === 'system'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  {message.data && formatGHLData(message.data)}
                  <div className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="animate-pulse text-sm">Thinking...</div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Ask about your GHL data..." : "Configure settings first..."}
                className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0FB981]"
                disabled={isLoading || !isConnected}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim() || !isConnected}
                className="bg-[#0FB981] text-white p-2 rounded-md hover:bg-[#0FB981]/90 disabled:bg-gray-300 transition-colors"
                title="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
