import React, { useState, useRef, useEffect } from 'react'
import { 
  BookOpen, Sparkles, HeartHandshake, Languages, GraduationCap, 
  Send, PhoneCall, ShieldAlert, ArrowLeft, Disc, FileText, Compass, Lightbulb
} from 'lucide-react'
import { HfInference } from '@huggingface/inference'
import syllabusData from './data/syllabus.json'

// Insert your live Hugging Face token here
const hf = new HfInference("PASTE_YOUR_HF_TOKEN_HERE")

const DISTRESS_KEYWORDS = [
  'stress', 'stressed', 'depressed', 'anxious', 'anxiety', 'fail', 'failing', 
  'give up', 'hopeless', 'pressure', 'scared', 'tired of life', 'die', 'மன அழுத்தம்', 'பயம்'
]

export default function App() {
  // Application Stage: 'welcome' -> 'login' -> 'portal'
  const [appStage, setAppStage] = useState('welcome')
  const [userName, setUserName] = useState('')
  const [userGrade, setUserGrade] = useState('')

  // Core App States
  const [lang, setLang] = useState('en')
  const [activeTab, setActiveTab] = useState('syllabus')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [activeBot, setActiveBot] = useState('arivu')
  const [strikeCount, setStrikeCount] = useState(0)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const messagesEndRef = useRef(null)
  const subjects = ['All', ...new Set(syllabusData.map(item => item.subject))]
  const filteredLessons = selectedSubject === 'All' ? syllabusData : syllabusData.filter(item => item.subject === selectedSubject)

  // Trigger Welcome Animation Fade
  useEffect(() => {
    if (appStage === 'welcome') {
      const timer = setTimeout(() => setAppStage('login'), 2200)
      return () => clearTimeout(timer)
    }
  }, [appStage])

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // AI Streaming Logic
  const streamAIResponse = async (userPrompt, lessonContext) => {
    setIsGenerating(true)
    let streamedText = ""
    setMessages(prev => [...prev, { sender: 'arivu', text: "", isTyping: true }])

    const contextData = lessonContext 
      ? (lang === 'en' ? lessonContext.summary_en : lessonContext.summary_ta) 
      : `General ${userGrade}th standard Samacheer Kalvi concepts.`

    const generateLocalAnalogy = () => {
      const topic = lessonContext?.topic || "Concept"
      if (topic.includes("Coulomb")) {
        return lang === 'en' ? "Think of Coulomb's Law like magnets on a table: the closer you bring them together, the stronger the pull or push." : "கூலும் விதியை இரு காந்தங்களின் விசையாகக் கருதலாம்: அவற்றை அருகருகே வைத்தால் விசை அதிகமாகும்."
      }
      return lang === 'en' ? `Here is the explanation for ${topic}: ${contextData}` : `${topic} விளக்கம்: ${contextData}`
    }

    try {
      const responseStream = await Promise.race([
        hf.chatCompletionStream({
          model: "Qwen/Qwen2.5-72B-Instruct",
          messages: [
            { 
              role: "system", 
              content: `You are Arivu, a friendly human tutor for a Tamil Nadu State Board student named ${userName} in class ${userGrade}. Explain concepts in clear conversational language. Use this syllabus context: "${contextData}". Always respond in ${lang === 'en' ? 'English' : 'Tamil'}. Keep responses under 4 sentences.` 
            },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 300
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
      ])

      for await (const chunk of responseStream) {
        const textChunk = chunk.choices[0]?.delta?.content || ""
        streamedText += textChunk
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1].text = streamedText
          return newMessages
        })
      }
    } catch (error) {
      console.warn("Using local streaming fallback:", error.message)
      const fallbackText = generateLocalAnalogy()
      for (let i = 0; i <= fallbackText.length; i += 3) {
        await new Promise(r => setTimeout(r, 20))
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1].text = fallbackText.slice(0, i)
          return newMessages
        })
      }
    } finally {
      setIsGenerating(false)
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1].isTyping = false
        if (lessonContext?.formula) newMessages[newMessages.length - 1].formula = lessonContext.formula
        return newMessages
      })
    }
  }

  const handleTriggerELI5 = (lesson) => {
    setSelectedLesson(lesson)
    setActiveTab('chat')
    setActiveBot('arivu')
    const promptText = lang === 'en' ? `Explain "${lesson.topic}" with an everyday analogy.` : `"${lesson.topic_ta}" என்பதை எனக்கு எளிய உதாரணத்துடன் விளக்கு.`
    setMessages([{ sender: 'user', text: promptText }])
    streamAIResponse(promptText, lesson)
  }

  const sendQuery = (textToSend) => {
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
        setMessages(prev => [...prev, { sender: 'user', text: userText }, { sender: 'kavani-critical', text: lang === 'en' ? `${userName}, your well-being is far more important than any exam. AI is disabled. Please connect with student support counsellors right now.` : `எந்தவொரு தேர்வை விடவும் உங்கள் மனநலம் மிகவும் முக்கியமானது. உடனடியாக ஆலோசகர்களை தொடர்பு கொள்ளவும்.` }])
      } else {
        setMessages(prev => [...prev, { sender: 'user', text: userText }, { sender: 'kavani', text: lang === 'en' ? `It is completely normal to feel exam pressure, ${userName}. Take a slow, deep breath. You are capable and not alone. (${nextStrike}/2)` : `உங்கள் உணர்வுகளை புரிந்து கொள்ள முடிகிறது. தேர்வு நேரத்தில் இந்த அழுத்தம் இயல்பானது. அமைதியாக இருங்கள். (${nextStrike}/2)` }])
      }
    } else {
      setMessages(prev => [...prev, { sender: 'user', text: userText }])
      streamAIResponse(userText, selectedLesson)
    }
  }

  const resetTriage = () => {
    setStrikeCount(0)
    setActiveBot('arivu')
    setMessages([])
    setActiveTab('syllabus')
  }

  // ==========================================
  // VIEW 1: WELCOME & ONBOARDING SCREENS
  // ==========================================
  if (appStage === 'welcome' || appStage === 'login') {
    return (
      <div className="flex justify-center items-center h-screen w-screen bg-[#cac2b7] font-['Space_Mono',monospace] overflow-hidden p-4">
        
        {/* Animated Welcome Screen with the Serif Tamil Headline Font */}
        <div className={`absolute transition-all duration-1000 ease-in-out ${appStage === 'welcome' ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
          <div className="flex flex-col items-center justify-center gap-2 animate-pulse">
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-600">Welcome To</span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-['Kavivanar',serif] font-black text-6xl md:text-7xl tracking-normal text-black drop-shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
                கல்வி
              </span>
              <span className="font-['VT323',monospace] font-bold text-5xl md:text-6xl tracking-widest text-black">
                AI
              </span>
            </div>
          </div>
        </div>

        {/* Clean, Centered Login Form */}
        <div className={`w-full max-w-sm p-8 bg-[#fdfcf9] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-8 transition-all duration-1000 delay-300 ease-out ${appStage === 'login' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
          <div className="text-center space-y-1">
            <div className="flex items-baseline justify-center gap-1.5 border-b-2 border-black pb-2">
              <span className="font-['Kavivanar',serif] font-black text-3xl text-black">கல்வி</span>
              <span className="font-['VT323',monospace] font-bold text-3xl tracking-wider text-black">AI PORTAL</span>
            </div>
            <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest pt-2">Sign In To Continue</p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black">First Name</label>
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                className="p-3 border-2 border-black bg-white focus:outline-none focus:bg-[#d8f3dc] transition-colors text-sm font-bold" 
                placeholder="Enter your name..." 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black">Select Grade</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setUserGrade('11')} 
                  className={`p-3 border-2 border-black font-bold text-sm tracking-widest transition-all ${userGrade === '11' ? 'bg-[#ffd166] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-[#ede6dc] hover:bg-[#e2d9cd]'}`}
                >
                  CLASS 11
                </button>
                <button 
                  onClick={() => setUserGrade('12')} 
                  className={`p-3 border-2 border-black font-bold text-sm tracking-widest transition-all ${userGrade === '12' ? 'bg-[#ffd166] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'bg-[#ede6dc] hover:bg-[#e2d9cd]'}`}
                >
                  CLASS 12
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={() => { if(userName && userGrade) setAppStage('portal') }} 
            disabled={!userName || !userGrade} 
            className="mt-2 p-4 bg-black text-white font-bold text-sm tracking-widest uppercase disabled:bg-neutral-400 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            Start Learning
          </button>
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW 2: MAIN EDUCATIONAL PORTAL
  // ==========================================
  return (
    <div className="flex justify-center items-center min-h-screen p-2 sm:p-6 bg-[#cac2b7]">
      <div className={`flex flex-col h-[92vh] max-h-[820px] w-full max-w-sm rounded-2xl overflow-hidden border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-colors duration-300 ${
        activeBot === 'kavani' ? 'bg-[#f0e2d8]' : 'bg-[#f4efe8]'
      } text-black font-['Space_Mono',monospace]`}>
        
        {/* Main Header */}
        <header className="p-3 border-b-2 border-black bg-[#ede6dc] flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            {activeTab === 'chat' ? (
              <button onClick={() => setActiveTab('syllabus')} className="p-1 border border-black bg-[#fdfcf9] hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-black bg-[#ff6b6b]" />
            )}
            <div className="flex items-baseline gap-1">
              <span className="font-['Kavivanar',serif] font-black text-lg leading-none">கல்வி</span>
              <span className="font-extrabold text-sm tracking-wider uppercase font-['VT323',monospace] text-base leading-none">
                {activeBot === 'kavani' ? 'AI // KAVANI' : 'AI // PORTAL'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-[#d8f3dc] border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#b7e4c7] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Languages className="w-3 h-3" />
            <span>{lang === 'en' ? 'தமிழ்' : 'ENG'}</span>
          </button>
        </header>

        {/* Personalized Student Banner */}
        <div className="bg-black text-[#6bf755] px-3 py-1.5 font-['VT323',monospace] text-base flex justify-between tracking-widest border-b-2 border-black uppercase">
          <span>{lang === 'en' ? `CLASS ${userGrade} SYLLABUS` : `வகுப்பு ${userGrade} பாடம்`}</span>
          <span>{activeBot === 'kavani' ? '[TRIAGE ACTIVE]' : `[USER: ${userName}]`}</span>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 space-y-3">
          {activeTab === 'syllabus' ? (
            <>
              <div className="flex gap-1.5 pb-1 overflow-x-auto no-scrollbar">
                {subjects.map(subject => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-2.5 py-1 text-[10px] font-bold tracking-tight uppercase border border-black transition-all cursor-pointer ${
                      selectedSubject === subject ? 'bg-[#ffd166] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-[#ede6dc] text-neutral-600 hover:bg-[#e2d9cd]'
                    }`}
                  >
                    {subject === 'All' ? (lang === 'en' ? 'ALL TRACKS' : 'அனைத்தும்') : (lang === 'en' ? subject : (subject === 'Physics' ? 'இயற்பியல்' : subject === 'Chemistry' ? 'வேதியியல்' : 'உயிரியல்'))}
                  </button>
                ))}
              </div>

              {filteredLessons.map(lesson => (
                <article key={lesson.id} className="p-3 bg-[#fdfcf9] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2">
                  <div className="flex justify-between items-center border-b border-dashed border-black/40 pb-1 text-[10px] font-bold text-neutral-500">
                    <span>{lang === 'en' ? lesson.chapter.toUpperCase() : lesson.chapter_ta}</span>
                    <span>{lesson.id.toUpperCase()}</span>
                  </div>
                  <h3 className="font-bold text-xs leading-snug tracking-tight text-black">{lang === 'en' ? lesson.topic : lesson.topic_ta}</h3>
                  <p className="text-[11px] leading-relaxed text-neutral-700">{lang === 'en' ? lesson.summary_en : lesson.summary_ta}</p>
                  {lesson.formula && (
                    <div className="p-1.5 bg-[#ede6dc] border border-black text-[10px] font-bold tracking-tight text-neutral-800">
                      FORMULA: {lesson.formula}
                    </div>
                  )}
                  <button 
                    onClick={() => handleTriggerELI5(lesson)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#ffd6a5] hover:bg-[#ffc68a] text-black border border-black font-bold text-[11px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <Disc className="w-3.5 h-3.5 animate-spin text-black" style={{ animationDuration: '4s' }} />
                    <span>{lang === 'en' ? "Play Arivu Breakdown" : "அறிவு விளக்கம்"}</span>
                  </button>
                </article>
              ))}
            </>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-2.5 text-[11px] leading-relaxed border border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    msg.sender === 'user' ? 'bg-[#caffbf] text-black font-semibold' : msg.sender === 'kavani-critical' ? 'bg-[#ffadad] text-black font-bold' : msg.sender === 'kavani' ? 'bg-[#ffd6a5] text-black' : 'bg-[#fdfcf9] text-black'
                  }`}>
                    <div className="text-[9px] tracking-wider uppercase font-bold text-neutral-600 mb-1 border-b border-black/20 pb-0.5">
                      {msg.sender === 'user' ? (lang === 'en' ? 'YOU' : 'நீங்கள்') : msg.sender.startsWith('kavani') ? (lang === 'en' ? 'KAVANI' : 'கவனி') : (lang === 'en' ? 'ARIVU' : 'அறிவு')}
                    </div>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {msg.isTyping && <span className="inline-block w-2 h-3.5 bg-black animate-pulse align-middle ml-1"></span>}
                    {msg.formula && !msg.isTyping && (
                      <div className="mt-1.5 pt-1.5 border-t border-dashed border-black/40 text-[10px] font-bold">KEY: {msg.formula}</div>
                    )}
                  </div>
                </div>
              ))}

              {strikeCount >= 3 && (
                <div className="p-3 bg-[#ffadad] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4" />
                    <span>{lang === 'en' ? 'DIRECT STUDENT HELPLINES' : 'இலவச உதவி எண்கள்'}[cite: 1, 3]</span>
                  </div>
                  <div className="space-y-1.5">
                    <a href="tel:14417" className="flex items-center justify-between p-2 bg-black text-white font-bold text-[11px] hover:bg-neutral-800">
                      <span>14417 (TN Student Helpline)[cite: 1, 3]</span><span className="bg-red-600 px-1.5 text-[9px]">CALL[cite: 1, 3]</span>
                    </a>
                    <a href="tel:14416" className="flex items-center justify-between p-2 bg-[#fdfcf9] border border-black font-bold text-[11px]">
                      <span>14416 (Tele-MANAS)[cite: 1, 3]</span><span className="text-[9px]">FREE</span>
                    </a>
                    <a href="tel:104" className="flex items-center justify-between p-2 bg-[#fdfcf9] border border-black font-bold text-[11px]">
                      <span>104 (TN Health Support)[cite: 1, 3]</span><span className="text-[9px]">24/7[cite: 1, 3]</span>
                    </a>
                  </div>
                  <button onClick={resetTriage} className="w-full text-center text-[10px] font-bold uppercase underline mt-1 cursor-pointer">
                    {lang === 'en' ? 'RETURN TO PORTAL' : 'பாடப்பிரிவுக்குச் செல்'}
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {activeTab === 'chat' && (
          <footer className="p-2 bg-[#ede6dc] border-t-2 border-black select-none">
            {strikeCount >= 3 ? (
              <div className="p-1.5 bg-[#fdfcf9] border border-black text-center text-[10px] font-bold">
                {lang === 'en' ? 'SYSTEM LOCKED FOR WELLNESS.' : 'பாதுகாப்பிற்காக AI முடக்கப்பட்டுள்ளது.'}
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); sendQuery(inputValue); }} className="flex gap-1.5">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={lang === 'en' ? `Ask Arivu a question...` : "அறிவுவிடம் கேள்வி கேட்கவும்..."}
                  disabled={isGenerating}
                  className="flex-1 bg-[#fdfcf9] border border-black px-2.5 py-1.5 text-[11px] font-bold text-black focus:outline-none placeholder-neutral-400"
                />
                <button type="submit" disabled={isGenerating || !inputValue.trim()} className="px-3 bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400 border border-black font-bold text-xs uppercase active:translate-x-0.5 active:translate-y-0.5 cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </footer>
        )}

        {activeTab === 'syllabus' && (
          <footer className="grid grid-cols-2 border-t-2 border-black bg-[#ede6dc] select-none text-[11px] font-bold uppercase">
            <button onClick={() => setActiveTab('syllabus')} className="flex items-center justify-center gap-1.5 py-2.5 bg-[#ffd166] border-r-2 border-black cursor-pointer">
              <BookOpen className="w-4 h-4" /><span>{lang === 'en' ? 'Syllabus' : 'பாடங்கள்'}</span>
            </button>
            <button onClick={() => { setActiveTab('chat'); if (messages.length === 0) { setMessages([{ sender: 'arivu', text: lang === 'en' ? `Hello ${userName}! Ready to tackle Class ${userGrade} concepts? Ask me anything.` : `வணக்கம் ${userName}! உங்கள் கேள்வியைக் கேட்கவும்.` }]) } }} className="flex items-center justify-center gap-1.5 py-2.5 bg-[#fdfcf9] hover:bg-[#eae3d8] cursor-pointer">
              <Sparkles className="w-4 h-4" /><span>{lang === 'en' ? 'AI Tutor' : 'அறிவு AI'}</span>
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}