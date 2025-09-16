import React from 'react';
import ChatWidget from './components/ChatWidget';
import './App.css';

function App() {
  return (
    <div className="App smartsquatch-background" style={{ minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>
        Smartsquatch Copilot - Debug Mode
      </h1>
      
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        display: 'flex', 
        gap: '20px',
        minHeight: '80vh'
      }}>
        {/* Simple Sidebar */}
        <div className="glass-sidebar" style={{ 
          width: '300px', 
          padding: '20px',
          borderRadius: '12px'
        }}>
          <h2 style={{ color: '#0FB981', marginBottom: '15px' }}>Features</h2>
          <ul style={{ color: 'rgba(255,255,255,0.8)', listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '8px' }}>• Contact Management</li>
            <li style={{ marginBottom: '8px' }}>• Calendar & Appointments</li>
            <li style={{ marginBottom: '8px' }}>• Conversations</li>
            <li style={{ marginBottom: '8px' }}>• Opportunities</li>
            <li style={{ marginBottom: '8px' }}>• Payments</li>
          </ul>
        </div>

        {/* Simple Chat Area */}
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
