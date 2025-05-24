// File: pages/api/chat.ts
import OpenAI from "openai";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const { messages } = await req.json();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

  const stream = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0125",
    stream: true,
    messages,
  });

  const encoder = new TextEncoder();
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const token of stream) {
          const textChunk = token.choices[0].delta.content || "";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(textChunk)}\n\n`)
          );
        }
        controller.close();
      },
    }),
    { headers }
  );
}
