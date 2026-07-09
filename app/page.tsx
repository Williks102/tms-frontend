import Link from 'next/link';

const ACTIONS = [
  {
    href:  '/billets',
    icon:  '🎫',
    title: 'Acheter un billet',
    desc:  'Réservez votre trajet en ligne, siège attribué automatiquement',
    accent: 'border-blue-500/20 hover:border-blue-500/40',
    iconBg: 'bg-blue-500/10 text-blue-400',
  },
  {
    href:  '/suivi-colis',
    icon:  '📦',
    title: 'Suivre un colis',
    desc:  'Entrez votre numéro de suivi pour connaître le statut de votre envoi',
    accent: 'border-orange-500/20 hover:border-orange-500/40',
    iconBg: 'bg-orange-500/10 text-orange-400',
  },
  {
    href:  '/mes-achats',
    icon:  '🧾',
    title: 'Mes achats',
    desc:  'Retrouvez vos billets et colis avec votre numéro de téléphone',
    accent: 'border-purple-500/20 hover:border-purple-500/40',
    iconBg: 'bg-purple-500/10 text-purple-400',
  },
  {
    href:  '/board',
    icon:  '🖥',
    title: 'Départs / Arrivées',
    desc:  'Consultez le tableau des départs et arrivées en temps réel',
    accent: 'border-emerald-500/20 hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#060A14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Fond décoratif — même mécanique que /login */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#94a3b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="w-full max-w-2xl relative py-10">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <span className="text-2xl font-black text-blue-400 font-[family-name:var(--font-syne)]">T</span>
          </div>
          <h1 className="text-2xl font-black text-white font-[family-name:var(--font-syne)] tracking-tight">
            TMS — Côte d&apos;Ivoire
          </h1>
          <p className="text-slate-500 text-sm mt-1">Transport Management System</p>
        </div>

        {/* Actions publiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`bg-[#080D1A] border ${action.accent} rounded-2xl p-5 flex items-start gap-4 transition-all shadow-lg shadow-black/20 hover:shadow-black/40`}
            >
              <div className={`w-11 h-11 rounded-xl ${action.iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
                {action.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white font-[family-name:var(--font-syne)]">{action.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Espace gestionnaire */}
        <div className="bg-[#080D1A] border border-slate-800/60 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-300 font-[family-name:var(--font-syne)]">Espace gestionnaire</p>
            <p className="text-xs text-slate-600 mt-0.5">Manager, RH, comptabilité, chauffeurs, guichet...</p>
          </div>
          <Link
            href="/login"
            className="flex-shrink-0 rounded-xl bg-blue-500 hover:bg-blue-400 px-5 py-2.5 text-sm font-bold text-white font-[family-name:var(--font-syne)] uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20"
          >
            Se connecter
          </Link>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-6 font-[family-name:var(--font-mono)]">
          TMS · Laravel 13 · Next.js 16 · Neon PostgreSQL
        </p>
      </div>
    </div>
  );
}
