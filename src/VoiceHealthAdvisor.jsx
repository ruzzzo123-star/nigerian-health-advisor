import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Heart, Loader2, Mic, MicOff, Volume2, VolumeX, Phone, WifiOff, RefreshCw, Settings, X } from 'lucide-react';
import './App.css';

const SPECIALTIES = [
  { 
    id: 'general', 
    name: 'General Health', 
    icon: '🏥', 
    color: 'bg-blue-500',
    quickQuestions: [
      { icon: '🤒', text: 'Treat fever?', query: 'How do I treat high fever at home?' },
      { icon: '🤕', text: 'Headache relief?', query: 'What helps with severe headaches?' },
      { icon: '🤧', text: 'Common cold?', query: 'How to treat common cold?' },
      { icon: '💊', text: 'Pain relief?', query: 'What painkillers are safe in Nigeria?' },
    ]
  },
  { 
    id: 'malaria', 
    name: 'Malaria & Typhoid', 
    icon: '🦟', 
    color: 'bg-orange-500',
    quickQuestions: [
      { icon: '🦟', text: 'Malaria symptoms?', query: 'What are malaria symptoms?' },
      { icon: '💊', text: 'Best treatment?', query: 'Best malaria medication in Nigeria?' },
      { icon: '🤒', text: 'Typhoid signs?', query: 'How do I know if I have typhoid?' },
      { icon: '🛡️', text: 'Prevention?', query: 'How to prevent malaria and typhoid?' },
    ]
  },
  { 
    id: 'maternal', 
    name: 'Maternal Health', 
    icon: '🤰', 
    color: 'bg-pink-500',
    quickQuestions: [
      { icon: '🤰', text: 'Pregnancy diet?', query: 'What should I eat during pregnancy in Nigeria?' },
      { icon: '🏥', text: 'Antenatal care?', query: 'Where can I get free antenatal care?' },
      { icon: '💊', text: 'Safe medications?', query: 'What medicines are safe while pregnant?' },
      { icon: '👶', text: 'Warning signs?', query: 'What pregnancy symptoms need urgent care?' },
    ]
  },
  { 
    id: 'nutrition', 
    name: 'Nutrition', 
    icon: '🥗', 
    color: 'bg-green-500',
    quickQuestions: [
      { icon: '🍎', text: 'Healthy Nigerian foods?', query: 'What are healthy Nigerian foods?' },
      { icon: '💪', text: 'Weight loss tips?', query: 'How can I lose weight eating Nigerian food?' },
      { icon: '🥛', text: 'Vitamin sources?', query: 'Where to get vitamins from Nigerian foods?' },
      { icon: '👶', text: 'Baby nutrition?', query: 'Best foods for babies in Nigeria?' },
    ]
  },
  { 
    id: 'child', 
    name: 'Child Health', 
    icon: '👶', 
    color: 'bg-yellow-500',
    quickQuestions: [
      { icon: '💉', text: 'Vaccination schedule?', query: 'What vaccines does my child need?' },
      { icon: '🤒', text: 'Treat child fever?', query: 'How to treat fever in children?' },
      { icon: '🍼', text: 'Feeding problems?', query: 'My child won\'t eat, what should I do?' },
      { icon: '⚠️', text: 'Warning signs?', query: 'When should I take my child to hospital?' },
    ]
  },
  { 
    id: 'mental', 
    name: 'Mental Health', 
    icon: '🧠', 
    color: 'bg-purple-500',
    quickQuestions: [
      { icon: '😢', text: 'Feeling depressed?', query: 'How do I deal with depression in Nigeria?' },
      { icon: '😰', text: 'Anxiety help?', query: 'How to manage anxiety and stress?' },
      { icon: '😴', text: 'Sleep problems?', query: 'I can\'t sleep well, what should I do?' },
      { icon: '🆘', text: 'Get mental health help?', query: 'Where can I get mental health support in Nigeria?' },
    ]
  },
];

const EMERGENCY_CONTACTS = {
  'Lagos': { emergency: '767 / 112', ambulance: '08023147654', lasema: '767' },
  'Abuja': { emergency: '112', ambulance: '08037245625' },
  'General': { emergency: '112', ncdc: '0800-9700-0010' }
};

const saveToLocalStorage = (key, data) => {
  const item = {
    data: data,
    timestamp: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  };
  localStorage.setItem(key, JSON.stringify(item));
};

const getFromLocalStorage = (key) => {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  
  try {
    const item = JSON.parse(itemStr);
    const now = Date.now();
    
    if (now > item.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return item.data;
  } catch (e) {
    return null;
  }
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
  
  // Settings menu
  const [showSettings, setShowSettings] = useState(false);
  
  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [detectedCity, setDetectedCity] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending');
  const [locationEnabled, setLocationEnabled] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    const savedMessages = getFromLocalStorage(`chat_${selectedSpecialty}`);
    if (savedMessages && Array.isArray(savedMessages)) {
      setMessages(savedMessages);
    } else {
      setMessages([]);
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (messages.length > 0) {
      saveToLocalStorage(`chat_${selectedSpecialty}`, messages);
    }
  }, [messages, selectedSpecialty]);

  useEffect(() => {
    const cleanupExpiredChats = () => {
      SPECIALTIES.forEach(specialty => {
        getFromLocalStorage(`chat_${specialty.id}`);
      });
    };
    cleanupExpiredChats();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      const englishVoices = voices.filter(v => 
        v.lang.includes('en') && !v.name.includes('compact')
      );
      setAvailableVoices(englishVoices);
    };
    
    loadVoices();
    
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-NG';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synthRef.current.cancel();
    };
  }, []);

  // Detect user location - only when enabled
  useEffect(() => {
    if (!locationEnabled) return;
    
    const detectLocation = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lon: longitude });
            setLocationPermission('granted');
            
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
              );
              const data = await response.json();
              
              const city = data.address.city || 
                          data.address.town || 
                          data.address.state_district || 
                          data.address.state;
              
              setDetectedCity(city);
              console.log('🗺️ Detected location:', city);
            } catch (error) {
              console.error('Geocoding error:', error);
            }
          },
          (error) => {
            console.log('Location permission denied or unavailable');
            setLocationPermission('denied');
            detectFromIP();
          },
          {
            timeout: 10000,
            enableHighAccuracy: false
          }
        );
      } else {
        detectFromIP();
      }
    };

    const detectFromIP = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        setDetectedCity(data.city);
        setUserLocation({ lat: data.latitude, lon: data.longitude });
        console.log('🌐 Detected from IP:', data.city);
      } catch (error) {
        console.error('IP detection failed:', error);
        setDetectedCity('Nigeria');
      }
    };

    detectLocation();
  }, [locationEnabled]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text) => {
    if (!voiceEnabled) return;

    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    
    const preferredVoices = [
      'Samantha',
      'Alex',
      'Google UK English Female',
      'Google US English Female',
      'Microsoft Zira Desktop',
      'Microsoft David Desktop',
      'Karen',
      'Daniel',
      'Moira',
      'Tessa',
    ];
    
    let selectedVoice = null;
    
    if (selectedVoiceName !== 'auto') {
      selectedVoice = voices.find(v => v.name === selectedVoiceName);
    }
    
    if (!selectedVoice) {
      for (const preferred of preferredVoices) {
        selectedVoice = voices.find(voice => voice.name.includes(preferred));
        if (selectedVoice) break;
      }
    }
    
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.lang.includes('en') && 
        voice.localService === true &&
        !voice.name.includes('compact')
      );
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.lang = 'en-US';
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.volume = 1.0;
    
    utterance.text = text
      .replace(/\. /g, '... ')
      .replace(/\? /g, '?.. ')
      .replace(/! /g, '!.. ');
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('❌ Speech error:', event);
      setIsSpeaking(false);
    };
    
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  };

  // Share to WhatsApp
  const shareToWhatsApp = (text) => {
    const appName = "Nigerian Health Advisor";
    const appUrl = "https://naija-health-advisor.vercel.app";
    const message = `${text}\n\n---\nFrom ${appName}\n${appUrl}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Share via SMS
  const shareToSMS = (text) => {
    const appName = "Nigerian Health Advisor";
    const appUrl = "https://naija-health-advisor.vercel.app";
    const message = `${text}\n\n---\nFrom ${appName}: ${appUrl}`;
    
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  // Copy to clipboard
  const copyToClipboard = async (text, event) => {
    try {
      await navigator.clipboard.writeText(text);
      
      const button = event.target.closest('button');
      const originalHTML = button.innerHTML;
      button.innerHTML = '<span style="font-size: 16px">✅</span> Copied!';
      button.style.background = '#22c55e';
      
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = '#6B7280';
      }, 2000);
    } catch (err) {
      alert('Failed to copy. Please try again.');
    }
  };

  const sendMessage = async (voiceInput = null) => {
    const messageText = voiceInput || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const nigerianContext = `
      You are a health advisor for Nigerian patients${detectedCity ? ` in ${detectedCity}` : ''}. Focus on common diseases (malaria, typhoid), local medications, and affordable treatments. Keep responses under 3 sentences for voice output.
      ${detectedCity ? `\nUser's location: ${detectedCity}, Nigeria. Provide location-specific advice when relevant.` : ''}
      `;
      
      const specialtyPrompts = {
        general: `You are a General Health advisor for Nigeria. ${nigerianContext}`,
        malaria: `You are a Malaria specialist for Nigeria. ${nigerianContext}`,
        maternal: `You are a Maternal Health specialist for Nigeria. ${nigerianContext}`,
        nutrition: `You are a Nutrition specialist for Nigeria. ${nigerianContext}`,
        child: `You are a Pediatric advisor for Nigeria. ${nigerianContext}`,
        mental: `You are a Mental Health counselor for Nigeria. ${nigerianContext}`
      };
      
      const systemPrompt = specialtyPrompts[selectedSpecialty] + ` 
      Always provide advice relevant to Nigerian context.
      Keep responses SHORT and CLEAR for voice output.
      If emergency, say "Please call 112 immediately" at the start.`;

      const response = await fetch('https://nigerian-health-backend.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          system: systemPrompt,
          messages: [
            ...messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6),
            userMessage,
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.content && data.content[0]) {
        const assistantMessage = {
          role: 'assistant',
          content: data.content[0].text,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        if (voiceEnabled) {
          speak(data.content[0].text);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message.includes('Failed to fetch') 
        ? 'Connection lost! Please check your internet and try again.' 
        : 'Oops! Something went wrong. Please try again.');
      setLastFailedMessage(messageText);
      
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastMessage = () => {
    if (lastFailedMessage) {
      setError(null);
      sendMessage(lastFailedMessage);
      setLastFailedMessage(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearCurrentChat = () => {
    setMessages([]);
    setInput('');
    setError(null);
    setLastFailedMessage(null);
    stopSpeaking();
    localStorage.removeItem(`chat_${selectedSpecialty}`);
  };

  const currentSpecialty = SPECIALTIES.find(s => s.id === selectedSpecialty);

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="header-content">
            <Heart className="header-icon" />
            <h1 className="header-title">🎤 Voice Health Advisor</h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Settings size={24} />
            </button>
          </div>
          <p className="header-subtitle">Your Nigerian health companion</p>
        </div>

        {/* Settings Menu Overlay */}
        {showSettings && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '20px',
            overflowY: 'auto'
          }}
          onClick={() => setShowSettings(false)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '16px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                animation: 'slideDown 0.3s ease-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Settings Header */}
              <div style={{
                padding: '20px',
                borderBottom: '2px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px 16px 0 0'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'white', margin: 0 }}>
                  ⚙️ Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Settings Content */}
              <div style={{ padding: '20px' }}>
                
                {/* Location Settings */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    📍 Location
                  </h3>
                  <div style={{
                    background: '#f9fafb',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Enable Location</span>
                      <button
                        onClick={() => setLocationEnabled(!locationEnabled)}
                        style={{
                          padding: '6px 16px',
                          background: locationEnabled ? '#22c55e' : '#9ca3af',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        {locationEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {detectedCity && locationEnabled && (
                      <div style={{ fontSize: '12px', color: '#15803d', marginTop: '8px' }}>
                        📍 Detected: {detectedCity}, Nigeria
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                      Get personalized emergency numbers and local health advice
                    </div>
                  </div>
                </div>

                {/* Voice Settings */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    🔊 Voice
                  </h3>
                  <div style={{
                    background: '#f9fafb',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>Voice Responses</span>
                      <button
                        onClick={() => {
                          setVoiceEnabled(!voiceEnabled);
                          if (voiceEnabled) stopSpeaking();
                        }}
                        style={{
                          padding: '6px 16px',
                          background: voiceEnabled ? '#8b5cf6' : '#9ca3af',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        {voiceEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    
                    {voiceEnabled && (
                      <>
                        <div style={{ marginTop: '16px' }}>
                          <label style={{ fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Speed:</span>
                            <span style={{ fontWeight: '600' }}>{voiceRate.toFixed(2)}x</span>
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.05"
                            value={voiceRate}
                            onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                        </div>
                        
                        <div style={{ marginTop: '12px' }}>
                          <label style={{ fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Pitch:</span>
                            <span style={{ fontWeight: '600' }}>{voicePitch.toFixed(2)}</span>
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.05"
                            value={voicePitch}
                            onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                        </div>
                        
                        <button
                          onClick={() => speak("Hello! This is how I sound.")}
                          style={{
                            marginTop: '12px',
                            padding: '8px 16px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            width: '100%'
                          }}
                        >
                          🔊 Test Voice
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Share App */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    🌟 Share App
                  </h3>
                  <div style={{
                    background: '#f9fafb',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                      Help others access free health advice!
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => shareToWhatsApp('Check out Nigerian Health Advisor! Free health advice: https://naija-health-advisor.vercel.app')}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '10px 16px',
                          background: '#25D366',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>💬</span>
                        WhatsApp
                      </button>
                      <button
                        onClick={(e) => copyToClipboard('https://naija-health-advisor.vercel.app', e)}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '10px 16px',
                          background: '#6B7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🔗</span>
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>

                {/* About */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                    ℹ️ About
                  </h3>
                  <div style={{
                    background: '#f9fafb',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    fontSize: '13px',
                    color: '#6b7280',
                    lineHeight: '1.6'
                  }}>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong style={{ color: '#374151' }}>Nigerian Health Advisor</strong>
                    </p>
                    <p style={{ margin: '0 0 8px 0' }}>
                      Free AI-powered health advice for Nigerians. Get instant answers in English or Pidgin.
                    </p>
                    <p style={{ margin: '0', fontSize: '11px' }}>
                      Version 2.0 • Built with ❤️ for Nigeria
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        <div style={{
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradientSlide 3s ease infinite',
          padding: '12px 16px',
          borderBottom: '2px solid #764ba2',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <span style={{ 
              fontSize: '16px',
              animation: 'bounce 2s infinite'
            }}>🗣️</span>
            <span style={{ 
              fontSize: '14px', 
              color: 'white', 
              fontWeight: '600',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              Talk or Type with me in English or Pidgin! 
            </span>
            <span style={{ 
              fontSize: '16px',
              animation: 'bounce 2s infinite 0.5s'
            }}>🇳🇬</span>
          </div>
        </div>

        {detectedCity && locationEnabled && (
          <div style={{
            background: '#f0fdf4',
            padding: '8px 16px',
            borderBottom: '1px solid #86efac',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '14px' }}>📍</span>
            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>
              {detectedCity}, Nigeria
            </span>
          </div>
        )}

        {error && (
          <div style={{
            background: '#fee2e2',
            padding: '16px',
            borderBottom: '2px solid #ef4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <WifiOff size={20} color="#dc2626" />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                {error}
              </span>
            </div>
            <button
              onClick={retryLastMessage}
              style={{
                padding: '8px 16px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '40px'
              }}
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        )}

        <div style={{
          background: '#fee2e2',
          padding: '12px 16px',
          borderBottom: '2px solid #ef4444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={18} color="#dc2626" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
              {(() => {
                const cityName = detectedCity?.toLowerCase() || '';
                
                if (cityName.includes('lagos')) {
                  return 'Emergency? Lagos: 767 / 112';
                } else if (cityName.includes('abuja')) {
                  return 'Emergency? Abuja: 112';
                } else {
                  return 'Emergency? Call 112';
                }
              })()}
            </span>
          </div>
          <button
            onClick={() => setShowEmergency(!showEmergency)}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              minHeight: '36px'
            }}
          >
            {showEmergency ? 'Hide' : 'More'}
          </button>
        </div>

        {showEmergency && (
          <div style={{
            background: '#fef2f2',
            padding: '16px',
            borderBottom: '1px solid #fecaca',
            fontSize: '13px',
            animation: 'slideDown 0.3s ease-out'
          }}>
            {(() => {
              const cityName = detectedCity?.toLowerCase() || '';
              
              if (cityName.includes('lagos')) {
                return (
                  <>
                    <div><strong>📍 Lagos:</strong></div>
                    <div>Emergency: 767 / 112</div>
                    <div>Ambulance: 08023147654</div>
                    <div>NCDC: 0800-9700-0010</div>
                  </>
                );
              } else if (cityName.includes('abuja')) {
                return (
                  <>
                    <div><strong>📍 Abuja:</strong></div>
                    <div>Emergency: 112</div>
                    <div>Ambulance: 08037245625</div>
                    <div>NCDC: 0800-9700-0010</div>
                  </>
                );
              } else {
                return (
                  <>
                    <div><strong>📍 Nigeria:</strong></div>
                    <div>Emergency: 112</div>
                    <div>NCDC: 0800-9700-0010</div>
                  </>
                );
              }
            })()}
          </div>
        )}

        {/* Compact Specialty Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          padding: '12px',
          background: '#f9fafb',
          borderBottom: '2px solid #e5e7eb'
        }}>
          {SPECIALTIES.map((specialty) => (
            <button
              key={specialty.id}
              onClick={() => {
                setSelectedSpecialty(specialty.id);
                setShowSpecialtyQuestions(false);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 8px',
                border: selectedSpecialty === specialty.id ? '2px solid #667eea' : '2px solid #e5e7eb',
                background: selectedSpecialty === specialty.id 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'white',
                color: selectedSpecialty === specialty.id ? 'white' : '#374151',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '11px',
                fontWeight: '600',
                minHeight: '70px'
              }}
            >
              <span style={{ fontSize: '24px' }}>{specialty.icon}</span>
              <span style={{ 
                fontSize: '11px', 
                textAlign: 'center',
                lineHeight: '1.2',
                wordBreak: 'break-word'
              }}>
                {specialty.name}
              </span>
            </button>
          ))}
        </div>

        {/* Quick Questions for Selected Specialty */}
        {currentSpecialty && (
          <div style={{
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setShowSpecialtyQuestions(!showSpecialtyQuestions)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#667eea'
              }}
            >
              <span>{currentSpecialty.icon}</span>
              <span>{showSpecialtyQuestions ? 'Hide' : 'Show'} {currentSpecialty.name} Questions</span>
              <span style={{ fontSize: '10px' }}>{showSpecialtyQuestions ? '▲' : '▼'}</span>
            </button>
            
            {showSpecialtyQuestions && (
              <div style={{
                padding: '0 12px 12px 12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                animation: 'slideDown 0.3s ease-out'
              }}>
                {currentSpecialty.quickQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(q.query);
                      sendMessage(q.query);
                      setShowSpecialtyQuestions(false);
                    }}
                    style={{
                      padding: '10px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      textAlign: 'left',
                      minHeight: '60px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                      e.currentTarget.style.borderColor = '#667eea';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <span style={{ fontSize: '24px', flexShrink: 0 }}>{q.icon}</span>
                    <span style={{ lineHeight: '1.3', flex: 1 }}>{q.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <Bot size={48} className="welcome-icon" />
              <h2 className="welcome-title">
                {currentSpecialty.icon} {currentSpecialty.name}
              </h2>
              <p className="welcome-text">
                Click above to see quick questions or type your own!
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
                  <div className="message-content">
                    {message.content}
                    
                    {message.role === 'assistant' && (
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginTop: '10px',
                        flexWrap: 'wrap'
                      }}>
                        {voiceEnabled && (
                          <button
                            onClick={() => speak(message.content)}
                            style={{
                              padding: '6px 12px',
                              background: '#8b5cf6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              minHeight: '32px',
                              fontWeight: '600'
                            }}
                          >
                            <Volume2 size={14} />
                            Play
                          </button>
                        )}
                        
                        <button
                          onClick={() => shareToWhatsApp(message.content)}
                          style={{
                            padding: '6px 12px',
                            background: '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            minHeight: '32px',
                            fontWeight: '600'
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>💬</span>
                          Share
                        </button>
                        
                        <button
                          onClick={(e) => copyToClipboard(message.content, e)}
                          style={{
                            padding: '6px 12px',
                            background: '#6B7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            minHeight: '32px',
                            fontWeight: '600'
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>📋</span>
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message message-assistant">
                  <div className="message-icon">
                    <Bot size={20} />
                  </div>
                  <div className="message-content">
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#667eea'
                    }}>
                      <Loader2 size={20} style={{ 
                        animation: 'spin 1s linear infinite'
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>
                          {(() => {
                            const messages = [
                              '💡 Drink 8 glasses of water daily',
                              '🦟 Sleep under a mosquito net',
                              '🇳🇬 Abeg wait small, I dey check am',
                              '💊 Always complete your medication',
                              '🧼 Wash your hands frequently',
                              '🔍 Make I check wetin fit help you',
                              '🍎 Eat fruits and vegetables daily',
                              '⏳ I dey find answer for you now',
                            ];
                            return messages[Math.floor(Math.random() * messages.length)];
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div style={{
            padding: '10px 16px',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button
              onClick={clearCurrentChat}
              style={{
                padding: '8px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                minHeight: '36px'
              }}
            >
              ↺ Clear Chat
            </button>
          </div>
        )}

        <div className="input-container">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            style={{
              padding: '12px',
              background: isListening ? '#ef4444' : '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              minWidth: '48px',
              minHeight: '48px'
            }}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Listening..." : "Type or speak..."}
            className="input-textarea"
            rows={1}
            disabled={isLoading || isListening}
            style={{
              fontSize: '14px',
              padding: '12px',
              minHeight: '48px'
            }}
          />
          
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="send-button"
            style={{
              minWidth: '48px',
              minHeight: '48px',
              padding: '12px'
            }}
          >
            <Send size={20} />
          </button>
        </div>

        <div className="disclaimer">
          <p style={{ fontSize: '12px', margin: 0 }}>
            ⚠️ AI assistant. Consult healthcare professionals. Emergency? Call 112!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes gradientSlide {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default VoiceHealthAdvisor;
