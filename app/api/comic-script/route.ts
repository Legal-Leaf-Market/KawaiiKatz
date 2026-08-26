import Anthropic from '@anthropic-ai/sdk'
import { NextResponse, type NextRequest } from 'next/server'

import { ADA_COOKIE, verifyToken } from '@/lib/ada-auth'
import { PANEL_COUNTS } from '@/lib/comic'
import { SCRIPT_MODEL, STRIP_TOOL, systemPrompt, toPanels } from '@/lib/comic-script'

/**
 * Premise in, comic strip out.
 *
 * -----------------------------------------------------------------------------
 * THIS IS THE ROUTE THE STUDIO COMMENT PREDICTED
 *
 * app/studio/page.tsx said the studio did not need the curator gate because it
 * "holds nothing, reads nothing, and calls nothing", and named the one thing
 * that would change that: "a server-side generator spending money per request".
 * This is that generator, so the gate arrives with it.
 *
 * The cost is the whole argument. An ungated endpoint that bills our Anthropic
 * account per call is a bill anyone who finds the URL can run up, and there is
 * no ceiling on it that does not also break the tool for its actual user. The
 * curator cookie already exists, already fails closed, and is already what
 * /api/exclusions trusts.
 *
 * -----------------------------------------------------------------------------
 * TWO SECRETS, TWO FAILURE MODES, BOTH CLOSED
 *
 * ANTHROPIC_API_KEY unset ⇒ 503 and nothing is called. ADA_PIN unset ⇒
 * verifyToken throws ⇒ 401. Neither has a fallback value, for the reason §3
 * gives about the PIN: a fallback is a credential in the repository.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cap on generated text.
 *
 * A six-panel strip is a few hundred words of dialogue plus six art notes. 4000
 * is generous for that and still bounds what one call can cost.
 */
const MAX_TOKENS = 4000
const MAX_PREMISE = 600

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}

function authorized(req: NextRequest): boolean {
  try {
    return verifyToken(req.cookies.get(ADA_COOKIE)?.value)
  } catch {
    return false // ADA_PIN unset: fail closed, same as everywhere else
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return noStore({ error: 'Sign in as the curator to write a strip.' }, 401)

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return noStore({ error: 'ANTHROPIC_API_KEY is not set on this deployment.' }, 503)
  }

  let body: { premise?: unknown; panels?: unknown }
  try {
    body = (await req.json()) as { premise?: unknown; panels?: unknown }
  } catch {
    return noStore({ error: 'bad json' }, 400)
  }

  const premise = String(body.premise ?? '').trim().slice(0, MAX_PREMISE)
  if (!premise) return noStore({ error: 'Give it a premise to work from.' }, 400)

  // Clamp to a count the renderer has a grid for: grid() only knows these, and
  // an unlisted number lays out as a broken lattice rather than erroring.
  const asked = Number(body.panels)
  const panelCount = (PANEL_COUNTS as readonly number[]).includes(asked) ? asked : 4

  try {
    const client = new Anthropic({ apiKey: key })
    const msg = await client.messages.create({
      model: SCRIPT_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(panelCount),
      // Forced, not offered: without this the model may reply with prose and
      // the route would be parsing free text for a structure it already
      // described exactly.
      tool_choice: { type: 'tool', name: STRIP_TOOL.name },
      tools: [STRIP_TOOL],
      messages: [{ role: 'user', content: `Premise: ${premise}` }],
    })

    const call = msg.content.find((c) => c.type === 'tool_use')
    if (!call || call.type !== 'tool_use') {
      return noStore({ error: 'The writer did not return a strip. Try rephrasing the premise.' }, 502)
    }
    const out = call.input as Record<string, unknown>

    return noStore({
      title: typeof out.title === 'string' ? out.title : 'Untitled strip',
      panels: toPanels(out.panels, panelCount),
      caption: typeof out.caption === 'string' ? out.caption : '',
      hashtags: Array.isArray(out.hashtags)
        ? out.hashtags
            .filter((h): h is string => typeof h === 'string')
            .map((h) => h.replace(/[^A-Za-z0-9]/g, ''))
            .filter(Boolean)
            .slice(0, 12)
        : [],
    })
  } catch (e) {
    // The message is surfaced because the operator here is the curator, not a
    // shopper: "overloaded", "rate limited" and "bad key" need different
    // reactions and a generic failure hides which one happened.
    const detail = e instanceof Anthropic.APIError ? `${e.status}: ${e.message}` : (e as Error).message
    return noStore({ error: `Could not write that strip. ${detail}` }, 502)
  }
}
