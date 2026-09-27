import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

import Header from './components/Header';
import IntakeProgressCard from './components/IntakeProgressCard';
import DiagnosticCard from './components/DiagnosticCard';
import SafetyAlertBanner from './components/SafetyAlertBanner';
import ChatMessage from './components/ChatMessage';
import QuickScenarios from './components/QuickScenarios';
import VoiceInputBar from './components/VoiceInputBar';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';

export default function App() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('car_agent_session_id') || null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: "Hello! Welcome to Precision AutoCare & Service Center. I'm Alex, your automated service advisor. How can I help with your vehicle today?",
      timestamp: new Date().toISOString(),
      safetyAlert: null
    }
  ]);
  
  const [customerProfile, setCustomerProfile] = useState({
    name: null,
    phone: null,
    vehicleModel: null,
    issueStartTime: null,
    complaint: null,
    mileage: null,
    drivableStatus: 'Unknown'
  });

  const [intake, setIntake] = useState({
    isComplete: false,
    missingFields: ['name', 'phone', 'vehicleModel', 'issueStartTime', 'complaint', 'mileage', 'drivableStatus'],
    completedFields: [],
    progressPercentage: 0
  });

  const [diagnosticContext, setDiagnosticContext] = useState({
    category: 'general',
    suggestedAction: 'Certified Multi-Point Vehicle Inspection & Diagnostic Scan',
    matchedKnowledge: []
  });

  const [safetyAlert, setSafetyAlert] = useState({
    isEmergency: false,
    level: 'NONE',
    advice: null
  });

  const [systemStatus, setSystemStatus] = useState('connecting');
  const [modelName, setModelName] = useState('AI Engine');
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isKbModalOpen, setIsKbModalOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const prevIntakeCompleteRef = useRef(false);

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial Health Check and Session Hydration
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'online') {
          setSystemStatus('online');
          setModelName(data.hasOpenAIKey ? data.model : 'Local Automotive Engine');
        }
      })
      .catch((err) => {
        setSystemStatus('offline');
        console.error('Health check failed:', err);
      });

    // Hydrate existing session if any
    const savedId = localStorage.getItem('car_agent_session_id');
    if (savedId) {
      fetch(`/api/session/${savedId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            const d = res.data;
            if (d.customerInfo) setCustomerProfile(d.customerInfo);
            if (d.messages && d.messages.length > 0) {
              setMessages(d.messages);
            }
            if (d.safetyStatus && d.safetyStatus.isEmergency) {
              setSafetyAlert({
                isEmergency: true,
                level: d.safetyStatus.level,
                advice: d.safetyStatus.lastAlert
              });
            }
            if (d.categoryIdentified) {
              setDiagnosticContext((prev) => ({
                ...prev,
                category: d.categoryIdentified,
                suggestedAction: d.suggestedServiceAction || prev.suggestedAction
              }));
            }
            const required = ['name', 'phone', 'vehicleModel', 'issueStartTime', 'complaint', 'mileage', 'drivableStatus'];
            const completed = required.filter((k) => d.customerInfo[k] && d.customerInfo[k] !== 'Unknown');
            setIntake({
              isComplete: d.intakeComplete,
              missingFields: d.missingFields || [],
              completedFields: completed,
              progressPercentage: Math.round((completed.length / 7) * 100)
            });
          }
        })
        .catch(console.warn);
    }
  }, []);

  // Trigger celebratory confetti when intake completes!
  useEffect(() => {
    if (intake.isComplete && !prevIntakeCompleteRef.current) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    prevIntakeCompleteRef.current = intake.isComplete;
  }, [intake.isComplete]);

  // Text to Speech
  const speakResponse = (text) => {
    if (!isTtsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    );
    if (naturalVoice) utterance.voice = naturalVoice;
    window.speechSynthesis.speak(utterance);
  };

  // Handle Send Message Flow
  const handleSendMessage = async (text) => {
    if (!text || text.trim() === '' || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId
        })
      });

      const result = await response.json();
      setIsLoading(false);

      if (result.success && result.data) {
        const data = result.data;
        setSessionId(data.sessionId);
        localStorage.setItem('car_agent_session_id', data.sessionId);

        const assistantMsg = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          safetyAlert: data.safetyAlert
        };

        setMessages((prev) => [...prev, assistantMsg]);
        speakResponse(data.reply);

        if (data.customerProfile) setCustomerProfile(data.customerProfile);
        if (data.intake) setIntake(data.intake);
        if (data.safetyAlert) setSafetyAlert(data.safetyAlert);
        if (data.diagnosticContext) setDiagnosticContext(data.diagnosticContext);
      } else {
        const errorMsg = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error: ${result.error || 'Unable to process your request.'}`,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Chat error:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Failed to connect to server. Please verify backend is running on port 5000.',
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  // Reset Session
  const handleResetSession = async () => {
    if (!window.confirm('Reset current service intake conversation and start a new session?')) return;
    setIsResetting(true);

    if (sessionId) {
      try {
        await fetch('/api/session/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
      } catch (e) {
        console.warn('Reset error:', e);
      }
    }

    localStorage.removeItem('car_agent_session_id');
    setSessionId(null);
    setCustomerProfile({
      name: null,
      phone: null,
      vehicleModel: null,
      issueStartTime: null,
      complaint: null,
      mileage: null,
      drivableStatus: 'Unknown'
    });
    setIntake({
      isComplete: false,
      missingFields: ['name', 'phone', 'vehicleModel', 'issueStartTime', 'complaint', 'mileage', 'drivableStatus'],
      completedFields: [],
      progressPercentage: 0
    });
    setSafetyAlert({
      isEmergency: false,
      level: 'NONE',
      advice: null
    });
    setDiagnosticContext({
      category: 'general',
      suggestedAction: 'Certified Multi-Point Vehicle Inspection & Diagnostic Scan',
      matchedKnowledge: []
    });
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: "Hello! Welcome to Precision AutoCare & Service Center. I'm Alex, your automated service advisor. How can I assist you with your vehicle today?",
        timestamp: new Date().toISOString(),
        safetyAlert: null
      }
    ]);
    setIsResetting(false);
  };

  // Export Work Order
  const handleExportJson = () => {
    const workOrder = {
      serviceCenter: 'Precision Auto Care & Service Center',
      exportedAt: new Date().toISOString(),
      sessionId,
      customerProfile,
      intakeStatus: intake,
      diagnosticSummary: diagnosticContext,
      safetyStatus: safetyAlert,
      messageCount: messages.length
    };

    const blob = new Blob([JSON.stringify(workOrder, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorkOrder_${customerProfile.name || 'Customer'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen max-w-[1680px] mx-auto w-full p-3 sm:p-5 gap-4 overflow-hidden">
      {/* Top Header */}
      <Header
        systemStatus={systemStatus}
        modelName={modelName}
        onOpenKnowledgeBase={() => setIsKbModalOpen(true)}
        onResetSession={handleResetSession}
        isResetting={isResetting}
      />

      {/* Main Dashboard Layout: Left Sidebar + Right Chat Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* LEFT COLUMN: HUD (Intake + Diagnostic + Safety) - 5 Cols on desktop */}
        <aside className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Safety Alert Banner */}
          <SafetyAlertBanner safetyAlert={safetyAlert} />

          {/* Customer Intake Progress */}
          <IntakeProgressCard
            customerProfile={customerProfile}
            intake={intake}
            onExportJson={handleExportJson}
          />

          {/* Diagnostic Triage */}
          <DiagnosticCard diagnosticContext={diagnosticContext} />
        </aside>

        {/* RIGHT COLUMN: Chat Console & Audio Voice Hub - 8 Cols on desktop */}
        <section className="lg:col-span-8 xl:col-span-8 flex flex-col glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          
          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSpeak={speakResponse}
              />
            ))}

            {/* Assistant Thinking Bubble */}
            {isLoading && (
              <div className="flex gap-3.5 max-w-[80%] self-start animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <span className="animate-spin text-sm">⚙️</span>
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-slate-900/80 border border-white/5 text-xs text-cyan-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Evaluating symptoms against mechanical knowledge base...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Scenario Prompts */}
          <QuickScenarios
            onSelectScenario={handleSendMessage}
            disabled={isLoading}
          />

          {/* Voice & Text Input Bar */}
          <VoiceInputBar
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isTtsEnabled={isTtsEnabled}
            onToggleTts={() => {
              const next = !isTtsEnabled;
              setIsTtsEnabled(next);
              if (!next && window.speechSynthesis) window.speechSynthesis.cancel();
            }}
          />
        </section>

      </div>

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={isKbModalOpen}
        onClose={() => setIsKbModalOpen(false)}
      />
    </div>
  );
}
