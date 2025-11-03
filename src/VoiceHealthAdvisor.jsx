import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Heart, Loader2, Mic, MicOff, Volume2, VolumeX, Phone, WifiOff, RefreshCw, Settings, X, MapPin } from 'lucide-react';
import './App.css';

const SPECIALTIES = [
  { 
    id: 'general', 
    name: 'General Health', 
    icon: '🏥', 
    color: '#3B82F6',
    lightColor: '#DBEAFE',
    quickQuestions: [
      { icon: '🤒', text: 'Treat fever?', query: 'How do I treat high fever at home?' },
      { icon: '🤕', text: 'Headache relief?', query: 'What helps with severe headaches?' },
      { icon: '🤧', text: 'Common cold?', query: 'How to treat common cold?' },
      { icon: '💊', text: 'Pain relief?', query: 'What painkillers are safe in Nigeria?' },
    ]
  },
  { 
    id: 'malaria', 
    name: 'Malaria', 
    icon: '🦟', 
    color: '#F59E0B',
    lightColor: '#FEF3C7',
    quickQuestions: [
      { icon: '🦟', text: 'Symptoms?', query: 'What are malaria symptoms?' },
      { icon: '💊', text: 'Treatment?', query: 'Best malaria medication in Nigeria?' },
      { icon: '🤒', text: 'Typhoid?', query: 'How do I know if I have typhoid?' },
      { icon: '🛡️', text: 'Prevention?', query: 'How to prevent malaria?' },
    ]
  },
  { 
    id: 'maternal', 
    name: 'Maternal', 
    icon: '🤰', 
    color: '#EC4899',
    lightColor: '#FCE7F3',
    quickQuestions: [
      { icon: '🤰', text: 'Diet?', query: 'What should I eat during pregnancy?' },
      { icon: '🏥', text: 'Care?', query: 'Where can I get antenatal care?' },
      { icon: '💊', text: 'Safe meds?', query: 'What medicines are safe?' },
      { icon: '👶', text: 'Warning signs?', query: 'Pregnancy emergency symptoms?' },
    ]
  },
  { 
    id: 'nutrition', 
    name: 'Nutrition', 
    icon: '🥗', 
    color: '#10B981',
    lightColor: '#D1FAE5',
    quickQuestions: [
      { icon: '🍎', text: 'Healthy foods?', query: 'Healthy Nigerian foods?' },
      { icon: '💪', text: 'Weight loss?', query: 'How to lose weight?' },
      { icon: '🥛', text: 'Vitamins?', query: 'Vitamin sources?' },
      { icon: '👶', text: 'Baby food?', query: 'Best foods for babies?' },
    ]
  },
  { 
    id: 'child', 
    name: 'Child Health', 
    icon: '👶', 
    color: '#FBBF24',
    lightColor: '#FEF3C7',
    quickQuestions: [
      { icon: '💉', text: 'Vaccines?', query: 'Child vaccination schedule?' },
      { icon: '🤒', text: 'Fever?', query: 'Treat child fever?' },
      { icon: '🍼', text: 'Feeding?', query: 'Child won\'t eat?' },
      { icon: '⚠️', text: 'Emergency?', query: 'When to see doctor?' },
    ]
  },
  { 
    id: 'mental', 
    name: 'Mental', 
    icon: '🧠', 
    color: '#8B5CF6',
    lightColor: '#EDE9FE',
    quickQuestions: [
      { icon: '😢', text: 'Depression?', query: 'Deal with depression?' },
      { icon: '😰', text: 'Anxiety?', query: 'Manage anxiety?' },
      { icon: '😴', text: 'Sleep?', query: 'Can\'t sleep well?' },
      { icon: '🆘', text: 'Help?', query: 'Mental health support?' },
    ]
  },
];

const saveToLocalStorage = (key, data) => {
  const item = { data: data, timestamp: Date.now(), expiresAt: Date.now() + (24 * 60 * 60 * 1000) };
  localStorage.setItem(key, JSON.stringify(item));
};

const getFromLocalStorage = (key) => {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  try {
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiresAt) { localStorage.removeItem(key); return null; }
    return item.data;
  } catch (e) { return null; }
};

function VoiceHealthAdvisor() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('general');
  const [showEmergency, setShowEmergency] = useState(false);
  const [showSpecialtyQuestions, setShowSpecialtyQuestions] = useState(false);
  const [error, setError] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRate, setVoiceRate] = useState(0.92);
  const [voicePitch, setVoicePitch] = useState(1.12);
  const [selectedVoiceName, setSelectedVoiceName] = useState('auto');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [detectedCity, setDetectedCity] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

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

  const shareToWhatsApp = (text) => { 
    const url = `https://wa.me/?text=${encodeURIComponent(text + '\n\nFrom Nigerian Health Advisor\nhttps://naija-health-advisor.vercel.app')}`; 
    window.open(url, '_blank'); 
  };
  
  const copyToClipboard = async (text, e) => { 
    try { 
      await navigator.clipboard.writeText(text); 
      const btn = e.target.closest('button'); 
      const orig = btn.innerHTML; 
      btn.innerHTML = '✅ Copied!'; 
      btn.style.background = '#10B981'; 
      setTimeout(() => { btn.innerHTML = orig; btn.style.background = '#6B7280'; }, 2000); 
    } catch {} 
  };

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
          system: `You are a Nigerian health advisor. Keep responses under 3 sentences.`,
          messages: [...messages.slice(-6), userMessage],
        }),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      if (data.content?.[0]) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content[0].text }]);
      }
    } catch (error) {
      setError('Connection lost! Please try again.');
      setLastFailedMessage(messageText);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const currentSpecialty = SPECIALTIES.find(s => s.id === selectedSpecialty);

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Clean Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>Health Advisor</h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Your Nigerian health companion</p>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} style={{ background: '#F3F4F6', border: 'none', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={20} color="#6B7280" />
          </button>
        </div>
      </div>

      {detectedCity && locationEnabled && (
        <div style={{ background: '#ECFDF5', padding: '10px', textAlign: 'center', borderBottom: '1px solid #D1FAE5' }}>
          <MapPin size={14} style={{ display: 'inline', marginRight: '6px' }} color="#059669" />
          <span style={{ fontSize: '13px', color: '#059669', fontWeight: '500' }}>{detectedCity}, Nigeria</span>
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 0 100px 0' }}>
        
        {/* Specialty Pills */}
        <div style={{ padding: '20px', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SPECIALTIES.map(s => (
            <button key={s.id} onClick={() => { setSelectedSpecialty(s.id); setShowSpecialtyQuestions(false); }}
              style={{ background: selectedSpecialty === s.id ? s.color : 'white', color: selectedSpecialty === s.id ? 'white' : '#374151', border: `2px solid ${selectedSpecialty === s.id ? s.color : '#E5E7EB'}`, borderRadius: '20px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: selectedSpecialty === s.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}>
              {s.icon} {s.name}
            </button>
          ))}
        </div>

        {/* Quick Questions */}
        {currentSpecialty && (
          <div style={{ padding: '0 20px 20px' }}>
            <button onClick={() => setShowSpecialtyQuestions(!showSpecialtyQuestions)}
              style={{ width: '100%', background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '600', color: currentSpecialty.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {showSpecialtyQuestions ? '▲' : '▼'} Quick Questions
            </button>
            {showSpecialtyQuestions && (
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {currentSpecialty.quickQuestions.map((q, i) => (
                  <button key={i} onClick={() => { sendMessage(q.query); setShowSpecialtyQuestions(false); }}
                    style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '12px', fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontWeight: '500', color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.target.style.borderColor = currentSpecialty.color; e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                    <span style={{ fontSize: '20px', marginRight: '8px' }}>{q.icon}</span>{q.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        <div style={{ padding: '0 20px' }}>
          {messages.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '16px', padding: '60px 40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{currentSpecialty.icon}</div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>{currentSpecialty.name}</h2>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>Ask a question or select one above</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: msg.role === 'user' ? currentSpecialty.color : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {msg.role === 'user' ? <User size={18} color="white" /> : <Bot size={18} color="#6B7280" />}
                  </div>
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{ background: msg.role === 'user' ? currentSpecialty.lightColor : 'white', padding: '12px 16px', borderRadius: '16px', fontSize: '14px', lineHeight: '1.5', color: '#111827', boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' }}>
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                        <button onClick={() => shareToWhatsApp(msg.content)} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', color: '#6B7280' }}>Share</button>
                        <button onClick={(e) => copyToClipboard(msg.content, e)} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', color: '#6B7280' }}>Copy</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={18} color="#6B7280" /></div>
                  <div style={{ background: 'white', padding: '12px 16px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <Loader2 size={16} color={currentSpecialty.color} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #E5E7EB', padding: '16px', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => {}} style={{ width: '44px', height: '44px', borderRadius: '12px', background: isListening ? '#EF4444' : currentSpecialty.color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isListening ? <MicOff size={20} color="white" /> : <Mic size={20} color="white" />}
          </button>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') sendMessage(); }} placeholder="Type your question..." style={{ flex: 1, background: '#F3F4F6', border: 'none', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', outline: 'none' }} />
          <button onClick={() => sendMessage()} disabled={!input.trim()} style={{ width: '44px', height: '44px', borderRadius: '12px', background: input.trim() ? currentSpecialty.color : '#E5E7EB', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send size={20} color="white" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default VoiceHealthAdvisor;