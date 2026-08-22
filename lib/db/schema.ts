import { pgTable, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core'

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
