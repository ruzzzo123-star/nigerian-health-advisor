import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Heart, Loader2 } from 'lucide-react';
import './App.css';

// YOUR API KEY
// API key is in backend only - not needed here
const SPECIALTIES = [
  { id: 'general', name: 'General Health', icon: '🏥', color: 'bg-blue-500' },
  { id: 'nutrition', name: 'Nutrition', icon: '🥗', color: 'bg-green-500' },
  { id: 'mental', name: 'Mental Health', icon: '🧠', color: 'bg-purple-500' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: 'bg-red-500' },
  { id: 'pediatric', name: 'Pediatric', icon: '👶', color: 'bg-yellow-500' },
  { id: 'maternal', name: 'Maternal Health', icon: '🤰', color: 'bg-pink-500' },
];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('general');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const specialty = SPECIALTIES.find(s => s.id === selectedSpecialty);
      const systemPrompt = `You are a helpful AI health advisor specializing in ${specialty.name}. 
      Provide informative, caring, and accurate health information. 
      Always remind users to consult healthcare professionals for serious concerns.
      Keep responses concise and easy to understand.`;

      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
     'Content-Type': 'application/json',
   },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...messages.filter(m => m.role === 'user' || m.role === 'assistant'),
            userMessage,
          ],
        }),
      });

      const data = await response.json();

      if (data.content && data.content[0]) {
        const assistantMessage = {
          role: 'assistant',
          content: data.content[0].text,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <Heart className="header-icon" />
            <h1 className="header-title">AI Health Advisor</h1>
          </div>
          <p className="header-subtitle">Your personal health companion</p>
        </div>

        {/* Specialty Selector */}
        <div className="specialty-container">
          {SPECIALTIES.map((specialty) => (
            <button
              key={specialty.id}
              onClick={() => setSelectedSpecialty(specialty.id)}
              className={`specialty-button ${
                selectedSpecialty === specialty.id ? 'specialty-button-active' : ''
              }`}
            >
              <span className="specialty-icon">{specialty.icon}</span>
              <span className="specialty-name">{specialty.name}</span>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <Bot size={48} className="welcome-icon" />
              <h2 className="welcome-title">How can I help you today?</h2>
              <p className="welcome-text">
                Ask me anything about your health and wellness!
              </p>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message ${
                    message.role === 'user' ? 'message-user' : 'message-assistant'
                  }`}
                >
                  <div className="message-icon">
                    {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="message message-assistant">
                  <div className="message-icon">
                    <Bot size={20} />
                  </div>
                  <div className="message-content">
                    <Loader2 className="loading-spinner" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your health question..."
            className="input-textarea"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="send-button"
          >
            <Send size={20} />
          </button>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer">
          <p>
            ⚠️ This is an AI assistant. Always consult healthcare professionals for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
