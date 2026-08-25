'use client'
import { CatMark, PandaMark } from '@/components/BrandMark'

/**
 * A carousel control that is one of our own mascots holding an arrow.
 *
 * -----------------------------------------------------------------------------
 * WHY IT IS NOT A CHEVRON
 *
 * It replaced a plain circular chevron on rails whose real affordance was the
 * scrollbar — a thin grey easily-missed thing on a page that is neither. The
 * mascot is bigger, obviously clickable, and unmistakably ours.
 *
 * -----------------------------------------------------------------------------
 * WHY IT NEVER DISABLES
 *
 * The first version greyed out at the end of its travel, which is the standard
 * carousel behaviour and was read — correctly, by the first person who saw it —
 * as a broken button. There is no way to style "this control is fine, you are
 * simply at the beginning" that a person reads as anything other than "this one
 * does not work".
 *
 * So the callers wrap instead: at the start, back goes to the end. On a rail of
 * a dozen or so items that is a loop rather than a disorientation, and both
 * mascots stay full-colour and alive. This component therefore has no disabled
 * state at all — if one is rendered, it works.
 *
 * -----------------------------------------------------------------------------
 * WHICH MASCOT GOES WHERE IS THE CALLER'S CHOICE
 *
 * Ada's Picks runs cat-then-panda, matching the logo. Featured Collection runs
 * panda-then-cat, so the two rails on the home page are not the same pair of
 * buttons twice.
 */
export default function MascotArrow({
  direction,
  mascot,
  accent,
  label,
  onClick,
}: {
  direction: 'prev' | 'next'
  mascot: 'cat' | 'panda'
  /** Border and chevron colour, so a rail's controls match its cards. */
  accent: string
  /** What the rail holds, for the screen-reader label: "Scroll picks left". */
  label: string
  onClick: () => void
}) {
  const isPrev = direction === 'prev'
  return (
    <button
      onClick={onClick}
      aria-label={`Scroll ${label} ${isPrev ? 'left' : 'right'}`}
      title={isPrev ? 'Back' : 'More'}
      style={{ borderColor: accent, boxShadow: `0 8px 22px ${accent}8c` }}
      className={[
        'absolute top-1/2 -translate-y-1/2 z-30 flex items-center gap-0.5',
        'bg-white border-[3px] rounded-full py-1.5 cursor-pointer transition-all',
        'hover:scale-110 group',
        isPrev ? 'left-0 -translate-x-1/4 pl-2 pr-2.5' : 'right-0 translate-x-1/4 pl-2.5 pr-2',
      ].join(' ')}
    >
      {isPrev && (
        <span style={{ color: accent }} className="text-[26px] leading-none font-black -mt-1">‹</span>
      )}
      <span className="block w-[42px] h-[42px]" aria-hidden="true">
        {mascot === 'cat' ? <CatMark size={42} /> : <PandaMark size={42} />}
      </span>
      {!isPrev && (
        <span style={{ color: accent }} className="text-[26px] leading-none font-black -mt-1">›</span>
      )}
    </button>
  )
}

/**
 * The wrapping scroll handlers both rails use.
 *
 * Returned as a pair so a caller cannot wire up one and forget the other, which
 * is how a rail ends up with a forward button that loops and a back button that
 * silently does nothing at the start.
 */
export function wrapScroll(
  el: HTMLElement | null,
  prev: () => void,
  next: () => void
): { goPrev: () => void; goNext: () => void } {
  return {
    goPrev: () => {
      if (!el) return
      if (el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
      else prev()
    },
    goNext: () => {
      if (!el) return
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' })
      else next()
    },
  }
}
