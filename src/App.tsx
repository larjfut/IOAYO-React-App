import { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const res = await axios.post('/api/chat', { message: input });
    setMessages([
      ...messages,
      { role: 'user', content: input },
      { role: 'assistant', content: res.data.reply }
    ]);
    setInput('');
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">💬 Chat with IOAYO Assistant</h1>
      <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded shadow">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded ${m.role === 'user' ? 'bg-purple-100 text-right' : 'bg-gray-100 text-left'}`}>
            <ReactMarkdown children={m.content} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage} className="bg-purple-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
