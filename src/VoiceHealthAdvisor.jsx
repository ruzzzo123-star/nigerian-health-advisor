import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Heart, Loader2, Mic, MicOff, Volume2, VolumeX, Phone, WifiOff, RefreshCw } from 'lucide-react';
import './App.css';

const SPECIALTIES = [
  { id: 'general', name: 'General Health', icon: '🏥', color: 'bg-blue-500' },
  { id: 'malaria', name: 'Malaria & Typhoid', icon: '🦟', color: 'bg-orange-500' },
  { id: 'maternal', name: 'Maternal Health', icon: '🤰', color: 'bg-pink-500' },
  { id: 'nutrition', name: 'Nutrition', icon: '🥗', color: 'bg-green-500' },
  { id: 'child', name: 'Child Health', icon: '👶', color: 'bg-yellow-500' },
  { id: 'mental', name: 'Mental Health', icon: '🧠', color: 'bg-purple-500' },
];

const EMERGENCY_CONTACTS = {
  'Lagos': { emergency: '767 / 112', ambulance: '08023147654', lasema: '767' },
  'Abuja': { emergency: '112', ambulance: '08037245625' },
  'General': { emergency: '112', ncdc: '0800-9700-0010' }
};

const FAQ_QUESTIONS = [
  { icon: '🦟', text: 'Treat malaria?', query: 'How can I treat malaria in Nigeria?' },
  { icon: '🤒', text: 'Typhoid symptoms?', query: 'What are the symptoms of typhoid fever?' },
  { icon: '🤧', text: 'Common cold?', query: 'How do I treat common cold and flu?' },
  { icon: '🏥', text: 'Find hospital?', query: 'How do I find the nearest hospital in Nigeria?' },
  { icon: '💊', text: 'Buy medicines?', query: 'Where can I buy affordable medications in Nigeria?' },
  { icon: '🆘', text: 'Emergency help?', query: 'What are the emergency numbers in Nigeria?' },
  { icon: '🤰', text: 'Pregnancy care?', query: 'What are important pregnancy care tips in Nigeria?' },
  { icon: '👶', text: 'Baby vaccines?', query: 'What vaccines does my baby need in Nigeria?' },
  { icon: '🩺', text: 'High BP?', query: 'How do I manage high blood pressure in Nigeria?' },
  { icon: '🤕', text: 'Headache relief?', query: 'How can I treat severe headaches?' },
  { icon: '🌡️', text: 'High fever?', query: 'What should I do if I have high fever?' },
  { icon: '💉', text: 'Adult vaccines?', query: 'What vaccines do adults need in Nigeria?' },
];

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
  const [showFAQ, setShowFAQ] = useState(false);
  const [error, setError] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  
  const [voiceRate, setVoiceRate] = useState(0.92);
  const [voicePitch, setVoicePitch] = useState(1.12);
  const [selectedVoiceName, setSelectedVoiceName] = useState('auto');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Location state
const [userLocation, setUserLocation] = useState(null);
const [detectedCity, setDetectedCity] = useState(null);
const [locationPermission, setLocationPermission] = useState('pending'); // pending, granted, denied
const [locationEnabled, setLocationEnabled] = useState(false); // Start disabled 
// PWA Install prompt
const [deferredPrompt, setDeferredPrompt] = useState(null);
const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
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

// Detect user location - only when enabled
useEffect(() => {
  if (!locationEnabled) return; // Don't run if disabled
  
  const detectLocation = async () => {
    // First try HTML5 Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lon: longitude });
          setLocationPermission('granted');
          
          // Reverse geocode to get city
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
          // Fallback: Try to detect from IP
          detectFromIP();
        },
        {
          timeout: 10000,
          enableHighAccuracy: false
        }
      );
    } else {
      // Fallback to IP-based detection
      detectFromIP();
    }
  };

  const detectFromIP = async () => {
    try {
      // Using ipapi.co - free tier, no API key needed
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      setDetectedCity(data.city);
      setUserLocation({ lat: data.latitude, lon: data.longitude });
      console.log('🌐 Detected from IP:', data.city);
    } catch (error) {
      console.error('IP detection failed:', error);
      setDetectedCity('Nigeria'); // Fallback
    }
  };

detectLocation();
}, [locationEnabled]); // Add this dependency!
// PWA Install prompt handler
useEffect(() => {
  const handler = (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
    setShowInstallPrompt(true);
  };
  
  window.addEventListener('beforeinstallprompt', handler);
  
  return () => {
    window.removeEventListener('beforeinstallprompt', handler);
  };
}, []);

const handleInstallClick = async () => {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    console.log('✅ User accepted install');
  }
  
  setDeferredPrompt(null);
  setShowInstallPrompt(false);
};
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
        
        if (handsFreeMode) {
          setTimeout(() => sendMessage(transcript), 500);
        }
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
  }, [handsFreeMode]);

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
      
      if (handsFreeMode && !isLoading) {
        setTimeout(() => startListening(), 1000);
      }
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

  const toggleHandsFreeMode = () => {
    const newMode = !handsFreeMode;
    setHandsFreeMode(newMode);
    
    if (newMode) {
      setVoiceEnabled(true);
      startListening();
    } else {
      stopListening();
      stopSpeaking();
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
    if (handsFreeMode) {
      setHandsFreeMode(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="header-content">
            <Heart className="header-icon" />
            <h1 className="header-title">🎤 Voice Health Advisor</h1>
          </div>
          <p className="header-subtitle">Your Nigerian health companion</p>
        </div>

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
{/* Location Toggle Button */}
<div style={{
  background: '#f9fafb',
  padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap'
}}>
  <button
    onClick={() => setLocationEnabled(!locationEnabled)}
    style={{
      padding: '10px 20px',
      background: locationEnabled ? '#22c55e' : '#9ca3af',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minHeight: '44px',
      transition: 'all 0.2s'
    }}
  >
    <span style={{ fontSize: '18px' }}>📍</span>
    <span>Location {locationEnabled ? 'ON' : 'OFF'}</span>
  </button>
  
  {detectedCity && locationEnabled && (
    <div style={{
      padding: '8px 16px',
      background: '#dcfce7',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#15803d',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <span>📍</span>
      <span>{detectedCity}, Nigeria</span>
    </div>
  )}
  
  {!locationEnabled && (
    <span style={{
      fontSize: '12px',
      color: '#6b7280',
      maxWidth: '400px',
      textAlign: 'center'
    }}>
      Enable location for personalized emergency numbers & health advice
    </span>
  )}
</div>
{/* Location Badge */}
{detectedCity && (
  <div style={{
    background: '#f0fdf4',
    padding: '10px 16px',
    borderBottom: '1px solid #86efac',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px'
  }}>
    <span style={{ fontSize: '16px' }}>📍</span>
    <span style={{ fontSize: '13px', color: '#15803d', fontWeight: '600' }}>
      Detected: {detectedCity}, Nigeria
    </span>
    {locationPermission === 'denied' && (
      <span style={{ 
        fontSize: '11px', 
        color: '#6b7280',
        marginLeft: '4px'
      }}>
        (approximate)
      </span>
    )}
  </div>
)}
        <div style={{
          background: handsFreeMode ? '#dcfce7' : '#f3f4f6',
          padding: '16px',
          borderBottom: '2px solid ' + (handsFreeMode ? '#22c55e' : '#e5e7eb'),
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={toggleHandsFreeMode}
            style={{
              padding: '12px 24px',
              background: handsFreeMode ? '#22c55e' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px',
              minHeight: '48px'
            }}
          >
            <Phone size={20} />
            {handsFreeMode ? '🔴 End Call Mode' : '📞 Call Mode'}
          </button>

          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) stopSpeaking();
            }}
            style={{
              padding: '12px 24px',
              background: voiceEnabled ? '#8b5cf6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px',
              minHeight: '48px'
            }}
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            Voice {voiceEnabled ? 'ON' : 'OFF'}
          </button>

          {isListening && (
            <div style={{
              padding: '12px 24px',
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px',
              animation: 'pulse 1.5s infinite',
              minHeight: '48px'
            }}>
              <Mic size={20} />
              Listening...
            </div>
          )}

          {isSpeaking && (
            <div style={{
              padding: '12px 24px',
              background: '#dbeafe',
              color: '#2563eb',
              borderRadius: '8px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px',
              minHeight: '48px'
            }}>
              <Volume2 size={20} />
              Speaking...
            </div>
          )}
        </div>

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

{showInstallPrompt && (
  <div style={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '14px 18px',
    borderBottom: '2px solid #764ba2',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    animation: 'slideDown 0.3s ease-out'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
      <span style={{ fontSize: '24px' }}>📱</span>
      <span style={{ fontSize: '14px', color: 'white', fontWeight: '600' }}>
        Install app for faster access & offline use!
      </span>
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={() => setShowInstallPrompt(false)}
        style={{
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: '1px solid white',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          minHeight: '40px'
        }}
      >
        Later
      </button>
      <button
        onClick={handleInstallClick}
        style={{
          padding: '8px 20px',
          background: 'white',
          color: '#667eea',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          minHeight: '40px'
        }}
      >
        Install
      </button>
    </div>
  </div>
)}

{/* iOS Install Instructions - Dismissible */}
{messages.length === 0 && 
 /iPad|iPhone|iPod/.test(navigator.userAgent) && 
 !localStorage.getItem('ios-banner-dismissed') && (
  <div style={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '14px 18px',
    borderBottom: '2px solid #764ba2',
    animation: 'slideDown 0.3s ease-out'
  }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      justifyContent: 'space-between',
      gap: '12px', 
      color: 'white' 
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
        <span style={{ fontSize: '28px', flexShrink: 0 }}>📱</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>
            Install This App!
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.5', opacity: 0.95 }}>
            Tap <strong style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: '2px 6px', 
              borderRadius: '4px' 
            }}>Share ⬆️</strong> button below, then tap <strong style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: '2px 6px', 
              borderRadius: '4px' 
            }}>"Add to Home Screen"</strong>
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          localStorage.setItem('ios-banner-dismissed', 'true');
          setMessages([...messages]);
        }}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px 8px',
          lineHeight: '1',
          borderRadius: '4px',
          minWidth: '32px',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        aria-label="Dismiss install banner"
      >
        ✕
      </button>
    </div>
  </div>
)}
        {voiceEnabled && (
          <div style={{
            background: '#f9fafb',
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              style={{
                padding: '10px 20px',
                background: showVoiceSettings ? '#667eea' : 'white',
                color: showVoiceSettings ? 'white' : '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                minHeight: '44px'
              }}
            >
              🎛️ {showVoiceSettings ? 'Hide Voice Settings' : 'Voice Settings'}
            </button>
          </div>
        )}

        {voiceEnabled && showVoiceSettings && (
          <div style={{
            background: '#f9fafb',
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: 0 }}>
                🎛️ Customize Voice
              </h3>
              
              {availableVoices.length > 0 && (
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Voice:
                  </label>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '2px solid #e5e7eb',
                      fontSize: '14px',
                      cursor: 'pointer',
                      minHeight: '44px'
                    }}
                  >
                    <option value="auto">🎙️ Auto (Best Available)</option>
                    {availableVoices.map(voice => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
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
                  style={{ width: '100%', cursor: 'pointer', minHeight: '32px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </div>
              </div>
              
              <div>
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
                  style={{ width: '100%', cursor: 'pointer', minHeight: '32px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  <span>Deeper</span>
                  <span>Normal</span>
                  <span>Higher</span>
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                  Quick Presets:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => { setVoiceRate(0.92); setVoicePitch(1.15); }}
                    style={{ padding: '8px 14px', background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', minHeight: '40px' }}>
                    👩 Warm Female
                  </button>
                  <button onClick={() => { setVoiceRate(0.90); setVoicePitch(0.85); }}
                    style={{ padding: '8px 14px', background: '#dbeafe', border: '2px solid #60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', minHeight: '40px' }}>
                    👨 Professional Male
                  </button>
                  <button onClick={() => { setVoiceRate(0.95); setVoicePitch(1.0); }}
                    style={{ padding: '8px 14px', background: '#e0e7ff', border: '2px solid #818cf8', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', minHeight: '40px' }}>
                    🎯 Clear & Neutral
                  </button>
                  <button onClick={() => { setVoiceRate(1.05); setVoicePitch(1.25); }}
                    style={{ padding: '8px 14px', background: '#fce7f3', border: '2px solid #f472b6', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', minHeight: '40px' }}>
                    😊 Friendly & Upbeat
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => speak("Hello! This is how I sound with your current settings.")}
                style={{
                  padding: '10px 18px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginTop: '4px',
                  minHeight: '44px'
                }}
              >
                🔊 Test Voice
              </button>
              
              <button
                onClick={() => {
                  setVoiceRate(0.92);
                  setVoicePitch(1.12);
                  setSelectedVoiceName('auto');
                }}
                style={{
                  padding: '8px 14px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  minHeight: '40px'
                }}
              >
                ↺ Reset to Default
              </button>
            </div>
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
          return 'Emergency? Lagos: 767 / 112 | Ambulance: 08023147654';
        } else if (cityName.includes('abuja')) {
          return 'Emergency? Abuja: 112 | Ambulance: 08037245625';
        } else {
          return 'Emergency? Call 112 | NCDC: 0800-9700-0010';
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
      minHeight: '40px'
    }}
  >
    {showEmergency ? 'Hide' : 'Show'}
  </button>
</div>

{showEmergency && (
  <div style={{
    background: '#fef2f2',
    padding: '16px',
    borderBottom: '1px solid #fecaca',
    fontSize: '14px'
  }}>
    {(() => {
      const cityName = detectedCity?.toLowerCase() || '';
      
      if (cityName.includes('lagos')) {
        return (
          <>
            <div><strong>📍 Lagos Emergency Numbers:</strong></div>
            <div>Emergency: 767 / 112</div>
            <div>Ambulance: 08023147654</div>
            <div>LASEMA: 767</div>
            <div>NCDC: 0800-9700-0010</div>
          </>
        );
      } else if (cityName.includes('abuja')) {
        return (
          <>
            <div><strong>📍 Abuja Emergency Numbers:</strong></div>
            <div>Emergency: 112</div>
            <div>Ambulance: 08037245625</div>
            <div>NCDC: 0800-9700-0010</div>
          </>
        );
      } else {
        return (
          <>
            <div><strong>📍 Nigeria Emergency Numbers:</strong></div>
            <div>Emergency: 112 (National)</div>
            <div>NCDC: 0800-9700-0010</div>
            <div>Lagos: 767</div>
            <div>For your city-specific numbers, search "{detectedCity || 'your city'} emergency numbers"</div>
          </>
        );
      }
    })()}
  </div>
)}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          padding: '14px',
          background: '#f9fafb',
          borderBottom: '2px solid #e5e7eb',
          overflowX: 'visible'
        }}>
          {SPECIALTIES.map((specialty) => (
            <button
              key={specialty.id}
              onClick={() => {
                setSelectedSpecialty(specialty.id);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '14px 10px',
                border: selectedSpecialty === specialty.id ? '2px solid #667eea' : '2px solid #e5e7eb',
                background: selectedSpecialty === specialty.id 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'white',
                color: selectedSpecialty === specialty.id ? 'white' : '#374151',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '13px',
                fontWeight: '600',
                minHeight: '80px'
              }}
            >
              <span style={{ fontSize: '28px' }}>{specialty.icon}</span>
              <span style={{ 
                fontSize: '12px', 
                textAlign: 'center',
                lineHeight: '1.3',
                wordBreak: 'break-word'
              }}>
                {specialty.name}
              </span>
            </button>
          ))}
        </div>

        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <Bot size={48} className="welcome-icon" />
              <h2 className="welcome-title">
                {handsFreeMode ? '📞 I dey listen...' : '🎤 Speak or Type Your Question'}
              </h2>
              <p className="welcome-text">
                {handsFreeMode 
                  ? 'Just talk! I go respond with voice automatically.'
                  : 'Click the microphone or type your health question!'}
              </p>

              <div style={{
                marginTop: '24px',
                width: '100%',
                maxWidth: '100%',
                padding: '0 10px'
              }}>
                <button
                  onClick={() => setShowFAQ(!showFAQ)}
                  style={{
                    width: '100%',
                    maxWidth: '500px',
                    margin: '0 auto',
                    padding: '16px 24px',
                    background: showFAQ ? '#667eea' : 'white',
                    color: showFAQ ? 'white' : '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s',
                    boxShadow: showFAQ ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
                    minHeight: '56px'
                  }}
                  onMouseEnter={(e) => {
                    if (!showFAQ) {
                      e.currentTarget.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showFAQ) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <span style={{ fontSize: '24px' }}>💬</span>
                  <span>{showFAQ ? '🔽 Hide Quick Questions' : '▶️ Show Quick Questions'}</span>
                </button>

                {showFAQ && (
                  <div style={{
                    marginTop: '16px',
                    animation: 'slideDown 0.3s ease-out'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '14px',
                      textAlign: 'center'
                    }}>
                      Popular Health Questions:
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: window.innerWidth < 640 ? '1fr' : 'repeat(2, 1fr)',
                      gap: '10px',
                      maxWidth: '500px',
                      margin: '0 auto'
                    }}>
                      {FAQ_QUESTIONS.map((faq, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setInput(faq.query);
                            sendMessage(faq.query);
                            setShowFAQ(false);
                          }}
                          style={{
                            padding: '14px',
                            background: 'white',
                            border: '2px solid #e5e7eb',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151',
                            minHeight: '68px',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                            e.currentTarget.style.borderColor = '#667eea';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          <span style={{ fontSize: '32px', flexShrink: 0 }}>{faq.icon}</span>
                          <span style={{ lineHeight: '1.4', flex: 1 }}>{faq.text}</span>
                        </button>
                      ))}
                    </div>

                    <p style={{
                      fontSize: '13px',
                      color: '#9ca3af',
                      marginTop: '18px',
                      textAlign: 'center'
                    }}>
                      👆 Tap a question above or type your own below!
                    </p>
                  </div>
                )}
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
                  <div className="message-content">
                    {message.content}
                    {message.role === 'assistant' && voiceEnabled && (
                      <button
                        onClick={() => speak(message.content)}
                        style={{
                          marginTop: '10px',
                          padding: '6px 14px',
                          background: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          minHeight: '36px'
                        }}
                      >
                        <Volume2 size={16} />
                        Play Again
                      </button>
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
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                          {(() => {
                            const healthTips = [
                              '💡 Drink 8 glasses of water daily',
                              '🦟 Sleep under a mosquito net',
                              '🏥 Keep emergency numbers saved',
                              '💊 Always complete your medication',
                              '🧼 Wash your hands frequently',
                              '🌡️ Check your temperature regularly',
                              '🍎 Eat fruits and vegetables daily',
                              '😴 Get 7-8 hours of sleep',
                              '🚶 Exercise for 30 minutes daily',
                              '📞 Call 112 for emergencies',
                              '💉 Stay up to date with vaccines',
                              '🥤 Avoid sugary drinks',
                              '🍲 Eat balanced Nigerian meals',
                              '🌞 Get some sunlight every day',
                              '🧘 Take time to rest and relax'
                            ];

                            const nigerianPidgin = [
                              '🇳🇬 Abeg wait small, I dey check am',
                              '🔍 Make I check wetin fit help you',
                              '⏳ I dey find answer for you now',
                              '🤔 One moment, I dey think am',
                              '💭 I dey reason the matter well well',
                              '🧠 Make I use my brain check am',
                              '📚 I dey look for better answer',
                              '✨ E go clear for you now now',
                              '🎯 I wan give you correct answer',
                              '💪 Make I find the best advice',
                              '🙏 Small time, answer dey come',
                              '⚡ I go answer you sharp sharp',
                              '🔥 I dey prepare correct gist for you',
                              '👌 E go make sense, just wait',
                              '🌟 Your answer dey come, no worry'
                            ];

                            const allMessages = [...healthTips, ...nigerianPidgin];
                            const randomMessage = allMessages[Math.floor(Math.random() * allMessages.length)];
                            
                            return randomMessage;
                          })()}
                        </span>
                        <span style={{ 
                          fontSize: '20px',
                          display: 'inline-flex',
                          gap: '2px',
                          letterSpacing: '2px'
                        }}>
                          <span style={{ animation: 'dot1 1.4s infinite' }}>.</span>
                          <span style={{ animation: 'dot2 1.4s infinite' }}>.</span>
                          <span style={{ animation: 'dot3 1.4s infinite' }}>.</span>
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
            padding: '14px 18px',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <button
              onClick={clearCurrentChat}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                minHeight: '48px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5568d3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#667eea';
              }}
            >
              ↺ Clear Chat
            </button>
          </div>
        )}

        <div className="input-container">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading || handsFreeMode}
            style={{
              padding: '14px',
              background: isListening ? '#ef4444' : '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: handsFreeMode ? 'not-allowed' : 'pointer',
              opacity: handsFreeMode ? 0.5 : 1,
              minWidth: '52px',
              minHeight: '52px'
            }}
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Listening..." : "Type or speak your question..."}
            className="input-textarea"
            rows={1}
            disabled={isLoading || isListening}
            style={{
              fontSize: '15px',
              padding: '14px',
              minHeight: '52px'
            }}
          />
          
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="send-button"
            style={{
              minWidth: '52px',
              minHeight: '52px',
              padding: '14px'
            }}
          >
            <Send size={22} />
          </button>
        </div>

        <div className="disclaimer">
          <p>
            ⚠️ AI assistant. Always consult healthcare professionals for medical advice. Emergency? Call 112!
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
        
        @keyframes dot1 {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
        
        @keyframes dot2 {
          0%, 80%, 100% { opacity: 0; }
          60% { opacity: 1; }
        }
        
        @keyframes dot3 {
          0%, 80%, 100% { opacity: 0; }
          80% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default VoiceHealthAdvisor;