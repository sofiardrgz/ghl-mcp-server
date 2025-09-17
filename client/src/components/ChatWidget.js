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
  Activity,
  TrendingUp,
  Plus,
  Edit,
  Search
} from 'lucide-react';
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

  const addMessage = (sender, content, data = null, aiActivity = null) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      content,
      data,
      aiActivity,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // if you keep demo auto-connect:
  useEffect(() => {
    const config = { token: 'demo-token', locationId: 'demo-location' };
    setGhlConfig(config);
    setIsConnected(true);
    addMessage('system', 'Successfully connected to Smartsquatch! You can now ask questions about your data.');
  }, []);

  const saveConfig = () => {
    setShowSettings(false);
    setIsConnected(true);
    addMessage('system', 'Configuration saved successfully!');
  };

  // AI Analysis function to understand user intent and requirements
  const analyzeUserRequest = (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Contact creation patterns
    if (lowerMessage.includes('create') && lowerMessage.includes('contact')) {
      return {
        action: 'CREATE_CONTACT',
        requiredFields: ['firstName', 'lastName', 'email OR phone'],
        extractedData: extractContactData(message),
        confidence: 'high'
      };
    }
    
    // Contact search patterns
    if (lowerMessage.includes('show') || lowerMessage.includes('get') || lowerMessage.includes('find')) {
      if (lowerMessage.includes('contact')) {
        return {
          action: 'GET_CONTACTS',
          filters: extractContactFilters(message),
          confidence: 'high'
        };
      }
    }
    
    // Calendar/appointment patterns
    if (lowerMessage.includes('appointment') || lowerMessage.includes('calendar') || lowerMessage.includes('schedule')) {
      if (lowerMessage.includes('create') || lowerMessage.includes('book')) {
        return {
          action: 'CREATE_APPOINTMENT',
          requiredFields: ['title', 'startTime', 'contactId OR attendeeEmail'],
          extractedData: extractAppointmentData(message),
          confidence: 'medium'
        };
      } else {
        return {
          action: 'GET_APPOINTMENTS',
          filters: extractDateFilters(message),
          confidence: 'high'
        };
      }
    }
    
    // Opportunity patterns
    if (lowerMessage.includes('opportunit') || lowerMessage.includes('deal')) {
      return {
        action: 'GET_OPPORTUNITIES',
        filters: extractOpportunityFilters(message),
        confidence: 'high'
      };
    }
    
    return {
      action: 'GENERAL_QUERY',
      confidence: 'low'
    };
  };

  const extractContactData = (message) => {
    const data = {};
    
    // Extract email
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) data.email = emailMatch[0];
    
    // Extract phone (basic pattern)
    const phoneMatch = message.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\(\d{3}\)\s?\d{3}[-.]?\d{4}/);
    if (phoneMatch) data.phone = phoneMatch[0];
    
    // Extract names (this is basic - would need more sophisticated NLP)
    const namePatterns = [
      /create contact (?:for |named )?([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
      /add ([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
      /new contact ([A-Z][a-z]+)\s+([A-Z][a-z]+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        data.firstName = match[1];
        data.lastName = match[2];
        break;
      }
    }
    
    return data;
  };

  const extractContactFilters = (message) => {
    const filters = {};
    
    if (message.includes('recent')) filters.timeframe = 'recent';
    if (message.includes('today')) filters.timeframe = 'today';
    if (message.includes('this week')) filters.timeframe = 'this_week';
    
    return filters;
  };

  const extractAppointmentData = (message) => {
    const data = {};
    
    // Extract basic appointment details
    const titleMatch = message.match(/(?:appointment|meeting) (?:for|with|about) (.+?)(?:\s+on|\s+at|\s+$)/i);
    if (titleMatch) data.title = titleMatch[1];
    
    return data;
  };

  const extractDateFilters = (message) => {
    const filters = {};
    
    if (message.includes('today')) filters.date = 'today';
    if (message.includes('tomorrow')) filters.date = 'tomorrow';
    if (message.includes('this week')) filters.date = 'this_week';
    if (message.includes('upcoming')) filters.date = 'upcoming';
    
    return filters;
  };

  const extractOpportunityFilters = (message) => {
    const filters = {};
    
    if (message.includes('open')) filters.status = 'open';
    if (message.includes('won')) filters.status = 'won';
    if (message.includes('lost')) filters.status = 'lost';
    
    return filters;
  };

  const validateRequiredFields = (action, extractedData, requiredFields) => {
    const missing = [];
    
    if (action === 'CREATE_CONTACT') {
      if (!extractedData.firstName) missing.push('first name');
      if (!extractedData.lastName) missing.push('last name');
      if (!extractedData.email && !extractedData.phone) {
        missing.push('email or phone number');
      }
    }
    
    return missing;
  };

  const formatResponse = (content) => {
    // Convert markdown-like formatting to JSX
    const parts = content.split('\n');
    return parts.map((part, index) => {
      if (part.trim() === '') return <br key={index} />;
      
      // Handle headers
      if (part.startsWith('##')) {
        return <h3 key={index} style={{ color: '#0FB981', marginBottom: '8px', fontSize: '16px' }}>{part.replace('##', '').trim()}</h3>;
      }
      if (part.startsWith('#')) {
        return <h2 key={index} style={{ color: '#0FB981', marginBottom: '10px', fontSize: '18px' }}>{part.replace('#', '').trim()}</h2>;
      }
      
      // Handle lists
      if (part.trim().startsWith('-') || part.trim().startsWith('*')) {
        return (
          <div key={index} style={{ marginLeft: '20px', marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#0FB981', marginTop: '2px' }}>•</span>
            <span>{part.replace(/^[-*]\s*/, '').trim()}</span>
          </div>
        );
      }
      
      // Handle numbered lists
      if (/^\d+\./.test(part.trim())) {
        return (
          <div key={index} style={{ marginLeft: '20px', marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: '#0FB981', fontWeight: 'bold' }}>{part.match(/^\d+/)[0]}.</span>
            <span>{part.replace(/^\d+\.\s*/, '').trim()}</span>
          </div>
        );
      }
      
      // Handle bold text
      const boldFormatted = part.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0FB981;">$1</strong>');
      
      return <p key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: boldFormatted }} />;
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      // Shift+Enter: Add new line (default behavior)
      if (e.shiftKey) {
        return; // Allow default behavior (new line)
      }
      
      // Ctrl+Enter or Cmd+Enter: Send message
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        sendMessage();
        return;
      }
      
      // Plain Enter: Send message (unless Shift is held)
      e.preventDefault();
      sendMessage();
    }
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

  const activitySteps = [
    { step: 'Processing with AI', status: 'in-progress', details: 'Gemini is analyzing your request...' },
    { step: 'Executing action', status: 'pending', details: 'Waiting for AI decision...' },
    { step: 'Formatting response', status: 'pending', details: 'Preparing response...' }
  ];

  try {
    // Send the ENTIRE request to Gemini for processing
    const response = await fetch('/api/mcp/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        ghlToken: ghlConfig.token,
        locationId: ghlConfig.locationId,
        useFullAI: true // Flag to tell backend to use Gemini for everything
      })
    });

    activitySteps[0].status = 'completed';
    activitySteps[1].status = 'completed';
    activitySteps[2].status = 'completed';

    const result = await response.json();

    if (result.error) {
      addMessage('system', `Error: ${result.error}`);
    } else {
      // Gemini returns the complete formatted response
      addMessage('assistant', result.response, result.ghlData, activitySteps);
    }

  } catch (error) {
    addMessage('system', 'Sorry, I encountered an error processing your request.');
  } finally {
    setIsLoading(false);
  }
};

  const AIActivityPanel = ({ activity, messageId }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!activity || !Array.isArray(activity)) return null;

    return (
      <div style={{
        marginTop: '12px',
        border: '1px solid rgba(15, 185, 129, 0.3)',
        borderRadius: '8px',
        backgroundColor: 'rgba(15, 185, 129, 0.1)',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#0FB981',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} />
            <span>AI Analysis & Processing ({activity.length} steps)</span>
          </div>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        
        {isExpanded && (
          <div style={{ padding: '12px', borderTop: '1px solid rgba(15, 185, 129, 0.2)' }}>
            {activity.map((step, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: idx < activity.length - 1 ? '8px' : '0'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: step.status === 'completed' ? '#0FB981' : 
                                 step.status === 'in-progress' ? '#fbbf24' : 
                                 step.status === 'pending' ? 'rgba(255,255,255,0.3)' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '2px',
                  flexShrink: 0
                }}>
                  {step.status === 'completed' && <CheckCircle size={10} color="white" />}
                  {step.status === 'in-progress' && (
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      animation: 'pulse 1.5s infinite'
                    }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: 'white',
                    marginBottom: '2px'
                  }}>
                    {step.step}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    {step.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const formatGHLData = (data) => {
    if (!data || data.error) return null;

    // Handle contacts data
    if (data.contacts && Array.isArray(data.contacts)) {
      return (
        <div style={{
          marginTop: '12px',
          padding: '16px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          border: '1px solid rgba(15, 185, 129, 0.3)'
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
          </div>
          
          <div style={{ display: 'grid', gap: '8px' }}>
            {data.contacts.map((contact, idx) => (
              <div key={idx} style={{ 
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                borderLeft: '3px solid #0FB981'
              }}>
                <div style={{ 
                  color: 'white', 
                  fontWeight: '600',
                  marginBottom: '6px',
                  fontSize: '14px'
                }}>
                  {contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact'}
                </div>
                <div style={{ display: 'grid', gap: '4px' }}>
                  {contact.email && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '12px'
                    }}>
                      <Mail size={12} />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '12px'
                    }}>
                      <Phone size={12} />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.source && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '11px'
                    }}>
                      <span>Source: {contact.source}</span>
                    </div>
                  )}
                </div>
                {contact.tags && contact.tags.length > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '4px' 
                  }}>
                    <Tag size={12} color="rgba(255,255,255,0.6)" />
                    {contact.tags.map((tag, tagIdx) => (
                      <span key={tagIdx} style={{
                        backgroundColor: 'rgba(15, 185, 129, 0.2)',
                        color: '#0FB981',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '500'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
          <div style={{ display: 'grid', gap: '8px' }}>
            {data.events.map((event, idx) => (
              <div key={idx} style={{ 
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                borderLeft: '3px solid #fbbf24'
              }}>
                <div style={{ 
                  color: 'white', 
                  fontWeight: '600', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <CalendarIcon size={14} />
                  {event.title}
                </div>
                <div style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '12px'
                }}>
                  {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
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
          <div style={{ display: 'grid', gap: '8px' }}>
            {data.opportunities.map((opp, idx) => (
              <div key={idx} style={{ 
                padding: '12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                borderLeft: '3px solid #10b981'
              }}>
                <div style={{ 
                  color: 'white', 
                  fontWeight: '600', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <DollarSign size={14} />
                  {opp.name}
                </div>
                <div style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '12px'
                }}>
                  Value: ${opp.monetaryValue?.toLocaleString() || 'N/A'}
                </div>
              </div>
            ))}
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
            <div style={{ marginBottom: '16px', color: 'white', fontSize: '16px', fontWeight: '500' }}>
              👋 Hello! I'm your Smartsquatch AI assistant.
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ 
                fontWeight: '500', 
                marginBottom: '8px',
                color: 'rgba(255,255,255,0.9)'
              }}>
                I can help you with:
              </div>
              <div style={{ display: 'grid', gap: '6px', marginLeft: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
                  <Plus size={12} color="#0FB981" />
                  <span>"Create contact John Smith with email john@example.com"</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
                  <Search size={12} color="#0FB981" />
                  <span>"Show me all my contacts from this week"</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
                  <CalendarIcon size={12} color="#0FB981" />
                  <span>"What appointments do I have today?"</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)' }}>
                  <TrendingUp size={12} color="#0FB981" />
                  <span>"Show me my open opportunities"</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              maxWidth: '85%',
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
                lineHeight: '1.5'
              }}>
                {message.sender === 'assistant' ? formatResponse(message.content) : message.content}
              </div>
              
              {/* AI Activity Panel */}
              {message.aiActivity && (
                <AIActivityPanel 
                  activity={message.aiActivity} 
                  messageId={message.id}
                />
              )}
              
              {message.data && formatGHLData(message.data)}
              
              <div style={{
                fontSize: '12px',
                marginTop: '12px',
                color: message.sender === 'user' 
                  ? 'rgba(255,255,255,0.7)' 
                  : 'rgba(255,255,255,0.6)',
                borderTop: message.data || message.aiActivity ? '1px solid rgba(255,255,255,0.1)' : 'none',
                paddingTop: message.data || message.aiActivity ? '8px' : '0'
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
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(15, 185, 129, 0.3)',
                borderRadius: '50%',
                borderTop: '2px solid #0FB981',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{ fontSize: '14px' }}>Analyzing your request...</div>
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isConnected ? "Ask about your Smartsquatch data...\n(Shift+Enter for new line, Enter to send)" : "Configure settings first..."}
              disabled={isLoading || !isConnected}
              rows={1}
              style={{
                width: '100%',
                minHeight: '44px',
                maxHeight: '120px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(15, 185, 129, 0.3)',
                backgroundColor: 'rgba(255,255,255,0.9)',
                fontSize: '14px',
                color: '#333',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.4',
                overflow: 'hidden'
              }}
              onInput={(e) => {
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              marginTop: '4px',
              textAlign: 'right'
            }}>
              Shift+Enter for new line • Enter to send
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim() || !isConnected}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(15, 185, 129, 0.3)',
              backgroundColor: 'rgba(15, 185, 129, 0.8)',
              color: 'white',
              cursor: (isLoading || !inputMessage.trim() || !isConnected) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !inputMessage.trim() || !isConnected) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '44px',
              flexShrink: 0
            }}
            title="Send message (Enter)"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ChatWidget;
