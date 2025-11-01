import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Heart, Loader2, Phone, MessageCircle } from 'lucide-react';
import './App.css';

// API key is in backend only - not needed here
// Nigerian-specific specialties
const SPECIALTIES = [
  { id: 'general', name: 'General Health', icon: '🏥', color: 'bg-blue-500' },
  { id: 'malaria', name: 'Malaria & Typhoid', icon: '🦟', color: 'bg-orange-500' },
  { id: 'maternal', name: 'Maternal Health', icon: '🤰', color: 'bg-pink-500' },
  { id: 'nutrition', name: 'Nutrition', icon: '🥗', color: 'bg-green-500' },
  { id: 'child', name: 'Child Health', icon: '👶', color: 'bg-yellow-500' },
  { id: 'mental', name: 'Mental Health', icon: '🧠', color: 'bg-purple-500' },
];

// Nigerian emergency contacts
const EMERGENCY_CONTACTS = {
  'Lagos': {
    emergency: '767 / 112',
    ambulance: '08023147654',
    lasema: '767'
  },
  'Abuja': {
    emergency: '112',
    ambulance: '08037245625'
  },
  'General': {
    emergency: '112',
    ncdc: '0800-9700-0010'
  }
};

function NigeriaHealthAdvisor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('general');
  const [showEmergency, setShowEmergency] = useState(false);
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
      
      // Nigeria-specific prompts
      const nigerianContext = `
      You are a health advisor for Nigerian patients. Consider:
      - Common Nigerian diseases (malaria, typhoid, cholera)
      - Local medications available in Nigeria
      - Nigerian healthcare system context
      - Tropical climate health concerns
      - Local health practices and beliefs
      - Affordable treatment options
      - When to visit a Nigerian hospital or pharmacy
      `;

      const specialtyPrompts = {
        general: `You are a General Health advisor for Nigeria. ${nigerianContext} Focus on common Nigerian health issues, preventive care, and when to seek medical attention.`,
        
        malaria: `You are a Malaria and Tropical Disease specialist for Nigeria. ${nigerianContext} Focus EXCLUSIVELY on malaria, typhoid, dengue, and other tropical diseases common in Nigeria. Discuss symptoms, prevention (mosquito nets, etc.), local antimalarial drugs (Coartem, Lonart, etc.), and when to visit hospital.`,
        
        maternal: `You are a Maternal Health specialist for Nigeria. ${nigerianContext} Focus on pregnancy care in Nigerian context, prenatal visits, nutrition during pregnancy with local foods, traditional birth attendants vs hospitals, postnatal care, and breastfeeding.`,
        
        nutrition: `You are a Nutrition specialist for Nigeria. ${nigerianContext} Focus on nutrition using LOCAL Nigerian foods (jollof rice, egusi, beans, plantain, etc.), affordable healthy eating, child nutrition, and managing malnutrition.`,
        
        child: `You are a Pediatric health advisor for Nigeria. ${nigerianContext} Focus on child health issues common in Nigeria, immunization schedules, common childhood diseases, growth monitoring, and when to take child to hospital.`,
        
        mental: `You are a Mental Health counselor for Nigeria. ${nigerianContext} Be culturally sensitive to Nigerian mental health attitudes, focus on stress, family pressure, economic stress, and accessible mental health resources in Nigeria.`
      };
      
      const systemPrompt = specialtyPrompts[selectedSpecialty] + ` 
      Always provide advice relevant to Nigerian context.
      Mention local medications when appropriate.
      Keep responses concise and easy to understand.
      Always remind users to consult healthcare professionals for serious concerns.
      If emergency, advise to call 112 or visit nearest hospital immediately.`;

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
            <h1 className="header-title">🇳🇬 Naija Health Advisor</h1>
          </div>
          <p className="header-subtitle">Your trusted Nigerian health companion</p>
        </div>

        {/* Emergency Banner */}
        <div style={{
          background: '#fee2e2',
          padding: '12px 16px',
          borderBottom: '2px solid #ef4444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={16} color="#dc2626" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
              Emergency: 112 | NCDC Hotline: 0800-9700-0010
            </span>
          </div>
          <button
            onClick={() => setShowEmergency(!showEmergency)}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {showEmergency ? 'Hide' : 'Show'} Contacts
          </button>
        </div>

        {/* Emergency Contacts Dropdown */}
        {showEmergency && (
          <div style={{
            background: '#fef2f2',
            padding: '16px',
            borderBottom: '1px solid #fecaca',
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <strong>Lagos Emergency:</strong> {EMERGENCY_CONTACTS.Lagos.emergency} | 
              Ambulance: {EMERGENCY_CONTACTS.Lagos.ambulance}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Abuja Emergency:</strong> {EMERGENCY_CONTACTS.Abuja.emergency}
            </div>
            <div>
              <strong>National NCDC Hotline:</strong> {EMERGENCY_CONTACTS.General.ncdc}
            </div>
          </div>
        )}

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
              <h2 className="welcome-title">Wetin you wan know about your health?</h2>
              <p className="welcome-text">
                Ask me anything about health - I go help you with Nigerian context!
              </p>
              <div style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
                <p>💡 Try asking:</p>
                <p>"How to treat malaria?"</p>
                <p>"Which food good for pregnancy?"</p>
                <p>"How to prevent typhoid?"</p>
              </div>
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
            placeholder="Type your health question in English or Pidgin..."
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

        {/* Nigerian Disclaimer */}
        <div className="disclaimer">
          <p>
            ⚠️ This na AI assistant. Always visit hospital or consult doctor for serious health matter. Emergency? Call 112 now!
          </p>
        </div>
      </div>
    </div>
  );
}

export default NigeriaHealthAdvisor;