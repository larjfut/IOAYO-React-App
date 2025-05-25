// File: api/chat.js  (Vercel edge runtime)
import OpenAI from 'openai';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { messages } = await req.json();                // ← now always an array
  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

  // Stream delta chunks
  const stream = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    stream: true,
    messages,
  });

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const token of stream) {
          const textChunk = token.choices[0]?.delta?.content || '';
          if (textChunk) {
            controller.enqueue(encoder.encode(`data: ${textChunk}\n\n`)); // plain text, no JSON
          }
        }
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    },
  );
}
