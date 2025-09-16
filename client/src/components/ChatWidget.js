import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Settings, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  DollarSign,
  Tag,
  ChevronDown,
  ChevronUp,
  Brain,
  Activity,
  TrendingUp
} from 'lucide-react';

const ChatWidget = ({ isFullPage = false }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIActivity, setShowAIActivity] = useState(false);
  const [aiActivity, setAIActivity] = useState([]);
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
    
    // Reset and show AI activity
    setAIActivity([
      'Analyzing your request...',
      'Connecting to Smartsquatch API...',
      'Processing data...',
      'Formatting response...'
    ]);
    setShowAIActivity(true);

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
      // Clear AI activity after response
      setTimeout(() => setShowAIActivity(false), 2000);
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

    // Handle contacts data specifically
    if (data.contacts && Array.isArray(data.contacts)) {
      return (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          border: '1px solid rgba(15, 185, 129, 0.3)',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0FB981' }}>
              <Users size={16} />
              <strong>Contacts Found: {data.contacts.length}</strong>
            </div>
            <button
              onClick={() => {
                const element = document.querySelector('[data-contact-details]');
                if (element) element.style.display = element.style.display === 'none' ? 'block' : 'none';
              }}
              style={{
                background: 'rgba(15, 185, 129, 0.2)',
                border: '1px solid rgba(15, 185, 129, 0.5)',
                borderRadius: '4px',
                color: '#0FB981',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Toggle Details
            </button>
          </div>
          
          {/* Contact summary */}
          <div style={{ marginBottom: '12px' }}>
            {data.contacts.slice(0, 5).map((contact, idx) => (
              <div key={idx} style={{ 
                marginBottom: '8px', 
                padding: '8px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                borderLeft: '3px solid #0FB981'
              }}>
                <div style={{ color: 'white', fontWeight: '500' }}>
                  {contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact'}
                </div>
                {contact.email && (
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <Mail size={12} />
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <Phone size={12} />
                    {contact.phone}
                  </div>
                )}
                {contact.tags && contact.tags.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <Tag size={12} color="rgba(255,255,255,0.6)" />
                    {contact.tags.slice(0, 3).map((tag, tagIdx) => (
                      <span key={tagIdx} style={{
                        display: 'inline-block',
                        backgroundColor: 'rgba(15, 185, 129, 0.2)',
                        color: '#0FB981',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '10px',
                      }}>
                        {tag}
                      </span>
                    ))}
                    {contact.tags.length > 3 && (
                      <span style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '10px',
                      }}>
                        +{contact.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {data.contacts.length > 5 && (
              <div style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: '12px',
                textAlign: 'center',
                marginTop: '8px'
              }}>
                ...and {data.contacts.length - 5} more contacts
              </div>
            )}
          </div>

          {/* Raw data (collapsible) */}
          <div data-contact-details style={{ display: 'none' }}>
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              padding: '12px',
              borderRadius: '6px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              <pre style={{ 
                whiteSpace: 'pre-wrap',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.7)',
                margin: 0
              }}>
                {JSON.stringify(data.contacts.slice(0, 3), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    // Handle events/appointments
    if (data.events && Array.isArray(data.events)) {
      return (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          border: '1px solid rgba(15, 185, 129, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0FB981', marginBottom: '12px' }}>
            <CalendarIcon size={16} />
            <strong>Events Found: {data.events.length}</strong>
          </div>
          {data.events.slice(0, 3).map((event, idx) => (
            <div key={idx} style={{ 
              marginTop: '8px',
              padding: '8px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '4px',
              borderLeft: '3px solid #fbbf24'
            }}>
              <div style={{ color: 'white', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={14} />
                {event.title}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginLeft: '20px', marginTop: '4px' }}>
                {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {data.events.length > 3 && (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '8px' }}>
              ...and {data.events.length - 3} more events
            </div>
          )}
        </div>
      );
    }

    // Handle opportunities
    if (data.opportunities && Array.isArray(data.opportunities)) {
      return (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          border: '1px solid rgba(15, 185, 129, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0FB981', marginBottom: '12px' }}>
            <TrendingUp size={16} />
            <strong>Opportunities Found: {data.opportunities.length}</strong>
          </div>
          {data.opportunities.slice(0, 3).map((opp, idx) => (
            <div key={idx} style={{ 
              marginTop: '8px',
              padding: '8px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '4px',
              borderLeft: '3px solid #10b981'
            }}>
              <div style={{ color: 'white', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={14} />
                {opp.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginLeft: '20px', marginTop: '4px' }}>
                Value: ${opp.monetaryValue || 'N/A'}
              </div>
            </div>
          ))}
          {data.opportunities.length > 3 && (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '8px' }}>
              ...and {data.opportunities.length - 3} more opportunities
            </div>
          )}
        </div>
      );
    }

    // Handle generic data with close button
    if (typeof data === 'object' && Object.keys(data).length > 0) {
      const dataId = `data-${Date.now()}`;
      return (
        <div id={dataId} style={{
          marginTop: '12px',
          padding: '16px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          border: '1px solid rgba(15, 185, 129, 0.3)',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <strong style={{ color: '#0FB981' }}>Raw Data</strong>
            <button
              onClick={() => {
                const element = document.getElementById(dataId);
                if (element) element.style.display = 'none';
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '4px',
                color: '#f87171',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              ✕ Close
            </button>
          </div>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: '12px',
            borderRadius: '6px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            <pre style={{ 
              whiteSpace: 'pre-wrap',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.7)',
              margin: 0
            }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    return null;
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
        
        {/* AI Activity Panel */}
        {showAIActivity && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'rgba(15, 185, 129, 0.1)',
            border: '1px solid rgba(15, 185, 129, 0.3)',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              cursor: 'pointer'
            }} onClick={() => setShowAIActivity(!showAIActivity)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0FB981' }}>
                <Activity size={16} />
                <strong>AI Activity</strong>
              </div>
              {showAIActivity ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            
            {showAIActivity && (
              <div style={{ padding: '8px' }}>
                {aiActivity.map((activity, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '13px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: index === aiActivity.length - 1 ? '#0FB981' : 'rgba(15, 185, 129, 0.5)',
                      animation: index === aiActivity.length - 1 ? 'pulse 1.5s infinite' : 'none'
                    }} />
                    {activity}
                  </div>
                ))}
              </div>
            )}
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
