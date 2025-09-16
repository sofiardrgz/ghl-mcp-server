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

    return (
      <div style={{
        marginTop: '8px',
        padding: '12px',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        fontSize: '12px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          overflow: 'auto', 
          maxHeight: '150px',
          color: 'rgba(255,255,255,0.8)'
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'rgba(13, 45, 13, 0.7)',
      border: '1px solid rgba(15, 185, 129, 0.2)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'rgba(13, 45, 13, 0.95)',
            border: '1px solid rgba(15, 185, 129, 0.2)',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: 'white',
                margin: 0
              }}>
                Smartsquatch Settings
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '4px',
                color: 'rgba(255,255,255,0.8)'
              }}>
                Private Integration Token (PIT)
              </label>
              <input
                type="password"
                value={ghlConfig.token}
                onChange={(e) => setGhlConfig({...ghlConfig, token: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(15, 185, 129, 0.3)',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  fontSize: '14px',
                  color: '#333'
                }}
                placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p style={{ 
                fontSize: '12px', 
                color: 'rgba(255,255,255,0.6)', 
                marginTop: '4px',
                margin: '4px 0 0 0'
              }}>
                Get this from your Smartsquatch integration settings
              </p>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '4px',
                color: 'rgba(255,255,255,0.8)'
              }}>
                Location ID
              </label>
              <input
                type="text"
                value={ghlConfig.locationId}
                onChange={(e) => setGhlConfig({...ghlConfig, locationId: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(15, 185, 129, 0.3)',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  fontSize: '14px',
                  color: '#333'
                }}
                placeholder="Your location ID"
              />
              <p style={{ 
                fontSize: '12px', 
                color: 'rgba(255,255,255,0.6)', 
                marginTop: '4px',
                margin: '4px 0 0 0'
              }}>
                Found in your location settings
              </p>
            </div>
            
            <button 
              onClick={saveConfig}
              disabled={!ghlConfig.token || !ghlConfig.locationId}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(15, 185, 129, 0.3)',
                backgroundColor: 'rgba(15, 185, 129, 0.8)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: ghlConfig.token && ghlConfig.locationId ? 'pointer' : 'not-allowed',
                opacity: ghlConfig.token && ghlConfig.locationId ? 1 : 0.5
              }}
            >
              Save & Test Connection
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        backgroundColor: 'rgba(13, 45, 13, 0.9)',
        borderBottom: '1px solid rgba(15, 185, 129, 0.2)',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="https://storage.googleapis.com/msgsndr/Wj3JvHTBsQKqvP85ShhE/media/68abc9cbd023bc5d3a871163.png" 
            alt="Smartsquatch Logo" 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px'
            }}
          />
          <h3 style={{ 
            fontWeight: '600', 
            color: 'white',
            margin: 0,
            fontSize: '16px'
          }}>
            Smartsquatch Copilot
          </h3>
          {isConnected ? (
            <CheckCircle size={16} color="#0FB981" />
          ) : (
            <AlertCircle size={16} color="#fbbf24" />
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '4px',
            padding: '8px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.7)'
          }}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Messages */}
      <div 
        className="chat-messages"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.8)' }}>
            <p style={{ marginBottom: '8px', color: 'white' }}>
              👋 Hello! I can help you with your Smartsquatch data.
            </p>
            <div style={{ fontSize: '14px' }}>
              <p style={{ 
                fontWeight: '500', 
                marginBottom: '4px',
                color: 'rgba(255,255,255,0.8)'
              }}>
                Try asking:
              </p>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0,
                color: 'rgba(255,255,255,0.6)'
              }}>
                <li>"Show me all my contacts"</li>
                <li>"What appointments do I have today?"</li>
                <li>"Get my recent conversations"</li>
                <li>"Show me my opportunities"</li>
              </ul>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: message.sender === 'user' 
                ? 'rgba(15, 185, 129, 0.8)'
                : message.sender === 'system'
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(255, 255, 255, 0.1)',
              color: message.sender === 'system' ? '#fecaca' : 'white',
              border: `1px solid ${
                message.sender === 'user' 
                  ? 'rgba(15, 185, 129, 0.3)'
                  : message.sender === 'system'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(255, 255, 255, 0.2)'
              }`
            }}>
              <div style={{ 
                fontSize: '14px', 
                whiteSpace: 'pre-wrap',
                lineHeight: '1.5'
              }}>
                {message.content}
              </div>
              {message.data && formatGHLData(message.data)}
              <div style={{
                fontSize: '12px',
                marginTop: '8px',
                color: message.sender === 'user' 
                  ? 'rgba(255,255,255,0.7)' 
                  : 'rgba(255,255,255,0.6)'
              }}>
                {message.timestamp}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{ fontSize: '14px' }}>Thinking...</div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '24px',
        backgroundColor: 'rgba(13, 45, 13, 0.9)',
        borderTop: '1px solid rgba(15, 185, 129, 0.2)'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Ask about your Smartsquatch data..." : "Configure settings first..."}
            disabled={isLoading || !isConnected}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(15, 185, 129, 0.3)',
              backgroundColor: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
              color: '#333',
              outline: 'none'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim() || !isConnected}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(15, 185, 129, 0.3)',
              backgroundColor: 'rgba(15, 185, 129, 0.8)',
              color: 'white',
              cursor: (isLoading || !inputMessage.trim() || !isConnected) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !inputMessage.trim() || !isConnected) ? 0.5 : 1
            }}
            title="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
