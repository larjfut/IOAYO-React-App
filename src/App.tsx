import { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', { message: input });
      setMessages([
        ...messages,
        { role: 'user', content: input },
        { role: 'assistant', content: res.data.reply }
      ]);
    } catch (err) {
      setMessages([
        ...messages,
        { role: 'user', content: input },
        { role: 'assistant', content: '❌ There was an error replying. Please try again.' }
      ]);
    }

    setInput('');
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">💬 Chat
