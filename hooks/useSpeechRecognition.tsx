import { useState, useEffect, useRef, useCallback } from 'react';

// Fix: Add type definitions for the Web Speech API to resolve TypeScript errors.
// These are not always included in standard DOM library typings.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

// Fix: Augment the Window interface to include properties for the Web Speech API.
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

// Polyfill for cross-browser compatibility
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

interface SpeechRecognitionHook {
  isListening: boolean;
  isPaused: boolean;
  isSpeaking: boolean;
  liveTranscript: string;
  finalTranscript: string;
  error: string | null;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  isSupported: boolean;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stopReasonRef = useRef<'user' | 'paused' | 'auto'>('auto');
  const speakingTimeoutRef = useRef<number | null>(null);

  // This ref holds the latest state, accessible inside callbacks without causing stale closures.
  const stateRef = useRef({ isListening, isPaused, liveTranscript, finalTranscript });
  useEffect(() => {
    stateRef.current = { isListening, isPaused, liveTranscript, finalTranscript };
  }, [isListening, isPaused, liveTranscript, finalTranscript]);


  const processResults = useCallback((event: SpeechRecognitionEvent) => {
    // Visual feedback: Indicate that speech is being processed
    setIsSpeaking(true);
    if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
    }
    speakingTimeoutRef.current = window.setTimeout(() => setIsSpeaking(false), 500);

    // Get the latest final transcript from the ref to build upon it.
    let final = stateRef.current.finalTranscript;
    let interim = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            final += transcript;
        } else {
            interim += transcript;
        }
    }
    
    // Update state with the new values. This is more performant than nested setters.
    setFinalTranscript(final);
    setLiveTranscript(final + interim);
  }, []);

  const handleEnd = useCallback(() => {
    setIsSpeaking(false);
    if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
    }
    
    const { isListening: isListeningNow, isPaused: isPausedNow, liveTranscript: liveTranscriptNow } = stateRef.current;
    
    // Only restart if the service stopped on its own AND we are in an active, unpaused listening state.
    if (stopReasonRef.current === 'auto' && isListeningNow && !isPausedNow) {
      recognitionRef.current?.start();
    } else {
      // For user-initiated stops or pauses, finalize the transcript.
      const finalVersion = liveTranscriptNow.trim();
      setFinalTranscript(finalVersion);
      setLiveTranscript(finalVersion);
    }
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR'; // Default language

    recognition.onresult = processResults;
    recognition.onend = handleEnd;
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') {
        console.warn('Speech recognition service aborted.');
        return; // 'aborted' is often not a critical error, so we can ignore it.
      }
      
      const errorMessages: { [key: string]: string } = {
        'no-speech': 'Nenhum som foi detectado. Verifique se seu microfone está funcionando.',
        'audio-capture': 'Falha ao capturar áudio. O microfone está sendo usado por outro aplicativo?',
        'not-allowed': 'Permissão para usar o microfone foi negada ou bloqueada.',
        'network': 'Ocorreu um erro de rede. Verifique sua conexão com a internet.',
      };

      const errorMessage = errorMessages[event.error] || `Um erro inesperado ocorreu: ${event.error}`;
      setError(errorMessage);
      console.error('Speech recognition error:', event.error);
      
      // Stop everything on a critical error
      stopReasonRef.current = 'user';
      setIsListening(false);
      setIsPaused(false);
      setIsSpeaking(false);
    };

    return () => {
      recognition.stop();
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
    };
  }, [processResults, handleEnd]);

  const startListening = (lang: string = 'pt-BR') => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
    setError(null);
    setLiveTranscript('');
    setFinalTranscript('');
    setIsListening(true);
    setIsPaused(false);
    stopReasonRef.current = 'auto';
    recognitionRef.current?.start();
  };

  const stopListening = () => {
    stopReasonRef.current = 'user';
    setIsListening(false); // Update state immediately
    setIsPaused(false);
    recognitionRef.current?.stop();
  };
  
  const pauseListening = () => {
    stopReasonRef.current = 'paused';
    setIsPaused(true); // Update state immediately
    recognitionRef.current?.stop();
  };

  const resumeListening = () => {
    // Add a space to separate new text from the previously paused transcript.
    const trimmedFinal = stateRef.current.liveTranscript.trim();
    if(trimmedFinal){
        setFinalTranscript(trimmedFinal + ' ');
        setLiveTranscript(trimmedFinal + ' ');
    }

    stopReasonRef.current = 'auto';
    setIsPaused(false); // Update state immediately
    recognitionRef.current?.start();
  };

  return {
    isListening,
    isPaused,
    isSpeaking,
    liveTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    isSupported: !!SpeechRecognition,
  };
};