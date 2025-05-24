import { useState, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';

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
      setMessages((prev: ChatMessage[]) => [...prev, userMsg]);
      setInput('');
      setPending(true);

      const botId = nanoid();
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { id: botId, role: 'assistant', content: '' },
      ]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input }),
        });

        if (!res.body) {
          throw new Error('No response body');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finished = false;
        while (!finished) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const match = line.match(/^data:\s*(.*)/);
            if (!match) continue;
            const data = match[1].trim();
            if (data === '[DONE]') {
              finished = true;
              break;
            }
            try {
              const payload = JSON.parse(data);
              const text = payload.choices?.[0]?.delta?.content;
              if (text) {
                setMessages((prev: ChatMessage[]) =>
                  prev.map((m) =>
                    m.id === botId ? { ...m, content: m.content + text } : m
                  )
                );
              }
            } catch (err) {
              console.error('Stream parse error', err);
            }
          }
        }
      } catch (err: any) {
        const errText =
          err.response?.data?.error ?? err.message ?? 'Unexpected error – please retry.';
        setMessages((prev: ChatMessage[]) => [
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
        {messages.map(({ id, role, content }: ChatMessage) => (
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
          onChange={(e: any) => setInput(e.target.value)}
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
