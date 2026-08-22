import { jsonLd } from '@/lib/schema'

/**
 * Renders a schema.org graph into the document.
 *
 * Serialised from values we control, so there is no user input to escape;
 * JSON.stringify is what Next's own docs prescribe here.
 */
export default function JsonLd({ nodes }: { nodes: unknown[] }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(nodes) }} />
  )
}
