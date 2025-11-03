import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Heart, Loader2, Mic, MicOff, Volume2, Sparkles, Phone, WifiOff, RefreshCw, Settings, X, MapPin, Zap } from 'lucide-react';
import './App.css';

const SPECIALTIES = [
  { id: 'general', name: 'General', icon: '🏥', gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', bg: 'rgba(102, 126, 234, 0.1)' },
  { id: 'malaria', name: 'Malaria', icon: '🦟', gradient: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)', bg: 'rgba(240, 147, 251, 0.1)' },
  { id: 'maternal', name: 'Maternal', icon: '🤰', gradient: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)', bg: 'rgba(250, 112, 154, 0.1)' },
  { id: 'nutrition', name: 'Nutrition', icon: '🥗', gradient: 'linear-gradient(135deg, #30CCD5 0%, #38EF7D 100%)', bg: 'rgba(48, 204, 213, 0.1)' },
  { id: 'child', name: 'Child', icon: '👶', gradient: 'linear-gradient(135deg, #FFD89B 0%, #19547B 100%)', bg: 'rgba(255, 216, 155, 0.1)' },
  { id: 'mental', name: 'Mental', icon: '🧠', gradient: 'linear-gradient(135deg, #A8EDEA 0%, #FED6E3 100%)', bg: 'rgba(168, 237, 234, 0.1)' },
];

const saveToLocalStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), expiresAt: Date.now() + 86400000 }));
};

const getFromLocalStorage = (key) => {
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    const parsed = JSON.parse(item);
    if (Date.now() > parsed.expiresAt) { localStorage.removeItem(key); return null; }
    return parsed.data;
  } catch { return null; }
};

function VoiceHealthAdvisor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('general');
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = getFromLocalStorage(`chat_${selectedSpecialty}`);
    setMessages(Array.isArray(saved) ? saved : []);
  }, [selectedSpecialty]);

  useEffect(() => { 
    if (messages.length > 0) saveToLocalStorage(`chat_${selectedSpecialty}`, messages); 
  }, [messages, selectedSpecialty]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  const sendMessage = async (voiceInput = null) => {
    const messageText = voiceInput || input;
    if (!messageText.trim() || isLoading) return;
    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://nigerian-health-backend.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          system: 'You are a Nigerian health advisor. Keep responses under 3 sentences.',
          messages: [...messages.slice(-6), userMessage],
        }),
      });
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      if (data.content?.[0]) setMessages(prev => [...prev, { role: 'assistant', content: data.content[0].text }]);
    } catch (error) {
      setError('Connection lost!');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const currentSpecialty = SPECIALTIES.find(s => s.id === selectedSpecialty);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #667EEA 0%, #764BA2 50%, #F093FB 100%)',
      backgroundAttachment: 'fixed',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Animated Background Blobs */}
      <div style={{ position: 'fixed', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%', animation: 'float 6s ease-in-out infinite' }}></div>
      <div style={{ position: 'fixed', bottom: '-150px', left: '-150px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', borderRadius: '50%', animation: 'float 8s ease-in-out infinite reverse' }}></div>

      {/* Glass Header */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.15)', 
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={28} /> Health Advisor
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: '600' }}>AI-powered Nigerian health companion</p>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} style={{ 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none', 
            width: '44px', 
            height: '44px', 
            borderRadius: '50%', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}>
            <Settings size={22} color="white" />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 20px 140px' }}>
        
        {/* Premium Specialty Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '14px', 
          padding: '24px 0',
          position: 'relative',
          zIndex: 1
        }}>
          {SPECIALTIES.map(s => (
            <button key={s.id} onClick={() => setSelectedSpecialty(s.id)}
              style={{ 
                background: selectedSpecialty === s.id ? s.gradient : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: selectedSpecialty === s.id ? 'white' : '#374151',
                border: selectedSpecialty === s.id ? '2px solid rgba(255,255,255,0.5)' : '2px solid rgba(255,255,255,0.3)',
                borderRadius: '20px',
                padding: '20px 12px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: selectedSpecialty === s.id ? '0 12px 32px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transform: selectedSpecialty === s.id ? 'translateY(-4px) scale(1.05)' : 'translateY(0) scale(1)',
                letterSpacing: '0.5px'
              }}>
              <span style={{ fontSize: '36px', filter: selectedSpecialty === s.id ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}>{s.icon}</span>
              <span style={{ fontSize: '10px', lineHeight: '1.2', textAlign: 'center' }}>{s.name}</span>
            </button>
          ))}
        </div>

        {/* Premium Chat Container */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {messages.length === 0 ? (
            <div style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '60px 40px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: currentSpecialty.gradient }}></div>
              <div style={{ fontSize: '72px', marginBottom: '20px', animation: 'bounce 2s infinite' }}>{currentSpecialty.icon}</div>
              <h2 style={{ fontSize: '26px', fontWeight: '900', background: currentSpecialty.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px' }}>
                {currentSpecialty.name} Health
              </h2>
              <p style={{ fontSize: '16px', color: '#6B7280', fontWeight: '500', marginBottom: '24px' }}>Ask me anything about your health! 💬</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: currentSpecialty.bg, padding: '10px 20px', borderRadius: '16px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>
                <Zap size={16} /> Powered by AI
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                  <div style={{ 
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: msg.role === 'user' ? currentSpecialty.gradient : 'rgba(255,255,255,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '2px solid rgba(255,255,255,0.5)'
                  }}>
                    {msg.role === 'user' ? <User size={20} color="white" /> : <Bot size={20} color="#667EEA" />}
                  </div>
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{ 
                      background: msg.role === 'user' ? currentSpecialty.gradient : 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      color: msg.role === 'user' ? 'white' : '#111827',
                      padding: '16px 20px',
                      borderRadius: msg.role === 'user' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      fontWeight: '500',
                      border: msg.role === 'assistant' ? '2px solid rgba(255,255,255,0.3)' : 'none'
                    }}>
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <button style={{ 
                          background: 'rgba(255,255,255,0.9)',
                          backdropFilter: 'blur(10px)',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderRadius: '12px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: '700',
                          color: '#667EEA',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{ fontSize: '16px' }}>✨</span> Share
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '2px solid rgba(255,255,255,0.5)' }}>
                    <Bot size={20} color="#667EEA" />
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', padding: '16px 20px', borderRadius: '24px 24px 24px 4px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '2px solid rgba(255,255,255,0.3)' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: currentSpecialty.gradient, animation: 'bounce1 1.4s infinite' }}></div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: currentSpecialty.gradient, animation: 'bounce2 1.4s infinite' }}></div>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: currentSpecialty.gradient, animation: 'bounce3 1.4s infinite' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Premium Floating Input */}
      <div style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '24px 20px',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
        zIndex: 100
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button style={{ 
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isListening ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' : currentSpecialty.gradient,
            border: '2px solid rgba(255,255,255,0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            flexShrink: 0,
            transition: 'all 0.3s'
          }}>
            {isListening ? <MicOff size={26} color="white" /> : <Mic size={26} color="white" />}
          </button>
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Type your health question..."
              style={{ 
                width: '100%',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '28px',
                padding: '16px 24px',
                fontSize: '15px',
                outline: 'none',
                fontWeight: '500',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                color: '#111827'
              }}
            />
          </div>
          <button 
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            style={{ 
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: input.trim() ? currentSpecialty.gradient : 'rgba(156, 163, 175, 0.5)',
              border: '2px solid rgba(255,255,255,0.5)',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: input.trim() ? '0 8px 24px rgba(0,0,0,0.2)' : 'none',
              flexShrink: 0,
              transition: 'all 0.3s'
            }}>
            <Send size={24} color="white" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, 20px); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes bounce1 { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
        @keyframes bounce2 { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } }
        @keyframes bounce3 { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 60% { transform: scale(1.2); opacity: 1; } }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default VoiceHealthAdvisor;
