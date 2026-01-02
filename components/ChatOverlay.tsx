
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, Language } from '../types';

interface ChatOverlayProps {
  user: User;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
  language?: Language;
}

const ChatOverlay: React.FC<ChatOverlayProps> = ({ user, messages, onSendMessage, onClose, language = 'pt' }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const t = {
    pt: {
      online: 'Online',
      type_message: 'Digite sua mensagem...',
      start_convo: (name: string) => `Comece uma conversa com ${name}`,
    },
    en: {
      online: 'Online',
      type_message: 'Type your message...',
      start_convo: (name: string) => `Start a conversation with ${name}`,
    }
  }[language];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-[70vh] sm:h-[500px] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <img src={user.avatar} className="w-10 h-10 rounded-full border border-indigo-500/50" alt="" />
            <div>
              <h3 className="text-sm font-bold text-white">{user.name}</h3>
              <p className="text-[10px] text-emerald-400 font-medium">{t.online}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-50 text-center">
              <i className="fas fa-comment-dots text-2xl"></i>
              <p className="text-xs italic px-6">{t.start_convo(user.name.split(' ')[0])}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderId === '1' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.senderId === '1' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.type_message}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatOverlay;
