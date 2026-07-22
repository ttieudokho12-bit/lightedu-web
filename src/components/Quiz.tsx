import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ArrowRight, HelpCircle, Loader2, ArrowLeft, Home, Volume2, AlertTriangle } from 'lucide-react';
import { Question } from '../types';
import { LazyQuestionImage } from './LazyQuestionImage';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { formatMathSymbols, cleanOptionText } from '../services/mathUtils';
import { verifyAndReplaceQuestion } from '../services/gemini';
import { TransparentImage } from './Login';
import { VocabularyIllustration } from './VocabularyIllustration';
import { SpeakingPractice } from './SpeakingPractice';
// @ts-ignore
import studentBoyPng from '../assets/images/student_boy.png';
// @ts-ignore
import studentGirlPng from '../assets/images/student_girl.png';
// @ts-ignore
import studentBoyAvatar from '../assets/images/student_boy_avatar_1783521150254.jpg';


const CuteFlower = ({ color, delay = '0s' }: { color: string; delay?: string }) => (
  <div 
    className="flex flex-col items-center animate-bounce pointer-events-none select-none"
    style={{ animationDelay: delay, animationDuration: '3s' }}
  >
    {/* Flower petals */}
    <div className="relative w-6 h-6">
      <div className={`absolute top-0 left-1 w-2.5 h-2.5 rounded-full ${color}`} />
      <div className={`absolute top-1 left-3.5 w-2.5 h-2.5 rounded-full ${color}`} />
      <div className={`absolute top-3.5 left-2 w-2.5 h-2.5 rounded-full ${color}`} />
      <div className={`absolute top-2.5 left-0 w-2.5 h-2.5 rounded-full ${color}`} />
      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-amber-200" />
    </div>
    {/* Stem */}
    <div className="w-1 h-4 bg-emerald-600 rounded-full" />
  </div>
);

interface QuizProps {
  questions: Question[];
  onComplete: (score: number) => void;
  loading?: boolean;
  onHome?: () => void;
  subject?: string;
}

const playCorrectSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Play a friendly chime (three notes: C5, E5, then G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.08);
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.43);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(783.99, now + 0.16);
    gain3.gain.setValueAtTime(0, now + 0.16);
    gain3.gain.linearRampToValueAtTime(0.2, now + 0.21);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.4);
    
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);

    osc3.start(now + 0.16);
    osc3.stop(now + 0.55);
  } catch (error) {
    console.error("Audio playback failed:", error);
  }
};

const playIncorrectSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // A classic gentle low buzz/thud falling in pitch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.3);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (error) {
    console.error("Audio playback failed:", error);
  }
};

export default function Quiz({ questions, onComplete, loading, onHome, subject }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Local questions state to support AI question replacement on error report
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(() => questions || []);
  const [isReportingError, setIsReportingError] = useState(false);
  const [reportResult, setReportResult] = useState<{ hasError: boolean; message: string } | null>(null);

  // Sync questions prop to local state
  useEffect(() => {
    if (questions) {
      setQuizQuestions(questions);
    }
  }, [questions]);

  // Reset report state on index change
  useEffect(() => {
    setReportResult(null);
    setIsReportingError(false);
  }, [currentIndex]);

  const handleReportError = async () => {
    if (!currentQuestion || isReportingError) return;

    setIsReportingError(true);
    setReportResult(null);

    try {
      const res = await verifyAndReplaceQuestion(currentQuestion, subject);
      setReportResult({
        hasError: res.hasError,
        message: res.message
      });

      if (res.hasError && res.correctedQuestion) {
        // Enforce same ID
        const corrected = { ...res.correctedQuestion, id: currentQuestion.id };
        
        // Update local quizQuestions state
        setQuizQuestions(prev => prev.map((q, idx) => idx === currentIndex ? corrected : q));
        
        // Reset answer states so student can re-attempt the corrected question
        setSelectedAnswer(null);
        setIsAnswered(false);
        setShowExplanation(false);
      }
    } catch (error: any) {
      console.error("Report error check failed:", error);
      setReportResult({
        hasError: false,
        message: "Có lỗi xảy ra khi kết nối hệ thống AI. Bạn vui lòng thử lại sau nhé!"
      });
    } finally {
      setIsReportingError(false);
    }
  };

  // Vocabulary preparation for English quizzes
  const [vocabList, setVocabList] = useState<{ word: string; meaning: string }[]>([]);
  const [showVocabScreen, setShowVocabScreen] = useState(false);
  const [showSpeakingPractice, setShowSpeakingPractice] = useState(false);
  const [activeVocabWord, setActiveVocabWord] = useState<string | null>(null);

  const isEnglishQuiz = !!(
    subject?.toLowerCase().includes('anh') || 
    subject?.toLowerCase().includes('english')
  );

  useEffect(() => {
    if (isEnglishQuiz && questions && questions.length > 0) {
      // 1. Gather vocabulary from the first question's vocabularyList
      let list = questions[0].vocabularyList || [];
      
      // 2. If list is empty, apply smart backup extraction heuristic
      if (list.length === 0) {
        const extracted: { word: string; meaning: string }[] = [];
        const seenWords = new Set<string>();
        
        questions.forEach(q => {
          const qText = q.question || "";
          
          // Heuristic: Find English words in single/double quotes, or English option words
          const quoteRegex = /['"“‘]([^'"“”’]{2,})['"”’]/;
          const match = qText.match(quoteRegex);
          if (match) {
            const word = match[1].trim();
            // check if standard english word and not already captured
            if (/^[a-zA-Z\s\-!?,.]+$/.test(word) && !seenWords.has(word.toLowerCase()) && word.length < 25) {
              seenWords.add(word.toLowerCase());
              const correctOptionText = q.options ? q.options[q.correctAnswer] : "";
              const hasVietnamese = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(correctOptionText);
              let meaning = "Từ mới trong bài";
              if (hasVietnamese && correctOptionText.length < 50) {
                meaning = correctOptionText;
              } else if (q.explanation) {
                meaning = q.explanation.replace(/^[’'"]|[’'"]$/g, '');
              }
              extracted.push({ word, meaning });
            }
          }
        });
        
        if (extracted.length > 0) {
          list = extracted;
        }
      }

      // Default fallback vocabulary so every English quiz has vocabulary and pronunciation trial
      if (list.length === 0) {
        list = [
          { word: "Vocabulary", meaning: "Từ vựng" },
          { word: "Practice", meaning: "Luyện tập" },
          { word: "English", meaning: "Tiếng Anh" },
          { word: "Student", meaning: "Học sinh" },
          { word: "Teacher", meaning: "Giáo viên" },
          { word: "School", meaning: "Trường học" }
        ];
      }

      if (list.length > 0) {
        setVocabList(list);
        setShowVocabScreen(true);
      }
    }
  }, [questions, isEnglishQuiz]);

  const currentQuestion = quizQuestions ? quizQuestions[currentIndex] : null;

  // Helper to extract text to be read and clean up the question text
  const getListeningDetails = (q: Question) => {
    const qText = q.question || "";
    
    // Check if the subject is English
    const isEnglishSubject = !!(
      subject?.toLowerCase().includes('anh') || 
      subject?.toLowerCase().includes('english') ||
      q.listeningText || 
      q.isListening ||
      // Or if question has mostly English alphabet with standard punctuation (heuristic)
      /^[a-zA-Z\s?,.'"\-!]+$/.test(qText.replace(/[0-9]/g, '').trim())
    );

    // Dedicated listening questions
    const isListeningType = !!(
      q.isListening || 
      qText.toLowerCase().includes('nghe') || 
      qText.toLowerCase().includes('listening') ||
      qText.toLowerCase().includes('lắng nghe')
    );

    let listeningText = q.listeningText || "";
    let displayedQuestion = qText;

    if (isEnglishSubject) {
      const correctOptionKey = q.correctAnswer;
      const correctOptionText = q.options ? (q.options[correctOptionKey] || "") : "";
      const isCorrectOptionEnglish = /^[a-zA-Z\s?,.'"\-!]+$/.test(correctOptionText.trim());
      const hasVietnameseAccents = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(qText);
      const isVietnameseQuestion = hasVietnameseAccents || qText.toLowerCase().includes("nghĩa") || qText.toLowerCase().includes("dịch");

      // CASE A: Vietnamese-to-English vocabulary question
      // Question is in Vietnamese, and correct option is in English (the target word)
      if (isVietnameseQuestion && isCorrectOptionEnglish && !q.listeningText) {
        listeningText = correctOptionText;
      }

      // CASE B: English-to-Vietnamese translation/vocabulary
      if (!listeningText) {
        // Look inside single/double/curly quotes for a candidate string (at least 3 characters)
        const quoteRegex = /['"“‘]([^'"“”’]{3,})['"”’]/;
        const match = qText.match(quoteRegex);
        if (match) {
          const candidate = match[1].trim();
          const candidateHasVietnamese = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(candidate);
          if (!candidateHasVietnamese) {
            listeningText = candidate;
          }
        } else {
          // Check for colon ':' followed by english text
          const colonIndex = qText.indexOf(':');
          if (colonIndex !== -1) {
            const afterColon = qText.substring(colonIndex + 1).trim();
            const afterColonHasVietnamese = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(afterColon);
            if (!afterColonHasVietnamese && afterColon.length >= 3) {
              listeningText = afterColon;
            }
          }
        }
      }

      // If we still can't find a dedicated substring, use the whole question text as the audio text (if it's clean English)
      if (!listeningText) {
        const hasVietnameseInQText = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(qText);
        if (!hasVietnameseInQText) {
          listeningText = qText;
        } else if (isCorrectOptionEnglish) {
          // Fallback to correct option if question has Vietnamese and option is English
          listeningText = correctOptionText;
        }
      }

      // Strip the listening text from the displayed question if this is a dedicated listening question
      if (isListeningType && listeningText) {
        const escapedText = listeningText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        
        // Remove quotes around the text first
        const regexWithQuotes = new RegExp(`['"“‘]\\s*${escapedText}\\s*['"”’]`, 'gi');
        displayedQuestion = displayedQuestion.replace(regexWithQuotes, '');

        // Remove direct matches
        const regexDirect = new RegExp(escapedText, 'gi');
        displayedQuestion = displayedQuestion.replace(regexDirect, '');

        // Clean up stray colons, spaces, and punctuation
        displayedQuestion = displayedQuestion.replace(/:\s*$/, '');
        displayedQuestion = displayedQuestion.replace(/-\s*$/, '');
        displayedQuestion = displayedQuestion.replace(/\s+/g, ' ');
        displayedQuestion = displayedQuestion.trim();

        if (displayedQuestion.length < 10) {
          displayedQuestion = "Hãy bấm vào biểu tượng loa bên cạnh để nghe câu hỏi:";
        } else {
          if (!displayedQuestion.endsWith(':') && !displayedQuestion.endsWith('?') && !displayedQuestion.endsWith('.')) {
            displayedQuestion += ':';
          }
        }
      }
    }

    return {
      isEnglishSubject,
      isListeningType,
      listeningText,
      displayedQuestion
    };
  };

  // Pre-fetch speech synthesis voices on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);

  const handleSpeak = async (text: string) => {
    if (!text) return;
    try {
      // 1. Cancel any current speech synthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // 2. Stop any current playing server-synthesized audio
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {}
        audioSourceRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          await audioCtxRef.current.close();
        } catch (e) {}
        audioCtxRef.current = null;
      }

      setActiveVocabWord(text);
      setIsPlayingAudio(true);

      // Try calling server-side TTS first
      try {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }
        const data = await response.json();
        if (!data.audio) {
          throw new Error("No audio returned in JSON");
        }

        const binaryString = window.atob(data.audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        
        if (data.format === 'mp3') {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audio.onended = () => {
            setIsPlayingAudio(false);
            setActiveVocabWord(null);
          };
          audio.onerror = () => {
            setIsPlayingAudio(false);
            setActiveVocabWord(null);
          };
          await audio.play();
          return; // Success!
        } else {
          // Convert 16-bit little-endian PCM to Float32
          const dataView = new DataView(arrayBuffer);
          const numSamples = arrayBuffer.byteLength / 2;
          const float32Data = new Float32Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
          }

          const audioCtx = new AudioContextClass({ sampleRate: 24000 });
          audioCtxRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          const buffer = audioCtx.createBuffer(1, numSamples, 24000);
          buffer.getChannelData(0).set(float32Data);

          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          audioSourceRef.current = source;

          source.connect(audioCtx.destination);
          source.onended = () => {
            setIsPlayingAudio(false);
            setActiveVocabWord(null);
          };

          source.start(0);
          return; // Success!
        }
      } catch (apiError) {
        console.warn("Server-side TTS failed or timed out, falling back to client-side speechSynthesis:", apiError);
      }

      // Fallback: Client-side Speech Synthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const isSingleWord = !text.trim().includes(' ');
        const isVi = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
        
        const speakWithSettings = (wordText: string, onEndCallback?: () => void) => {
          try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
          } catch (e) {}

          const utterance = new SpeechSynthesisUtterance(wordText);
          utterance.lang = isVi ? 'vi-VN' : 'en-US';
          utterance.rate = 0.85;
          utterance.pitch = isVi ? 1.0 : 1.3;

          let voices = window.speechSynthesis.getVoices();
          if (!voices || voices.length === 0) {
            voices = window.speechSynthesis.getVoices();
          }

          const targetLang = isVi ? 'vi' : 'en';
          const matchingVoices = voices.filter(voice => {
            const lang = voice.lang.toLowerCase();
            return lang.startsWith(targetLang) || lang.includes(targetLang);
          });

          if (matchingVoices.length > 0) {
            const femaleVoice = matchingVoices.find(v => {
              const nameLower = v.name.toLowerCase();
              return nameLower.includes('female') ||
                     nameLower.includes('linh') ||
                     nameLower.includes('hoaimy') ||
                     nameLower.includes('an') ||
                     nameLower.includes('google') ||
                     nameLower.includes('samantha') ||
                     nameLower.includes('zira');
            });
            utterance.voice = femaleVoice || matchingVoices[0];
          }

          utterance.onstart = () => {
            setIsPlayingAudio(true);
          };
          utterance.onend = () => {
            if (onEndCallback) {
              onEndCallback();
            } else {
              setIsPlayingAudio(false);
              setActiveVocabWord(null);
            }
          };
          utterance.onerror = () => {
            setIsPlayingAudio(false);
            setActiveVocabWord(null);
          };

          setTimeout(() => {
            try {
              window.speechSynthesis.resume();
              window.speechSynthesis.speak(utterance);
            } catch (err) {
              console.error("SpeechSynthesis error:", err);
              setIsPlayingAudio(false);
              setActiveVocabWord(null);
            }
          }, 50);
        };

        if (isSingleWord) {
          // Word repetition with 500ms break
          speakWithSettings(text, () => {
            setTimeout(() => {
              speakWithSettings(text);
            }, 500);
          });
        } else {
          speakWithSettings(text);
        }
      } else {
        setIsPlayingAudio(false);
        setActiveVocabWord(null);
      }
    } catch (err) {
      console.error("All Speech Synthesis methods failed:", err);
      setIsPlayingAudio(false);
      setActiveVocabWord(null);
    }
  };

  // Cancel any active speech when moving to a new question
  useEffect(() => {
    try {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {}
        audioSourceRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    } catch (e) {}
  }, [currentIndex, currentQuestion]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis.cancel();
        if (audioSourceRef.current) {
          try {
            audioSourceRef.current.stop();
          } catch (e) {}
          audioSourceRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
      } catch (e) {}
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
        <p className="text-stone-600 font-medium italic serif">AI đang soạn bộ câu hỏi cho bạn...</p>
        <p className="text-stone-400 text-sm mt-2">Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  // Vocabulary pre-study screen before showing the quiz questions
  if (showVocabScreen && vocabList.length > 0) {
    const cardStyles = [
      {
        bg: 'bg-[#f0fdf4]/80 border-[#bbf7d0]/80',
        text: 'text-[#166534]',
        hoverBorder: 'hover:border-[#4ade80]',
        playingRing: 'ring-[#4ade80]/30 border-[#4ade80] bg-[#f0fdf4]',
      },
      {
        bg: 'bg-[#fffbeb]/80 border-[#fef08a]/80',
        text: 'text-[#9a3412]',
        hoverBorder: 'hover:border-[#facc15]',
        playingRing: 'ring-[#facc15]/30 border-[#facc15] bg-[#fffbeb]',
      },
      {
        bg: 'bg-[#f0f9ff]/80 border-[#bae6fd]/80',
        text: 'text-[#0369a1]',
        hoverBorder: 'hover:border-[#38bdf8]',
        playingRing: 'ring-[#38bdf8]/30 border-[#38bdf8] bg-[#f0f9ff]',
      },
      {
        bg: 'bg-[#fff5f5]/80 border-[#fecdd3]/80',
        text: 'text-[#9f1239]',
        hoverBorder: 'hover:border-[#fb7185]',
        playingRing: 'ring-[#fb7185]/30 border-[#fb7185] bg-[#fff5f5]',
      },
      {
        bg: 'bg-[#faf5ff]/80 border-[#e9d5ff]/80',
        text: 'text-[#6b21a8]',
        hoverBorder: 'hover:border-[#c084fc]',
        playingRing: 'ring-[#c084fc]/30 border-[#c084fc] bg-[#faf5ff]',
      }
    ];

    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {onHome && (
          <div className="flex justify-start mb-4 sm:mb-6">
            <button
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn thoát khỏi bài ôn luyện này và quay lại Trang chủ không?")) {
                  onHome();
                }
              }}
              className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-900 font-extrabold text-xs sm:text-sm transition-all bg-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-emerald-100 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>Trang chủ</span>
            </button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#fffdfa] rounded-[24px] sm:rounded-[40px] border-4 border-[#ffedd5] p-4 sm:p-8 md:p-10 shadow-xl relative overflow-hidden"
        >
          {/* Decorative design elements */}
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-36 sm:h-36 bg-[#f0fdf4] rounded-full -mr-12 -mt-12 -z-10 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-28 sm:h-28 bg-[#f0f9ff] rounded-full -ml-10 -mb-10 -z-10" />

          {/* Header row containing illustrations and centered text */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-10 pb-6 sm:pb-8 border-b-2 border-dashed border-[#fed7aa]/50 relative">
            {/* Left decoration (Purple book with notes) */}
            <div className="hidden md:block w-32 h-32 flex-shrink-0 animate-bounce" style={{ animationDuration: '6s' }}>
              <svg viewBox="0 0 160 160" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="rotate(-12 80 80)">
                  <rect x="34" y="34" width="92" height="102" rx="12" fill="#7c3aed" opacity="0.25" />
                  <rect x="30" y="30" width="92" height="102" rx="12" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="4.5" />
                  <rect x="38" y="30" width="8" height="102" fill="#6d28d9" />
                  <text x="78" y="86" textAnchor="middle" fill="#fef08a" fontSize="26" fontWeight="900" letterSpacing="1" fontFamily="sans-serif">ABC</text>
                  <rect x="23" y="48" width="8" height="12" rx="2" fill="#f43f5e" />
                  <rect x="23" y="72" width="8" height="12" rx="2" fill="#10b981" />
                </g>
                <path d="M15 45 L17 50 L22 51 L17 53 L15 58 L13 53 L8 51 L13 50 Z" fill="#facc15" />
                <path d="M135 110 L137 114 L141 115 L137 116 L135 120 L133 116 L129 115 L133 114 Z" fill="#ec4899" />
                <path d="M25 110 V95 Q30 92 35 98 V113" stroke="#f472b6" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="21" cy="110" r="4.5" fill="#f472b6" />
                <circle cx="31" cy="113" r="4.5" fill="#f472b6" />
              </svg>
            </div>

            {/* Centered header texts */}
            <div className="flex-1 text-center w-full">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-black bg-[#e8fbf0] text-[#15803d] border-2 border-[#bbf7d0] tracking-wider mb-3 sm:mb-4 shadow-sm select-none">
                📖 HỌC TỪ MỚI TIẾNG ANH
              </span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-2 sm:mb-3 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap select-none font-sans">
                <span>Sổ Tay</span>
                <span className="text-emerald-500 underline decoration-wavy decoration-[#86efac]/80 underline-offset-4 font-black">Từ Vựng</span>
                <span>Mới</span>
              </h2>
              <p className="text-slate-500 font-extrabold text-xs sm:text-sm md:text-base max-w-lg mx-auto leading-relaxed px-2">
                Bé ơi, hãy cùng nghe và luyện phát âm các từ mới sẽ xuất hiện trong bài này trước khi làm bài nhé!
              </p>
            </div>

            {/* Right decoration (Boy with ABC book card) */}
            <div className="hidden md:block w-36 h-36 flex-shrink-0">
              <svg viewBox="0 0 180 180" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60 140 L120 140 L130 180 L50 180 Z" fill="#3b82f6" />
                <path d="M72 140 L90 156 L108 140 Z" fill="#ffffff" />
                <path d="M86 148 L94 148 L90 170 Z" fill="#1d4ed8" />
                <rect x="80" y="125" width="20" height="20" rx="5" fill="#ffedd5" />
                <circle cx="90" cy="90" r="44" fill="#ffedd5" stroke="#7c2d12" strokeWidth="1.5" />
                <circle cx="60" cy="108" r="8" fill="#fca5a5" opacity="0.6" />
                <circle cx="120" cy="108" r="8" fill="#fca5a5" opacity="0.6" />
                <circle cx="70" cy="95" r="8" fill="#1f2937" />
                <circle cx="67" cy="92" r="3" fill="#ffffff" />
                <circle cx="68" cy="98" r="1.5" fill="#ffffff" />
                <circle cx="110" cy="95" r="8" fill="#1f2937" />
                <circle cx="107" cy="92" r="3" fill="#ffffff" />
                <circle cx="108" cy="98" r="1.5" fill="#ffffff" />
                <path d="M80 112 Q90 124 100 112" stroke="#b91c1c" strokeWidth="4.5" strokeLinecap="round" />
                <circle cx="90" cy="84" r="46" fill="#78350f" />
                <path d="M44 80 C44 50, 60 40, 90 40 C120 40, 136 50, 136 80 C128 72, 118 70, 110 76 C100 82, 94 72, 90 72 C86 72, 80 82, 70 76 C62 70, 52 72, 44 80 Z" fill="#78350f" />
                <path d="M80 40 L90 20 L100 40" fill="#78350f" />
                <path d="M60 50 L65 35 L75 48" fill="#78350f" />
                <path d="M105 48 L115 35 L120 50" fill="#78350f" />
                <circle cx="44" cy="140" r="10" fill="#ffedd5" />
                <path d="M44 140 V122" stroke="#ffedd5" strokeWidth="6" strokeLinecap="round" />
                <g transform="translate(130 125)">
                  <rect x="0" y="0" width="30" height="40" rx="4" fill="#10b981" stroke="#047857" strokeWidth="1.5" transform="rotate(15)" />
                  <text x="15" y="25" fill="#ffffff" fontSize="12" fontWeight="900" transform="rotate(15)" textAnchor="middle" fontFamily="sans-serif">ABC</text>
                  <circle cx="5" cy="18" r="8" fill="#ffedd5" />
                </g>
                <path d="M140 25 L143 31 L149 33 L143 35 L140 41 L137 35 L131 33 L137 31 Z" fill="#fbbf24" />
                <path d="M160 55 L161 59 L165 60 L161 61 L160 65 L159 61 L155 60 L159 59 Z" fill="#f59e0b" />
              </svg>
            </div>
          </div>

          {/* Vocabulary Grid (2 Columns, responsive and flexible) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
            {vocabList.map((item, idx) => {
              const style = cardStyles[idx % cardStyles.length];
              const isCurrentPlaying = activeVocabWord === item.word;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.015 }}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-5 rounded-[20px] sm:rounded-[30px] border-2 transition-all shadow-sm overflow-hidden ${
                    isCurrentPlaying
                      ? `${style.playingRing} shadow-md ring-2 sm:ring-4`
                      : `${style.bg} ${style.hoverBorder} hover:bg-white hover:shadow-md`
                  }`}
                >
                  {/* Rounded image container with White background for Illustration */}
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center p-1 sm:p-1.5 shadow-sm border border-stone-100 flex-shrink-0 overflow-hidden relative">
                    <VocabularyIllustration word={item.word} className="w-full h-full object-contain" />
                  </div>

                  {/* Word information */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight capitalize font-sans truncate block max-w-full ${style.text}`}>
                        {item.word}
                      </span>
                      {isCurrentPlaying && (
                        <span className="flex gap-0.5 items-end h-4 pb-1">
                          <span className="w-0.75 sm:w-1 bg-emerald-500 rounded-full animate-bounce h-2 sm:h-3" style={{ animationDelay: '0ms' }} />
                          <span className="w-0.75 sm:w-1 bg-emerald-500 rounded-full animate-bounce h-3 sm:h-4" style={{ animationDelay: '150ms' }} />
                          <span className="w-0.75 sm:w-1 bg-emerald-500 rounded-full animate-bounce h-1.5 sm:h-2" style={{ animationDelay: '300ms' }} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm md:text-base text-stone-600 mt-0.5 sm:mt-1 font-bold italic select-none truncate">
                      {item.meaning}
                    </p>
                  </div>

                  {/* Sound speaker button */}
                  <button
                    onClick={() => handleSpeak(item.word)}
                    className={`p-2 sm:p-3.5 rounded-full transition-all duration-300 flex-shrink-0 shadow-sm border ${
                      isCurrentPlaying
                        ? 'bg-emerald-500 text-white shadow-md border-emerald-500 scale-105 sm:scale-110'
                        : 'bg-white border-stone-200 text-[#15803d] hover:bg-emerald-50 hover:border-emerald-300 hover:scale-105'
                    }`}
                    title="Nghe phát âm"
                  >
                    <Volume2 className={`w-4 h-4 sm:w-6 sm:h-6 ${isCurrentPlaying ? 'animate-pulse' : ''}`} />
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Footer controls responsive */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 pt-6 sm:pt-8 border-t-2 border-[#ffedd5]">
            {/* Left status badge with Cute Star */}
            <div className="flex items-center gap-2 sm:gap-3 bg-[#fffbeb] border-2 border-[#fde047] rounded-xl sm:rounded-2xl px-4 py-2 sm:px-5 sm:py-3 shadow-sm select-none">
              <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="50,12 62,38 90,42 70,61 75,88 50,75 25,88 30,61 10,42 38,38" fill="#fbbf24" stroke="#ca8a04" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="41" cy="48" r="2.5" fill="#854d0e" />
                <circle cx="59" cy="48" r="2.5" fill="#854d0e" />
                <path d="M45 58 Q50 63 55 58" stroke="#854d0e" strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx="35" cy="54" r="2" fill="#fca5a5" opacity="0.8" />
                <circle cx="65" cy="54" r="2" fill="#fca5a5" opacity="0.8" />
              </svg>
              <span className="text-xs sm:text-sm md:text-base text-stone-700 font-extrabold font-sans">
                Tổng số từ vựng: <span className="text-emerald-600 font-black text-lg sm:text-2xl px-0.5">{vocabList.length}</span> từ
              </span>
            </div>

            {/* Action Buttons Group */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              {/* Skip button directly enters quiz exercises */}
              <button
                onClick={() => {
                  try {
                    window.speechSynthesis.cancel();
                    setIsPlayingAudio(false);
                  } catch (e) {}
                  setShowVocabScreen(false);
                  setShowSpeakingPractice(false);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 font-black text-sm sm:text-base px-6 py-3.5 rounded-2xl border-2 border-amber-200 transition-all shadow-sm select-none cursor-pointer"
              >
                <span>Bỏ qua luyện nói (Làm bài luôn) ➔</span>
              </button>

              {/* Right "Let's start" Green Button with Popper Rocket */}
              <button
                onClick={() => {
                  try {
                    window.speechSynthesis.cancel();
                    setIsPlayingAudio(false);
                  } catch (e) {}
                  setShowVocabScreen(false);
                  if (isEnglishQuiz && vocabList.length > 0) {
                    setShowSpeakingPractice(true);
                  }
                }}
                className="relative w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] text-white font-extrabold text-sm sm:text-base md:text-lg pl-12 pr-6 py-3.5 sm:pl-16 sm:pr-8 sm:py-4 rounded-[20px] sm:rounded-[25px] transition-all shadow-md hover:shadow-lg active:scale-98 select-none border-b-4 border-[#047857] cursor-pointer"
              >
                {/* Pocket Rocket */}
                <div className="absolute left-[-16px] sm:left-[-24px] top-[-10px] sm:top-[-14px] w-14 h-14 sm:w-20 sm:h-20 select-none pointer-events-none drop-shadow-lg z-10 rotate-[-15deg] animate-bounce" style={{ animationDuration: '3s' }}>
                  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path d="M60 15 C80 40, 80 80, 80 95 H40 C40 80, 40 40, 60 15 Z" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
                    <path d="M60 15 C70 40, 70 80, 70 95 H50 C50 80, 50 40, 60 15 Z" fill="#ef4444" />
                    <circle cx="60" cy="55" r="10" fill="#38bdf8" stroke="#1d4ed8" strokeWidth="3" />
                    <circle cx="57" cy="52" r="3" fill="#ffffff" />
                    <path d="M40 80 L20 100 L35 100 L40 92 Z" fill="#f97316" />
                    <path d="M80 80 L100 100 L85 100 L80 92 Z" fill="#f97316" />
                    <path d="M60 92 L60 105" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                    <path d="M52 98 C52 115, 60 125, 60 125 C60 125, 68 115, 68 98 Z" fill="#fb5607" />
                    <path d="M55 98 C55 108, 60 115, 60 115 C60 115, 65 108, 65 98 Z" fill="#ffbe0b" />
                  </svg>
                </div>

                <span>Luyện nói & Làm bài thi!</span>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showSpeakingPractice && vocabList.length > 0) {
    return (
      <SpeakingPractice 
        vocabList={vocabList}
        onComplete={() => {
          setShowSpeakingPractice(false);
        }}
        onHome={onHome || (() => {})}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <p className="text-stone-600 font-medium">Không tìm thấy câu hỏi nào. Vui lòng thử lại sau nhé!</p>
      </div>
    );
  }

  const details = getListeningDetails(currentQuestion);

  const handleAnswer = (option: 'A' | 'B' | 'C' | 'D') => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);
    if (option === currentQuestion.correctAnswer) {
      setScore(s => s + 1);
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
  };

  const handleNext = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowExplanation(false);
    } else {
      onComplete(score);
    }
  };

  const progress = ((currentIndex + 1) / quizQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2FE] via-[#F0F9FF] to-[#FFFFFF] text-stone-900 font-sans pb-36 relative overflow-x-hidden">
      {/* Cute Background Clouds */}
      <div className="absolute top-10 left-[10%] opacity-40 animate-pulse pointer-events-none select-none" style={{ animationDuration: '8s' }}>
        <div className="w-24 h-8 bg-white rounded-full filter blur-[1px]" />
        <div className="w-16 h-16 bg-white rounded-full -mt-12 ml-4 filter blur-[1px]" />
      </div>
      <div className="absolute top-24 right-[15%] opacity-30 animate-pulse pointer-events-none select-none" style={{ animationDuration: '12s' }}>
        <div className="w-32 h-10 bg-white rounded-full filter blur-[1px]" />
        <div className="w-20 h-20 bg-white rounded-full -mt-16 ml-8 filter blur-[1px]" />
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-8 pb-16 relative z-10">
        {/* Quiz Navigation and Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 z-10 relative">
          <div className="flex items-center gap-3">
            {onHome && (
              <button
                onClick={() => {
                  if (confirm("Bạn có chắc chắn muốn thoát khỏi bài ôn luyện này và quay lại Trang chủ không?")) {
                    onHome();
                  }
                }}
                className="inline-flex items-center gap-2 text-stone-700 hover:text-stone-950 font-black text-sm transition-all bg-white px-5 py-2.5 rounded-full border-2 border-stone-150 shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-stone-600" />
                <span>Quay lại trang chủ</span>
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#1e293b] ml-1">
                Câu <span className="text-emerald-600">{currentIndex + 1}</span> / {quizQuestions.length}
              </span>
              {currentQuestion && currentQuestion.difficulty && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-[#dcfce7] text-[#15803d] px-3 py-1 rounded-full font-black border border-[#bbf7d0] shadow-sm">
                  <span className="text-yellow-400">★</span> {currentQuestion.difficulty === 'Easy' ? 'Dễ' : currentQuestion.difficulty === 'Medium' ? 'Trung bình' : 'Khó'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:self-end self-start ml-auto sm:ml-0">
            <div className="relative">
              {/* Speech Bubble */}
              <div className="bg-white border border-stone-200 rounded-2xl px-4 py-2.5 text-xs font-black text-stone-700 shadow-md relative whitespace-nowrap">
                <span>Cố lên! 💪 Bạn làm rất tốt!</span>
                {/* Bubble tail */}
                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-white" />
                <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[7px] border-l-stone-200 -z-10" />
              </div>
            </div>

            {/* Robot Mascot */}
            <div className="w-14 h-14 relative animate-bounce" style={{ animationDuration: '4s' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                <rect x="15" y="40" width="10" height="20" rx="4" fill="#3b82f6" />
                <rect x="75" y="40" width="10" height="20" rx="4" fill="#3b82f6" />
                <path d="M20 45 A 30 30 0 0 1 80 45" stroke="#3b82f6" strokeWidth="6" fill="none" />
                <rect x="22" y="30" width="56" height="42" rx="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                <rect x="28" y="36" width="44" height="30" rx="8" fill="#1e293b" />
                <circle cx="40" cy="48" r="4" fill="#22d3ee" />
                <circle cx="60" cy="48" r="4" fill="#22d3ee" />
                <path d="M44 56 Q 50 60 56 56" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M35 72 L65 72 L72 85 L28 85 Z" fill="#3b82f6" />
                <circle cx="50" cy="78" r="3" fill="#f59e0b" />
              </svg>
            </div>

            {/* Percentage Badge */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm">
              <svg className="w-4 h-4 text-emerald-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 12h3v8h14v-8h3L12 2z" />
              </svg>
              <span className="text-xs font-black text-emerald-600">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full bg-[#dcfce7]/60 rounded-full overflow-hidden border border-[#bbf7d0]/40 mb-8 z-10 relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-[#10b981] to-[#059669] rounded-full transition-all duration-300"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Main Question Card */}
            <div className="bg-white p-6 sm:p-10 rounded-[32px] border-4 border-[#fed7aa]/50 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] relative z-10 overflow-visible">
              {/* Yellow Star Sticker at top left */}
              <div className="absolute -top-5 -left-5 w-12 h-12 select-none pointer-events-none drop-shadow-md animate-bounce" style={{ animationDuration: '4s' }}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Question text and Mascot block */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-stone-100 pb-6 relative">
                <div className="flex-1 w-full text-center md:text-left">
                  {details.isListeningType && (
                    <div className="inline-flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 mb-3 mx-auto md:mx-0">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Bài luyện nghe - Chú ý lắng nghe nhé!</span>
                    </div>
                  )}

                  <div className="text-2xl sm:text-3xl font-black text-stone-850 leading-snug tracking-tight">
                    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {formatMathSymbols(details.displayedQuestion)}
                    </Markdown>
                  </div>
                </div>

                {/* Speak button for English */}
                {details.isEnglishSubject && (
                  <button
                    id="speak-button"
                    onClick={() => handleSpeak(details.listeningText)}
                    className={`flex-shrink-0 p-3.5 rounded-full transition-all duration-300 shadow-sm border cursor-pointer ${
                      isPlayingAudio 
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-600 animate-pulse scale-110' 
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:scale-105 active:scale-95'
                    }`}
                    title="Bấm để nghe âm thanh"
                  >
                    <Volume2 className="w-7 h-7" />
                  </button>
                )}

                {/* Cute Lightbulb Mascot Sticker */}
                <div className="w-14 h-14 md:w-24 md:h-24 flex-shrink-0 relative animate-bounce" style={{ animationDuration: '6s' }}>
                  <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md">
                    <circle cx="20" cy="35" r="2" fill="#f59e0b" />
                    <line x1="15" y1="20" x2="25" y2="28" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                    <line x1="100" y1="20" x2="90" y2="28" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="100" cy="35" r="2" fill="#f59e0b" />
                    <path d="M35 55 C35 32 85 32 85 55 C85 68 75 74 72 82 L48 82 C45 74 35 68 35 55 Z" fill="#fef08a" stroke="#d97706" strokeWidth="3" />
                    <rect x="48" y="82" width="24" height="6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                    <rect x="52" y="88" width="16" height="5" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
                    <circle cx="50" cy="50" r="3" fill="#1e293b" />
                    <circle cx="70" cy="50" r="3" fill="#1e293b" />
                    <circle cx="45" cy="56" r="3" fill="#f87171" opacity="0.6" />
                    <circle cx="75" cy="56" r="3" fill="#f87171" opacity="0.6" />
                    <path d="M56 58 Q 60 62 64 58" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M 30 80 Q 60 100 90 80 L 85 105 Q 60 115 35 105 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
                    <line x1="60" y1="88" x2="60" y2="108" stroke="#1d4ed8" strokeWidth="2" />
                    <circle cx="32" cy="78" r="4.5" fill="#fef08a" stroke="#d97706" strokeWidth="2" />
                    <circle cx="88" cy="78" r="4.5" fill="#fef08a" stroke="#d97706" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* Lazy Loaded Question Image (e.g. geometric shapes) */}
              <LazyQuestionImage 
                imagePrompt={currentQuestion.imagePrompt} 
                questionText={currentQuestion.question} 
                initialImage={currentQuestion.image} 
              />

              {/* Options list */}
              <div className="grid grid-cols-1 gap-4 mt-6">
                {(Object.entries(currentQuestion.options) as [('A' | 'B' | 'C' | 'D'), string][]).map(([key, value]) => {
                  const isCorrect = key === currentQuestion.correctAnswer;
                  const isSelected = key === selectedAnswer;
                  
                  // Styles depending on answered state
                  let containerClass = "bg-white border-2 border-[#e2e8f0] text-stone-700 hover:border-stone-300 hover:bg-stone-50/50 shadow-sm";
                  let badgeClass = "bg-[#eff6ff] border border-[#dbeafe] text-[#2563eb]";
                  
                  if (isAnswered) {
                    if (isCorrect) {
                      containerClass = "bg-[#ecfdf5] border-2 border-[#10b981] text-[#15803d] shadow-sm shadow-emerald-50";
                      badgeClass = "bg-[#10b981] text-white border-transparent";
                    } else if (isSelected) {
                      containerClass = "bg-[#fff5f5] border-2 border-[#f87171] text-[#b91c1c] shadow-sm shadow-rose-50";
                      badgeClass = "bg-[#ef4444] text-white border-transparent";
                    } else {
                      containerClass = "bg-stone-50/50 border border-stone-150 text-stone-400 opacity-60";
                      badgeClass = "bg-stone-100 text-stone-400 border-transparent";
                    }
                  }

                  return (
                    <button
                      key={key}
                      onClick={() => handleAnswer(key)}
                      disabled={isAnswered}
                      className={`group flex items-center gap-5 p-5 rounded-2xl text-left transition-all font-bold text-lg md:text-xl relative overflow-visible cursor-pointer ${containerClass}`}
                    >
                      {/* Option letter badge */}
                      <span className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full font-black text-lg border transition-all ${badgeClass}`}>
                        {key}
                      </span>

                      {/* Option value content */}
                      <div className="flex-1">
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {formatMathSymbols(value)}
                        </Markdown>
                      </div>

                      {/* Boy Mascot Peeking when correct and answered */}
                      {isAnswered && isCorrect && (
                        <div className="absolute right-10 sm:right-20 bottom-[-5px] w-12 h-12 sm:w-16 sm:h-16 select-none pointer-events-none z-10 animate-bounce" style={{ animationDuration: '4s' }}>
                          <TransparentImage 
                            src={studentBoyPng} 
                            onError={(e) => { e.currentTarget.src = studentBoyAvatar }} 
                            alt="Student Boy"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      {/* Girl Mascot Peeking when selected incorrect */}
                      {isAnswered && isSelected && !isCorrect && (
                        <div className="absolute right-10 sm:right-20 bottom-[-5px] w-12 h-12 sm:w-16 sm:h-16 select-none pointer-events-none z-10 animate-bounce" style={{ animationDuration: '3.5s' }}>
                          <TransparentImage 
                            src={studentGirlPng} 
                            onError={(e) => { e.currentTarget.src = studentBoyAvatar }} 
                            alt="Student Girl"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-[-5px] left-[-5px] bg-red-100 text-red-600 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full border border-red-200">?</div>
                        </div>
                      )}

                      {/* Selection indicators (empty circle, checkmark, cross) */}
                      <div className="flex-shrink-0 ml-auto pl-2">
                        {isAnswered ? (
                          isCorrect ? (
                            <div className="w-7 h-7 rounded-full border-2 border-[#10b981] bg-emerald-50 flex items-center justify-center text-[#10b981]">
                              <svg className="w-4 h-4 stroke-current" strokeWidth="4" viewBox="0 0 24 24" fill="none">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          ) : isSelected ? (
                            <div className="w-7 h-7 rounded-full border-2 border-[#ef4444] bg-rose-50 flex items-center justify-center text-[#ef4444]">
                              <svg className="w-4 h-4 stroke-current" strokeWidth="4" viewBox="0 0 24 24" fill="none">
                                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full border-2 border-stone-200 bg-stone-50" />
                          )
                        ) : (
                          <div className="w-7 h-7 rounded-full border-2 border-stone-300 bg-white group-hover:border-stone-400 transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Card Footer Helpers & Report */}
              <div className="mt-8 pt-6 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 relative">
                {/* Dashed Helper Capsule */}
                <div className="inline-flex items-center gap-2 border border-dashed border-amber-300 bg-amber-50/50 text-[#d97706] text-xs font-black px-4 py-2.5 rounded-full shadow-sm max-w-fit">
                  <span className="text-yellow-500 text-sm">★</span>
                  <span>Bé hãy chọn 1 đáp án đúng nhé!</span>
                </div>

                {/* Report button */}
                <button
                  id="report-error-btn"
                  onClick={handleReportError}
                  disabled={isReportingError}
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 px-4 py-2.5 rounded-full border border-rose-200 transition-colors font-extrabold cursor-pointer shadow-sm"
                >
                  {isReportingError ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      <span>AI đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Báo cáo đáp án sai</span>
                    </>
                  )}
                </button>
              </div>

              {reportResult && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl text-sm border mt-4 relative z-10 ${
                    reportResult.hasError
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-emerald-50 border-emerald-100 text-emerald-800"
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    {reportResult.hasError ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">
                        {reportResult.hasError ? "Phát hiện có sai sót! AI đã đổi câu hỏi mới:" : "Kết quả kiểm tra:"}
                      </p>
                      <p className="mt-1 leading-relaxed opacity-90">{reportResult.message}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Answer Explanation Box (Appears when isAnswered === true) */}
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 pt-4"
              >
                <div className="relative rounded-[28px] border-2 border-sky-100 bg-[#eff6ff] p-6 sm:p-8 shadow-sm overflow-visible">
                  {/* Ribbon Badge */}
                  <div className="absolute top-[-20px] left-6 bg-[#2563eb] text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full flex items-center gap-2 shadow-md border-2 border-white">
                    <span className="text-yellow-300 text-sm">★</span>
                    <span>Giải thích đáp án</span>
                  </div>

                  <div className="mt-4 flex flex-row items-start justify-between gap-3 sm:gap-6">
                    <div className="flex-1 space-y-4 min-w-0">
                      {/* Explanatory text statement with checkmark */}
                      <div className="flex items-start gap-2.5 text-stone-750 text-base sm:text-lg font-bold leading-relaxed">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                          <svg className="w-3.5 h-3.5 stroke-current" strokeWidth="4" viewBox="0 0 24 24" fill="none">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {formatMathSymbols(currentQuestion.explanation)}
                          </Markdown>
                        </div>
                      </div>

                      {/* Formula Visual Highlight Box */}
                      <div className="bg-white border border-sky-100 rounded-2xl p-4 sm:p-5 flex items-center justify-center text-center shadow-sm">
                        <div className="text-xl sm:text-2xl font-black text-[#1e3a8a] tracking-wide flex items-center gap-1.5 flex-wrap justify-center">
                          <span>Vậy đáp án là: </span>
                          <span className="text-rose-500 text-2xl sm:text-3xl font-black px-1.5 inline-flex items-center">
                            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {formatMathSymbols(
                                currentQuestion.correctAnswer === 'A' ? currentQuestion.options.A :
                                currentQuestion.correctAnswer === 'B' ? currentQuestion.options.B :
                                currentQuestion.correctAnswer === 'C' ? currentQuestion.options.C :
                                currentQuestion.options.D
                              )}
                            </Markdown>
                          </span>
                          <span className="text-amber-500">✨</span>
                        </div>
                      </div>
                    </div>

                    {/* Cute Boy mascot pointing up next to glowing bulb */}
                    <div className="w-20 h-32 sm:w-28 sm:h-44 relative flex-shrink-0 self-end select-none pointer-events-none">
                      <TransparentImage 
                        src={studentBoyPng} 
                        onError={(e) => { e.currentTarget.src = studentBoyAvatar }} 
                        alt="Student Boy"
                        className="w-full h-full object-contain filter drop-shadow-md"
                      />
                      {/* Floating lightbulb */}
                      <div className="absolute top-[-25px] right-1 w-8 h-8 sm:top-[-30px] sm:right-2 sm:w-10 sm:h-10 animate-bounce" style={{ animationDuration: '3s' }}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-sm">
                          <path d="M9 21h6m-3-18a6 6 0 016 6c0 1.62-.64 3.09-1.69 4.16L15 15.5V17a3 3 0 01-6 0v-1.5l-1.31-2.34A6 6 0 0112 3z" stroke="#fbbf24" strokeWidth="2" fill="#fef08a" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proceed button */}
                <button
                  onClick={handleNext}
                  className="bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] text-white text-base sm:text-lg font-black py-4 px-12 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-98 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <span>{currentIndex === quizQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cute Grass & Flowers Footer at the bottom of the screen */}
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none select-none z-0 overflow-hidden">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full preserve-3d" preserveAspectRatio="none">
          <path d="M0 120 V50 Q 80 40 160 55 T 320 60 T 480 45 T 640 65 T 800 50 T 960 60 T 1120 45 T 1280 55 T 1440 50 V120 Z" fill="#047857" opacity="0.8" />
          <path d="M0 120 V65 Q 90 60 180 72 T 360 65 T 540 75 T 720 60 T 900 70 T 1080 65 T 1260 72 T 1440 65 V120 Z" fill="#10b981" />
        </svg>
        <div className="absolute bottom-4 left-0 right-0 flex justify-around px-8">
          <CuteFlower color="bg-pink-400" />
          <CuteFlower color="bg-yellow-400" delay="1s" />
          <CuteFlower color="bg-rose-400" delay="0.5s" />
          <CuteFlower color="bg-sky-400" delay="1.5s" />
          <CuteFlower color="bg-pink-400" delay="2s" />
          <CuteFlower color="bg-yellow-400" delay="0.8s" />
          <CuteFlower color="bg-rose-400" delay="1.2s" />
        </div>
      </div>
    </div>
  );
}
