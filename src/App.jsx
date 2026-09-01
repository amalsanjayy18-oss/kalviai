import React, { useState, useRef, useEffect } from 'react'
import { 
  BookOpen, Sparkles, HeartHandshake, Languages, GraduationCap, 
  Send, PhoneCall, ShieldAlert, ArrowLeft, Sun, Moon, 
  CheckCircle2, Award, LayoutDashboard, LogOut, BarChart3, 
  HelpCircle, ChevronRight, Check, X
} from 'lucide-react'
import syllabusData from './data/syllabus.json'
import { saveSecureData, getSecureData } from './lib/db.js'

const DISTRESS_KEYWORDS = [
  'stress', 'stressed', 'depressed', 'anxious', 'anxiety', 'fail', 'failing', 
  'give up', 'hopeless', 'pressure', 'scared', 'tired of life', 'die', 'மன அழுத்தம்', 'பயம்'
]

// 5 Conceptual Questions per topic for local offline grading
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
  // App navigation state: 'welcome' -> 'login' -> 'main'
  const [appStage, setAppStage] = useState('welcome')
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'syllabus' | 'chat'
  const [syllabusView, setSyllabusView] = useState('subjects') // 'subjects' | 'lessons' | 'topicDetail' | 'quiz'

  // User Profile & Preferences
  const [userName, setUserName] = useState('')
  const [userGrade, setUserGrade] = useState('12')
  const [lang, setLang] = useState('en')
  const [darkMode, setDarkMode] = useState(false)

  // Curriculum & Lesson Selection
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedLesson, setSelectedLesson] = useState(null)

  // Chat & Kavani State
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [activeBot, setActiveBot] = useState('arivu')
  const [strikeCount, setStrikeCount] = useState(0)

  // Progress, Quiz & Marks Store
  // Format: { [topicId]: { score: 80, completed: true, answers: {0: 0, 1: 1...} } }
  const [topicProgress, setTopicProgress] = useState({})
  const [currentQuizSelection, setCurrentQuizSelection] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [currentQuizScore, setCurrentQuizScore] = useState(0)

  const messagesEndRef = useRef(null)

  const subjects = [...new Set(syllabusData.map(item => item.subject))]
  const filteredLessons = syllabusData.filter(item => item.subject === selectedSubject)

  // 1. Initial Load: Restore Offline Profile & Encrypted Progress
  useEffect(() => {
    async function restoreSession() {
      const savedTheme = localStorage.getItem('kalviai_theme')
      if (savedTheme === 'dark') setDarkMode(true)

      const profile = await getSecureData('user_profile')
      const progress = await getSecureData('user_progress_data')

      if (progress) {
        setTopicProgress(progress)
      }

      if (profile && profile.name) {
        setUserName(profile.name)
        setUserGrade(profile.grade || '12')
        setAppStage('main')
      } else {
        const timer = setTimeout(() => setAppStage('login'), 2000)
        return () => clearTimeout(timer)
      }
    }
    restoreSession()
  }, [])

  // 2. Save Progress to Encrypted Local DB
  const saveProgressToDisk = async (updatedProgress) => {
    setTopicProgress(updatedProgress)
    await saveSecureData('user_progress_data', updatedProgress)
  }

  // 3. Theme Toggle
  const toggleTheme = () => {
    const nextTheme = !darkMode
    setDarkMode(nextTheme)
    localStorage.setItem('kalviai_theme', nextTheme ? 'dark' : 'light')
  }

  // 4. Session Login
  const handleLogin = async () => {
    if (!userName.trim() || !userGrade) return
    const profile = { name: userName.trim(), grade: userGrade }
    await saveSecureData('user_profile', profile)
    setAppStage('main')
    setActiveTab('dashboard')
  }

  // 5. Session Logout
  const handleLogout = async () => {
    await saveSecureData('user_profile', null)
    setUserName('')
    setTopicProgress({})
    setStrikeCount(0)
    setMessages([])
    setAppStage('login')
  }

  // 6. Metrics Calculation for Dashboard
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

  // 7. Handle Quiz Submission & Marks
  const handleSubmitQuiz = async () => {
    if (!selectedLesson) return

    let correctCount = 0
    SAMPLE_QUIZ_QUESTIONS.forEach((q, index) => {
      if (currentQuizSelection[index] === q.correct) {
        correctCount += 1
      }
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

  // 8. Chat & Kavani Interception
  const handleSendMessage = (textToSend) => {
    if (!textToSend.trim()) return
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
              ? `${userName}, your well-being is far more important than any exam. AI is disabled. Please connect with student counsellors immediately.`
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
      const summary = selectedLesson 
        ? (lang === 'en' ? selectedLesson.summary_en : selectedLesson.summary_ta)
        : (lang === 'en' ? "Samacheer Kalvi Class 12 General Syllabus" : "சமச்சீர் கல்வி 12ஆம் வகுப்பு பாடத்திட்டம்")

      setMessages(prev => [
        ...prev,
        { sender: 'user', text: userText },
        { 
          sender: 'arivu',
          text: lang === 'en'
            ? `💡 Concept Overview: ${summary}\n\nKey Formula: ${selectedLesson?.formula || 'Standard relations apply'}`
            : `💡 பாடச் சுருக்கம்: ${summary}\n\nமுக்கிய வாய்பாடு: ${selectedLesson?.formula || 'நிலையான விதி'}`
        }
      ])
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // =========================================================================
  // VIEW 1: WELCOME & ONBOARDING LOGIN
  // =========================================================================
  if (appStage === 'welcome' || appStage === 'login') {
    return (
      <div className={`flex justify-center items-center h-screen w-screen font-['Space_Mono',monospace] overflow-hidden p-4 ${darkMode ? 'bg-neutral-900 text-neutral-100' : 'bg-[#cac2b7] text-black'}`}>
        {/* Animated Splash */}
        <div className={`absolute transition-all duration-1000 ease-in-out ${appStage === 'welcome' ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
          <div className="flex flex-col items-center justify-center gap-2 animate-pulse">
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-500">Welcome To</span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-['Kavivanar',serif] font-black text-6xl md:text-7xl">கல்வி</span>
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
            <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Student Portal Login</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Student Name</label>
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                className={`p-3 border-2 border-black text-sm font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-white text-black'}`}
                placeholder="Enter your name..." 
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
            onClick={handleLogin} 
            disabled={!userName.trim()} 
            className="p-4 bg-black text-white font-bold text-sm tracking-widest uppercase disabled:bg-neutral-400 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            Launch Dashboard
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: MAIN APP WITH PERSISTENT TABS (DASHBOARD / SYLLABUS / CHAT)
  // =========================================================================
  return (
    <div className={`flex justify-center items-center min-h-screen p-2 sm:p-6 font-['Space_Mono',monospace] ${darkMode ? 'bg-neutral-900 text-neutral-100' : 'bg-[#cac2b7] text-black'}`}>
      <div className={`flex flex-col h-[92vh] max-h-[820px] w-full max-w-sm rounded-2xl overflow-hidden border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-neutral-800' : 'bg-[#f4efe8]'}`}>
        
        {/* Persistent Top Header */}
        <header className={`p-3 border-b-2 border-black flex items-center justify-between select-none ${darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'}`}>
          <div className="flex items-baseline gap-1">
            <span className="font-['Kavivanar',serif] font-black text-lg leading-none">கல்வி</span>
            <span className="font-extrabold text-sm tracking-wider uppercase font-['VT323',monospace] text-base leading-none">
              AI // STD {userGrade}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Dark/Light Toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-1.5 border border-black bg-white dark:bg-neutral-700 rounded text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-black" />}
            </button>

            {/* Bilingual Switcher */}
            <button 
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="px-2 py-1 border border-black rounded text-[10px] font-bold uppercase bg-[#d8f3dc] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              {lang === 'en' ? 'தமிழ்' : 'ENG'}
            </button>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="p-1.5 border border-black bg-rose-200 text-rose-900 rounded text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* User Identity Banner */}
        <div className="bg-black text-[#6bf755] px-3 py-1 font-['VT323',monospace] text-sm flex justify-between tracking-widest border-b-2 border-black uppercase">
          <span>STUDENT: {userName}</span>
          <span>{completedCount}/{totalTopicsCount} TOPICS DONE</span>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: INTERACTIVE PROGRESS DASHBOARD */}
        {/* ================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            
            {/* 1. Master Progress Meter Card */}
            <div className={`p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3 ${darkMode ? 'bg-neutral-700' : 'bg-[#fdfcf9]'}`}>
              <div className="flex justify-between items-center border-b border-black pb-1.5">
                <span className="text-xs font-black uppercase flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  {lang === 'en' ? 'Overall Completion' : 'மொத்த முன்னேற்றம்'}
                </span>
                <span className="font-['VT323',monospace] text-2xl font-bold">{overallPercentage}%</span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-4 border border-black overflow-hidden p-0.5">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>

              {/* Dashboard Score Cards */}
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

            {/* 2. Subject Breakdown Meters */}
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

            {/* Quick Action Button to Jump into Learning */}
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
            
            {/* SUB-VIEW 1: SELECT SUBJECT */}
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

            {/* SUB-VIEW 2: LESSONS LIST */}
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

            {/* SUB-VIEW 3: TOPIC DETAILS & ACTIONS */}
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
                    onClick={() => startQuizForTopic(selectedLesson)}
                    className="w-full py-2.5 bg-[#ff6b6b] text-black border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>{topicProgress[selectedLesson.id]?.completed ? 'Retake Quiz (Update Marks)' : 'Take Topic Quiz (5 Questions)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-VIEW 4: FULL SCROLLABLE 5-QUESTION QUIZ WITH REAL MARKS */}
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

                {/* SCROLL CONTAINER WITH EXPLICIT OVERFLOW */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1.5 text-xs">
                  {SAMPLE_QUIZ_QUESTIONS.map((item, qIdx) => {
                    const selectedOpt = currentQuizSelection[qIdx]
                    return (
                      <div 
                        key={qIdx} 
                        className={`p-3 border-2 border-black space-y-2 ${darkMode ? 'bg-neutral-700' : 'bg-[#fdfcf9]'}`}
                      >
                        <p className="font-bold leading-tight">
                          Q{qIdx + 1}: {lang === 'en' ? item.q_en : item.q_ta}
                        </p>
                        <div className="space-y-1.5">
                          {(lang === 'en' ? item.options_en : item.options_ta).map((opt, optIdx) => {
                            const isSelected = selectedOpt === optIdx
                            const isCorrect = item.correct === optIdx
                            let optionClass = darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'

                            if (quizSubmitted) {
                              if (isCorrect) optionClass = 'bg-emerald-200 text-emerald-900 border-emerald-600 font-bold'
                              else if (isSelected && !isCorrect) optionClass = 'bg-rose-200 text-rose-900 border-rose-600'
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
                                {quizSubmitted && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                                {quizSubmitted && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-rose-700" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Quiz Action Footer */}
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
        {/* TAB 3: TUTOR & CRISIS TRIAGE CHAT */}
        {/* ================================================================= */}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <header className="p-2 border-b border-black flex justify-between items-center bg-black text-white text-xs">
              <span>{activeBot === 'kavani' ? 'KAVANI (TRIAGE ACTIVE)' : 'ARIVU (ACADEMIC TUTOR)'}</span>
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
                  </div>
                </div>
              ))}

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

            <footer className={`p-2 border-t-2 border-black select-none ${darkMode ? 'bg-neutral-800' : 'bg-[#ede6dc]'}`}>
              {strikeCount >= 3 ? (
                <div className="p-1.5 bg-red-100 text-black border border-black text-center text-[10px] font-bold">
                  SYSTEM LOCKED FOR STUDENT SAFETY.
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex gap-1.5">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={lang === 'en' ? "Ask Arivu or share thoughts..." : "கேள்வி கேட்கவும்..."}
                    className={`flex-1 border border-black px-2.5 py-1.5 text-[11px] font-bold focus:outline-none ${darkMode ? 'bg-neutral-700 text-white' : 'bg-[#fdfcf9] text-black'}`}
                  />
                  <button 
                    type="submit" 
                    disabled={!inputValue.trim()}
                    className="px-3 bg-black text-white border border-black font-bold text-xs uppercase cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </footer>
          </div>
        )}

        {/* PERSISTENT BOTTOM NAVIGATION TAB BAR */}
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
                setMessages([{ sender: 'arivu', text: lang === 'en' ? `Hello ${userName}! Ask me any conceptual question or pick a lesson.` : `வணக்கம் ${userName}! உங்கள் கேள்வியைக் கேட்கவும்.` }])
              }
            }} 
            className={`flex items-center justify-center gap-1.5 py-2.5 cursor-pointer ${activeTab === 'chat' ? 'bg-[#ffd166] text-black' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'AI Chat' : 'அறிவு AI'}</span>
          </button>
        </footer>

      </div>
    </div>
  )
}