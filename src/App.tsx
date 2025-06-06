// ─────────────────────────────────────────────────────────────
// File: src/App.tsx
// Working version with:
// • inferred <form> handler (no manual React.FormEvent annotation)
// • spinner that shows ANY time `pending` is true
// • pure Tailwind spinner (no external .loader class)
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import type React from 'react';
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

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const sendMessage = useCallback(
    e => {
      e.preventDefault();
      if (!input.trim() || pending) return;

      (async () => {
        // 1. optimistic user message
        const userMsg: ChatMessage = {
          id: nanoid(),
          role: 'user',
          content: input,
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setPending(true);

        // 2. placeholder assistant message
        const botId = nanoid();
        setMessages(prev => [
          ...prev,
          { id: botId, role: 'assistant', content: '' },
        ]);

        // 3. build OpenAI-compatible history
        const history = [...messages, userMsg].map(({ role, content }) => ({
          role,
          content,
        }));

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
          });

          if (!res.body) throw new Error('No response body');

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const match = line.match(/^data:\s*(.*)/);
              if (!match) continue;
              const text = match[1];
              if (text) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === botId
                      ? { ...m, content: m.content + text }
                      : m
                  )
                );
              }
            }
          }
        } catch (err: any) {
          const errText = err?.message ?? 'Unexpected error – please retry.';
          setMessages(prev => [
            ...prev.filter(m => m.id !== botId),
            {
              id: nanoid(),
              role: 'assistant',
              content: `❌ ${errText}`,
            },
          ]);
        } finally {
          setPending(false);
          scrollToBottom();
        }
      })();
    },
    [input, pending, messages]
  );

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <h2 className="text-2xl font-bold mb-4">
        💬 Enter a zipcode, county, or city to find services nearby.
      </h2>

      {/* chat window */}
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
              {content || (role === 'assistant' && pending && '🤖 Thinking…')}
            </ReactMarkdown>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* always-visible spinner while pending */}
      {pending && (
        <div className="flex items-center gap-3 text-gray-500 p-3 mb-4">
          <span className="h-5 w-5 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600" />
          <span>🤖 Thinking…</span>
        </div>
      )}

      {/* input */}
      <form onSubmit={sendMessage} className="flex gap-2 items-center">
        <input
          aria-label="Chat input"
          className="flex-1 border rounded-lg p-3 text-lg w-full"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          placeholder="Type a message…"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-purple-700 hover:bg-purple-800 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
        >
          {pending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
