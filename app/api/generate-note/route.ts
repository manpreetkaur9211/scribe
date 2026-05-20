import { streamText } from 'ai'
import { z } from 'zod'
import { anthropic } from '@/lib/claude'
import { buildNotePrompt } from '@/lib/prompts'

export const runtime = 'edge'

const bodySchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters').max(5000),
  template: z.enum(['gp-note', 'specialist-referral', 'ed-triage']),
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

  const { transcript, template } = parsed.data
  const prompt = buildNotePrompt(template, transcript)

  const result = await streamText({
    model: anthropic('anthropic.claude-sonnet-4-6-20251001-v1:0'),
    prompt,
    maxOutputTokens: 1024,
  })

  return result.toTextStreamResponse()
}
