import React from 'react';
import { TrashIcon, HistoryIcon } from './Icons';

export interface Transcript {
  id: number;
  date: string;
  content: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: Transcript[];
  onView: (item: Transcript) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onView, onDelete, onClearAll }) => {
  if (!isOpen) return null;

  const handleClear = () => {
    if (window.confirm('Tem certeza de que deseja apagar todo o histórico? Esta ação não pode ser desfeita.')) {
        onClearAll();
    }
  }

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
            <HistoryIcon />
            Histórico de Transcrições
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>
        
        <div className="p-6 overflow-y-auto space-y-4 flex-grow">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <HistoryIcon />
                <p className="mt-2">Nenhuma transcrição salva ainda.</p>
            </div>
          ) : (
            history.map(item => (
              <div key={item.id} className="bg-gray-900 p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-colors hover:bg-gray-700">
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-gray-300">{item.date}</p>
                  <p className="text-sm text-gray-400 truncate">{item.content || "Transcrição vazia."}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                  <button onClick={() => onView(item)} className="px-4 py-2 text-sm font-bold bg-cyan-600 hover:bg-cyan-700 rounded-md transition-transform transform hover:scale-105">Ver</button>
                  <button onClick={() => onDelete(item.id)} className="p-2 bg-red-600 hover:bg-red-700 rounded-md transition-transform transform hover:scale-105"><TrashIcon /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <footer className="p-4 border-t border-gray-700 flex-shrink-0">
            <button
              onClick={handleClear}
              className="w-full px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-semibold rounded-lg transition-colors"
            >
              Limpar Todo o Histórico
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
