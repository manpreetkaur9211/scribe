import { streamText } from 'ai'
import { z } from 'zod'
import { getBedrockProvider } from '@/lib/claude'
import { getDemoScriptByTemplate } from '@/lib/demo-scripts'
import { streamDemoNote } from '@/lib/demo-notes'
import { buildNotePrompt } from '@/lib/prompts'

export const runtime = 'edge'

const bodySchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters').max(5000),
  template: z.enum(['gp-note', 'specialist-referral', 'ed-triage']),
  mode: z.enum(['live', 'demo']).default('live'),
})

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ data: null, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { transcript, template, mode } = parsed.data
  if (mode === 'demo') {
    if (transcript.trim() !== getDemoScriptByTemplate(template).text.trim()) {
      return Response.json({ error: 'Let the full sample consultation finish before generating its note.' }, { status: 400 })
    }
    return streamDemoNote(template, request.signal)
  }
  const anthropic = getBedrockProvider()
  if (!anthropic) {
    return Response.json({ error: 'Live AI is unavailable. Choose Home, then Run Demo to try sample notes.' }, { status: 503 })
  }
  const prompt = buildNotePrompt(template, transcript)

  let result
  try {
    result = await streamText({
      model: anthropic('global.anthropic.claude-opus-4-6-v1'),
      prompt,
      maxOutputTokens: 1024,
    })
  } catch (err) {
    console.error('Live generation failed', err)
    const message = 'Live AI generation failed. Try again or choose Home, then Run Demo.'
    return Response.json({ data: null, error: message }, { status: 502 })
  }

  return result.toTextStreamResponse()
}
