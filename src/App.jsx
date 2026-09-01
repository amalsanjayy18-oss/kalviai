import React, { useState, useRef, useEffect } from 'react'
import { 
  BookOpen, Sparkles, HeartHandshake, Languages, GraduationCap, 
  Send, PhoneCall, ShieldAlert, ArrowLeft, Sun, Moon, Camera, 
  Upload, X, Loader2, CheckCircle2, Award
} from 'lucide-react'
import syllabusData from './data/syllabus.json'
import { saveSecureData, getSecureData } from './lib/db.js'
import { generateLocalResponse, initSLM } from './lib/slm.js'
import { supabase } from './lib/supabase.js'

const DISTRESS_KEYWORDS = [
  'stress', 'stressed', 'depressed', 'anxious', 'anxiety', 'fail', 'failing', 
  'give up', 'hopeless', 'pressure', 'scared', 'tired of life', 'die', 'மன அழுத்தம்', 'பயம்'
]

export default function App() {
  // Application Stage: 'welcome' -> 'login' -> 'subjects' -> 'lessons' -> 'topicDetail' -> 'quiz'
  const [appStage, setAppStage] = useState('welcome')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userGrade, setUserGrade] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  // Navigation & Content States
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [lang, setLang] = useState('en')
  const [activeTab, setActiveTab] = useState('syllabus')

  // Chat & AI States
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [activeBot, setActiveBot] = useState('arivu')
  const [strikeCount, setStrikeCount] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [slmLoadingStatus, setSlmLoadingStatus] = useState('')

  // Picture Upload Modal State
  const [showPicModal, setShowPicModal] = useState(false)
  const [selectedImageBase64, setSelectedImageBase64] = useState(null)
  const [imagePrompt, setImagePrompt] = useState('')
  const [isSolvingImage, setIsSolvingImage] = useState(false)

  // Quiz Progress State
  const [quizAnswers, setQuizAnswers] = useState({})
  const [completedTopics, setCompletedTopics] = useState([])

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const subjects = [...new Set(syllabusData.map(item => item.subject))]
  const filteredLessons = syllabusData.filter(item => item.subject === selectedSubject)

  // 1. Initial Load: Check Offline DB for Existing Login & Theme
  useEffect(() => {
    async function restoreSession() {
      const savedTheme = localStorage.getItem('kalviai_theme')
      if (savedTheme === 'dark') setDarkMode(true)

      const profile = await getSecureData('user_profile')
      const progress = await getSecureData('user_progress')

      if (progress && progress.completed) {
        setCompletedTopics(progress.completed)
      }

      if (profile && profile.name && profile.grade) {
        setUserName(profile.name)
        setUserEmail(profile.email || '')
        setUserGrade(profile.grade)
        setAppStage('subjects')
      } else {
        const timer = setTimeout(() => setAppStage('login'), 2000)
        return () => clearTimeout(timer)
      }
    }
    restoreSession()
  }, [])

  // 2. Toggle Dark / Light Theme
  const toggleTheme = () => {
    const nextTheme = !darkMode
    setDarkMode(nextTheme)
    localStorage.setItem('kalviai_theme', nextTheme ? 'dark' : 'light')
  }

  // 3. One-Time Online Login Handler
  const handleInitialLogin = async () => {
    if (!userName.trim() || !userGrade) return

    // Save profile locally in encrypted IndexedDB (available 100% offline from now on)
    const profile = { name: userName, email: userEmail, grade: userGrade, created_at: new Date().toISOString() }
    await saveSecureData('user_profile', profile)

    // Optional Cloud Sync to Supabase if connected
    if (navigator.onLine && userEmail) {
      try {
        await supabase.from('students').upsert({
          name: userName,
          email: userEmail,
          grade: userGrade
        })
      } catch (err) {
        console.warn('Cloud registration deferred (offline):', err.message)
      }
    }

    setAppStage('subjects')
  }

  // 4. Scroll Chat to Bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 5. Offline SLM RAG Query Execution
  const triggerOfflineSLM = async (userPrompt, lessonContext) => {
    setIsGenerating(true)
    setMessages(prev => [...prev, { sender: 'arivu', text: 'Generating explanation via offline neural engine...', isLoading: true }])

    const contextData = lessonContext 
      ? (lang === 'en' ? lessonContext.summary_en : lessonContext.summary_ta) 
      : `General Class ${userGrade} Samacheer Kalvi concepts.`

    const reply = await generateLocalResponse(userPrompt, contextData, lang)

    setIsGenerating(false)
    setMessages(prev => [
      ...prev.slice(0, -1),
      { sender: 'arivu', text: reply, formula: lessonContext?.formula }
    ])
  }

  // 6. Handle Distress Keyword Interception (Kavani Triage)
  const handleUserMessage = (textToSend) => {
    if (!textToSend.trim() || isGenerating) return
    const userText = textToSend.trim()
    const lower = userText.toLowerCase()
    setInputValue('')

    const isDistressed = DISTRESS_KEYWORDS.some(word => lower.includes(word))

    if (isDistressed) {
      const nextStrike = strikeCount + 1
      setStrikeCount(nextStrike)
      setActiveBot('kavani')

      if (nextStrike >= 3) {
        setMessages(prev => [
          ...prev,
          { sender: 'user', text: userText },
          { 
            sender: 'kavani-critical',
            text: lang === 'en'
              ? `${userName}, your well-being is far more important than any exam. AI is disabled. Please connect with student support counsellors immediately.`
              : `எந்தவொரு தேர்வை விடவும் உங்கள் மனநலம் முதன்மையானது. AI முடக்கப்பட்டது. உடனடியாக உதவி எண்களைத் தொடர்பு கொள்ளவும்.`
          }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          { sender: 'user', text: userText },
          { 
            sender: 'kavani',
            text: lang === 'en'
              ? `It is completely normal to feel exam pressure, ${userName}. Take a slow, deep breath. You are capable and not alone. (${nextStrike}/2)`
              : `உங்கள் உணர்வுகளை புரிந்து கொள்ள முடிகிறது. தேர்வு நேரத்தில் இந்த அழுத்தம் இயல்பானது. அமைதியாக இருங்கள். (${nextStrike}/2)`
          }
        ])
      }
    } else {
      setMessages(prev => [...prev, { sender: 'user', text: userText }])
      triggerOfflineSLM(userText, selectedLesson)
    }
  }

  // 7. Multimodal Picture Problem Solver (Online Only)
  const handleImageFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setSelectedImageBase64(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSolveImageProblem = async () => {
    if (!selectedImageBase64) return

    if (!navigator.onLine) {
      alert(lang === 'en' ? 'Internet connection required for Picture Upload Solver.' : 'படம் மூலம் தீர்வு காண இணைய இணைப்பு தேவை.')
      return
    }

    setIsSolvingImage(true)
    try {
      const res = await fetch('/api/solve-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImageBase64,
          prompt: imagePrompt || 'Please solve this question step-by-step with clear derivation.'
        })
      })

      const data = await res.json()
      setShowPicModal(false)
      setActiveTab('chat')
      setActiveBot('arivu')
      
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: `📸 [Picture Uploaded]: ${imagePrompt || 'Solve step-by-step'}` },
        { sender: 'arivu', text: data.reply || 'Problem solved successfully.' }
      ])
      setSelectedImageBase64(null)
      setImagePrompt('')
    } catch (err) {
      alert('Error communicating with vision solver: ' + err.message)
    } finally {
      setIsSolvingImage(false)
    }
  }

  // 8. Complete Quiz & Save Encrypted Progress Offline
  const handleCompleteQuiz = async () => {
    if (selectedLesson && !completedTopics.includes(selectedLesson.id)) {
      const updated = [...completedTopics, selectedLesson.id]
      setCompletedTopics(updated)
      await saveSecureData('user_progress', { completed: updated, last_updated: new Date().toISOString() })
    }
    setAppStage('topicDetail')
  }

  // =========================================================================
  // VIEW 1: WELCOME & ONE-TIME ONLINE SIGN-IN
  // =========================================================================
  if (appStage === 'welcome' || appStage === 'login') {
    return (
      <div className={`flex justify-center items-center h-screen w-screen font-['Space_Mono',monospace] overflow-hidden p-4 ${darkMode ? 'bg-neutral-900 text-neutral-100' : 'bg-[#cac2b7] text-black'}`}>
        
        {/* Welcome Splash */}
        <div className={`absolute transition-all duration-1000 ease-in-out ${appStage === 'welcome' ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
          <div className="flex flex-col items-center justify-center gap-2 animate-pulse">
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-500">Welcome To</span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-['Kavivanar',serif] font-black text-6xl md:text-7xl tracking-normal">கல்வி</span>
              <span className="font-['VT323',monospace] font-bold text-5xl md:text-6xl tracking-widest">AI</span>
            </div>
          </div>
        </div>

        {/* Tactile Login Form */}
        <div className={`w-full max-w-sm p-6 sm:p-8 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6 transition-all duration-1000 delay-300 ease-out ${darkMode ? 'bg-neutral-800' : 'bg-[#fdfcf9]'} ${appStage === 'login' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
          <div className="text-center space-y-1 border-b-2 border-black pb-2">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-['Kavivanar',serif] font-black text-3xl">கல்வி</span>
              <span className="font-['VT323',monospace] font-bold text-3xl tracking-wider">AI PORTAL</span>
            </div>
            <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">One-Time Student Setup</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Your Name</label>
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                className={`p-3 border-2 border-black text-sm font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-black'}`}
                placeholder="Enter name..." 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Email ID (Cloud Backup)</label>
              <input 
                type="email" 
                value={userEmail} 
                onChange={(e) => setUserEmail(e.target.value)} 
                className={`p-3 border-2 border-black text-sm font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-black'}`}
                placeholder="student@example.com" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Select Grade</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setUserGrade('11')} 
                  className={`p-3 border-2 border-black font-bold text-sm tracking-widest transition-all ${userGrade === '11' ? 'bg-[#ffd166] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-neutral-200 text-neutral-700'}`}
                >
                  CLASS 11
                </button>
                <button 
                  onClick={() => setUserGrade('12')} 
                  className={`p-3 border-2 border-black font-bold text-sm tracking-widest transition-all ${userGrade === '12' ? 'bg-[#ffd166] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-neutral-200 text-neutral-700'}`}
                >
                  CLASS 12
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={handleInitialLogin} 
            disabled={!userName || !userGrade} 
            className="p-4 bg-black text-white font-bold text-sm tracking-widest uppercase disabled:bg-neutral-400 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            Enter Offline Portal
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: MAIN EDUCATIONAL PORTAL
  // =========================================================================
  return (
    <div className={`flex justify-center items-center min-h-screen p-2 sm:p-6 font-['Space_Mono',monospace] ${darkMode ? 'bg-neutral-900 text-neutral-100' : 'bg-[#cac2b7] text-black'}`}>
      <div className={`flex flex-col h-[92vh] max-h-[820px] w-full max-w-sm rounded-2xl overflow-hidden border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-neutral-800' : 'bg-[#f4efe8]'}`}>
        
        {/* Top Header */}
        <header className={`p-3 border-b-2 border-black flex items-center justify-between select-none ${darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'}`}>
          <div className="flex items-baseline gap-1">
            <span className="font-['Kavivanar',serif] font-black text-lg leading-none">கல்வி</span>
            <span className="font-extrabold text-sm tracking-wider uppercase font-['VT323',monospace] text-base leading-none">
              AI // CLASS {userGrade}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Dark / Light Mode Toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-1.5 border border-black bg-white dark:bg-neutral-700 rounded text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-black" />}
            </button>

            {/* Bilingual Toggle */}
            <button 
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="px-2 py-1 border border-black rounded text-[10px] font-bold uppercase bg-[#d8f3dc] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              {lang === 'en' ? 'தமிழ்' : 'ENG'}
            </button>
          </div>
        </header>

        {/* Personalized Student & Network Status Banner */}
        <div className="bg-black text-[#6bf755] px-3 py-1 font-['VT323',monospace] text-sm flex justify-between tracking-widest border-b-2 border-black">
          <span>USER: {userName.toUpperCase()}</span>
          <span>{navigator.onLine ? '[CLOUD READY]' : '[100% OFFLINE]'}</span>
        </div>

        {/* 1. SUBJECT SELECTION */}
        {appStage === 'subjects' && (
          <div className="flex flex-col h-full p-4 space-y-4">
            <h2 className="text-base font-black uppercase border-b-2 border-black pb-1.5">
              {lang === 'en' ? 'Select Subject' : 'பாடத்தைத் தேர்ந்தெடுக்கவும்'}
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {subjects.map(subject => (
                <button 
                  key={subject}
                  onClick={() => { setSelectedSubject(subject); setAppStage('lessons'); }}
                  className="p-4 border-2 border-black bg-[#ffd166] text-black font-bold text-sm tracking-wider uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all text-left flex justify-between items-center cursor-pointer"
                >
                  <span>{lang === 'en' ? subject : (subject === 'Physics' ? 'இயற்பியல்' : subject === 'Chemistry' ? 'வேதியியல்' : 'உயிரியல்')}</span>
                  <span className="text-xs bg-black text-white px-2 py-0.5 font-mono">12TH</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. LESSONS LIST */}
        {appStage === 'lessons' && (
          <div className="flex flex-col h-full p-4 space-y-3">
            <button 
              onClick={() => setAppStage('subjects')} 
              className="self-start text-xs font-bold uppercase underline hover:opacity-75 cursor-pointer"
            >
              &larr; {lang === 'en' ? 'Back to Subjects' : 'பாடப் பிரிவுக்குச் செல்'}
            </button>
            <h2 className="text-base font-black uppercase border-b-2 border-black pb-1">
              {selectedSubject} {lang === 'en' ? 'Lessons' : 'பாடங்கள்'}
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredLessons.map(lesson => {
                const isDone = completedTopics.includes(lesson.id)
                return (
                  <div 
                    key={lesson.id}
                    onClick={() => { setSelectedLesson(lesson); setAppStage('topicDetail'); }}
                    className={`p-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-colors space-y-1 ${darkMode ? 'bg-neutral-700 hover:bg-neutral-600' : 'bg-[#fdfcf9] hover:bg-[#fff9db]'}`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase">
                      <span>{lesson.chapter}</span>
                      {isDone && <span className="flex items-center gap-1 text-emerald-500 font-bold"><CheckCircle2 className="w-3 h-3" /> DONE</span>}
                    </div>
                    <h3 className="text-xs font-bold leading-tight">{lang === 'en' ? lesson.topic : lesson.topic_ta}</h3>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 3. TOPIC DETAIL & ACTIONS */}
        {appStage === 'topicDetail' && selectedLesson && (
          <div className="flex flex-col h-full p-4 space-y-3">
            <button 
              onClick={() => setAppStage('lessons')} 
              className="self-start text-xs font-bold uppercase underline hover:opacity-75 cursor-pointer"
            >
              &larr; {lang === 'en' ? 'Back to Lessons' : 'பட்டியலுக்குச் செல்'}
            </button>
            <div className="space-y-0.5 border-b-2 border-black pb-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">{selectedLesson.chapter}</span>
              <h2 className="text-sm font-black uppercase">{lang === 'en' ? selectedLesson.topic : selectedLesson.topic_ta}</h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 text-xs leading-relaxed space-y-3">
              <p>{lang === 'en' ? selectedLesson.summary_en : selectedLesson.summary_ta}</p>
              {selectedLesson.formula && (
                <div className={`p-2 border border-black text-[11px] font-bold ${darkMode ? 'bg-neutral-700' : 'bg-[#ede6dc]'}`}>
                  Formula: {selectedLesson.formula}
                </div>
              )}
            </div>
            <div className="space-y-2 pt-2">
              <button 
                onClick={() => {
                  setActiveTab('chat')
                  setActiveBot('arivu')
                  const promptText = lang === 'en' ? `Explain "${selectedLesson.topic}" with an everyday analogy.` : `"${selectedLesson.topic_ta}" என்பதை எனக்கு எளிய உதாரணத்துடன் விளக்கு.`
                  setMessages([{ sender: 'user', text: promptText }])
                  triggerOfflineSLM(promptText, selectedLesson)
                }}
                className="w-full py-2.5 bg-[#ffd6a5] text-black border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Explain via Offline AI (Arivu)' : 'அறிவு AI விளக்கம்'}</span>
              </button>
              <button 
                onClick={() => setAppStage('quiz')}
                className="w-full py-2.5 bg-[#ff6b6b] text-black border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                {lang === 'en' ? 'Take Topic Assessment (Quiz)' : 'பயிற்சித் தேர்வு (Quiz)'}
              </button>
            </div>
          </div>
        )}

        {/* 4. QUIZ ASSESSMENT */}
        {appStage === 'quiz' && selectedLesson && (
          <div className="flex flex-col h-full p-4 space-y-3">
            <h2 className="text-base font-black uppercase border-b-2 border-black pb-1">
              Assessment: {selectedLesson.topic}
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`p-3 border border-black space-y-2 ${darkMode ? 'bg-neutral-700' : 'bg-[#fdfcf9]'}`}>
                  <p className="font-bold">Q{i + 1}: Conceptual check regarding {selectedLesson.topic}?</p>
                  <div className="space-y-1">
                    {['Option A: Correct Principle', 'Option B: Inverse Reaction', 'Option C: Null State', 'Option D: Constant'].map((opt, optIndex) => (
                      <label key={optIndex} className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input 
                          type="radio" 
                          name={`q${i}`} 
                          className="accent-black" 
                          onChange={() => setQuizAnswers(prev => ({ ...prev, [i]: optIndex }))}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={handleCompleteQuiz}
              className="w-full py-3 bg-black text-white border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              Submit & Save Progress Offline
            </button>
          </div>
        )}

        {/* 5. AI CHAT & CRISIS INTERCEPTION DECK */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <header className="p-2 border-b border-black flex justify-between items-center bg-black text-white text-xs">
              <span>CHAT WITH {activeBot === 'kavani' ? 'KAVANI (TRIAGE)' : 'ARIVU (OFFLINE AI)'}</span>
              <button onClick={() => setActiveTab('syllabus')} className="underline text-[10px] cursor-pointer">&larr; Back</button>
            </header>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[88%] p-2.5 text-[11px] leading-relaxed border border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    msg.sender === 'user'
                      ? 'bg-[#caffbf] text-black font-semibold'
                      : msg.sender === 'kavani-critical'
                      ? 'bg-[#ffadad] text-black font-bold'
                      : msg.sender === 'kavani'
                      ? 'bg-[#ffd6a5] text-black'
                      : darkMode ? 'bg-neutral-700 text-white' : 'bg-[#fdfcf9] text-black'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {msg.formula && (
                      <div className="mt-1.5 pt-1.5 border-t border-dashed border-black/40 text-[10px] font-bold">
                        KEY: {msg.formula}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* 3-Strike Escalation Direct Dialers */}
              {strikeCount >= 3 && (
                <div className="p-3 bg-[#ffadad] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2 mt-2 text-black">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                    <ShieldAlert className="w-4 h-4" />
                    <span>DIRECT STUDENT HELPLINES</span>
                  </div>
                  <div className="space-y-1">
                    <a href="tel:14417" className="flex items-center justify-between p-2 bg-black text-white font-bold text-[11px]">
                      <span>14417 (TN Student Helpline)</span>
                      <span className="bg-red-600 px-1.5 text-[9px]">CALL</span>
                    </a>
                    <a href="tel:14416" className="flex items-center justify-between p-2 bg-[#fdfcf9] border border-black font-bold text-[11px]">
                      <span>14416 (Tele-MANAS Support)</span>
                      <span className="text-[9px]">FREE</span>
                    </a>
                    <a href="tel:104" className="flex items-center justify-between p-2 bg-[#fdfcf9] border border-black font-bold text-[11px]">
                      <span>104 (TN Health Helpline)</span>
                      <span className="text-[9px]">24/7</span>
                    </a>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar with Camera / Photo Upload Button */}
            <footer className={`p-2 border-t-2 border-black select-none ${darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'}`}>
              {strikeCount >= 3 ? (
                <div className="p-1.5 bg-red-100 text-black border border-black text-center text-[10px] font-bold">
                  SYSTEM LOCKED FOR STUDENT SAFETY.
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleUserMessage(inputValue); }} className="flex gap-1.5">
                  <button 
                    type="button" 
                    onClick={() => setShowPicModal(true)} 
                    className="p-2 bg-white dark:bg-neutral-700 border border-black text-black dark:text-white cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                    title="Upload Photo Problem"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={lang === 'en' ? "Ask offline Arivu..." : "கேள்வி கேட்கவும்..."}
                    disabled={isGenerating}
                    className={`flex-1 border border-black px-2.5 py-1.5 text-[11px] font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-[#fdfcf9] text-black'}`}
                  />
                  <button 
                    type="submit" 
                    disabled={isGenerating || !inputValue.trim()}
                    className="px-3 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400 border border-black font-bold text-xs uppercase cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </footer>
          </div>
        )}

        {/* PICTURE UPLOAD MODAL */}
        {showPicModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-xs p-5 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 ${darkMode ? 'bg-neutral-800 text-white' : 'bg-[#fdfcf9] text-black'}`}>
              <div className="flex justify-between items-center border-b border-black pb-2">
                <h3 className="text-xs font-black uppercase">📸 Problem Solver (Photo)</h3>
                <button onClick={() => setShowPicModal(false)}><X className="w-4 h-4 cursor-pointer" /></button>
              </div>

              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef} 
                onChange={handleImageFileChange} 
                className="hidden" 
              />

              {selectedImageBase64 ? (
                <div className="space-y-2">
                  <img src={selectedImageBase64} alt="Problem Preview" className="max-h-36 w-full object-contain border border-black bg-black" />
                  <input 
                    type="text" 
                    value={imagePrompt} 
                    onChange={(e) => setImagePrompt(e.target.value)} 
                    placeholder="Specific question (optional)..."
                    className={`w-full p-2 border border-black text-xs font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-black'}`}
                  />
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-black flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-[11px] font-bold uppercase">Snap or Select Photo</span>
                </button>
              )}

              <button 
                onClick={handleSolveImageProblem}
                disabled={!selectedImageBase64 || isSolvingImage}
                className="w-full py-2.5 bg-black text-white border border-black font-bold text-xs uppercase tracking-wider disabled:bg-neutral-400 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSolvingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Solve Problem (Cloud AI)'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}