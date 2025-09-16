import React from 'react';
import ChatWidget from './components/ChatWidget';
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="https://storage.googleapis.com/msgsndr/Wj3JvHTBsQKqvP85ShhE/media/68abc9cbd023bc5d3a871163.png" 
              alt="Company Logo" 
              className="w-16 h-16 rounded-lg shadow-md"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            AI Business Assistant
          </h1>
          <p className="text-gray-600 mb-8 max-w-md">
            Your AI-powered assistant for managing business data. 
            Click the chat button to get started!
          </p>
          
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Features</h2>
            <ul className="text-left space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="text-[#0FB981] mr-2">•</span>
                View and manage contacts
              </li>
              <li className="flex items-center">
                <span className="text-[#0FB981] mr-2">•</span>
                Check calendar appointments
              </li>
              <li className="flex items-center">
                <span className="text-[#0FB981] mr-2">•</span>
                Access conversations
              </li>
              <li className="flex items-center">
                <span className="text-[#0FB981] mr-2">•</span>
                Monitor opportunities
              </li>
              <li className="flex items-center">
                <span className="text-[#0FB981] mr-2">•</span>
                Review transactions
              </li>
            </ul>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-[#0FB981]/20">
              <p className="text-sm text-green-800">
                <strong>Getting Started:</strong><br/>
                1. Click the chat bubble below<br/>
                2. Configure your GHL credentials<br/>
                3. Start asking questions about your data!
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>Powered by Google Gemini AI • Secure GoHighLevel Integration</p>
          </div>
        </div>
      </div>
      
      {/* Chat Widget - this will float in bottom right */}
      <ChatWidget />
    </div>
  );
}

export default App;
