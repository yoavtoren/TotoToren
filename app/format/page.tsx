import GlassCard from '@/components/ui/GlassCard'
import Link from 'next/link'

export const metadata = {
  title: 'טוטו-תורן — פורמט הטורניר',
}

const TIEBREAKERS = [
  'נקודות במשחקים בין הקבוצות הקשורות (גול-גול)',
  'הפרש שערים במשחקים בין הקבוצות הקשורות',
  'שערים שבוקעו במשחקים בין הקבוצות הקשורות',
  '(חוזרים על 1–3 אם עדיין יש שוויון בתת-קבוצה)',
  'הפרש שערים כולל בבית',
  'שערים שבוקעו כולל בבית',
  'ציון הגינות (כרטיסים אדומים/צהובים)',
  'דירוג FIFA',
]

const BEST_THIRD = [
  'נקודות',
  'הפרש שערים',
  'שערים שבוקעו',
  'ציון הגינות',
  'דירוג FIFA',
]

const SCORING_TABLE = [
  { cat: '1X2 נכון (מי ניצח)',        pts: '+1 נק׳' },
  { cat: 'מספר שערים נכון',           pts: '+2 נק׳' },
  { cat: 'תוצאה מדויקת',              pts: '+3 נק׳' },
  { cat: 'דירוג בית — מיקום נכון (×4 לבית)',     pts: '+3 נק׳' },
  { cat: 'קבוצה מגיעה לשלב 32',                  pts: '+4 נק׳' },
  { cat: 'קבוצה מגיעה לשלב 16',                  pts: '+5 נק׳' },
  { cat: 'קבוצה מגיעה לרבע גמר',                 pts: '+6 נק׳' },
  { cat: 'קבוצה מגיעה לחצי גמר',                 pts: '+7 נק׳' },
  { cat: 'קבוצה מגיעה לגמר',                     pts: '+8 נק׳' },
  { cat: 'משחק נוקאאוט — מספר שערים נכון',       pts: '+2 נק׳' },
  { cat: 'משחק נוקאאוט — תוצאה מדויקת',          pts: '+3 נק׳' },
  { cat: 'אלוף גביע העולם',                       pts: '+15 נק׳' },
  { cat: 'הקבוצה הכי שערנית',                    pts: '+8 נק׳' },
  { cat: 'קבוצת מלך השערים (עקב זהב)',           pts: '+8 נק׳' },
  { cat: 'הקבוצה שספגה הכי הרבה שערים',          pts: '+10 נק׳' },
  { cat: 'סך שערים בטורניר (מדויק)',             pts: '+12 נק׳' },
]

export default function FormatPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-shadow">פורמט הטורניר</h1>
        <p className="text-sm text-white/50">מונדיאל 2026 — כך זה עובד</p>
      </div>

      {/* סקירה */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">סקירה כללית</h2>
        <p className="text-sm text-white/70 leading-relaxed">
          לראשונה, המונדיאל כולל <strong className="text-white">48 קבוצות</strong> ב-
          <strong className="text-white">12 בתים</strong> (A–L), 4 קבוצות לבית. כל קבוצה משחקת נגד שלוש
          האחרות בבית שלה — 72 משחקי בית בסך הכל — ואחר כך 32 הטובות עוברות לשלב הנוקאאוט שמסתיים בגמר
          ב-19 ביולי 2026 בניו יורק/ניו ג׳רזי.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {[
            ['48', 'קבוצות'],
            ['12', 'בתים'],
            ['72', 'משחקי בית'],
            ['32', 'לשלב 32'],
            ['104', 'סך משחקים'],
            ['6', 'סבבי נוקאאוט'],
          ].map(([n, l]) => (
            <div key={l} className="glass rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-300">{n}</p>
              <p className="text-xs text-white/50">{l}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* שלב הבתים */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">שלב הבתים</h2>
        <p className="text-sm text-white/70 leading-relaxed">
          כל בית משחק ליגה פנימית. ניצחון = <strong className="text-white">3 נקודות</strong>,
          תיקו = <strong className="text-white">נקודה</strong>, הפסד = 0. שתי הקבוצות הראשונות בכל בית
          עוברות אוטומטית (24 קבוצות). 8 הקבוצות הטובות שסיימו שלישיות גם עוברות — סך הכל 32 בשלב הנוקאאוט.
        </p>
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-2">פריסה במקרה שוויון (לפי הסדר)</h3>
          <ol className="space-y-1">
            {TIEBREAKERS.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/60">
                <span className="text-white/30 shrink-0">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </GlassCard>

      {/* שלישיות */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">8 הקבוצות הטובות במקום השלישי</h2>
        <p className="text-sm text-white/70 leading-relaxed">
          כל 12 הקבוצות שסיימו שלישיות מדורגות לפי הקריטריונים הבאים. 8 הטובות מהן עוברות לשלב 32.
          בטורניר האמיתי FIFA קובעת מראש לאיזה חריץ כל שלישית נכנסת — במשחק הזה
          <strong className="text-white"> אתם בוחרים</strong> אילו 8 שלישיות עוברות ומסדרים אותן בחריצים.
        </p>
        <ol className="space-y-1">
          {BEST_THIRD.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/60">
              <span className="text-white/30 shrink-0">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </GlassCard>

      {/* נוקאאוט */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">שלב הנוקאאוט</h2>
        <div className="space-y-2 text-sm text-white/70">
          <p>
            נוקאאוט ישיר מסבב 32. אם תיקו אחרי 90 דקות:{' '}
            <strong className="text-white">30 דקות הארכה (2×15)</strong>, ואז פנדלים.
          </p>
          <p>
            הניקוד במשחק זה מבוסס על <strong className="text-white">תוצאת 90 הדקות בלבד</strong>,
            ללא קשר להארכה או פנדלים.
          </p>
          <div className="flex flex-col gap-1 pt-1">
            {[
              'שלב 32 — 16 משחקים, 28 יוני–3 יולי',
              'שלב 16 — 8 משחקים, 4–7 יולי',
              'רבע גמר — 4 משחקים, 9–11 יולי',
              'חצי גמר — 2 משחקים, 14–15 יולי',
              'משחק המקום השלישי — 18 יולי, מיאמי',
              'גמר — 19 יולי, ניו יורק/ניו ג׳רזי',
            ].map((r) => (
              <div key={r} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5 text-xs text-white/60">
                <span className="text-indigo-400">▸</span> {r}
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* ניקוד */}
      <GlassCard className="space-y-3">
        <h2 className="text-lg font-bold">שיטת הניקוד</h2>
        <p className="text-sm text-white/50">כל הקטגוריות עצמאיות ומצטברות.</p>
        <div className="divide-y divide-white/10">
          {SCORING_TABLE.map(({ cat, pts }) => (
            <div key={cat} className="flex items-center justify-between py-2">
              <span className="text-sm text-white/70 pr-4">{cat}</span>
              <span className="text-sm font-bold text-indigo-300 shrink-0">{pts}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 pt-2">
          במשחקי בית הניקוד מצטבר: תוצאה מדויקת = 1+2+3 = 6 נקודות.
          1X2 נכון + שערים נכון (אבל לא מדויק) = 3 נקודות. דירוגי ההתקדמות עצמאיים — קבוצה שנוחשה נכון מנקדת בכל שלב שהיא מגיעה אליו.
        </p>
      </GlassCard>

      <div className="text-center">
        <Link href="/predict" className="glass-btn-primary px-8 py-3 rounded-2xl text-sm font-semibold inline-block">
          בנה את הניחושים שלי ←
        </Link>
      </div>
    </div>
  )
}
