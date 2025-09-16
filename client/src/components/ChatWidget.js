import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, X, CheckCircle, AlertCircle } from 'lucide-react';

const ChatWidget = ({ isFullPage = false }) => {
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
        addMessage('system', 'Successfully connected to Smartsquatch! You can now ask questions about your data.');
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
      addMessage('system', 'Please configure your Smartsquatch connection first.');
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
        <div className="mt-2 p-3 bg-black/20 rounded-lg text-sm backdrop-blur-sm border border-white/10">
          <strong>Contacts Found: {data.contacts.length}</strong>
          {data.contacts.slice(0, 3).map((contact, idx) => (
            <div key={idx} className="mt-1 text-xs text-glass-light">
              • {contact.name || contact.firstName} {contact.lastName || ''} 
              {contact.email && ` (${contact.email})`}
              {contact.phone && ` - ${contact.phone}`}
            </div>
          ))}
          {data.contacts.length > 3 && (
            <div className="text-glass-muted text-xs mt-1">
              ...and {data.contacts.length - 3} more contacts
            </div>
          )}
        </div>
      );
    }

    // Handle events/appointments
    if (data.events && Array.isArray(data.events)) {
      return (
        <div className="mt-2 p-3 bg-black/20 rounded-lg text-sm backdrop-blur-sm border border-white/10">
          <strong>Events Found: {data.events.length}</strong>
          {data.events.slice(0, 3).map((event, idx) => (
            <div key={idx} className="mt-1 text-xs text-glass-light">
              • {event.title} - {new Date(event.startTime).toLocaleDateString()}
            </div>
          ))}
          {data.events.length > 3 && (
            <div className="text-glass-muted text-xs mt-1">
              ...and {data.events.length - 3} more events
            </div>
          )}
        </div>
      );
    }

    // Handle opportunities
    if (data.opportunities && Array.isArray(data.opportunities)) {
      return (
        <div className="mt-2 p-3 bg-black/20 rounded-lg text-sm backdrop-blur-sm border border-white/10">
          <strong>Opportunities Found: {data.opportunities.length}</strong>
          {data.opportunities.slice(0, 3).map((opp, idx) => (
            <div key={idx} className="mt-1 text-xs text-glass-light">
              • {opp.name} - ${opp.monetaryValue || 'N/A'}
            </div>
          ))}
          {data.opportunities.length > 3 && (
            <div className="text-glass-muted text-xs mt-1">
              ...and {data.opportunities.length - 3} more opportunities
            </div>
          )}
        </div>
      );
    }

    // Handle generic data
    if (typeof data === 'object' && Object.keys(data).length > 0) {
      return (
        <div className="mt-2 p-3 bg-black/20 rounded-lg text-sm backdrop-blur-sm border border-white/10">
          <pre className="whitespace-pre-wrap overflow-x-auto text-xs max-h-32 overflow-y-auto text-glass-light">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
    }

    return null;
  };

  // Full Page Chat Layout
  if (isFullPage) {
    return (
      <div className="flex flex-col h-full">
        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="glass-modal rounded-lg p-6 w-96 max-w-90vw">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-glass-white">Smartsquatch Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-glass-light hover:text-glass-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-glass-light">
                    Private Integration Token (PIT)
                  </label>
                  <input
                    type="password"
                    value={ghlConfig.token}
                    onChange={(e) => setGhlConfig({...ghlConfig, token: e.target.value})}
                    className="glass-input w-full p-2 rounded-md text-sm text-gray-800"
                    placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <p className="text-xs text-glass-muted mt-1">
                    Get this from your Smartsquatch integration settings
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-glass-light">
                    Location ID
                  </label>
                  <input
                    type="text"
                    value={ghlConfig.locationId}
                    onChange={(e) => setGhlConfig({...ghlConfig, locationId: e.target.value})}
                    className="glass-input w-full p-2 rounded-md text-sm text-gray-800"
                    placeholder="Your location ID"
                  />
                  <p className="text-xs text-glass-muted mt-1">
                    Found in your location settings
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={saveConfig}
                    className="glass-button flex-1 text-white py-2 px-4 rounded-md text-sm font-medium"
                    disabled={!ghlConfig.token || !ghlConfig.locationId}
                  >
                    Save & Test Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="glass-header text-white p-4 rounded-t-lg flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="https://storage.googleapis.com/msgsndr/Wj3JvHTBsQKqvP85ShhE/media/68abc9cbd023bc5d3a871163.png" 
              alt="Smartsquatch Logo" 
              className="w-8 h-8 rounded filter drop-shadow-md"
            />
            <h3 className="font-semibold text-glass-white">Smartsquatch Copilot</h3>
            {isConnected ? (
              <CheckCircle size={16} className="text-[#0FB981]" />
            ) : (
              <AlertCircle size={16} className="text-yellow-400" />
            )}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="hover:bg-white/10 p-2 rounded transition-colors backdrop-blur-sm"
            title="Settings"
          >
            <Settings size={16} className="text-glass-light" />
          </button>
        </div>

        {/* Messages - LEFT ALIGNED with glassmorphism */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 chat-messages">
          {messages.length === 0 && (
            <div className="text-glass-light text-left">
              <p className="mb-2 text-glass-white">👋 Hello! I can help you with your Smartsquatch data.</p>
              <div className="text-sm">
                <p className="font-medium mb-1 text-glass-light">Try asking:</p>
                <ul className="space-y-1 text-glass-muted">
                  <li>"Show me all my contacts"</li>
                  <li>"What appointments do I have today?"</li>
                  <li>"Get my recent conversations"</li>
                  <li>"Show me my opportunities"</li>
                </ul>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className="flex justify-start">
              <div className={`max-w-2xl p-4 rounded-lg ${
                message.sender === 'user'
                  ? 'glass-message-user text-white'
                  : message.sender === 'system'
                  ? 'glass-message-system text-red-100'
                  : 'glass-message-assistant text-glass-white'
              }`}>
                <div className="text-sm whitespace-pre-wrap text-left">{message.content}</div>
                {message.data && formatGHLData(message.data)}
                <div className={`text-xs mt-2 text-left ${
                  message.sender === 'user' ? 'text-green-100' : 'text-glass-muted'
                }`}>
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="glass-message-assistant p-4 rounded-lg">
                <div className="animate-pulse text-sm text-glass-white">Thinking...</div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input with glassmorphism */}
        <div className="p-6 glass-header rounded-b-lg">
          <div className="flex space-x-3 max-w-4xl">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Ask about your Smartsquatch data..." : "Configure settings first..."}
              className="glass-input flex-1 p-3 rounded-lg focus:outline-none text-gray-800"
              disabled={isLoading || !isConnected}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim() || !isConnected}
              className="glass-button px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Widget version (not used in new design, but keeping for compatibility)
  return null;
};

export default ChatWidget;
