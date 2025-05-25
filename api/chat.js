// File: api/chat.js  (Vercel edge runtime)
import OpenAI from 'openai';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (!process.env.OPENAI_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing environment variable OPENAI_KEY' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const { messages } = await req.json();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

  // Stream delta chunks
  let stream;
  try {
    stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      stream: true,
      messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OpenAI API request failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const token of stream) {
          const textChunk = token.choices[0]?.delta?.content || '';
          if (textChunk) {
          controller.enqueue(encoder.encode(`:connected\n\n`));          }
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
// inside your ReadableStream.start()

// then for-await your OpenAI stream…
