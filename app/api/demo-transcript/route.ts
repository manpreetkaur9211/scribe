import { z } from 'zod'
import { getDemoScript } from '@/lib/demo-scripts'
import type { DemoScriptId } from '@/types/workspace'

export const runtime = 'edge'

const querySchema = z.object({
  script: z.enum(['gp-chest-pain', 'specialist-cardio', 'ed-trauma']),
})

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const parsed = querySchema.safeParse({ script: url.searchParams.get('script') })

  if (!parsed.success) {
    return Response.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const script = getDemoScript(parsed.data.script as DemoScriptId)
  const words = script.text.split(' ')

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      for (const word of words) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'word', text: word + ' ' })}\n\n`)
        )
        await new Promise(resolve => setTimeout(resolve, 80))
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
