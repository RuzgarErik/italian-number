import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Check, X, ArrowRight, VolumeX, Heart, Trophy, Flame, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function getItalianNumber(n: number): string {
  // Handle decimals
  if (!Number.isInteger(n)) {
    const [whole, decimal] = n.toString().split('.');
    const wholeWord = getItalianNumber(parseInt(whole, 10));
    
    // For decimals, we read them digit by digit or as a whole number depending on context
    // In Italian, "virgola" is used for the decimal point (e.g., 1.55 -> uno virgola cinquantacinque)
    const decimalWord = getItalianNumber(parseInt(decimal, 10));
    
    return `${wholeWord} virgola ${decimalWord}`;
  }

  if (n === 100) return "cento";
  if (n === 0) return "zero";
  
  const units = ["", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove", "dieci", "undici", "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove"];
  const tens = ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"];
  
  if (n < 20) return units[n];
  
  const t = Math.floor(n / 10);
  const u = n % 10;
  
  let tenWord = tens[t];
  let unitWord = units[u];
  
  if (u === 1 || u === 8) {
    tenWord = tenWord.slice(0, -1);
  }
  
  if (u === 3) {
    unitWord = "tré";
  }
  
  return tenWord + unitWord;
}

export default function App() {
  const [currentNumber, setCurrentNumber] = useState<number>(0);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  
  // Gamification State
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');
  const [shake, setShake] = useState(false);
  
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const getLevelMax = (lvl: number) => {
    if (lvl === 1) return 10;
    if (lvl === 2) return 20;
    if (lvl === 3) return 50;
    if (lvl === 4) return 100;
    return 100; // Level 5+ includes decimals
  };

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSpeechSupported(false);
    }
    generateNumber(1); // Start at level 1
  }, []);

  const generateNumber = (currentLevel = level) => {
    const maxNumber = getLevelMax(currentLevel);
    let next = Math.floor(Math.random() * maxNumber) + 1;
    
    // Introduce decimals at level 5
    if (currentLevel >= 5) {
      // 30% chance to generate a decimal number
      if (Math.random() < 0.3) {
        const decimalPart = Math.floor(Math.random() * 99) + 1; // 1 to 99
        next = parseFloat(`${next}.${decimalPart}`);
      }
    }
    
    setCurrentNumber(next);
    setInputValue('');
    setFeedback('idle');
    playAudio(next);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const playAudio = (num: number = currentNumber) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Convert to string, replacing dot with comma for Italian pronunciation
    const numStr = num.toString().replace('.', ',');
    
    const utterance = new SpeechSynthesisUtterance(numStr);
    utterance.lang = 'it-IT';
    utterance.rate = 0.8;
    const voices = window.speechSynthesis.getVoices();
    const italianVoice = voices.find(v => v.lang.startsWith('it'));
    if (italianVoice) utterance.voice = italianVoice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback !== 'idle' || !inputValue.trim()) return;

    const normalizedInput = inputValue.trim().toLowerCase();
    const correctWord = getItalianNumber(currentNumber).toLowerCase();
    const correctWordNoAccent = correctWord.replace(/é/g, 'e');
    
    // Accept both dot and comma for decimal input
    const inputAsNumberStr = normalizedInput.replace(',', '.');
    const correctDigitDot = currentNumber.toString();
    const correctDigitComma = currentNumber.toString().replace('.', ',');
    
    if (
      normalizedInput === correctWord || 
      inputAsNumberStr === correctDigitDot || 
      normalizedInput === correctDigitComma ||
      normalizedInput === correctWordNoAccent
    ) {
      // Correct Answer
      setFeedback('correct');
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      
      const multiplier = Math.floor(streak / 3) + 1;
      // Bonus points for decimals
      const basePoints = !Number.isInteger(currentNumber) ? 20 : 10;
      const points = basePoints * multiplier;
      const newScore = score + points;
      setScore(newScore);
      
      // Level up logic
      let newLevel = level;
      if (newScore >= 500 && level < 5) newLevel = 5; // Level 5 unlocks decimals
      else if (newScore >= 300 && level < 4) newLevel = 4;
      else if (newScore >= 150 && level < 3) newLevel = 3;
      else if (newScore >= 50 && level < 2) newLevel = 2;
      
      if (newLevel !== level) {
        setLevel(newLevel);
      }
      
    } else {
      // Incorrect Answer
      setFeedback('incorrect');
      setStreak(0);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      const newLives = lives - 1;
      setLives(newLives);
      
      if (newLives <= 0) {
        setTimeout(() => setGameState('gameover'), 1500);
      }
    }
  };

  const restartGame = () => {
    setLives(3);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setLevel(1);
    setGameState('playing');
    generateNumber(1);
  };

  if (gameState === 'gameover') {
    return (
      <div className="min-h-screen bg-[#f5f5f0] font-sans flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-white rounded-[32px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-10 flex flex-col items-center text-center"
        >
          <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mb-6">
            <Trophy className="w-12 h-12 text-rose-500" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-[#2A2A1A] mb-2">Game Over</h2>
          <p className="text-[#5A5A40] text-lg mb-8 font-serif italic">You reached Level {level}</p>
          
          <div className="flex gap-12 mb-10">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70 text-[#5A5A40] mb-1">Final Score</span>
              <span className="text-4xl font-serif font-bold text-[#2A2A1A]">{score}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70 text-[#5A5A40] mb-1">Best Streak</span>
              <span className="text-4xl font-serif font-bold text-[#2A2A1A]">{maxStreak}</span>
            </div>
          </div>
          
          <button
            onClick={restartGame}
            className="w-full py-4 rounded-full bg-[#2A2A1A] text-white font-medium tracking-wide hover:bg-black transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" /> Play Again
          </button>
        </motion.div>
      </div>
    );
  }

  const multiplier = Math.floor(streak / 3) + 1;

  return (
    <div className="min-h-screen bg-[#f5f5f0] font-sans flex flex-col items-center justify-center p-4">
      
      {/* Top HUD */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 px-2">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <Heart 
              key={i} 
              className={`w-6 h-6 transition-all duration-300 ${i < lives ? 'fill-rose-500 text-rose-500' : 'fill-gray-200 text-gray-200'}`} 
            />
          ))}
        </div>
        <div className="bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest font-semibold text-gray-500">Level</span>
          <span className="font-serif font-bold text-lg text-[#2A2A1A]">{level}</span>
        </div>
      </div>

      <motion.div 
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-8 flex flex-col items-center relative overflow-hidden"
      >
        
        {/* Header Stats */}
        <div className="w-full flex justify-between items-start mb-8 text-[#5A5A40]">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70">Score</span>
            <span className="text-3xl font-serif font-semibold text-[#2A2A1A]">{score}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70">Streak</span>
            <div className="flex items-center gap-1">
              <span className="text-3xl font-serif font-semibold text-[#2A2A1A]">{streak}</span>
              {streak >= 3 && (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="flex items-center text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full ml-2"
                >
                  <Flame className="w-4 h-4 mr-1" />
                  <span className="text-xs font-bold">{multiplier}x</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Play Button */}
        <button 
          onClick={() => playAudio()}
          disabled={!isSpeechSupported}
          className="w-32 h-32 rounded-full bg-[#5A5A40] text-white flex items-center justify-center hover:bg-[#4A4A30] transition-all shadow-xl mb-10 group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 relative"
          aria-label="Play audio"
        >
          {/* Ripple effect */}
          <div className="absolute inset-0 rounded-full border-2 border-[#5A5A40] opacity-0 group-hover:animate-ping" />
          
          {isSpeechSupported ? (
            <Volume2 className="w-14 h-14 group-hover:scale-110 transition-transform" />
          ) : (
            <VolumeX className="w-14 h-14" />
          )}
        </button>
        
        {!isSpeechSupported && (
          <p className="text-xs text-rose-500 mb-4 text-center">Speech synthesis is not supported on your browser.</p>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center min-h-[220px]">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={feedback !== 'idle'}
            placeholder="Type digits or word..."
            className="w-full text-center text-3xl font-serif py-4 border-b-2 border-[#E5E5E0] focus:border-[#5A5A40] outline-none bg-transparent transition-colors disabled:opacity-50 disabled:bg-transparent placeholder:text-xl placeholder:font-sans placeholder:text-gray-300"
            autoComplete="off"
          />
          
          <div className="mt-8 w-full flex justify-center">
            <AnimatePresence mode="wait">
              {feedback === 'idle' ? (
                <motion.button
                  key="submit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="px-12 py-4 rounded-full bg-[#2A2A1A] text-white font-medium tracking-wide disabled:opacity-30 hover:bg-black transition-colors w-full max-w-[220px] shadow-lg"
                >
                  Check Answer
                </motion.button>
              ) : (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col items-center"
                >
                  <div className={`flex items-center gap-2 text-xl font-medium mb-4 ${feedback === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {feedback === 'correct' ? <Check className="w-7 h-7" /> : <X className="w-7 h-7" />}
                    <span>{feedback === 'correct' ? 'Esatto!' : 'Sbagliato!'}</span>
                    {feedback === 'correct' && multiplier > 1 && (
                      <span className="text-sm bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full ml-2">
                        +{10 * multiplier} pts
                      </span>
                    )}
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-[#5A5A40] font-serif text-2xl">
                      <strong className="text-[#2A2A1A] font-sans text-4xl mx-2">{currentNumber}</strong>
                    </p>
                    <p className="text-[#5A5A40] font-serif italic text-2xl mt-2">
                      {getItalianNumber(currentNumber)}
                    </p>
                  </div>

                  {lives > 0 && (
                    <button
                      onClick={() => generateNumber(level)}
                      type="button"
                      className="px-10 py-4 rounded-full bg-[#5A5A40] text-white font-medium tracking-wide hover:bg-[#4A4A30] transition-colors flex items-center gap-2 shadow-lg"
                    >
                      Continue <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </motion.div>
      
      <div className="mt-6 text-center text-sm text-gray-400 font-medium">
        Level {level} • Numbers up to {getLevelMax(level)}
      </div>
    </div>
  );
}
