// Add these imports at the top
import { 
  Mail, 
  Phone, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Tag,
  ChevronDown,
  ChevronUp,
  Brain,
  Activity
} from 'lucide-react';

// Inside the ChatWidget component, add state for showing AI activity
const [showAIActivity, setShowAIActivity] = useState(false);
const [aiActivity, setAIActivity] = useState([]);

// Update the sendMessage function to simulate AI activity
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

// Update the formatGHLData function to use icons instead of emojis
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

// Add this component inside the main return statement, before the messages section
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
