import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Square, Sparkles } from 'lucide-react';

export default function VoiceInputBar({ 
  onSendMessage, 
  isLoading, 
  isTtsEnabled, 
  onToggleTts 
}) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
        if (transcript.trim()) {
          onSendMessage(transcript.trim());
          setInputText('');
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition warning:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [onSendMessage]);

  const toggleRecording = () => {
    if (!speechSupported) {
      alert('Speech Recognition is not supported by this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        if (recognitionRef.current) recognitionRef.current.start();
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="p-4 bg-slate-950/80 border-t border-white/10 flex flex-col gap-2.5">
      {/* Active Voice Waveform Indicator */}
      {isRecording && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-semibold animate-fade-in shadow-lg shadow-red-900/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-1 bg-red-400 rounded-full animate-soundwave h-4" />
              <div className="w-1 bg-red-400 rounded-full animate-soundwave h-6 delay-75" />
              <div className="w-1 bg-red-400 rounded-full animate-soundwave h-3 delay-150" />
              <div className="w-1 bg-red-400 rounded-full animate-soundwave h-5 delay-200" />
            </div>
            <span>Listening to your voice... Speak your symptoms</span>
          </div>

          <button
            type="button"
            onClick={toggleRecording}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      )}

      {/* Input Action Controls */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        {/* Microphone Button */}
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isLoading}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
            isRecording
              ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse'
              : 'bg-slate-900/90 border-white/10 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 hover:bg-slate-800'
          }`}
          title={speechSupported ? 'Click to speak (Voice Recognition)' : 'Voice not supported'}
        >
          {isRecording ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text-to-Speech Toggle */}
        <button
          type="button"
          onClick={onToggleTts}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
            isTtsEnabled
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'bg-slate-900/90 border-white/10 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title={isTtsEnabled ? 'Voice Output (TTS) Active — Click to mute' : 'Voice Output Muted — Click to unmute'}
        >
          {isTtsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* Text Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={isRecording ? 'Listening...' : 'Type vehicle symptoms or speak into mic (e.g. 2019 Camry brake squeal)...'}
            className="w-full bg-slate-900/90 border border-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all pr-10 shadow-inner"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="w-11 h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-40 disabled:hover:scale-100 hover:scale-105 active:scale-95"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
