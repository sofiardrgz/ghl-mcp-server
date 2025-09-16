import React from 'react';
import ChatWidget from './components/ChatWidget';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  CreditCard,
  ClipboardList,
  MapPin,
  FileText,
  Building
} from 'lucide-react';
import './App.css';

function App() {
  const features = [
    { name: 'Contact Management', icon: Users },
    { name: 'Calendar & Appointments', icon: Calendar },
    { name: 'Conversations', icon: MessageSquare },
    { name: 'Opportunities', icon: TrendingUp },
    { name: 'Payments', icon: CreditCard },
    { name: 'Tasks', icon: ClipboardList },
    { name: 'Locations', icon: MapPin },
    { name: 'Custom Fields', icon: FileText },
    { name: 'Pipelines', icon: Building }
  ];

  return (
    <div className="App smartsquatch-background" style={{ minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>
        Smartsquatch Copilot
      </h1>
      
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        display: 'flex', 
        gap: '20px',
        minHeight: '80vh'
      }}>
        {/* Enhanced Sidebar */}
        <div className="glass-sidebar" style={{ 
          width: '300px', 
          padding: '20px',
          borderRadius: '12px',
          overflowY: 'auto'
        }}>
          <h2 style={{ color: '#0FB981', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} />
            Features
          </h2>
          <ul style={{ color: 'rgba(255,255,255,0.8)', listStyle: 'none', padding: 0 }}>
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <li key={index} style={{ 
                  marginBottom: '12px', 
                  padding: '8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.05)'
                }}>
                  <IconComponent size={16} color="#0FB981" />
                  {feature.name}
                </li>
              );
            })}
          </ul>
        </div>
        
        {/* Chat Area */}
        <div style={{ flex: 1 }}>
          <div className="glass-chat" style={{ 
            height: '80vh', 
            borderRadius: '12px',
            padding: '10px'
          }}>
            <ChatWidget isFullPage={true} />
          </div>
        </div>
      </div>
      
      <p style={{ 
        textAlign: 'center', 
        color: 'rgba(255,255,255,0.6)', 
        marginTop: '20px' 
      }}>
        Built by Laken Lee Creative
      </p>
    </div>
  );
}

export default App;
