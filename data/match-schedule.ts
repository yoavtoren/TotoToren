/**
 * All 104 FIFA World Cup 2026 matches with UTC kickoff times.
 * Derived from worldcup2026_data.json.
 *
 * Conversion rule (June = EDT = UTC-4):
 *   kickoff_utc = kickoff_et + 4h
 *   "00:00" ET on date X is treated as midnight ending date X → UTC 04:00 on date X+1
 *   When the result rolls past midnight, the date advances by 1.
 */

export interface GroupMatch {
  match: number
  date_utc: string      // ISO date in UTC
  kickoff_utc: string   // full ISO datetime in UTC
  group: string
  home: string          // team name (matches teams.ts)
  away: string
  city: string
  country: string
}

export interface KnockoutMatch {
  match: number
  stage: 'r32' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'
  date_utc: string
  kickoff_utc: string
  city: string
  // R32: slot sources
  home_slot?: { winner: string } | { runner_up: string } | { third_from: string[] }
  away_slot?: { winner: string } | { runner_up: string } | { third_from: string[] }
  // R16, QF, SF: feeder match IDs
  home_feeder_match?: number
  away_feeder_match?: number
}

/** Convert ET kickoff + ET date to UTC ISO string.
 *  "00:00" on date X = 04:00 UTC on date X+1 (midnight at end of ET day). */
function etToUtc(etDate: string, etTime: string): string {
  if (etTime === '00:00') {
    const d = new Date(`${etDate}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    d.setUTCHours(4)
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
  }
  const [h, m] = etTime.split(':').map(Number)
  const totalMins = h * 60 + m + 240 // +4h for EDT
  const rollover = totalMins >= 1440  // >= 24h
  const d = new Date(`${etDate}T00:00:00Z`)
  if (rollover) d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(Math.floor((totalMins % 1440) / 60))
  d.setUTCMinutes(totalMins % 60)
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// Knockout matches don't have published ET times yet — we use midnight UTC on their date
function koUtc(date: string): string {
  return `${date}T19:00:00Z` // 19:00 UTC is a typical WC kickoff; admin can correct
}

export const GROUP_MATCHES: GroupMatch[] = [
  { match: 1,  group:'A', home:'Mexico',                 away:'South Africa',         city:'Mexico City',         country:'Mexico', date_utc:'2026-06-11', kickoff_utc: etToUtc('2026-06-11','15:00') },
  { match: 2,  group:'A', home:'South Korea',             away:'Czechia',              city:'Guadalajara',          country:'Mexico', date_utc:'2026-06-11', kickoff_utc: etToUtc('2026-06-11','22:00') },
  { match: 3,  group:'B', home:'Canada',                  away:'Bosnia and Herzegovina',city:'Toronto',             country:'Canada', date_utc:'2026-06-12', kickoff_utc: etToUtc('2026-06-12','15:00') },
  { match: 4,  group:'D', home:'United States',           away:'Paraguay',             city:'Los Angeles',          country:'USA',    date_utc:'2026-06-12', kickoff_utc: etToUtc('2026-06-12','21:00') },
  { match: 5,  group:'B', home:'Qatar',                   away:'Switzerland',          city:'San Francisco Bay Area',country:'USA',   date_utc:'2026-06-13', kickoff_utc: etToUtc('2026-06-13','15:00') },
  { match: 6,  group:'C', home:'Brazil',                  away:'Morocco',              city:'New York New Jersey',  country:'USA',    date_utc:'2026-06-13', kickoff_utc: etToUtc('2026-06-13','18:00') },
  { match: 7,  group:'C', home:'Haiti',                   away:'Scotland',             city:'Boston',               country:'USA',    date_utc:'2026-06-13', kickoff_utc: etToUtc('2026-06-13','21:00') },
  { match: 8,  group:'D', home:'Australia',               away:'Türkiye',              city:'Vancouver',            country:'Canada', date_utc:'2026-06-14', kickoff_utc: etToUtc('2026-06-13','00:00') },
  { match: 9,  group:'E', home:'Germany',                 away:'Curaçao',              city:'Houston',              country:'USA',    date_utc:'2026-06-14', kickoff_utc: etToUtc('2026-06-14','13:00') },
  { match: 10, group:'F', home:'Netherlands',             away:'Japan',                city:'Dallas',               country:'USA',    date_utc:'2026-06-14', kickoff_utc: etToUtc('2026-06-14','16:00') },
  { match: 11, group:'E', home:'Ivory Coast',             away:'Ecuador',              city:'Philadelphia',         country:'USA',    date_utc:'2026-06-14', kickoff_utc: etToUtc('2026-06-14','19:00') },
  { match: 12, group:'F', home:'Sweden',                  away:'Tunisia',              city:'Guadalajara',          country:'Mexico', date_utc:'2026-06-15', kickoff_utc: etToUtc('2026-06-14','22:00') },
  { match: 13, group:'H', home:'Spain',                   away:'Cape Verde',           city:'Atlanta',              country:'USA',    date_utc:'2026-06-15', kickoff_utc: etToUtc('2026-06-15','13:00') },
  { match: 14, group:'G', home:'Belgium',                 away:'Egypt',                city:'Seattle',              country:'USA',    date_utc:'2026-06-15', kickoff_utc: etToUtc('2026-06-15','18:00') },
  { match: 15, group:'H', home:'Saudi Arabia',            away:'Uruguay',              city:'Miami',                country:'USA',    date_utc:'2026-06-15', kickoff_utc: etToUtc('2026-06-15','18:00') },
  { match: 16, group:'G', home:'Iran',                    away:'New Zealand',          city:'Los Angeles',          country:'USA',    date_utc:'2026-06-16', kickoff_utc: etToUtc('2026-06-15','00:00') },
  { match: 17, group:'I', home:'France',                  away:'Senegal',              city:'New York New Jersey',  country:'USA',    date_utc:'2026-06-16', kickoff_utc: etToUtc('2026-06-16','15:00') },
  { match: 18, group:'I', home:'Iraq',                    away:'Norway',               city:'Boston',               country:'USA',    date_utc:'2026-06-16', kickoff_utc: etToUtc('2026-06-16','18:00') },
  { match: 19, group:'J', home:'Argentina',               away:'Algeria',              city:'Kansas City',          country:'USA',    date_utc:'2026-06-17', kickoff_utc: etToUtc('2026-06-16','21:00') },
  { match: 20, group:'J', home:'Austria',                 away:'Jordan',               city:'San Francisco Bay Area',country:'USA',   date_utc:'2026-06-17', kickoff_utc: etToUtc('2026-06-16','00:00') },
  { match: 21, group:'K', home:'Portugal',                away:'DR Congo',             city:'Houston',              country:'USA',    date_utc:'2026-06-17', kickoff_utc: etToUtc('2026-06-17','13:00') },
  { match: 22, group:'L', home:'England',                 away:'Croatia',              city:'Dallas',               country:'USA',    date_utc:'2026-06-17', kickoff_utc: etToUtc('2026-06-17','16:00') },
  { match: 23, group:'L', home:'Ghana',                   away:'Panama',               city:'Toronto',              country:'Canada', date_utc:'2026-06-17', kickoff_utc: etToUtc('2026-06-17','19:00') },
  { match: 24, group:'K', home:'Uzbekistan',              away:'Colombia',             city:'Mexico City',          country:'Mexico', date_utc:'2026-06-18', kickoff_utc: etToUtc('2026-06-17','22:00') },
  { match: 25, group:'A', home:'Czechia',                 away:'South Africa',         city:'Atlanta',              country:'USA',    date_utc:'2026-06-18', kickoff_utc: etToUtc('2026-06-18','12:00') },
  { match: 26, group:'B', home:'Switzerland',             away:'Bosnia and Herzegovina',city:'Los Angeles',         country:'USA',    date_utc:'2026-06-18', kickoff_utc: etToUtc('2026-06-18','15:00') },
  { match: 27, group:'B', home:'Canada',                  away:'Qatar',                city:'Vancouver',            country:'Canada', date_utc:'2026-06-18', kickoff_utc: etToUtc('2026-06-18','18:00') },
  { match: 28, group:'A', home:'Mexico',                  away:'South Korea',          city:'Guadalajara',          country:'Mexico', date_utc:'2026-06-19', kickoff_utc: etToUtc('2026-06-18','23:00') },
  { match: 29, group:'D', home:'United States',           away:'Australia',            city:'Seattle',              country:'USA',    date_utc:'2026-06-19', kickoff_utc: etToUtc('2026-06-19','15:00') },
  { match: 30, group:'C', home:'Scotland',                away:'Morocco',              city:'Boston',               country:'USA',    date_utc:'2026-06-19', kickoff_utc: etToUtc('2026-06-19','18:00') },
  { match: 31, group:'C', home:'Brazil',                  away:'Haiti',                city:'Philadelphia',         country:'USA',    date_utc:'2026-06-20', kickoff_utc: etToUtc('2026-06-19','21:00') },
  { match: 32, group:'D', home:'Türkiye',                 away:'Paraguay',             city:'San Francisco Bay Area',country:'USA',   date_utc:'2026-06-20', kickoff_utc: etToUtc('2026-06-19','00:00') },
  { match: 33, group:'F', home:'Netherlands',             away:'Sweden',               city:'Houston',              country:'USA',    date_utc:'2026-06-20', kickoff_utc: etToUtc('2026-06-20','13:00') },
  { match: 34, group:'E', home:'Germany',                 away:'Ivory Coast',          city:'Toronto',              country:'Canada', date_utc:'2026-06-20', kickoff_utc: etToUtc('2026-06-20','16:00') },
  { match: 35, group:'E', home:'Ecuador',                 away:'Curaçao',              city:'Kansas City',          country:'USA',    date_utc:'2026-06-21', kickoff_utc: etToUtc('2026-06-20','20:00') },
  { match: 36, group:'F', home:'Tunisia',                 away:'Japan',                city:'Guadalajara',          country:'Mexico', date_utc:'2026-06-21', kickoff_utc: etToUtc('2026-06-20','00:00') },
  { match: 37, group:'H', home:'Spain',                   away:'Saudi Arabia',         city:'Atlanta',              country:'USA',    date_utc:'2026-06-21', kickoff_utc: etToUtc('2026-06-21','12:00') },
  { match: 38, group:'G', home:'Belgium',                 away:'Iran',                 city:'Los Angeles',          country:'USA',    date_utc:'2026-06-21', kickoff_utc: etToUtc('2026-06-21','15:00') },
  { match: 39, group:'H', home:'Uruguay',                 away:'Cape Verde',           city:'Miami',                country:'USA',    date_utc:'2026-06-21', kickoff_utc: etToUtc('2026-06-21','18:00') },
  { match: 40, group:'G', home:'New Zealand',             away:'Egypt',                city:'Vancouver',            country:'Canada', date_utc:'2026-06-22', kickoff_utc: etToUtc('2026-06-21','21:00') },
  { match: 41, group:'J', home:'Argentina',               away:'Austria',              city:'Dallas',               country:'USA',    date_utc:'2026-06-22', kickoff_utc: etToUtc('2026-06-22','13:00') },
  { match: 42, group:'I', home:'France',                  away:'Iraq',                 city:'Philadelphia',         country:'USA',    date_utc:'2026-06-22', kickoff_utc: etToUtc('2026-06-22','17:00') },
  { match: 43, group:'I', home:'Norway',                  away:'Senegal',              city:'New York New Jersey',  country:'USA',    date_utc:'2026-06-23', kickoff_utc: etToUtc('2026-06-22','20:00') },
  { match: 44, group:'J', home:'Jordan',                  away:'Algeria',              city:'San Francisco Bay Area',country:'USA',   date_utc:'2026-06-23', kickoff_utc: etToUtc('2026-06-22','23:00') },
  { match: 45, group:'K', home:'Portugal',                away:'Uzbekistan',           city:'Houston',              country:'USA',    date_utc:'2026-06-23', kickoff_utc: etToUtc('2026-06-23','13:00') },
  { match: 46, group:'L', home:'England',                 away:'Ghana',                city:'Boston',               country:'USA',    date_utc:'2026-06-23', kickoff_utc: etToUtc('2026-06-23','16:00') },
  { match: 47, group:'L', home:'Panama',                  away:'Croatia',              city:'Toronto',              country:'Canada', date_utc:'2026-06-23', kickoff_utc: etToUtc('2026-06-23','19:00') },
  { match: 48, group:'K', home:'Colombia',                away:'DR Congo',             city:'Guadalajara',          country:'Mexico', date_utc:'2026-06-24', kickoff_utc: etToUtc('2026-06-23','22:00') },
  { match: 49, group:'B', home:'Switzerland',             away:'Canada',               city:'Vancouver',            country:'Canada', date_utc:'2026-06-24', kickoff_utc: etToUtc('2026-06-24','15:00') },
  { match: 50, group:'B', home:'Bosnia and Herzegovina',  away:'Qatar',                city:'Seattle',              country:'USA',    date_utc:'2026-06-24', kickoff_utc: etToUtc('2026-06-24','15:00') },
  { match: 51, group:'C', home:'Scotland',                away:'Brazil',               city:'Miami',                country:'USA',    date_utc:'2026-06-24', kickoff_utc: etToUtc('2026-06-24','18:00') },
  { match: 52, group:'C', home:'Morocco',                 away:'Haiti',                city:'Atlanta',              country:'USA',    date_utc:'2026-06-24', kickoff_utc: etToUtc('2026-06-24','18:00') },
  { match: 53, group:'A', home:'Czechia',                 away:'Mexico',               city:'Mexico City',          country:'Mexico', date_utc:'2026-06-25', kickoff_utc: etToUtc('2026-06-24','21:00') },
  { match: 54, group:'A', home:'South Africa',            away:'South Korea',          city:'Monterrey',            country:'Mexico', date_utc:'2026-06-25', kickoff_utc: etToUtc('2026-06-24','21:00') },
  { match: 55, group:'E', home:'Ecuador',                 away:'Germany',              city:'New York New Jersey',  country:'USA',    date_utc:'2026-06-25', kickoff_utc: etToUtc('2026-06-25','16:00') },
  { match: 56, group:'E', home:'Curaçao',                 away:'Ivory Coast',          city:'Philadelphia',         country:'USA',    date_utc:'2026-06-25', kickoff_utc: etToUtc('2026-06-25','16:00') },
  { match: 57, group:'F', home:'Japan',                   away:'Sweden',               city:'Dallas',               country:'USA',    date_utc:'2026-06-25', kickoff_utc: etToUtc('2026-06-25','19:00') },
  { match: 58, group:'F', home:'Tunisia',                 away:'Netherlands',          city:'Kansas City',          country:'USA',    date_utc:'2026-06-25', kickoff_utc: etToUtc('2026-06-25','19:00') },
  { match: 59, group:'D', home:'Türkiye',                 away:'United States',        city:'Los Angeles',          country:'USA',    date_utc:'2026-06-26', kickoff_utc: etToUtc('2026-06-25','22:00') },
  { match: 60, group:'D', home:'Paraguay',                away:'Australia',            city:'San Francisco Bay Area',country:'USA',   date_utc:'2026-06-26', kickoff_utc: etToUtc('2026-06-25','22:00') },
  { match: 61, group:'I', home:'Norway',                  away:'France',               city:'Boston',               country:'USA',    date_utc:'2026-06-26', kickoff_utc: etToUtc('2026-06-26','15:00') },
  { match: 62, group:'I', home:'Senegal',                 away:'Iraq',                 city:'Toronto',              country:'Canada', date_utc:'2026-06-26', kickoff_utc: etToUtc('2026-06-26','15:00') },
  { match: 63, group:'H', home:'Cape Verde',              away:'Saudi Arabia',         city:'Houston',              country:'USA',    date_utc:'2026-06-27', kickoff_utc: etToUtc('2026-06-26','20:00') },
  { match: 64, group:'H', home:'Uruguay',                 away:'Spain',                city:'Guadalajara',          country:'Mexico', date_utc:'2026-06-27', kickoff_utc: etToUtc('2026-06-26','20:00') },
  { match: 65, group:'G', home:'Egypt',                   away:'Iran',                 city:'Seattle',              country:'USA',    date_utc:'2026-06-27', kickoff_utc: etToUtc('2026-06-26','23:00') },
  { match: 66, group:'G', home:'New Zealand',             away:'Belgium',              city:'Vancouver',            country:'Canada', date_utc:'2026-06-27', kickoff_utc: etToUtc('2026-06-26','23:00') },
  { match: 67, group:'L', home:'Panama',                  away:'England',              city:'New York New Jersey',  country:'USA',    date_utc:'2026-06-27', kickoff_utc: etToUtc('2026-06-27','17:00') },
  { match: 68, group:'L', home:'Croatia',                 away:'Ghana',                city:'Philadelphia',         country:'USA',    date_utc:'2026-06-27', kickoff_utc: etToUtc('2026-06-27','17:00') },
  { match: 69, group:'K', home:'Colombia',                away:'Portugal',             city:'Miami',                country:'USA',    date_utc:'2026-06-27', kickoff_utc: etToUtc('2026-06-27','19:30') },
  { match: 70, group:'K', home:'DR Congo',                away:'Uzbekistan',           city:'Atlanta',              country:'USA',    date_utc:'2026-06-27', kickoff_utc: etToUtc('2026-06-27','19:30') },
  { match: 71, group:'J', home:'Algeria',                 away:'Austria',              city:'Kansas City',          country:'USA',    date_utc:'2026-06-28', kickoff_utc: etToUtc('2026-06-27','22:00') },
  { match: 72, group:'J', home:'Jordan',                  away:'Argentina',            city:'Dallas',               country:'USA',    date_utc:'2026-06-28', kickoff_utc: etToUtc('2026-06-27','22:00') },
]

export const KNOCKOUT_MATCHES: KnockoutMatch[] = [
  // ── Round of 32 ──────────────────────────────────────────
  { match: 73, stage:'r32', city:'Los Angeles',         date_utc:'2026-06-28', kickoff_utc: koUtc('2026-06-28'), home_slot:{runner_up:'A'}, away_slot:{runner_up:'B'} },
  { match: 74, stage:'r32', city:'Houston',             date_utc:'2026-06-29', kickoff_utc: koUtc('2026-06-29'), home_slot:{winner:'C'},    away_slot:{runner_up:'F'} },
  { match: 75, stage:'r32', city:'Boston',              date_utc:'2026-06-29', kickoff_utc: koUtc('2026-06-29'), home_slot:{winner:'E'},    away_slot:{third_from:['A','B','C','D','F']} },
  { match: 76, stage:'r32', city:'Guadalajara',         date_utc:'2026-06-29', kickoff_utc: koUtc('2026-06-29'), home_slot:{winner:'F'},    away_slot:{runner_up:'C'} },
  { match: 77, stage:'r32', city:'Dallas',              date_utc:'2026-06-30', kickoff_utc: koUtc('2026-06-30'), home_slot:{runner_up:'E'}, away_slot:{runner_up:'I'} },
  { match: 78, stage:'r32', city:'New York New Jersey', date_utc:'2026-06-30', kickoff_utc: koUtc('2026-06-30'), home_slot:{winner:'I'},    away_slot:{third_from:['C','D','F','G','H']} },
  { match: 79, stage:'r32', city:'Mexico City',         date_utc:'2026-06-30', kickoff_utc: koUtc('2026-06-30'), home_slot:{winner:'A'},    away_slot:{third_from:['C','E','F','H','I']} },
  { match: 80, stage:'r32', city:'Atlanta',             date_utc:'2026-07-01', kickoff_utc: koUtc('2026-07-01'), home_slot:{winner:'L'},    away_slot:{third_from:['E','H','I','J','K']} },
  { match: 81, stage:'r32', city:'Seattle',             date_utc:'2026-07-01', kickoff_utc: koUtc('2026-07-01'), home_slot:{winner:'G'},    away_slot:{third_from:['A','E','H','I','J']} },
  { match: 82, stage:'r32', city:'San Francisco Bay Area',date_utc:'2026-07-01', kickoff_utc: koUtc('2026-07-01'), home_slot:{winner:'D'}, away_slot:{third_from:['B','E','F','I','J']} },
  { match: 83, stage:'r32', city:'Los Angeles',         date_utc:'2026-07-02', kickoff_utc: koUtc('2026-07-02'), home_slot:{winner:'H'},    away_slot:{runner_up:'J'} },
  { match: 84, stage:'r32', city:'Toronto',             date_utc:'2026-07-02', kickoff_utc: koUtc('2026-07-02'), home_slot:{runner_up:'K'}, away_slot:{runner_up:'L'} },
  { match: 85, stage:'r32', city:'Vancouver',           date_utc:'2026-07-02', kickoff_utc: koUtc('2026-07-02'), home_slot:{winner:'B'},    away_slot:{third_from:['E','F','G','I','J']} },
  { match: 86, stage:'r32', city:'Dallas',              date_utc:'2026-07-03', kickoff_utc: koUtc('2026-07-03'), home_slot:{runner_up:'D'}, away_slot:{runner_up:'G'} },
  { match: 87, stage:'r32', city:'Miami',               date_utc:'2026-07-03', kickoff_utc: koUtc('2026-07-03'), home_slot:{winner:'J'},    away_slot:{runner_up:'H'} },
  { match: 88, stage:'r32', city:'Kansas City',         date_utc:'2026-07-03', kickoff_utc: koUtc('2026-07-03'), home_slot:{winner:'K'},    away_slot:{third_from:['D','E','I','J','L']} },
  // ── Round of 16 ──────────────────────────────────────────
  { match: 89, stage:'r16', city:'Philadelphia',        date_utc:'2026-07-04', kickoff_utc: koUtc('2026-07-04'), home_feeder_match:74, away_feeder_match:77 },
  { match: 90, stage:'r16', city:'Houston',             date_utc:'2026-07-04', kickoff_utc: koUtc('2026-07-04'), home_feeder_match:73, away_feeder_match:75 },
  { match: 91, stage:'r16', city:'New York New Jersey', date_utc:'2026-07-05', kickoff_utc: koUtc('2026-07-05'), home_feeder_match:76, away_feeder_match:78 },
  { match: 92, stage:'r16', city:'Mexico City',         date_utc:'2026-07-05', kickoff_utc: koUtc('2026-07-05'), home_feeder_match:79, away_feeder_match:80 },
  { match: 93, stage:'r16', city:'Dallas',              date_utc:'2026-07-06', kickoff_utc: koUtc('2026-07-06'), home_feeder_match:83, away_feeder_match:84 },
  { match: 94, stage:'r16', city:'Seattle',             date_utc:'2026-07-06', kickoff_utc: koUtc('2026-07-06'), home_feeder_match:81, away_feeder_match:82 },
  { match: 95, stage:'r16', city:'Atlanta',             date_utc:'2026-07-07', kickoff_utc: koUtc('2026-07-07'), home_feeder_match:86, away_feeder_match:88 },
  { match: 96, stage:'r16', city:'Vancouver',           date_utc:'2026-07-07', kickoff_utc: koUtc('2026-07-07'), home_feeder_match:85, away_feeder_match:87 },
  // ── Quarter-finals ───────────────────────────────────────
  { match: 97, stage:'qf',  city:'Boston',              date_utc:'2026-07-09', kickoff_utc: koUtc('2026-07-09'), home_feeder_match:89, away_feeder_match:90 },
  { match: 98, stage:'qf',  city:'Los Angeles',         date_utc:'2026-07-10', kickoff_utc: koUtc('2026-07-10'), home_feeder_match:91, away_feeder_match:92 },
  { match: 99, stage:'qf',  city:'Miami',               date_utc:'2026-07-11', kickoff_utc: koUtc('2026-07-11'), home_feeder_match:93, away_feeder_match:94 },
  { match:100, stage:'qf',  city:'Kansas City',         date_utc:'2026-07-11', kickoff_utc: koUtc('2026-07-11'), home_feeder_match:95, away_feeder_match:96 },
  // ── Semi-finals ──────────────────────────────────────────
  { match:101, stage:'sf',  city:'Dallas',              date_utc:'2026-07-14', kickoff_utc: koUtc('2026-07-14'), home_feeder_match:97, away_feeder_match:98 },
  { match:102, stage:'sf',  city:'Atlanta',             date_utc:'2026-07-15', kickoff_utc: koUtc('2026-07-15'), home_feeder_match:99, away_feeder_match:100 },
  // ── Third-place play-off ──────────────────────────────────
  { match:103, stage:'third_place', city:'Miami',          date_utc:'2026-07-18', kickoff_utc: koUtc('2026-07-18') },
  // ── Final ────────────────────────────────────────────────
  { match:104, stage:'final',       city:'New York New Jersey', date_utc:'2026-07-19', kickoff_utc: koUtc('2026-07-19') },
]

// R32 → R16 feeder mapping: which R16 match does each R32 match feed into?
export const R32_FEEDS_INTO: Record<number, { match: number; side: 'home' | 'away' }> = {
  73: { match: 90, side: 'home' },
  74: { match: 89, side: 'home' },
  75: { match: 90, side: 'away' },
  76: { match: 91, side: 'home' },
  77: { match: 89, side: 'away' },
  78: { match: 91, side: 'away' },
  79: { match: 92, side: 'home' },
  80: { match: 92, side: 'away' },
  81: { match: 94, side: 'home' },
  82: { match: 94, side: 'away' },
  83: { match: 93, side: 'home' },
  84: { match: 93, side: 'away' },
  85: { match: 96, side: 'home' },
  86: { match: 95, side: 'home' },
  87: { match: 96, side: 'away' },
  88: { match: 95, side: 'away' },
}

export const MATCH_BY_ID: Record<number, GroupMatch | KnockoutMatch> = Object.fromEntries(
  [...GROUP_MATCHES, ...KNOCKOUT_MATCHES].map((m) => [m.match, m])
)

export const GROUP_MATCHES_BY_GROUP: Record<string, GroupMatch[]> = {}
for (const m of GROUP_MATCHES) {
  if (!GROUP_MATCHES_BY_GROUP[m.group]) GROUP_MATCHES_BY_GROUP[m.group] = []
  GROUP_MATCHES_BY_GROUP[m.group].push(m)
}

/** Last match in each group (simultaneous final matchday — the reveal_at for group standing predictions) */
export const GROUP_FINAL_KICKOFF: Record<string, string> = {}
for (const [g, matches] of Object.entries(GROUP_MATCHES_BY_GROUP)) {
  GROUP_FINAL_KICKOFF[g] = matches.reduce(
    (latest, m) => (m.kickoff_utc > latest ? m.kickoff_utc : latest),
    ''
  )
}
