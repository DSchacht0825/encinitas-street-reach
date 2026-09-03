/**
 * PostgREST (and therefore Supabase) caps every `select()` at a default of
 * 1000 rows. A plain `.from('encounters').select('*')` silently returns only
 * the first 1000 rows once the table grows past that — which is how the
 * dashboard / Custom Report Builder ended up showing "nothing" for recent
 * dates even though encounters existed.
 *
 * `fetchAllRows` pages through the whole result set with `.range()` so callers
 * get every matching row. A stable `.order()` is applied so paging is
 * consistent between requests; pass `orderBy` to override the column.
 */

// The Supabase client is generically typed; `any` keeps this helper usable
// from every call site without threading the Database generic through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

const PAGE_SIZE = 1000

export async function fetchAllRows<T = Record<string, unknown>>(
  supabase: AnySupabase,
  table: string,
  options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    build?: (query: any) => any
    select?: string
    orderBy?: string
    ascending?: boolean
  } = {}
): Promise<{ data: T[]; error: unknown }> {
  const { build, select = '*', orderBy = 'id', ascending = true } = options
  const rows: T[] = []
  let offset = 0

  for (;;) {
    let query = supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending })
      .range(offset, offset + PAGE_SIZE - 1)

    if (build) query = build(query)

    const { data, error } = await query
    if (error) return { data: rows, error }

    const page = (data ?? []) as T[]
    rows.push(...page)

    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return { data: rows, error: null }
}
