import React, { useState, useRef, useEffect } from 'react'
import { 
  BookOpen, Sparkles, HeartHandshake, Languages, GraduationCap, 
  Send, PhoneCall, ShieldAlert, ArrowLeft, Sun, Moon, 
  CheckCircle2, Award, LayoutDashboard, LogOut, BarChart3, 
  Check, X, Camera, Upload, Loader2
} from 'lucide-react'
import syllabusData from './data/syllabus.json'
import { saveSecureData, getSecureData } from './lib/db.js'
import { generateLocalResponse } from './lib/slm.js'
import { supabase } from './lib/supabase.js'

const DISTRESS_KEYWORDS = [
  'stress', 'stressed', 'depressed', 'anxious', 'anxiety', 'fail', 'failing', 
  'give up', 'hopeless', 'pressure', 'scared', 'tired of life', 'die', 'மன அழுத்தம்', 'பயம்'
]

const SAMPLE_QUIZ_QUESTIONS = [
  {
    q_en: "What is the primary governing principle of this concept?",
    q_ta: "இக்கோட்பாட்டின் முதன்மையான அடிப்படை விதி எது?",
    options_en: ["Direct proportional relationship", "Inverse cubic decrease", "Zero net interaction", "Constant saturation state"],
    options_ta: ["நேர்விகித தொடர்பு", "தலைகீழ் முப்படி குறைவு", "சுழி தொடர்பு", "நிலையான செறிவு நிலை"],
    correct: 0
  },
  {
    q_en: "Under which specific boundary conditions does this law hold true?",
    q_ta: "எந்த குறிப்பிட்ட நிபந்தனைகளின் கீழ் இந்த விதி பொருந்தும்?",
    options_en: ["Only at absolute zero", "In standard vacuum or uniform media", "During relativistic velocity only", "Under extreme thermal fluctuation"],
    options_ta: ["முழுமையான சுழி வெப்பநிலையில்", "வெற்றிடம் அல்லது சீரான ஊடகத்தில்", "ஒளி வேக இயக்கத்தில் மட்டும்", "அதிக வெப்ப மாறுபாட்டில்"],
    correct: 1
  },
  {
    q_en: "How does doubling the intervening distance impact the net resultant magnitude?",
    q_ta: "தொலைவை இருமடங்காக அதிகரித்தால் ஏற்படும் விளைவு என்ன?",
    options_en: ["Increases by 2x", "Remains unchanged", "Reduces to 1/4th (Inverse Square)", "Doubles exponentially"],
    options_ta: ["2 மடங்கு அதிகரிக்கும்", "மாற்றமிருக்காது", "1/4 மடங்காகக் குறையும் (எதிர் இருமடி)", "அதிவேகமாக இரட்டிப்பாகும்"],
    correct: 2
  },
  {
    q_en: "Which standard SI unit is assigned to the primary calculated variable?",
    q_ta: "இக்கோட்பாட்டின் முக்கிய மாறிலியின் SI அலகு எது?",
    options_en: ["Newton (N) / Joule (J)", "Coulomb / Farad", "Tesla / Weber", "Pascal / Watt"],
    options_ta: ["நியூட்டன் (N) / ஜூல் (J)", "கூலும் / பாரட்", "டெஸ்லா / வெபர்", "பாஸ்கல் / வாட்"],
    correct: 0
  },
  {
    q_en: "In practical engineering, where is this concept predominantly applied?",
    q_ta: "நடைமுறை பொறியியலில் இதன் நேரடி பயன்பாடு எங்குள்ளது?",
    options_en: ["Circuit design & energy storage capacitors", "Acoustic dampening", "Optic fiber dispersion", "Hydraulic fluid pumps"],
    options_ta: ["மின்சுற்று மற்றும் மின்தேக்கிகள்", "ஒலித் தடுப்பான்", "ஒளி இழை ஊடகம்", "நீரியல் பம்புகள்"],
    correct: 0
  }
]

export default function App() {
  const [appStage, setAppStage] = useState('welcome')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [syllabusView, setSyllabusView] = useState('subjects')

  // User Profile
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userGrade, setUserGrade] = useState('12')
  const [lang, setLang] = useState('en')
  const [darkMode, setDarkMode] = useState(false)

  // Navigation & Content
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedLesson, setSelectedLesson] = useState(null)

  // Chat & AI State
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [activeBot, setActiveBot] = useState('arivu')
  const [strikeCount, setStrikeCount] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // Picture Upload State
  const [showPicModal, setShowPicModal] = useState(false)
  const [selectedImageBase64, setSelectedImageBase64] = useState(null)
  const [imagePrompt, setImagePrompt] = useState('')
  const [isSolvingImage, setIsSolvingImage] = useState(false)

  // Assessment & Marks State
  const [topicProgress, setTopicProgress] = useState({})
  const [currentQuizSelection, setCurrentQuizSelection] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [currentQuizScore, setCurrentQuizScore] = useState(0)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const subjects = [...new Set(syllabusData.map(item => item.subject))]
  const filteredLessons = syllabusData.filter(item => item.subject === selectedSubject)

  // 1. Initial Session Restore from Local Encrypted DB
  useEffect(() => {
    async function restoreSession() {
      const savedTheme = localStorage.getItem('kalviai_theme')
      if (savedTheme === 'dark') setDarkMode(true)

      const profile = await getSecureData('user_profile')
      const progress = await getSecureData('user_progress_data')

      if (progress) setTopicProgress(progress)

      if (profile && profile.name) {
        setUserName(profile.name)
        setUserEmail(profile.email || '')
        setUserGrade(profile.grade || '12')
        setAppStage('main')
      } else {
        const timer = setTimeout(() => setAppStage('login'), 2000)
        return () => clearTimeout(timer)
      }
    }
    restoreSession()
  }, [])

  const saveProgressToDisk = async (updatedProgress) => {
    setTopicProgress(updatedProgress)
    await saveSecureData('user_progress_data', updatedProgress)
  }

  const toggleTheme = () => {
    const nextTheme = !darkMode
    setDarkMode(nextTheme)
    localStorage.setItem('kalviai_theme', nextTheme ? 'dark' : 'light')
  }

  // 2. Initial Setup (Local Persistence + Secondary Cloud Auth Sync)
  const handleLogin = async () => {
    if (!userName.trim() || !userGrade) return
    const profile = { name: userName.trim(), email: userEmail.trim(), grade: userGrade }
    await saveSecureData('user_profile', profile)

    // ATTRIBUTION: Secondary user registration via Supabase
    if (navigator.onLine && userEmail.trim()) {
      try {
        await supabase.from('students').upsert({
          name: userName.trim(),
          email: userEmail.trim(),
          grade: userGrade
        })
      } catch (err) {
        console.warn('Cloud registration sync deferred:', err.message)
      }
    }

    setAppStage('main')
    setActiveTab('dashboard')
  }

  const handleLogout = async () => {
    await saveSecureData('user_profile', null)
    setUserName('')
    setUserEmail('')
    setTopicProgress({})
    setStrikeCount(0)
    setMessages([])
    setAppStage('login')
  }

  // 3. Metrics Calculations
  const totalTopicsCount = syllabusData.length
  const completedTopicsList = Object.keys(topicProgress).filter(id => topicProgress[id]?.completed)
  const completedCount = completedTopicsList.length
  const overallPercentage = totalTopicsCount > 0 ? Math.round((completedCount / totalTopicsCount) * 100) : 0
  const totalScoresSum = completedTopicsList.reduce((sum, id) => sum + (topicProgress[id]?.score || 0), 0)
  const averageScore = completedCount > 0 ? Math.round(totalScoresSum / completedCount) : 0

  const getSubjectMetrics = (subjectName) => {
    const subjectTopics = syllabusData.filter(item => item.subject === subjectName)
    const total = subjectTopics.length
    const completed = subjectTopics.filter(item => topicProgress[item.id]?.completed).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percent }
  }

  // 4. On-Device SLM Query Execution (Arivu)
  const triggerOfflineSLM = async (userPrompt, lessonContext) => {
    setIsGenerating(true)
    setMessages(prev => [...prev, { sender: 'arivu', text: 'Analyzing via on-device SLM...', isLoading: true }])

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

  // 5. Message Dispatcher & Kavani Interception
  const handleSendMessage = (textToSend) => {
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
              ? `It is completely normal to feel exam pressure, ${userName}. Take a slow, deep breath. You are capable and not alone.`
              : `உங்கள் உணர்வுகளை புரிந்து கொள்ள முடிகிறது. தேர்வு நேரத்தில் இந்த அழுத்தம் இயல்பானது. அமைதியாக இருங்கள்.`
          }
        ])
      }
    } else {
      setMessages(prev => [...prev, { sender: 'user', text: userText }])
      triggerOfflineSLM(userText, selectedLesson)
    }
  }

  // 6. Multimodal Vision Problem Solver
  const handleImageFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => setSelectedImageBase64(event.target.result)
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
      // ATTRIBUTION: Secondary multimodal reasoning proxied via /api/solve-problem
      const res = await fetch('/api/solve-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImageBase64,
          prompt: imagePrompt || 'Please solve this academic problem step-by-step with clear derivation.'
        })
      })

      const data = await res.json()
      setShowPicModal(false)
      setActiveTab('chat')
      setActiveBot('arivu')
      
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: `📸 [Picture Uploaded]: ${imagePrompt || 'Solve step-by-step'}` },
        { sender: 'arivu', text: data.reply || 'Problem solution generated.' }
      ])
      setSelectedImageBase64(null)
      setImagePrompt('')
    } catch (err) {
      alert('Error connecting to vision solver: ' + err.message)
    } finally {
      setIsSolvingImage(false)
    }
  }

  // 7. Quiz Grading & Submission
  const handleSubmitQuiz = async () => {
    if (!selectedLesson) return
    let correctCount = 0
    SAMPLE_QUIZ_QUESTIONS.forEach((q, index) => {
      if (currentQuizSelection[index] === q.correct) correctCount += 1
    })

    const finalMarks = Math.round((correctCount / SAMPLE_QUIZ_QUESTIONS.length) * 100)
    setCurrentQuizScore(finalMarks)
    setQuizSubmitted(true)

    const updated = {
      ...topicProgress,
      [selectedLesson.id]: {
        completed: true,
        score: finalMarks,
        answers: currentQuizSelection,
        updatedAt: new Date().toISOString()
      }
    }
    await saveProgressToDisk(updated)
  }

  const startQuizForTopic = (lesson) => {
    setSelectedLesson(lesson)
    setQuizSubmitted(false)
    setCurrentQuizSelection(topicProgress[lesson.id]?.answers || {})
    setCurrentQuizScore(topicProgress[lesson.id]?.score || 0)
    setSyllabusView('quiz')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // =========================================================================
  // VIEW 1: ONBOARDING & LOGIN
  // =========================================================================
  if (appStage === 'welcome' || appStage === 'login') {
    return (
      <div className={`flex justify-center items-center h-screen w-screen font-['Space_Mono',monospace] overflow-hidden p-4 ${darkMode ? 'bg-neutral-900 text-neutral-100' : 'bg-[#cac2b7] text-black'}`}>
        <div className={`absolute transition-all duration-1000 ease-in-out ${appStage === 'welcome' ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
          <div className="flex flex-col items-center justify-center gap-2 animate-pulse">
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-500">Welcome To</span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-['Kavivanar',serif] font-black text-6xl md:text-7xl">கல்வி</span>
              <span className="font-['VT323',monospace] font-bold text-5xl md:text-6xl tracking-widest">AI</span>
            </div>
          </div>
        </div>

        <div className={`w-full max-w-sm p-6 sm:p-8 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-5 transition-all duration-1000 delay-300 ease-out ${darkMode ? 'bg-neutral-800' : 'bg-[#fdfcf9]'} ${appStage === 'login' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
          <div className="text-center space-y-1 border-b-2 border-black pb-2">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-['Kavivanar',serif] font-black text-3xl">கல்வி</span>
              <span className="font-['VT323',monospace] font-bold text-3xl tracking-wider">AI PORTAL</span>
            </div>
            <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">One-Time Student Setup</p>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider">Student Name</label>
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                className={`p-2.5 border-2 border-black text-sm font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-black'}`}
                placeholder="Enter name..." 
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider">Email (Cloud Backup)</label>
              <input 
                type="email" 
                value={userEmail} 
                onChange={(e) => setUserEmail(e.target.value)} 
                className={`p-2.5 border-2 border-black text-sm font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-black'}`}
                placeholder="student@example.com" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider">Select Grade</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setUserGrade('11')} 
                  className={`p-2.5 border-2 border-black font-bold text-xs tracking-widest transition-all ${userGrade === '11' ? 'bg-[#ffd166] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'bg-neutral-200 text-neutral-700'}`}
                >
                  CLASS 11
                </button>
                <button 
                  onClick={() => setUserGrade('12')} 
                  className={`p-2.5 border-2 border-black font-bold text-xs tracking-widest transition-all ${userGrade === '12' ? 'bg-[#ffd166] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'bg-neutral-200 text-neutral-700'}`}
                >
                  CLASS 12
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogin} 
            disabled={!userName.trim()} 
            className="p-3.5 bg-black text-white font-bold text-xs tracking-widest uppercase disabled:bg-neutral-400 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            Launch Portal
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: MAIN EDUCATIONAL DASHBOARD
  // =========================================================================
  return (
    <div className={`flex justify-center items-center min-h-screen p-2 sm:p-6 font-['Space_Mono',monospace] ${darkMode ? 'bg-neutral-900 text-neutral-100' : 'bg-[#cac2b7] text-black'}`}>
      <div className={`flex flex-col h-[92vh] max-h-[820px] w-full max-w-sm rounded-2xl overflow-hidden border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-neutral-800' : 'bg-[#f4efe8]'}`}>
        
        {/* Top Navigation Bar */}
        <header className={`p-3 border-b-2 border-black flex items-center justify-between select-none ${darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'}`}>
          <div className="flex items-baseline gap-1">
            <span className="font-['Kavivanar',serif] font-black text-lg leading-none">கல்வி</span>
            <span className="font-extrabold text-sm tracking-wider uppercase font-['VT323',monospace] text-base leading-none">
              AI // STD {userGrade}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={toggleTheme} 
              className="p-1.5 border border-black bg-white dark:bg-neutral-700 rounded text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-black" />}
            </button>

            <button 
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="px-2 py-1 border border-black rounded text-[10px] font-bold uppercase bg-[#d8f3dc] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              {lang === 'en' ? 'தமிழ்' : 'ENG'}
            </button>

            <button 
              onClick={handleLogout}
              className="p-1.5 border border-black bg-rose-200 text-rose-900 rounded text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* User Identity & Telemetry Status Bar */}
        <div className="bg-black text-[#6bf755] px-3 py-1 font-['VT323',monospace] text-sm flex justify-between tracking-widest border-b-2 border-black uppercase">
          <span>STUDENT: {userName}</span>
          <span>{completedCount}/{totalTopicsCount} TOPICS DONE</span>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: INTERACTIVE PROGRESS DASHBOARD */}
        {/* ================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <div className={`p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3 ${darkMode ? 'bg-neutral-700' : 'bg-[#fdfcf9]'}`}>
              <div className="flex justify-between items-center border-b border-black pb-1.5">
                <span className="text-xs font-black uppercase flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  {lang === 'en' ? 'Overall Completion' : 'மொத்த முன்னேற்றம்'}
                </span>
                <span className="font-['VT323',monospace] text-2xl font-bold">{overallPercentage}%</span>
              </div>

              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-4 border border-black overflow-hidden p-0.5">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className={`p-2 border border-black text-center ${darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'}`}>
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase">
                    {lang === 'en' ? 'Avg Quiz Score' : 'சராசரி மதிப்பெண்'}
                  </span>
                  <span className="text-lg font-black">{averageScore}%</span>
                </div>
                <div className={`p-2 border border-black text-center ${darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'}`}>
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase">
                    {lang === 'en' ? 'Quizzes Passed' : 'முடித்த தேர்வுகள்'}
                  </span>
                  <span className="text-lg font-black">{completedCount}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider">
                {lang === 'en' ? 'Subject-Wise Mastery' : 'பாடவாரி முன்னேற்றம்'}
              </h3>

              {subjects.map(subj => {
                const metrics = getSubjectMetrics(subj)
                return (
                  <div 
                    key={subj} 
                    className={`p-3 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-1.5 cursor-pointer hover:opacity-95 ${darkMode ? 'bg-neutral-700' : 'bg-[#fdfcf9]'}`}
                    onClick={() => {
                      setSelectedSubject(subj)
                      setSyllabusView('lessons')
                      setActiveTab('syllabus')
                    }}
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>{lang === 'en' ? subj : (subj === 'Physics' ? 'இயற்பியல்' : subj === 'Chemistry' ? 'வேதியியல்' : 'உயிரியல்')}</span>
                      <span>{metrics.percent}% ({metrics.completed}/{metrics.total})</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2.5 border border-black overflow-hidden">
                      <div 
                        className="bg-[#ffd166] h-full transition-all duration-300" 
                        style={{ width: `${metrics.percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <button 
              onClick={() => {
                setSelectedSubject(subjects[0])
                setSyllabusView('subjects')
                setActiveTab('syllabus')
              }}
              className="w-full py-3 bg-[#ffd166] text-black border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>{lang === 'en' ? 'Continue Lesson Quizzes' : 'பயிற்சித் தேர்வை தொடரவும்'}</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: SYLLABUS, TOPICS, AND SCROLLABLE QUIZZES */}
        {/* ================================================================= */}
        {activeTab === 'syllabus' && (
          <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
            {syllabusView === 'subjects' && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
                <h2 className="text-sm font-black uppercase border-b-2 border-black pb-1">
                  {lang === 'en' ? 'Select Subject' : 'பாடத்தைத் தேர்ந்தெடுக்கவும்'}
                </h2>
                <div className="grid grid-cols-1 gap-2.5">
                  {subjects.map(subj => {
                    const metrics = getSubjectMetrics(subj)
                    return (
                      <button 
                        key={subj}
                        onClick={() => { setSelectedSubject(subj); setSyllabusView('lessons'); }}
                        className="p-3.5 border-2 border-black bg-[#ffd166] text-black font-bold text-xs tracking-wider uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all text-left flex justify-between items-center cursor-pointer"
                      >
                        <span>{lang === 'en' ? subj : (subj === 'Physics' ? 'இயற்பியல்' : subj === 'Chemistry' ? 'வேதியியல்' : 'உயிரியல்')}</span>
                        <span className="text-[10px] bg-black text-white px-2 py-0.5 font-mono">{metrics.completed}/{metrics.total} DONE</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {syllabusView === 'lessons' && (
              <div className="flex-1 min-h-0 flex flex-col space-y-2">
                <button 
                  onClick={() => setSyllabusView('subjects')} 
                  className="self-start text-[11px] font-bold uppercase underline cursor-pointer"
                >
                  &larr; {lang === 'en' ? 'Back to Subjects' : 'பாடங்கள்'}
                </button>
                <h2 className="text-sm font-black uppercase border-b-2 border-black pb-1">
                  {selectedSubject} {lang === 'en' ? 'Topics' : 'தலைப்புகள்'}
                </h2>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
                  {filteredLessons.map(lesson => {
                    const progress = topicProgress[lesson.id]
                    const isDone = progress?.completed
                    return (
                      <div 
                        key={lesson.id}
                        onClick={() => { setSelectedLesson(lesson); setSyllabusView('topicDetail'); }}
                        className={`p-3 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-colors space-y-1 ${darkMode ? 'bg-neutral-700 hover:bg-neutral-600' : 'bg-[#fdfcf9] hover:bg-[#fff9db]'}`}
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase">
                          <span>{lesson.chapter}</span>
                          {isDone ? (
                            <span className="flex items-center gap-1 text-emerald-500 font-bold">
                              <CheckCircle2 className="w-3 h-3" /> {progress.score}%
                            </span>
                          ) : (
                            <span className="text-amber-500">PENDING QUIZ</span>
                          )}
                        </div>
                        <h3 className="text-xs font-bold leading-tight">{lang === 'en' ? lesson.topic : lesson.topic_ta}</h3>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {syllabusView === 'topicDetail' && selectedLesson && (
              <div className="flex-1 min-h-0 flex flex-col space-y-3">
                <button 
                  onClick={() => setSyllabusView('lessons')} 
                  className="self-start text-[11px] font-bold uppercase underline cursor-pointer"
                >
                  &larr; {lang === 'en' ? 'Back to Topics' : 'பட்டியல்'}
                </button>
                <div className="space-y-0.5 border-b-2 border-black pb-1.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">{selectedLesson.chapter}</span>
                  <h2 className="text-sm font-black uppercase">{lang === 'en' ? selectedLesson.topic : selectedLesson.topic_ta}</h2>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 text-xs leading-relaxed space-y-3">
                  <p>{lang === 'en' ? selectedLesson.summary_en : selectedLesson.summary_ta}</p>
                  {selectedLesson.formula && (
                    <div className={`p-2 border border-black text-[11px] font-bold ${darkMode ? 'bg-neutral-700' : 'bg-[#ede6dc]'}`}>
                      Formula: {selectedLesson.formula}
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-1">
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
                    <span>{lang === 'en' ? 'Explain via On-Device AI' : 'அறிவு AI விளக்கம்'}</span>
                  </button>
                  <button 
                    onClick={() => startQuizForTopic(selectedLesson)}
                    className="w-full py-2.5 bg-[#ff6b6b] text-black border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>{topicProgress[selectedLesson.id]?.completed ? 'Retake Quiz' : 'Take Topic Quiz'}</span>
                  </button>
                </div>
              </div>
            )}

            {syllabusView === 'quiz' && selectedLesson && (
              <div className="flex-1 min-h-0 flex flex-col space-y-2">
                <div className="flex justify-between items-center border-b-2 border-black pb-1">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-neutral-400">{selectedLesson.topic}</span>
                    <h3 className="text-xs font-black uppercase">Topic Assessment</h3>
                  </div>
                  {quizSubmitted && (
                    <span className="px-2 py-0.5 bg-black text-[#6bf755] font-['VT323',monospace] text-base">
                      SCORE: {currentQuizScore}%
                    </span>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1.5 text-xs">
                  {SAMPLE_QUIZ_QUESTIONS.map((item, qIdx) => {
                    const selectedOpt = currentQuizSelection[qIdx]
                    const isCorrect = item.correct === selectedOpt
                    return (
                      <div key={qIdx} className={`p-3 border-2 border-black space-y-2 ${darkMode ? 'bg-neutral-700' : 'bg-[#fdfcf9]'}`}>
                        <p className="font-bold leading-tight">Q{qIdx + 1}: {lang === 'en' ? item.q_en : item.q_ta}</p>
                        <div className="space-y-1.5">
                          {(lang === 'en' ? item.options_en : item.options_ta).map((opt, optIdx) => {
                            const isSelected = selectedOpt === optIdx
                            const isAnswerCorrect = item.correct === optIdx
                            let optionClass = darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'

                            if (quizSubmitted) {
                              if (isAnswerCorrect) optionClass = 'bg-emerald-200 text-emerald-900 border-emerald-600 font-bold'
                              else if (isSelected && !isAnswerCorrect) optionClass = 'bg-rose-200 text-rose-900 border-rose-600'
                            } else if (isSelected) {
                              optionClass = 'bg-[#ffd166] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={quizSubmitted}
                                onClick={() => setCurrentQuizSelection(prev => ({ ...prev, [qIdx]: optIdx }))}
                                className={`w-full p-2 border border-black text-left text-[11px] transition-all flex justify-between items-center ${optionClass}`}
                              >
                                <span>{opt}</span>
                                {quizSubmitted && isAnswerCorrect && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                                {quizSubmitted && isSelected && !isAnswerCorrect && <X className="w-3.5 h-3.5 text-rose-700" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-1 flex gap-2">
                  {!quizSubmitted ? (
                    <button 
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(currentQuizSelection).length < SAMPLE_QUIZ_QUESTIONS.length}
                      className="flex-1 py-2.5 bg-black text-white border-2 border-black font-bold text-xs uppercase tracking-wider disabled:bg-neutral-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    >
                      Submit & Save Marks
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setSyllabusView('topicDetail')
                        setActiveTab('dashboard')
                      }}
                      className="flex-1 py-2.5 bg-emerald-500 text-black border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    >
                      View Dashboard Update &rarr;
                    </button>
                  )}
                  <button 
                    onClick={() => setSyllabusView('topicDetail')}
                    className="px-3 py-2.5 bg-neutral-200 text-black border-2 border-black font-bold text-xs uppercase cursor-pointer"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: DUAL-ENGINE AI CHAT & CRISIS TRIAGE */}
        {/* ================================================================= */}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <header className="p-2 border-b border-black flex justify-between items-center bg-black text-white text-xs">
              <span>{activeBot === 'kavani' ? 'KAVANI (TRIAGE ACTIVE)' : 'ARIVU (ON-DEVICE SLM)'}</span>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
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

              {strikeCount >= 3 && (
                <div className="p-3 bg-[#ffadad] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2 mt-2 text-black">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase">
                    <ShieldAlert className="w-4 h-4" />
                    <span>DIRECT STUDENT HELPLINES[cite: 2, 4]</span>
                  </div>
                  <div className="space-y-1">
                    <a href="tel:14417" className="flex items-center justify-between p-2 bg-black text-white font-bold text-[11px]">
                      <span>14417 (TN Student Helpline)[cite: 2, 4]</span>
                      <span className="bg-red-600 px-1.5 text-[9px]">CALL[cite: 2, 4]</span>
                    </a>
                    <a href="tel:14416" className="flex items-center justify-between p-2 bg-[#fdfcf9] border border-black font-bold text-[11px]">
                      <span>14416 (Tele-MANAS Support)[cite: 2, 4]</span>
                      <span className="text-[9px]">FREE</span>
                    </a>
                    <a href="tel:104" className="flex items-center justify-between p-2 bg-[#fdfcf9] border border-black font-bold text-[11px]">
                      <span>104 (TN Health Helpline)[cite: 2, 4]</span>
                      <span className="text-[9px]">24/7[cite: 2, 4]</span>
                    </a>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className={`p-2 border-t-2 border-black select-none ${darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'}`}>
              {strikeCount >= 3 ? (
                <div className="p-1.5 bg-red-100 text-black border border-black text-center text-[10px] font-bold">
                  SYSTEM LOCKED FOR STUDENT SAFETY.
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex gap-1.5">
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
                    placeholder={lang === 'en' ? "Ask on-device Arivu..." : "கேள்வி கேட்கவும்..."}
                    disabled={isGenerating}
                    className={`flex-1 border border-black px-2.5 py-1.5 text-[11px] font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-[#fdfcf9] text-black'}`}
                  />
                  <button 
                    type="submit" 
                    disabled={isGenerating || !inputValue.trim()}
                    className="px-3 bg-black text-white border border-black font-bold text-xs uppercase cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </footer>
          </div>
        )}

        {/* BOTTOM TAB NAVIGATION */}
        <footer className="grid grid-cols-3 border-t-2 border-black bg-[#ede6dc] dark:bg-neutral-800 select-none text-[11px] font-bold uppercase">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex items-center justify-center gap-1.5 py-2.5 border-r-2 border-black cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#ffd166] text-black' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Dashboard' : 'முன்னேற்றம்'}</span>
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('syllabus')
              setSyllabusView('subjects')
            }} 
            className={`flex items-center justify-center gap-1.5 py-2.5 border-r-2 border-black cursor-pointer ${activeTab === 'syllabus' ? 'bg-[#ffd166] text-black' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Syllabus' : 'பாடங்கள்'}</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('chat')
              if (messages.length === 0) {
                setMessages([{ sender: 'arivu', text: lang === 'en' ? `Hello ${userName}! Ask me any conceptual question or upload a photo.` : `வணக்கம் ${userName}! உங்கள் கேள்வியைக் கேட்கவும்.` }])
              }
            }} 
            className={`flex items-center justify-center gap-1.5 py-2.5 cursor-pointer ${activeTab === 'chat' ? 'bg-[#ffd166] text-black' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'AI Chat' : 'அறிவு AI'}</span>
          </button>
        </footer>

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