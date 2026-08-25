import { pgTable, text, doublePrecision, timestamp, boolean, index } from 'drizzle-orm/pg-core'

/**
 * Global admin kill-list. A single shared table (not per-user) of products the
 * curator has manually hidden from the storefront. Metadata is stored alongside
 * the id so an excluded item can always be listed and restored, even if it later
 * drops out of the live vendor catalog.
 */
export const storeExclusions = pgTable('store_exclusions', {
  productId: text('product_id').primaryKey(),
  name: text('name'),
  image: text('image'),
  price: doublePrecision('price'),
  vendor: text('vendor'),
  url: text('url'),
  excludedAt: timestamp('excluded_at', { withTimezone: true }).notNull().defaultNow(),
})

export type StoreExclusion = typeof storeExclusions.$inferSelect

/**
 * Ada's Picks, shared by every visitor.
 *
 * This table exists because the picks previously did not have one. `adaPicks`
 * lived in the client reducer and was persisted to localStorage and nowhere
 * else, which meant a pick Ada starred was saved to the browser she starred it
 * in and was invisible to everyone — every visitor, and Ada herself on any
 * other device, saw the hardcoded DEFAULT_ADA_PICKS instead. Clearing site data
 * erased the lot. The curator UI looked like it was working the entire time,
 * which is why it went unnoticed.
 *
 * Global and single-row-per-product, exactly like store_exclusions: this is
 * editorial state owned by the curator, not per-visitor state.
 *
 * Metadata is denormalised alongside the id for the same reason it is over
 * there — a pick must still render if the product later drops out of a vendor's
 * feed, otherwise a merchant going quiet would silently blank the rail.
 */
export const storePicks = pgTable('store_picks', {
  productId: text('product_id').primaryKey(),
  name: text('name'),
  vendor: text('vendor'),
  cat: text('cat'),
  image: text('image'),
  price: doublePrecision('price'),
  url: text('url'),
  pickedAt: timestamp('picked_at', { withTimezone: true }).notNull().defaultNow(),
})

export type StorePick = typeof storePicks.$inferSelect

/**
 * Threaded comments on a product page.
 *
 * -----------------------------------------------------------------------------
 * NO ACCOUNTS, WHICH IS A DECISION AND NOT AN OMISSION
 *
 * This site has never had a login for shoppers and should not grow one for
 * this: we take no payment, so an account would hold a name and a password and
 * protect nothing worth protecting, while becoming a breach we could have. A
 * comment therefore carries a display name the poster typed and nothing else.
 *
 * That makes moderation the whole design rather than a feature bolted on later.
 * Three controls, all in the route:
 *   - links are refused outright, because an affiliate storefront with an open
 *     comment box is a link-spam target and nothing else we could do matters
 *     as much as simply not letting a URL through;
 *   - a per-poster hourly cap, keyed on a salted hash of the IP;
 *   - the curator can hide anything, from the page, with one click.
 *
 * -----------------------------------------------------------------------------
 * hidden, NOT DELETE
 *
 * Hiding a parent that has replies must not orphan them, and a hard delete
 * either cascades (destroying other people's replies for one bad comment) or
 * leaves rows pointing at nothing. A soft flag keeps the thread's shape: the
 * body is withheld and the slot stays, so replies still read in order.
 *
 * `ipHash` is a one-way hash and is never returned by the API. It exists for
 * rate limiting and for banning a persistent abuser without holding anyone's
 * address.
 */
export const productComments = pgTable(
  'product_comments',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    /** Null for a top-level comment. Replies are one level deep, enforced in the route. */
    parentId: text('parent_id'),
    author: text('author').notNull(),
    body: text('body').notNull(),
    ipHash: text('ip_hash'),
    hidden: boolean('hidden').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('product_comments_product_idx').on(t.productId, t.createdAt)]
)

export type ProductComment = typeof productComments.$inferSelect
