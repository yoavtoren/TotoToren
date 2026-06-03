/**
 * 48 FIFA World Cup 2026 teams — sourced from worldcup2026_data.json.
 * IDs are assigned 1–48 in group-alphabetical order (A→L), team-order within group.
 */

export interface TeamData {
  id: number
  name: string
  flag_code: string // ISO 3166-1 alpha-2 (or "GB-ENG" / "GB-SCT" for UK nations)
  group_letter: string
}

export const TEAMS: TeamData[] = [
  // ── Group A ──────────────────────────────────────────────
  { id: 1,  name: 'Mexico',                  flag_code: 'MX',     group_letter: 'A' },
  { id: 2,  name: 'South Africa',            flag_code: 'ZA',     group_letter: 'A' },
  { id: 3,  name: 'South Korea',             flag_code: 'KR',     group_letter: 'A' },
  { id: 4,  name: 'Czechia',                 flag_code: 'CZ',     group_letter: 'A' },
  // ── Group B ──────────────────────────────────────────────
  { id: 5,  name: 'Canada',                  flag_code: 'CA',     group_letter: 'B' },
  { id: 6,  name: 'Qatar',                   flag_code: 'QA',     group_letter: 'B' },
  { id: 7,  name: 'Switzerland',             flag_code: 'CH',     group_letter: 'B' },
  { id: 8,  name: 'Bosnia and Herzegovina',  flag_code: 'BA',     group_letter: 'B' },
  // ── Group C ──────────────────────────────────────────────
  { id: 9,  name: 'Brazil',                  flag_code: 'BR',     group_letter: 'C' },
  { id: 10, name: 'Morocco',                 flag_code: 'MA',     group_letter: 'C' },
  { id: 11, name: 'Haiti',                   flag_code: 'HT',     group_letter: 'C' },
  { id: 12, name: 'Scotland',                flag_code: 'GB-SCT', group_letter: 'C' },
  // ── Group D ──────────────────────────────────────────────
  { id: 13, name: 'United States',           flag_code: 'US',     group_letter: 'D' },
  { id: 14, name: 'Paraguay',                flag_code: 'PY',     group_letter: 'D' },
  { id: 15, name: 'Australia',               flag_code: 'AU',     group_letter: 'D' },
  { id: 16, name: 'Türkiye',                 flag_code: 'TR',     group_letter: 'D' },
  // ── Group E ──────────────────────────────────────────────
  { id: 17, name: 'Germany',                 flag_code: 'DE',     group_letter: 'E' },
  { id: 18, name: 'Curaçao',                 flag_code: 'CW',     group_letter: 'E' },
  { id: 19, name: 'Ivory Coast',             flag_code: 'CI',     group_letter: 'E' },
  { id: 20, name: 'Ecuador',                 flag_code: 'EC',     group_letter: 'E' },
  // ── Group F ──────────────────────────────────────────────
  { id: 21, name: 'Netherlands',             flag_code: 'NL',     group_letter: 'F' },
  { id: 22, name: 'Japan',                   flag_code: 'JP',     group_letter: 'F' },
  { id: 23, name: 'Tunisia',                 flag_code: 'TN',     group_letter: 'F' },
  { id: 24, name: 'Sweden',                  flag_code: 'SE',     group_letter: 'F' },
  // ── Group G ──────────────────────────────────────────────
  { id: 25, name: 'Belgium',                 flag_code: 'BE',     group_letter: 'G' },
  { id: 26, name: 'Egypt',                   flag_code: 'EG',     group_letter: 'G' },
  { id: 27, name: 'Iran',                    flag_code: 'IR',     group_letter: 'G' },
  { id: 28, name: 'New Zealand',             flag_code: 'NZ',     group_letter: 'G' },
  // ── Group H ──────────────────────────────────────────────
  { id: 29, name: 'Spain',                   flag_code: 'ES',     group_letter: 'H' },
  { id: 30, name: 'Cape Verde',              flag_code: 'CV',     group_letter: 'H' },
  { id: 31, name: 'Uruguay',                 flag_code: 'UY',     group_letter: 'H' },
  { id: 32, name: 'Saudi Arabia',            flag_code: 'SA',     group_letter: 'H' },
  // ── Group I ──────────────────────────────────────────────
  { id: 33, name: 'France',                  flag_code: 'FR',     group_letter: 'I' },
  { id: 34, name: 'Senegal',                 flag_code: 'SN',     group_letter: 'I' },
  { id: 35, name: 'Norway',                  flag_code: 'NO',     group_letter: 'I' },
  { id: 36, name: 'Iraq',                    flag_code: 'IQ',     group_letter: 'I' },
  // ── Group J ──────────────────────────────────────────────
  { id: 37, name: 'Argentina',               flag_code: 'AR',     group_letter: 'J' },
  { id: 38, name: 'Algeria',                 flag_code: 'DZ',     group_letter: 'J' },
  { id: 39, name: 'Austria',                 flag_code: 'AT',     group_letter: 'J' },
  { id: 40, name: 'Jordan',                  flag_code: 'JO',     group_letter: 'J' },
  // ── Group K ──────────────────────────────────────────────
  { id: 41, name: 'Portugal',                flag_code: 'PT',     group_letter: 'K' },
  { id: 42, name: 'DR Congo',                flag_code: 'CD',     group_letter: 'K' },
  { id: 43, name: 'Uzbekistan',              flag_code: 'UZ',     group_letter: 'K' },
  { id: 44, name: 'Colombia',                flag_code: 'CO',     group_letter: 'K' },
  // ── Group L ──────────────────────────────────────────────
  { id: 45, name: 'England',                 flag_code: 'GB-ENG', group_letter: 'L' },
  { id: 46, name: 'Croatia',                 flag_code: 'HR',     group_letter: 'L' },
  { id: 47, name: 'Ghana',                   flag_code: 'GH',     group_letter: 'L' },
  { id: 48, name: 'Panama',                  flag_code: 'PA',     group_letter: 'L' },
]

// Name → ID lookup (matches the strings used in the JSON)
const NAME_TO_ID: Record<string, number> = Object.fromEntries(
  TEAMS.map((t) => [t.name, t.id])
)
// Handle encoding variants from raw JSON
NAME_TO_ID['Türkiye'] = 16  // Türkiye
NAME_TO_ID['Curaçao'] = 18  // Curaçao

export function getTeamIdByName(name: string): number | undefined {
  return NAME_TO_ID[name]
}

export function getFlagEmoji(isoCode: string): string {
  if (isoCode === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (isoCode === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  const code = isoCode.toUpperCase().slice(0, 2)
  return [...code]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

export function getTeamsByGroup(groupLetter: string): TeamData[] {
  return TEAMS.filter((t) => t.group_letter === groupLetter)
}

export function getTeamById(id: number): TeamData | undefined {
  return TEAMS.find((t) => t.id === id)
}
