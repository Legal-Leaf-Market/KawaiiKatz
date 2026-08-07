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
