import 'server-only'

import type { Art, Panel, Placement, Scale } from './comic'

/**
 * The writing half of IG Studio: a premise goes in, a laid-out strip comes out.
 *
 * -----------------------------------------------------------------------------
 * SERVER-ONLY, AND THE `server-only` IMPORT IS LOAD-BEARING
 *
 * This module names the model, holds the character bible and builds the prompt.
 * None of that is secret, but it sits one import away from the API key, and the
 * rule this project already learned the hard way is that a file which drifts
 * into a 'use client' tree takes everything it imports with it (§3, §7 — the PIN
 * shipped in the public bundle exactly that way). `server-only` turns that drift
 * into a build error instead of a quiet leak.
 *
 * -----------------------------------------------------------------------------
 * WHAT THIS DOES AND DELIBERATELY DOES NOT DO
 *
 * It writes dialogue and art DIRECTION. It does not draw. The pictures are made
 * elsewhere — that is the whole workflow: premise here, dialogue here, then the
 * per-panel `artNote` is pasted into an image tool, and the finished pictures
 * come back into the panel uploads.
 *
 * So `artNote` is not a nicety, it is the handoff. It has to read as an
 * instruction to an illustrator who has never seen this site: it names the
 * characters, the shot, the setting and the mood in one sentence, and it repeats
 * the character description every time because each panel is prompted
 * independently in a fresh context.
 */

/** Model for the strip writer. */
export const SCRIPT_MODEL = 'claude-opus-5'

/**
 * Who these two are.
 *
 * They are the site's own brand marks, so they cannot be redesigned per strip —
 * the whole point of a recurring cast is that readers recognise them. The
 * physical description is fixed and is repeated into every artNote; the
 * personalities exist so the dialogue has somewhere to come from. Two characters
 * who agree about everything have no strip in them.
 */
export const CAST = `THE CAT — the left-hand character, and the one who wants things.
Physical: a fluffy BLACK cat with pointed ears, pink inner ears and white
whiskers. Enormous sparkling violet-purple eyes with big white star highlights,
a small pink nose, an open happy smile with the pink tongue showing, and pink
blush on both cheeks. Glossy chibi sticker style with a clean white outline.
Personality: enthusiastic, impulsive, a shopper. Falls in love with objects on
sight. Speaks in short bursts. Optimistic to the point of being wrong.

THE PANDA — the right-hand character, and the one who notices things.
Physical: a round panda with a white face, black ears and black eye patches.
Enormous sparkling magenta-pink eyes with big white highlights, a small black
nose, an open happy smile with the pink tongue showing, pink blush on both
cheeks. Same glossy chibi sticker style and clean white outline as the cat.
Personality: dry, gentle, practical. The one who reads the price tag. Never
mean — the joke is never at the cat's expense, it is at the situation's.

Both brand marks are HEAD ONLY. Bodies are not established, so an artNote that
needs one should ask for a simple round chibi body in the same style, and ask
for it the same way every time. Never describe clothing on them unless the
premise requires it.

They are friends. Nobody wins; the strip ends warm.`

export type ScriptPanel = {
  art: Art
  placement: Placement
  scale: Scale
  caption?: string
  cat?: string
  panda?: string
  /** The sentence to paste into an image tool for this panel. */
  artNote: string
}

export type ScriptResult = {
  title: string
  panels: ScriptPanel[]
  caption: string
  hashtags: string[]
}

/**
 * The tool the model is forced to call.
 *
 * A tool rather than "reply in JSON": the shape is validated at the tool-call
 * layer, so a malformed strip is retried by the model instead of arriving here
 * as prose this route would have to parse and guess at. Every enum matches the
 * renderer's own union types — a value outside them draws nothing and fails
 * silently, which is the worst way for this to break.
 */
export const STRIP_TOOL = {
  name: 'write_strip',
  description: 'Return the finished comic strip, one entry per panel, in order.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Short internal name for the strip. Three or four words.',
      },
      panels: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            art: {
              type: 'string',
              enum: ['both', 'cat', 'panda', 'none'],
              description: 'Who is in frame. Prefer "both" unless a beat is stronger with one.',
            },
            placement: {
              type: 'string',
              enum: ['left', 'center', 'right'],
              description: 'Only used when art is a single character.',
            },
            scale: {
              type: 'string',
              enum: ['far', 'mid', 'near', 'huge'],
              description:
                'Shot size. Vary it across the strip — four identical mid shots read as a slideshow. "huge" is for a reaction beat.',
            },
            caption: {
              type: 'string',
              description: 'Optional narration box. Use sparingly; most panels need none.',
            },
            cat: { type: 'string', description: "The cat's line. Omit if the cat does not speak." },
            panda: { type: 'string', description: "The panda's line. Omit if the panda does not speak." },
            artNote: {
              type: 'string',
              description:
                'One sentence describing this panel as a picture, for an illustrator who has not seen the others. Name each character present with their full physical description, then the setting, action and mood. No dialogue, no panel numbers.',
            },
          },
          required: ['art', 'placement', 'scale', 'artNote'],
        },
      },
      caption: {
        type: 'string',
        description:
          'The Instagram caption. One or two warm sentences about the premise. Do NOT include hashtags or #ad here.',
      },
      hashtags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Six to ten hashtags, without the leading #, CamelCase.',
      },
    },
    required: ['title', 'panels', 'caption', 'hashtags'],
  },
}

/**
 * How to write one.
 *
 * The two constraints that come from the renderer rather than from taste:
 * bubbles are drawn at a fixed size into a panel that is at most ~513px wide, so
 * a long line wraps into a bubble that eats the picture; and the cat is always
 * drawn on the left and the panda on the right, so their lines cannot be swapped
 * for rhythm the way a normal script could.
 */
export function systemPrompt(panelCount: number): string {
  return `You write short comic strips for Kawaii Katz, a cute-gift storefront. Two recurring characters, a house style, and a strip that has to work as an Instagram post.

${CAST}

FORMAT
- Exactly ${panelCount} panel${panelCount === 1 ? '' : 's'}.
- The cat's bubble is ALWAYS on the left, the panda's ALWAYS on the right. That is fixed by the renderer; do not write a beat that depends on swapping them.
- Keep every spoken line under about 12 words. Bubbles are drawn at a fixed size into a narrow panel, and a long line wraps until it covers the picture.
- Not every panel needs both characters to speak. Silence is a beat.
- Narration captions are optional and usually unnecessary. Let the characters talk.

WRITING IT
- Give the strip a shape: set up, turn, land. With four panels that is roughly beat, beat, turn, punchline.
- The humour is gentle and observational. No sarcasm at anyone's expense, no put-downs, nothing mean about money or appearance.
- Do not write an advertisement. Nobody says "available now" or names a price. If a product appears it is a prop in a joke, not a pitch.
- Vary the shot sizes. A reaction lands harder in "huge" after two "mid" panels.

ART NOTES
- Every panel needs an artNote, and each one is read on its own by someone who has not seen the others.
- So repeat the full physical description of every character in frame, every time, and describe the setting every time. Do not write "same as panel 2" or "they continue" — that produces a blank stare from an image tool.
- Describe the picture only: characters, setting, action, expression, mood. Never the dialogue, never a panel number, never the speech bubbles.
- Keep the house look in each one: glossy chibi sticker art, clean white outlines, big sparkling eyes, soft pastel backgrounds.

Call write_strip with the finished strip. Return nothing else.`
}

/** Coerce a tool result into panels the renderer can draw, dropping anything odd. */
export function toPanels(raw: unknown, panelCount: number): (Panel & { artNote?: string })[] {
  const arts: Art[] = ['both', 'cat', 'panda', 'none']
  const places: Placement[] = ['left', 'center', 'right']
  const scales: Scale[] = ['far', 'mid', 'near', 'huge']
  const list = Array.isArray(raw) ? raw : []

  return Array.from({ length: panelCount }, (_, i) => {
    const p = (list[i] ?? {}) as Record<string, unknown>
    const art = arts.includes(p.art as Art) ? (p.art as Art) : 'both'
    return {
      art,
      placement: places.includes(p.placement as Placement) ? (p.placement as Placement) : 'left',
      scale: scales.includes(p.scale as Scale) ? (p.scale as Scale) : 'mid',
      caption: typeof p.caption === 'string' ? p.caption : undefined,
      cat: typeof p.cat === 'string' ? p.cat : undefined,
      panda: typeof p.panda === 'string' ? p.panda : undefined,
      artNote: typeof p.artNote === 'string' ? p.artNote : undefined,
    }
  })
}
