import { useState, useRef, useCallback, FormEvent } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { nanoid } from 'nanoid';

type Role = 'user' | 'assistant';
interface ChatMessage { id: string; role: Role; content: string }
interface ChatResponse { reply: string }

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const sendMessage = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || pending) return;

      const userMsg: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content: input
      };
      setMessages((m) => [...m, userMsg]);
      setInput('');
      setPending(true);

      try {
        const { data } = await axios.post<ChatResponse>('/api/chat', {
          message: input
        });
        const botMsg: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: data.reply
        };
        setMessages((m) => [...m, botMsg]);
      } catch (err: any) {
        const errText =
          err.response?.data?.error ?? 'Unexpected error – please retry.';
        setMessages((m) => [
          ...m,
          { id: nanoid(), role: 'assistant', content: `❌ ${errText}` }
        ]);
      } finally {
        setPending(false);
        scrollToBottom();
      }
    },
    [input, pending]
  );

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">
        💬 Chat with IOAYO
