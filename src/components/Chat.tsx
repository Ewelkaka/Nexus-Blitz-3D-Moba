import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export const Chat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState(`Player_${Math.floor(Math.random() * 1000)}`);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to the same host
    socketRef.current = io();

    socketRef.current.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg].slice(-50)); // Keep last 50 messages
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = () => {
    if (inputText.trim() && socketRef.current) {
      socketRef.current.emit('chat_message', {
        user: username,
        text: inputText.trim()
      });
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
    // Prevent game controls when typing
    e.stopPropagation();
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100] pointer-events-auto">
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 h-96 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-slate-200">Team Chat</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase ${msg.user === username ? 'text-blue-400' : 'text-emerald-400'}`}>
                        {msg.user}
                      </span>
                      <span className="text-[8px] text-slate-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 break-words">
                      {msg.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/30">
              <div className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-200"
                />
                <button
                  onClick={sendMessage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 text-white transition-all border border-blue-400/30"
          >
            <MessageSquare className="w-6 h-6" />
            {messages.length > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
