'use client'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import { PINTEREST_TAG_ID, trackingOptedOut } from '@/lib/pinterest-track'

/**
 * The Pinterest base tag.
 *
 * Loaded through next/script rather than pasted into <head> as the setup guide
 * shows. `afterInteractive` is the default and the right one here: the tag is
 * not needed to render anything, and `beforeInteractive` would put a
 * third-party script ahead of our own code on a storefront whose first paint we
 * have gone to some trouble to protect (§4b).
 *
 * NOT LOADED AT ALL under Do Not Track or Global Privacy Control. The server
 * route flags those to the Conversions API, but the tag is a different
 * proposition — it runs in the visitor's browser and sets cookies. The only
 * honest way to honour the signal is to never fetch it.
 *
 * Two guards, not the snippet's one. Pinterest's version wraps EVERYTHING in
 * `if(!window.pintrk)`, which is wrong here: lib/pinterest-track creates that
 * same stub so an event firing before this script runs is queued rather than
 * dropped — and with the stub already present, the snippet would skip injecting
 * core.js and the tag would never load at all. Creating the stub and loading
 * the script are therefore separate checks.
 *
 * `pintrk('page')` is deliberately absent. The guide's snippet calls it, which
 * would fire a page visit the Conversions API knows nothing about — an event
 * with no shared `event_id` is an event Pinterest cannot dedupe, and it would
 * be double-counted against the one PinterestPageVisit sends. Page visits go
 * through track() like everything else, so both transports carry the same id.
 *
 * The `em` parameter for Enhanced Match is also absent: we have no accounts and
 * therefore no email to pass. Nothing to withhold, nothing to invent.
 */
export default function PinterestTag() {
  /**
   * Decided in an effect, not during render. `trackingOptedOut()` reads
   * `navigator`, which does not exist on the server — so a render-time check
   * emits the <Script> in the server HTML and then removes it on the client for
   * an opted-out visitor, which is a hydration mismatch. Rendering nothing
   * until mounted means the server and the first client render agree, and the
   * tag appears only once the browser has been asked.
   */
  const [allowed, setAllowed] = useState(false)
  useEffect(() => { setAllowed(!trackingOptedOut()) }, [])
  if (!allowed) return null

  return (
    <Script id="pinterest-tag" strategy="afterInteractive">
      {`(function(s){
  if(!window.pintrk){
    window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};
    window.pintrk.queue=[];window.pintrk.version="3.0";
    window.pintrk('load','${PINTEREST_TAG_ID}');
  }
  if(window.__kkPinCore)return;window.__kkPinCore=1;
  var t=document.createElement("script");t.async=!0;t.src=s;
  var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r);
})("https://s.pinimg.com/ct/core.js");`}
    </Script>
  )
}
