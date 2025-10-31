
import React, { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { MicIcon, StopIcon, PauseIcon, PlayIcon, CopyIcon, HistoryIcon } from './components/Icons';
import { HistoryModal, Transcript } from './components/HistoryModal';


const App: React.FC = () => {
  const [finalContent, setFinalContent] = useState('');
  const [notification, setNotification] = useState('');
  const [selectedLang, setSelectedLang] = useState('pt-BR');
  const [history, setHistory] = useState<Transcript[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  const {
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
    isSupported,
  } = useSpeechRecognition();

  // Load history and auto-saved content from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('transcriptHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      const autoSavedContent = localStorage.getItem('autoSavedTranscript');
      if (autoSavedContent) {
        setFinalContent(autoSavedContent);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);
  
  // Auto-save edited content to localStorage with debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      if (finalContent) {
        localStorage.setItem('autoSavedTranscript', finalContent);
      } else {
        localStorage.removeItem('autoSavedTranscript');
      }
    }, 500); // Debounce time: 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [finalContent]);

  // Update finalContent and save to history when recording stops
  useEffect(() => {
    if (!isListening && finalTranscript) {
        setFinalContent(finalTranscript);

        const trimmedContent = finalTranscript.trim();
        const isAlreadySaved = history.some(item => item.content.trim() === trimmedContent);

        if (trimmedContent.length > 0 && !isAlreadySaved) {
            const newTranscript: Transcript = {
                id: Date.now(),
                date: new Date().toLocaleString('pt-BR'),
                content: trimmedContent,
            };
            
            setHistory(prevHistory => {
                const updatedHistory = [newTranscript, ...prevHistory];
                localStorage.setItem('transcriptHistory', JSON.stringify(updatedHistory));
                return updatedHistory;
            });
        }
    }
  }, [isListening, finalTranscript, history]); // Added history to dependency array

  const handleStartStop = () => {
    if (isListening) {
      stopListening();
    } else {
      setFinalContent('');
      startListening(selectedLang);
    }
  };
  
  const handlePauseResume = () => {
    if (isPaused) {
      resumeListening();
    } else {
      pauseListening();
    }
  };

  const handleCopy = () => {
    if (finalContent) {
      navigator.clipboard.writeText(finalContent);
      setNotification('Texto copiado para a área de transferência!');
      setTimeout(() => setNotification(''), 2000);
    }
  };

  // History action handlers
  const handleDeleteTranscript = (id: number) => {
    setHistory(prevHistory => {
        const updatedHistory = prevHistory.filter(item => item.id !== id);
        localStorage.setItem('transcriptHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('transcriptHistory');
  };

  const handleViewHistoryItem = (item: Transcript) => {
    setFinalContent(item.content);
    setIsHistoryVisible(false);
  };

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="p-8 bg-red-800 rounded-lg shadow-xl">
          <h1 className="text-2xl font-bold">Navegador não suportado</h1>
          <p className="mt-2">A API de Reconhecimento de Fala não é suportada por este navegador.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-3xl mx-auto bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
          <header className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Izy Transcription Live</h1>
            <p className="text-gray-400 mt-2">Sua voz, suas anotações. Transcrição em tempo real.</p>
          </header>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
              <strong className="font-bold">Ocorreu um erro: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-full sm:w-auto">
                  <label htmlFor="language-select" className="block mb-2 text-sm font-medium text-gray-400 text-center sm:text-left">Idioma:</label>
                  <select
                      id="language-select"
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      disabled={isListening}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (United States)</option>
                      <option value="es-ES">Español (España)</option>
                      <option value="fr-FR">Français (France)</option>
                      <option value="de-DE">Deutsch (Deutschland)</option>
                      <option value="ja-JP">日本語 (日本)</option>
                      <option value="it-IT">Italiano (Italia)</option>
                      <option value="ru-RU">Русский (Россия)</option>
                  </select>
              </div>
              <div className="w-full sm:w-auto self-center">
                <label className="block mb-2 text-sm font-medium text-gray-400 opacity-0 hidden sm:block">Histórico</label>
                <button
                    onClick={() => setIsHistoryVisible(true)}
                    disabled={isListening}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 font-semibold rounded-lg shadow-md bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-gray-500 transition-all transform hover:scale-105 disabled:transform-none"
                    >
                    <HistoryIcon />
                    Histórico
                </button>
              </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
              <button
                  id="btnGravar"
                  onClick={handleStartStop}
                  className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 ${
                  isListening
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500'
                  }`}
              >
                  {isListening ? <StopIcon /> : <MicIcon />}
                  <span>{isListening ? 'Parar Transcrição' : 'Começar Transcrição'}</span>
              </button>

              {isListening && (
                  <button
                  id="btnPausar"
                  onClick={handlePauseResume}
                  className="flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg shadow-md bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-4 focus:ring-yellow-400 transition-transform transform hover:scale-105"
                  >
                  {isPaused ? <PlayIcon /> : <PauseIcon />}
                  <span>{isPaused ? 'Retomar' : 'Pausar'}</span>
                  </button>
              )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="divLive" className="block text-sm font-medium text-gray-400 mb-2">
                Transcrição ao Vivo
              </label>
              <div
                id="divLive"
                className="w-full min-h-[120px] bg-gray-900 rounded-lg p-4 border border-gray-700 transition-all duration-300 relative"
              >
                {isListening && !isPaused && (
                  <span className="absolute top-3 right-3 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className={`relative inline-flex rounded-full h-3 w-3 bg-red-500 transition-transform duration-200 ${isSpeaking ? 'scale-150' : 'scale-100'}`}></span>
                  </span>
                )}
                <p className="text-gray-300">{liveTranscript || finalContent}</p>
                {isPaused && <p className="text-yellow-400 italic mt-2">Pausado...</p>}
                {!isListening && !finalContent && <p className="text-gray-500">Aguardando áudio...</p>}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                  <label htmlFor="txtFinal" className="block text-sm font-medium text-gray-400">
                  Documento Editável
                  </label>
                  <button
                      id="btnCopiar"
                      onClick={handleCopy}
                      disabled={!finalContent}
                      className="flex items-center gap-2 text-sm px-4 py-2 font-semibold rounded-lg shadow-md bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-green-500 transition-all transform hover:scale-105 disabled:transform-none"
                      >
                      <CopyIcon />
                      Copiar
                  </button>
              </div>
              <textarea
                id="txtFinal"
                value={finalContent}
                onChange={(e) => setFinalContent(e.target.value)}
                className="w-full min-h-[200px] bg-gray-900 rounded-lg p-4 border border-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                placeholder="O texto final consolidado aparecerá aqui após parar a transcrição."
              />
              {notification && (
                  <div className="mt-2 text-center text-sm text-green-400 animate-pulse">
                      {notification}
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <HistoryModal
        isOpen={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        history={history}
        onView={handleViewHistoryItem}
        onDelete={handleDeleteTranscript}
        onClearAll={handleClearHistory}
      />
    </>
  );
};

export default App;