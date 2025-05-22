import { useState, useRef, useCallback, FormEvent } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize'; // safer than rehypeRaw
import { nanoid } from 'nanoid';

type Role = 'user' | 'assistant';
interface ChatMessage { id: string; role: Role; content: string }
interface ChatResponse { reply: string }

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const sendMessage = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || pending) return;
      const userMsg: ChatMessage = { id: nanoid(), role: 'user', content: input };
      setMessages((m) => [...m, userMsg]);
      setInput('');
      setPending(true);

      try {
        const { data } = await axios.post<ChatResponse>(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
          message: input,
          context: messages, // <-- optional: pass full history
        });
        const botMsg: ChatMessage = { id: nanoid(), role: 'assistant', content: data.reply };
        setMessages((m) => [...m, botMsg]);
      } catch (err: any) {
        const msg = err.response?.data?.error ?? 'Unexpected error – please retry.';
        setMessages((m) => [
          ...m,
          { id: nanoid(), role: 'assistant', content: `❌ ${msg}` },
        ]);
      } finally {
        setPending(false);
        scrollToBottom();
      }
    },
    [input, messages, pending]
  );

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">💬 Chat with IOAYO Assistant</h1>

      <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded shadow h-[60vh] overflow-y-auto">
        {messages.map(({ id, role, content }) => (
          <div
            key={id}
            className={`p-3 rounded ${role === 'user' ? 'bg-purple-100 text-right' : 'bg-gray-100'}`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {content}
            </ReactMarkdown>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          aria-label="Chat input"
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={pending}
        >
          {pending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
