import React, { useState } from 'react'
import { BookOpen, Sparkles, HeartHandshake, Languages } from 'lucide-react'

export default function App() {
  const [lang, setLang] = useState('en')

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-900 text-slate-100 shadow-2xl overflow-hidden font-sans border-x border-slate-800">
      {/* Top Bar with Persistent Bilingual Toggle */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-lg tracking-tight">KalviAI</span>
        </div>
        <button 
          onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 active:scale-95 transition-all cursor-pointer"
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>
      </header>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              {lang === 'en' ? 'Phase 1 Ready' : 'படிநிலை 1 தயார்'}
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {lang === 'en' 
              ? 'React, Tailwind, and Service Worker caching are active. Offline-first foundation is running.' 
              : 'React, Tailwind மற்றும் Service Worker தயார் நிலையில் உள்ளது. ஆஃப்லைன் கட்டமைப்பு செயல்படுகிறது.'}
          </p>
        </div>
      </main>

      {/* Mobile One-Handed Bottom Nav */}
      <footer className="p-3 bg-slate-800/90 border-t border-slate-700 flex justify-around">
        <button className="flex flex-col items-center gap-1 text-indigo-400 text-xs font-medium">
          <BookOpen className="w-5 h-5" />
          <span>{lang === 'en' ? 'Syllabus' : 'பாடத்திட்டம்'}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-medium">
          <HeartHandshake className="w-5 h-5" />
          <span>{lang === 'en' ? 'Support' : 'உதவி'}</span>
        </button>
      </footer>
    </div>
  )
}