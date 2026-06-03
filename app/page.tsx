import Link from 'next/link'
import CountdownTimer from '@/components/ui/CountdownTimer'
import GlassCard from '@/components/ui/GlassCard'

const FEATURES = [
  { icon: '🗂️', title: 'דרגו את כל 12 הבתים',   body: 'גררו את 4 הקבוצות בכל בית לפי הסדר שאתם מנחשים. מי יהיה ראשון, מי שני, ומי ייפול.' },
  { icon: '🏆', title: 'בנו את הסבב שלכם',        body: 'שלב 32 מתמלא אוטומטית מהבתים. בחרו את 8 הקבוצות שלדעתכם יעברו במקום השלישי, ואחר כך נחשו כל משחק נוקאאוט עד הגמר.' },
  { icon: '📊', title: 'טבלת ניקוד בזמן אמת',    body: 'ראו איפה אתם עומדים לעומת החברים ככל שהתוצאות מתפרסמות. תוצאות מדויקות, 1X2 נכון, התקדמות של קבוצות — כל נקודה קובעת.' },
  { icon: '🔒', title: 'אנטי-העתקה',              body: 'אי אפשר לראות ניחושים של אחרים עד שהמשחק הרלוונטי מתחיל. כולם מנחשים בעצמם — בלי להסתכל על השכן.' },
]

function FieldDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 opacity-[0.055] w-[700px] max-w-full"
        viewBox="0 0 700 500" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="20" y="20" width="660" height="460" rx="4" stroke="white" strokeWidth="2"/>
        <line x1="350" y1="20" x2="350" y2="480" stroke="white" strokeWidth="1.5"/>
        <circle cx="350" cy="250" r="70" stroke="white" strokeWidth="1.5"/>
        <circle cx="350" cy="250" r="3" fill="white"/>
        <rect x="20" y="140" width="120" height="220" stroke="white" strokeWidth="1.5"/>
        <rect x="20" y="195" width="50" height="110" stroke="white" strokeWidth="1.5"/>
        <circle cx="92" cy="250" r="3" fill="white"/>
        <path d="M 140 185 A 70 70 0 0 1 140 315" stroke="white" strokeWidth="1.5"/>
        <rect x="560" y="140" width="120" height="220" stroke="white" strokeWidth="1.5"/>
        <rect x="630" y="195" width="50" height="110" stroke="white" strokeWidth="1.5"/>
        <circle cx="608" cy="250" r="3" fill="white"/>
        <path d="M 560 185 A 70 70 0 0 0 560 315" stroke="white" strokeWidth="1.5"/>
        <path d="M 20 36 A 16 16 0 0 1 36 20" stroke="white" strokeWidth="1.5"/>
        <path d="M 664 20 A 16 16 0 0 1 680 36" stroke="white" strokeWidth="1.5"/>
        <path d="M 20 464 A 16 16 0 0 0 36 480" stroke="white" strokeWidth="1.5"/>
        <path d="M 664 480 A 16 16 0 0 0 680 464" stroke="white" strokeWidth="1.5"/>
      </svg>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-20">
      {/* Hero */}
      <section className="relative text-center space-y-6 animate-fade-in py-8">
        <FieldDecoration />
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm text-emerald-300/80 border-emerald-600/30">
            <span>🇺🇸 🇨🇦 🇲🇽</span>
            <span>מונדיאל 2026 — ארה״ב, קנדה, מקסיקו</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-shadow leading-none">
            טוטו-תורן
          </h1>
          <p className="text-lg sm:text-xl text-white/65 max-w-xl mx-auto leading-relaxed">
            נחשו את מונדיאל 2026 עם החברים. בנו את הטבלה שלכם, הוכיחו שידעתם.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/predict" className="glass-btn-primary px-8 py-3.5 rounded-2xl text-base font-semibold glow-green">
              בנה את הניחושים שלי ←
            </Link>
            <Link href="/leaderboard" className="glass glass-hover px-8 py-3.5 rounded-2xl text-base font-semibold">
              טבלת ניקוד
            </Link>
          </div>
        </div>
      </section>

      {/* Countdown */}
      <section>
        <CountdownTimer />
      </section>

      {/* Features */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center text-shadow">איך זה עובד?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <GlassCard key={f.title} className="space-y-2">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Scoring */}
      <section>
        <GlassCard className="space-y-4">
          <h2 className="text-xl font-bold text-shadow">שיטת הניקוד</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              ['תוצאה מדויקת (כמה:כמה)',         '+3 נק׳'],
              ['1X2 נכון (מי ניצח)',               '+1 נק׳'],
              ['מספר שערים נכון במשחק',           '+2 נק׳'],
              ['ניחוש מנצח הבית',                  '+2 נק׳'],
              ['ניחוש קבוצה בטופ-2',              '+1 נק׳'],
              ['קבוצה עוברת שלב 32 ← 16',         '+4 נק׳'],
              ['קבוצה עוברת שלב 16 ← רבע',        '+5 נק׳'],
              ['קבוצה עוברת רבע ← חצי',           '+6 נק׳'],
              ['קבוצה עוברת חצי ← גמר',           '+7 נק׳'],
              ['ניחוש אלוף גביע העולם',            '+15 נק׳'],
            ].map(([label, pts]) => (
              <div key={label} className="flex items-center justify-between glass rounded-xl px-3 py-2">
                <span className="text-white/65">{label}</span>
                <span className="font-bold text-emerald-300">{pts}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  )
}
