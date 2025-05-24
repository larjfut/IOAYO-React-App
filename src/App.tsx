import { useState, useRef, useCallback, FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { nanoid } from 'nanoid';

type Role = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}


export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || pending) return;

      const userMsg: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content: input,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setPending(true);

      const botId = nanoid();
      try {
        setMessages((prev) => [
          ...prev,
          { id: botId, role: 'assistant', content: '' },
        ]);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input }),
        });

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let acc = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);
            if (chunk.startsWith('data:')) {
              const data = chunk.replace(/^data:\s*/, '');
              if (data === '[DONE]') {
                buffer = '';
                break;
              }
              try {
                const json = JSON.parse(data);
                const text = json.choices?.[0]?.delta?.content || '';
                if (text) {
                  acc += text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botId ? { ...m, content: acc } : m
                    )
                  );
                  scrollToBottom();
                }
              } catch {
                // ignore JSON parse errors
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (err: any) {
        const errText = err?.message ?? 'Unexpected error – please retry.';
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== botId),
          { id: nanoid(), role: 'assistant', content: `❌ ${errText}` },
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
      <h2 className="text-2xl font-bold mb-4">
        💬 Enter a zipcode, county or city to find services nearby.
      </h2>

      <div className="space-y-4 mb-6 bg-gray-50 p-4 rounded shadow h-[60vh] overflow-y-auto">
        {messages.map(({ id, role, content }) => (
          <div
            key={id}
            className={`p-3 rounded ${
              role === 'user' ? 'bg-purple-100 text-right' : 'bg-gray-100'
            }`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {content}
            </ReactMarkdown>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 items-center">
        <input
          aria-label="Chat input"
          className="flex-1 border rounded-lg p-3 text-lg w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button
          type="submit"
          className="bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
          disabled={pending}
        >
          {pending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
