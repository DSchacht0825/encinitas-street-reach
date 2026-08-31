/**
 * Bulk exit clients to Permanent Supportive Housing (batch of 2026-08-31).
 *
 * Operates on an explicit list of client_ids (resolved from the name list with
 * Daniel, including spelling variants and duplicate records).
 *
 * For each record:
 *   1. persons: set exit_destination -> HUD "Permanent housing for formerly
 *      homeless persons (CoC, ESG, or other funding)", set exit_notes.
 *      exit_date is PRESERVED (fallback to today only if somehow null).
 *   2. status_changes: if an 'exit' row already exists for the person, update
 *      its exit_destination to match; otherwise insert one dated to exit_date.
 *
 * The destination is one of the values app/dashboard/page.tsx counts in
 * `permanentHousingDests`, so these land under the dashboard's permanent-housing
 * "Housed" outflow and the green "Permanent Housing" bucket in Program Exits.
 *
 * Dry run:  npx tsx --env-file=.env.local scripts/exit-to-psh.ts
 * Apply:    npx tsx --env-file=.env.local scripts/exit-to-psh.ts --apply
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EXIT_DESTINATION =
  'Permanent housing for formerly homeless persons (CoC, ESG, or other funding)'
const EXIT_NOTES = 'Exited to permanent supportive housing (batch update 2026-08-31).'
const CREATED_BY = 'Bulk PSH exit script (2026-08-31)'

// client_id -> name as given by Daniel (for readable output)
const TARGETS: Record<string, string> = {
  'CL-000082': 'Ralph Rosas',
  'CL-000254': 'Kimberly Denise Penalver',
  'CL-000111': 'Kevin Munn',
  'CL-000245': 'Jonathan Romandy',
  'CL-000100': 'Amanda Berg',
  'CL-000096': 'Morgan Malone',
  'CL-000064': 'Michael Kanable',
  'CL-000065': 'Gerald Everett',
  'CL-000140': 'Patrick Schultz (Schulze)',
  'CL-000221': 'Stephen Griffey (Steven Griffee)',
  'CL-000195': 'Natalia Horchakov (Nataliia Horchakova)',
  'CL-000099': 'Aurthur Dedrick (Arthur Dedrick)',
  'CL-000018': 'Rafael Mendez (Raphael Mendez)',
  'CL-000244': 'Ingrid Rego De Faria (Ingrid De forie)',
  'CL-000093': 'Bayla Munn (Bayla lees Anderson)',
  'CL-000193': 'Kuane Washington (dup 1/2)',
  'CL-000194': 'Kuane Washington (dup 2/2)',
  'CL-000039': 'Mario Gil (dup 1/2)',
  'CL-000040': 'Mario Gil (dup 2/2)',
}

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

type Person = {
  id: string
  client_id: string
  first_name: string
  last_name: string
  exit_date: string | null
  exit_destination: string | null
}

type StatusChange = {
  id: string
  person_id: string
  change_type: string
  change_date: string
  exit_destination: string | null
}

async function main() {
  const ids = Object.keys(TARGETS)
  const apply = process.argv.includes('--apply')

  const { data: pData, error: pErr } = await supabase
    .from('persons')
    .select('id, client_id, first_name, last_name, exit_date, exit_destination')
    .in('client_id', ids)
  if (pErr) {
    console.error('Error fetching persons:', pErr)
    process.exit(1)
  }
  const persons = (pData ?? []) as Person[]

  const found = new Set(persons.map((p) => p.client_id))
  const missing = ids.filter((id) => !found.has(id))
  if (missing.length) {
    console.error(`\n❌ These client_ids were not found: ${missing.join(', ')}`)
    console.error('Aborting so the batch stays complete.\n')
    process.exit(1)
  }

  const personIds = persons.map((p) => p.id)
  const { data: scData, error: scErr } = await supabase
    .from('status_changes')
    .select('id, person_id, change_type, change_date, exit_destination')
    .in('person_id', personIds)
  if (scErr) {
    console.error('Error fetching status_changes:', scErr)
    process.exit(1)
  }
  const statusChanges = (scData ?? []) as StatusChange[]
  const exitRowByPerson = new Map<string, StatusChange>()
  for (const sc of statusChanges) {
    if (sc.change_type !== 'exit') continue
    const cur = exitRowByPerson.get(sc.person_id)
    // keep the most recent exit row
    if (!cur || sc.change_date > cur.change_date) exitRowByPerson.set(sc.person_id, sc)
  }

  console.log(`\nDestination: "${EXIT_DESTINATION}"`)
  console.log(`Records: ${persons.length}\n`)

  const plan = persons
    .sort((a, b) => a.client_id.localeCompare(b.client_id))
    .map((p) => {
      const exitDate = p.exit_date || localToday()
      const scRow = exitRowByPerson.get(p.id)
      return {
        p,
        exitDate,
        datePreserved: !!p.exit_date,
        scAction: scRow
          ? scRow.exit_destination === EXIT_DESTINATION
            ? 'sc: already correct'
            : `sc: update row (was "${trunc(scRow.exit_destination)}")`
          : 'sc: insert new row',
        scRow,
      }
    })

  for (const row of plan) {
    console.log(
      `  ${row.p.client_id}  ${TARGETS[row.p.client_id]}\n` +
        `      persons.exit_destination: "${trunc(row.p.exit_destination)}" -> PSH\n` +
        `      exit_date: ${row.exitDate}${row.datePreserved ? ' (preserved)' : ' (was null -> today)'}\n` +
        `      ${row.scAction}`
    )
  }

  if (!apply) {
    console.log('\nDRY RUN — no changes made. Re-run with --apply to write.\n')
    return
  }

  console.log('\n🚀 Applying...\n')
  let ok = 0
  const errors: string[] = []

  for (const row of plan) {
    const { p, exitDate, scRow } = row

    const { error: upErr } = await supabase
      .from('persons')
      .update({
        exit_date: exitDate,
        exit_destination: EXIT_DESTINATION,
        exit_notes: EXIT_NOTES,
      } as never)
      .eq('id', p.id)
    if (upErr) {
      errors.push(`${p.client_id} persons: ${upErr.message}`)
      continue
    }

    if (scRow) {
      if (scRow.exit_destination !== EXIT_DESTINATION) {
        const { error } = await supabase
          .from('status_changes')
          .update({ exit_destination: EXIT_DESTINATION } as never)
          .eq('id', scRow.id)
        if (error) errors.push(`${p.client_id} status_changes update: ${error.message}`)
      }
    } else {
      const { error } = await supabase.from('status_changes').insert({
        person_id: p.id,
        change_type: 'exit',
        change_date: exitDate,
        exit_destination: EXIT_DESTINATION,
        notes: EXIT_NOTES,
        created_by: CREATED_BY,
      } as never)
      if (error) errors.push(`${p.client_id} status_changes insert: ${error.message}`)
    }

    console.log(`  ✅ ${p.client_id}  ${TARGETS[p.client_id]}`)
    ok++
  }

  console.log(`\nDone: ${ok}/${plan.length} records updated.`)
  if (errors.length) {
    console.log(`\n⚠ ${errors.length} error(s):`)
    for (const e of errors) console.log(`  ${e}`)
  }
  console.log()
}

function trunc(s: string | null, n = 60): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

main()
