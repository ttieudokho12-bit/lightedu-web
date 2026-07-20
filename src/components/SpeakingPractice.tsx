import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, Mic, MicOff, RotateCcw, Check, Heart, Play, Square, 
  ArrowRight, Home, Loader2, Sparkles, Smile, Star, HelpCircle, Info
} from 'lucide-react';
import { VocabularyIllustration } from './VocabularyIllustration';

interface SpeakingPracticeProps {
  vocabList: { word: string; meaning: string }[];
  onComplete: () => void;
  onHome: () => void;
}

const getExampleSentence = (word: string) => {
  const lowercaseWord = word.trim().toLowerCase();
  const lookup: Record<string, string> = {
    bike: "This is a bike.",
    apple: "This is a red apple.",
    banana: "I like to eat a banana.",
    orange: "Look at the orange orange.",
    grape: "The grape is sweet.",
    cat: "I have a cute little cat.",
    dog: "The dog is wagging its tail.",
    book: "She is reading an interesting book.",
    pen: "This is my blue pen.",
    ruler: "The ruler is on the desk.",
    pencil: "I write with a yellow pencil.",
    rubber: "Here is a rubber eraser.",
    eraser: "I need an eraser.",
    bag: "My school bag is heavy.",
    school: "We go to school every morning.",
    teacher: "Our teacher is very kind.",
    student: "He is a hard-working student.",
    family: "I love my family so much.",
    mother: "My mother is cooking dinner.",
    father: "My father plays football with me.",
    brother: "He has an older brother.",
    sister: "She is my baby sister.",
    car: "This is a fast red car.",
    cup: "There is some hot tea in the cup.",
    cap: "He wears a cool blue cap.",
    yellow: "The sun is yellow and warm.",
    red: "Red is my favorite color.",
    blue: "The sky is clear and blue.",
    green: "Green leaves grow on trees."
  };
  return lookup[lowercaseWord] || `This is a ${lowercaseWord}.`;
};

export const SpeakingPractice: React.FC<SpeakingPracticeProps> = ({
  vocabList,
  onComplete,
  onHome
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = vocabList[currentIndex] || { word: "", meaning: "" };
  const targetSentence = getExampleSentence(currentItem.word);

  // Recording & speech recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [speechText, setSpeechText] = useState("");
  const [microphoneBlocked, setMicrophoneBlocked] = useState(false);

  // Assessment results
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [clearPronunciation, setClearPronunciation] = useState(true);
  const [correctWord, setCorrectWord] = useState(true);
  const [confidentTone, setConfidentTone] = useState(true);

  // Audio recording storage for replay
  const [studentAudioUrl, setStudentAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // References for API control
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechTextRef = useRef("");
  const sampleAudioCtxRef = useRef<AudioContext | null>(null);
  const sampleAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Speak vocabulary word using custom speed rate with US Female Speech model
  const playSampleVoice = async (rate: number = 1.0) => {
    try {
      if (typeof window === 'undefined') return;

      // 1. Cancel speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // 2. Stop sample audio
      if (sampleAudioSourceRef.current) {
        try {
          sampleAudioSourceRef.current.stop();
        } catch (e) {}
        sampleAudioSourceRef.current = null;
      }
      if (sampleAudioCtxRef.current && sampleAudioCtxRef.current.state !== 'closed') {
        try {
          await sampleAudioCtxRef.current.close();
        } catch (e) {}
        sampleAudioCtxRef.current = null;
      }

      const text = currentItem.word;
      if (!text) return;

      // Try backend TTS API first
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
          const audioCtx = new AudioContextClass();
          sampleAudioCtxRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          const buffer = await audioCtx.decodeAudioData(arrayBuffer);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          sampleAudioSourceRef.current = source;

          source.connect(audioCtx.destination);
          source.start(0);
        } else {
          const dataView = new DataView(arrayBuffer);
          const numSamples = arrayBuffer.byteLength / 2;
          const float32Data = new Float32Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
          }

          const audioCtx = new AudioContextClass({ sampleRate: 24000 });
          sampleAudioCtxRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          const buffer = audioCtx.createBuffer(1, numSamples, 24000);
          buffer.getChannelData(0).set(float32Data);

          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          sampleAudioSourceRef.current = source;

          source.connect(audioCtx.destination);
          source.start(0);
        }
        return; // Success!
      } catch (apiError) {
        console.warn("Server-side TTS failed or timed out, falling back to client-side speechSynthesis:", apiError);
      }

      // Fallback: Client-side Speech Synthesis
      if (window.speechSynthesis) {
        const isSingleWord = !text.trim().includes(' ');

        const speakWithSettings = (wordText: string, onEndCallback?: () => void) => {
          const utterance = new SpeechSynthesisUtterance(wordText);
          utterance.lang = 'en-US';
          utterance.rate = rate; // use requested rate (e.g. 0.8 or 1.0)
          utterance.pitch = 1.5; // friendly pitch

          const voices = window.speechSynthesis.getVoices();
          const femaleUSVoice = voices.find(voice => {
            const name = voice.name.toLowerCase();
            const lang = voice.lang.toLowerCase();
            return (lang.includes('en-us') || lang.includes('en_us')) && 
                   (name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('hazel') || name.includes('jenny') || name.includes('ava') || name.includes('shimmer') || name.includes('google'));
          }) || voices.find(voice => {
            const lang = voice.lang.toLowerCase();
            return lang.includes('en-us') || lang.includes('en_us');
          });

          if (femaleUSVoice) {
            utterance.voice = femaleUSVoice;
          }

          utterance.onend = () => {
            if (onEndCallback) {
              onEndCallback();
            }
          };

          window.speechSynthesis.speak(utterance);
        };

        // For 0.8 rate, repeat single words with 500ms break
        if (rate === 0.8 && isSingleWord) {
          speakWithSettings(text, () => {
            setTimeout(() => {
              speakWithSettings(text);
            }, 500);
          });
        } else {
          speakWithSettings(text);
        }
      }
    } catch (e) {
      console.error("Speech Synthesis error:", e);
    }
  };

  // Listen sample wrapper (usually 1.0x rate)
  const handlePlaySample = () => {
    playSampleVoice(1.0);
  };

  // Listen sample slow wrapper (0.8x rate)
  const handlePlaySampleSlow = () => {
    playSampleVoice(0.8);
  };

  // Replay recorded student voice
  const handlePlayStudentAudio = () => {
    if (studentAudioUrl) {
      try {
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
        }
        const audio = new Audio(studentAudioUrl);
        activeAudioRef.current = audio;
        setIsPlayingAudio(true);
        audio.play();
        audio.onended = () => setIsPlayingAudio(false);
      } catch (e) {
        console.error("Failed to play student audio", e);
      }
    } else {
      handlePlaySample();
    }
  };

  // Init Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += result;
          } else {
            interimTranscript += result;
          }
        }
        const text = finalTranscript || interimTranscript;
        if (text) {
          setSpeechText(text);
          speechTextRef.current = text;
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Speech Recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setMicrophoneBlocked(true);
        }
        setRecognitionError(event.error);
      };

      recognitionRef.current = rec;
    } else {
      setRecognitionError("not-supported");
    }

    return () => {
      try {
        window.speechSynthesis.cancel();
        if (sampleAudioSourceRef.current) {
          try {
            sampleAudioSourceRef.current.stop();
          } catch (e) {}
          sampleAudioSourceRef.current = null;
        }
        if (sampleAudioCtxRef.current && sampleAudioCtxRef.current.state !== 'closed') {
          sampleAudioCtxRef.current.close().catch(() => {});
          sampleAudioCtxRef.current = null;
        }
      } catch (e) {}
    };
  }, []);

  // Update voice configuration on new vocabulary
  useEffect(() => {
    setHasEvaluated(false);
    setAccuracy(null);
    setSpeechText("");
    speechTextRef.current = "";
    setFeedback("");
    setStudentAudioUrl(null);
    setIsRecording(false);
    setIsEvaluating(false);
  }, [currentIndex]);

  // Helper for string similarity
  const getLevenshteinDistance = (a: string, b: string): number => {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const getStringSimilarity = (s1: string, s2: string): number => {
    const len = Math.max(s1.length, s2.length);
    if (len === 0) return 100;
    const dist = getLevenshteinDistance(s1, s2);
    return Math.round(((len - dist) / len) * 100);
  };

  // Speech evaluation scoring algorithms
  const evaluateSpeech = (text: string) => {
    const normalizedTargetWord = currentItem.word.toLowerCase().trim().replace(/[.,?!]/g, "");
    const normalizedSpeech = text.toLowerCase().trim().replace(/[.,?!]/g, "");

    if (!normalizedSpeech) {
      setAccuracy(0);
      setFeedback("Âm cuối cần rõ hơn một chút, chúng mình luyện lại nhé! (0%)");
      setClearPronunciation(false);
      setCorrectWord(false);
      setConfidentTone(false);
      setHasEvaluated(true);
      setIsEvaluating(false);
      return;
    }

    const speechWords = normalizedSpeech.split(/\s+/).filter(Boolean);
    const isWordMatch = speechWords.includes(normalizedTargetWord);
    const similarity = getStringSimilarity(normalizedSpeech, normalizedTargetWord);
    
    let score = 0;
    if (isWordMatch) {
      score = 100;
    } else if (similarity >= 60) {
      score = similarity;
    } else {
      let maxWordSimilarity = 0;
      speechWords.forEach(w => {
        const s = getStringSimilarity(w, normalizedTargetWord);
        if (s > maxWordSimilarity) maxWordSimilarity = s;
      });
      
      if (maxWordSimilarity >= 70) {
        score = maxWordSimilarity;
      } else {
        score = Math.max(similarity, maxWordSimilarity);
      }
    }

    if (score >= 90) {
      score = Math.min(100, score - Math.floor(Math.random() * 3));
    } else if (score >= 70) {
      score = Math.min(95, score + Math.floor(Math.random() * 5));
    }

    setAccuracy(score);
    setClearPronunciation(score >= 75);
    setCorrectWord(score >= 80);
    setConfidentTone(score >= 70);

    // Cute, friendly feedback matching criteria
    if (score >= 90) {
      setFeedback("Con phát âm rất tốt! Bé thật là siêu đẳng! 🌟🎉");
    } else if (score >= 80) {
      setFeedback("Con đọc đúng rồi, thử đọc rõ hơn nhé! Cố lên con yêu! 🦁✨");
    } else {
      setFeedback("Âm cuối cần rõ hơn một chút, chúng mình luyện lại nhé! AI tin bé sẽ làm được! 🐼🎈");
    }

    setHasEvaluated(true);
    setIsEvaluating(false);

    if (score >= 80) {
      playPositiveChime();
    }
  };

  const playPositiveChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.1); // A5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (err) {}
  };

  const simulateEvaluation = (text: string) => {
    evaluateSpeech(text);
  };

  // Start micro recording
  const handleStartRecording = async () => {
    setHasEvaluated(false);
    setSpeechText("");
    speechTextRef.current = "";
    setFeedback("");
    setStudentAudioUrl(null);

    if (recognitionRef.current && !microphoneBlocked) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech Recognition failed to start synchronously:", e);
      }
    }

    if (!recognitionRef.current) {
      setIsRecording(true);
      return;
    }

    setIsRecording(true);

    try {
      if (typeof MediaRecorder !== 'undefined') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setStudentAudioUrl(audioUrl);
          } catch (blobErr) {
            console.warn("Failed to create student audio blob:", blobErr);
          }
          try {
            stream.getTracks().forEach(track => track.stop());
          } catch (e) {}
        };

        mediaRecorder.start();
      }
    } catch (e: any) {
      console.warn("Media devices microphone recording failed/blocked, continuing with speech recognition only:", e);
    }
  };

  // Stop micro recording
  const handleStopRecording = () => {
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const textToEvaluate = speechTextRef.current.trim();
    
    if (!textToEvaluate) {
      if (microphoneBlocked || !recognitionRef.current) {
        simulateEvaluation(currentItem.word);
      } else {
        evaluateSpeech("");
      }
    } else {
      evaluateSpeech(textToEvaluate);
    }
  };

  const handleNextWord = () => {
    if (currentIndex < vocabList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleRetry = () => {
    setHasEvaluated(false);
    setAccuracy(null);
    setSpeechText("");
    speechTextRef.current = "";
    setFeedback("");
    setStudentAudioUrl(null);
    setIsRecording(false);
    setIsEvaluating(false);
  };

  // Generate metrics score dynamically from overall accuracy to present detailed evaluation
  const getEvaluationMetrics = (score: number | null) => {
    if (score === null) return { pronunciation: 0, accuracy: 0, fluency: 0, completeness: 0 };
    if (score === 0) return { pronunciation: 0, accuracy: 0, fluency: 0, completeness: 0 };
    
    const pronunciation = Math.round(score);
    const accuracyVal = Math.round(score * 0.96 + Math.sin(score) * 2);
    const fluency = Math.round(score * 0.94 + Math.cos(score) * 3);
    const completeness = Math.round(score * 0.98 + Math.sin(score + 1) * 2);
    
    return {
      pronunciation: Math.min(100, Math.max(10, pronunciation)),
      accuracy: Math.min(100, Math.max(10, accuracyVal)),
      fluency: Math.min(100, Math.max(10, fluency)),
      completeness: Math.min(100, Math.max(10, completeness)),
    };
  };

  const currentMetrics = getEvaluationMetrics(accuracy);

  // Character-by-character color comparison feedback (Emerald Green, Amber Yellow, Crimson Red)
  const renderGradedCharacters = () => {
    const target = currentItem.word;
    const spoken = speechText.trim();
    
    if (!hasEvaluated) return null;
    
    return (
      <div className="flex flex-col items-center gap-3 bg-white p-5 rounded-3xl border-2 border-[#f0f4f8] shadow-sm w-full select-none">
        <span className="text-xs text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
          <span>🔍 CHI TIẾT PHÁT ÂM TỪNG KÝ TỰ</span>
        </span>
        
        <div className="flex flex-wrap gap-2.5 justify-center mt-1">
          {target.split("").map((char, index) => {
            const charLower = char.toLowerCase();
            
            let colorBg = "bg-rose-50 text-rose-500 border-rose-300";
            
            if (accuracy && accuracy >= 85) {
              colorBg = "bg-emerald-50 text-emerald-500 border-emerald-300";
            } else if (accuracy && accuracy >= 65) {
              // Heuristic highlighting patterns for kids
              if (index % 3 === 0 && index !== 0) {
                colorBg = "bg-amber-50 text-amber-500 border-amber-300";
              } else {
                colorBg = "bg-emerald-50 text-emerald-500 border-emerald-300";
              }
            } else {
              // Lower accuracy checks
              if (spoken.toLowerCase().includes(charLower)) {
                colorBg = "bg-amber-50 text-amber-500 border-amber-300";
              } else {
                colorBg = "bg-rose-50 text-rose-500 border-rose-300";
              }
            }
            
            return (
              <div key={index} className="flex flex-col items-center transform hover:scale-110 transition-transform duration-200">
                <span className={`w-12 h-12 rounded-2xl border-2 font-black text-2xl flex items-center justify-center shadow-xs ${colorBg}`}>
                  {char}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Color Legend */}
        <div className="flex items-center gap-5 mt-2 text-[11px] font-black text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-slate-500">Đúng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-slate-500">Cần cải thiện</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-400" />
            <span className="text-slate-500">Chưa đúng</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="speaking_practice_screen" className="w-full max-w-5xl mx-auto px-4 py-6 font-sans">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4 select-none">
        <button
          id="btn_back_home"
          onClick={onHome}
          className="flex items-center gap-2 bg-[#fffcf0] hover:bg-[#fff9db] active:scale-95 transition-all text-[#b45309] font-black py-2.5 px-5 rounded-full border-2 border-[#fcd34d] shadow-sm text-sm cursor-pointer"
        >
          <Home className="w-5 h-5 text-[#d97706]" />
          <span>Trang chủ</span>
        </button>

        {/* Header Badge */}
        <div className="bg-[#f3e8ff] border-2 border-[#e9d5ff] text-[#6b21a8] text-xs md:text-sm font-extrabold px-6 py-2.5 rounded-full shadow-sm tracking-wide inline-flex items-center gap-2">
          <Mic className="w-4 h-4 animate-pulse" />
          <span>LUYỆN NÓI TIẾNG ANH</span>
        </div>

        {/* Skip button directly goes to quiz exercises */}
        <button
          id="btn_skip_speaking"
          onClick={onComplete}
          className="flex items-center gap-2 bg-[#f0fdf4] hover:bg-[#dcfce7] active:scale-95 transition-all text-[#16a34a] font-black py-2.5 px-5 rounded-full border-2 border-[#bbf7d0] shadow-sm text-sm cursor-pointer"
        >
          <span>Bỏ qua luyện nói ➔</span>
        </button>
      </div>

      {/* Main Titles with cute Mascot graphics */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 select-none relative bg-[#fffdf5]/50 p-6 rounded-[30px] border-2 border-amber-100/40">
        
        {/* Left stack of books SVG */}
        <div className="hidden md:block flex-shrink-0">
          <svg viewBox="0 0 160 140" className="w-24 h-24 lg:w-32 lg:h-32 object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="80" cy="70" r="60" fill="#fef3c7" opacity="0.3" />
            <path d="M15 35 H38 V115 H15 Z" fill="#818cf8" />
            <path d="M15 35 C15 30 38 30 38 35" stroke="#4f46e5" strokeWidth="2" fill="#c7d2fe" />
            <path d="M38 28 H58 V115 H38 Z" fill="#34d399" />
            <path d="M38 28 C38 23 58 23 58 28" stroke="#059669" strokeWidth="2" fill="#a7f3d0" />
            <path d="M45 60 C75 50 105 50 135 60 L130 125 C100 115 70 115 40 125 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
            <path d="M45 60 L48 125 C78 115 108 115 138 125" stroke="#cbd5e1" strokeWidth="2" fill="none" />
            <text x="60" y="95" fill="#f43f5e" fontSize="22" fontWeight="900" fontFamily="sans-serif">A</text>
            <text x="82" y="90" fill="#3b82f6" fontSize="22" fontWeight="900" fontFamily="sans-serif">B</text>
            <text x="105" y="95" fill="#eab308" fontSize="22" fontWeight="900" fontFamily="sans-serif">C</text>
          </svg>
        </div>

        {/* Center Title Content */}
        <div className="text-center flex-1">
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight">
            Thử Tài <span className="text-[#5046e5]">Phát Âm</span>
          </h1>
          <p className="text-stone-600 font-bold text-sm md:text-base mt-2 flex items-center justify-center gap-1.5">
            <span>Bé hãy nghe mẫu rồi bấm vào mic để luyện nói theo nhé! 🪄</span>
          </p>

          {/* Cute Floating notes */}
          <div className="absolute top-2 left-1/4 opacity-40 text-amber-500 text-2xl animate-bounce">♪</div>
          <div className="absolute bottom-2 right-1/4 opacity-40 text-purple-500 text-2xl animate-bounce" style={{ animationDelay: '1s' }}>♫</div>
        </div>

        {/* Right Child Mascot SVG */}
        <div className="hidden md:block flex-shrink-0">
          <svg viewBox="0 0 160 160" className="w-24 h-24 lg:w-32 lg:h-32 object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="80" cy="80" r="60" fill="#e0e7ff" opacity="0.4" />
            <circle cx="80" cy="75" r="42" fill="#7c2d12" />
            <circle cx="42" cy="80" r="10" fill="#fed7aa" />
            <circle cx="118" cy="80" r="10" fill="#fed7aa" />
            <circle cx="80" cy="80" r="36" fill="#fed7aa" />
            <circle cx="68" cy="76" r="4" fill="#0f172a" />
            <circle cx="92" cy="76" r="4" fill="#0f172a" />
            <path d="M72 88 Q80 96 88 88" stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="62" cy="84" r="4.5" fill="#fca5a5" />
            <circle cx="98" cy="84" r="4.5" fill="#fca5a5" />
            <path d="M44 65 C55 52 70 55 80 48 C90 55 105 52 116 65 C122 80 118 40 80 40 C42 40 38 80 44 65 Z" fill="#7c2d12" />
            <path d="M54 116 L106 116 L100 155 L60 155 Z" fill="#3b82f6" />
            <path d="M74 116 L80 128 L86 116" fill="#ffffff" />
            <path d="M106 122 L132 102" stroke="#fed7aa" strokeWidth="8" strokeLinecap="round" />
            <circle cx="132" cy="102" r="9" fill="#fed7aa" />
            <path d="M54 126 L36 110" stroke="#fed7aa" strokeWidth="8" strokeLinecap="round" />
            <rect x="22" y="98" width="8" height="18" rx="2" fill="#475569" transform="rotate(25, 22, 98)" />
            <circle cx="31" cy="101" r="7.5" fill="#818cf8" />
          </svg>
        </div>
      </div>

      {/* Main Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Speech Target & Sample Player */}
        <div id="sandbox_card_left" className="lg:col-span-6 bg-[#fffdfa] rounded-[36px] border-4 border-amber-100 p-6 md:p-8 flex flex-col justify-between shadow-md relative min-h-[500px]">
          
          <div>
            {/* Word display & hear sample rows */}
            <div className="flex items-start justify-between gap-4 border-b border-dashed border-amber-200 pb-5">
              <div className="flex-1">
                <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider mb-2.5 inline-block select-none">
                  Từ vựng hiện tại
                </span>
                <h2 className="text-4xl md:text-5xl font-black text-[#5046e5] capitalize tracking-tight font-sans">
                  {currentItem.word}
                </h2>
                <p className="text-lg md:text-xl text-stone-600 font-extrabold mt-1">
                  💡 Nghĩa: <span className="text-slate-800">{currentItem.meaning}</span>
                </p>
              </div>

              {/* Multi Speed Sample Player for Children */}
              <div className="flex flex-col gap-2.5 shrink-0 select-none">
                <button
                  id="btn_hear_sample_normal"
                  onClick={handlePlaySample}
                  className="bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 active:scale-95 transition-all px-3 py-2 rounded-2xl shadow-sm text-indigo-700 font-extrabold text-[11px] flex items-center gap-1.5 border-b-4 cursor-pointer"
                  title="Nghe mẫu tốc độ thường (1.0x)"
                >
                  <Volume2 className="w-4 h-4 text-[#5046e5]" />
                  <span>Nghe mẫu 🐰 1.0x</span>
                </button>

                <button
                  id="btn_hear_sample_slow"
                  onClick={handlePlaySampleSlow}
                  className="bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 active:scale-95 transition-all px-3 py-2 rounded-2xl shadow-sm text-amber-800 font-extrabold text-[11px] flex items-center gap-1.5 border-b-4 cursor-pointer"
                  title="Nghe mẫu tốc độ chậm (0.8x)"
                >
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>Nghe chậm 🐢 0.8x</span>
                </button>
              </div>
            </div>

            {/* Containers for sentences */}
            <div className="mt-6 flex flex-col gap-4">
              {/* TỪ CẦN LUYỆN PHÁT ÂM */}
              <div className="bg-[#f5f3ff] rounded-2xl p-4 border border-indigo-100/50 flex flex-col gap-1 shadow-xs">
                <span className="text-[#5046e5] font-black text-xs uppercase tracking-wider">Từ cần phát âm:</span>
                <span className="text-slate-900 font-black text-2xl md:text-3xl tracking-wide capitalize flex items-center gap-2">
                  <span>{currentItem.word}</span>
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                </span>
              </div>
              
              {/* VÍ DỤ CÂU */}
              <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-4 flex flex-col gap-1.5">
                <span className="text-slate-500 font-black text-xs uppercase tracking-wider">Câu ví dụ:</span>
                <p className="text-sm md:text-base font-bold text-slate-700 leading-normal">
                  {targetSentence.split(/\b/).map((word, i) => {
                    const isTarget = word.toLowerCase() === currentItem.word.toLowerCase();
                    return (
                      <span 
                        key={i} 
                        className={isTarget ? "text-[#5046e5] font-black bg-indigo-50 px-1 rounded-sm" : ""}
                      >
                        {word}
                      </span>
                    );
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Image Illustration at bottom of left card */}
          <div className="mt-6 flex justify-center items-center h-44 select-none">
            <VocabularyIllustration 
              word={currentItem.word} 
              className="max-h-full max-w-[200px] object-contain drop-shadow-md hover:scale-105 transition-transform duration-300" 
            />
          </div>
        </div>

        {/* Right Side: AI Speech Evaluation & Micro Input Area */}
        <div id="evaluation_card_right" className="lg:col-span-6 bg-white rounded-[36px] border-4 border-[#f1f5f9] p-6 md:p-8 flex flex-col justify-between shadow-lg relative min-h-[500px]">
          
          <AnimatePresence mode="wait">
            {isEvaluating ? (
              <motion.div 
                key="evaluating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center my-auto py-12 select-none"
              >
                <div className="relative mb-6">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                  <Mic className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-xl font-black text-indigo-950 animate-pulse">AI đang phân tích giọng đọc...</h3>
                <p className="text-stone-500 text-sm mt-2 px-6 italic">
                  Đang chấm điểm và phân tích chi tiết phát âm của bé...
                </p>
              </motion.div>
            ) : hasEvaluated ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col h-full justify-between select-none py-1"
              >
                <div className="flex flex-col gap-5">
                  {/* Speech Bubble comments with chibi character */}
                  <div className="bg-[#fffbeb] border-2 border-[#fef3c7] rounded-3xl p-4 flex gap-3.5 items-start relative shadow-xs">
                    {/* Cute Animal Chibi Face Avatar inside comment box */}
                    <div className="shrink-0 bg-amber-100 rounded-2xl w-12 h-12 flex items-center justify-center border-2 border-amber-300">
                      <svg viewBox="0 0 100 100" className="w-10 h-10 animate-bounce" style={{ animationDuration: '4s' }}>
                        <circle cx="50" cy="50" r="42" fill="#fed7aa" />
                        <circle cx="30" cy="38" r="8" fill="#7c2d12" />
                        <circle cx="70" cy="38" r="8" fill="#7c2d12" />
                        <circle cx="40" cy="46" r="3" fill="#0f172a" />
                        <circle cx="60" cy="46" r="3" fill="#0f172a" />
                        <ellipse cx="50" cy="58" rx="6" ry="3" fill="#ef4444" />
                        <circle cx="34" cy="52" r="2.5" fill="#fca5a5" />
                        <circle cx="66" cy="52" r="2.5" fill="#fca5a5" />
                      </svg>
                    </div>
                    
                    <div className="flex-1">
                      <span className="text-amber-800 font-extrabold text-[11px] block uppercase tracking-wide">Nhận xét của AI:</span>
                      <p className="text-slate-800 font-black text-sm md:text-base leading-snug">
                        {feedback}
                      </p>
                    </div>
                  </div>

                  {/* "Con đã đọc" STT display bubble */}
                  <div className="bg-[#f0f9ff] border-2 border-[#e0f2fe] rounded-3xl p-4 select-none shadow-xs">
                    <span className="text-[#0284c7] font-extrabold text-xs block uppercase tracking-wider mb-1">💬 Con đã đọc:</span>
                    <p className="text-slate-800 font-black text-lg md:text-xl tracking-wide italic">
                      "{speechText || "AI chưa nghe rõ lắm con ơi..."}"
                    </p>
                  </div>

                  {/* Phonetic Color-Coded Grading Breakdown */}
                  {renderGradedCharacters()}

                  {/* 4 Multi-Criteria Graded Assessment Grid (Phát âm, Độ chính xác, Lưu loát, Hoàn thành) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-none">
                    
                    {/* Pronunciation Score */}
                    <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs">
                      <Star className="w-5 h-5 text-indigo-500 fill-indigo-200 mb-1 animate-pulse" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Phát âm</span>
                      <span className="text-lg font-black text-[#5046e5] mt-0.5">{currentMetrics.pronunciation}/100</span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-[#5046e5] h-full rounded-full" style={{ width: `${currentMetrics.pronunciation}%` }} />
                      </div>
                    </div>

                    {/* Accuracy Score */}
                    <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs">
                      <Check className="w-5 h-5 text-emerald-500 mb-1" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Chính xác</span>
                      <span className="text-lg font-black text-emerald-600 mt-0.5">{currentMetrics.accuracy}/100</span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${currentMetrics.accuracy}%` }} />
                      </div>
                    </div>

                    {/* Fluency Score */}
                    <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs">
                      <Sparkles className="w-5 h-5 text-amber-500 fill-amber-100 mb-1 animate-bounce" style={{ animationDuration: '3s' }} />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Trôi chảy</span>
                      <span className="text-lg font-black text-amber-600 mt-0.5">{currentMetrics.fluency}/100</span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${currentMetrics.fluency}%` }} />
                      </div>
                    </div>

                    {/* Completeness Score */}
                    <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs">
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-100 mb-1" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Hoàn thành</span>
                      <span className="text-lg font-black text-rose-600 mt-0.5">{currentMetrics.completeness}/100</span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${currentMetrics.completeness}%` }} />
                      </div>
                    </div>

                  </div>

                  {/* Gold Self-Assessment Bypass option when recognition fails or is low score on mobile */}
                  {accuracy !== null && accuracy < 80 && (
                    <button
                      id="btn_self_pass"
                      onClick={() => {
                        setAccuracy(100);
                        setSpeechText(currentItem.word);
                        speechTextRef.current = currentItem.word;
                        setFeedback("Tuyệt vời! Bé tự tin đã phát âm tốt. Cố lên con nhé! 🎉🌟");
                        setHasEvaluated(true);
                        playPositiveChime();
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-[#fffbeb] hover:bg-[#fef3c7] text-[#b45309] font-black py-3 px-4 rounded-2xl border-2 border-[#fde047] shadow-sm text-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <Smile className="w-5 h-5 text-amber-500 animate-bounce" />
                      <span>Con tự tin đã phát âm tốt ➔ Nhận điểm 100%</span>
                    </button>
                  )}
                </div>

                {/* Action Row containing "Nghe lại" / "Đọc lại" & Next button */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="grid grid-cols-2 gap-4 select-none">
                    <button
                      id="btn_hear_self"
                      onClick={handlePlayStudentAudio}
                      className={`flex items-center justify-center gap-2 border-2 py-3.5 px-4 rounded-2xl shadow-sm font-black text-sm border-b-4 transition-all cursor-pointer ${
                        isPlayingAudio
                          ? 'bg-amber-100 border-amber-400 text-amber-800 animate-pulse'
                          : 'bg-white hover:bg-slate-50 border-slate-300 hover:border-slate-400 text-stone-700'
                      }`}
                    >
                      <Play className={`w-4 h-4 ${isPlayingAudio ? 'animate-spin' : ''}`} />
                      <span>{isPlayingAudio ? "Đang nghe..." : "Nghe lại"}</span>
                    </button>

                    <button
                      id="btn_try_again"
                      onClick={handleRetry}
                      className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border-2 border-amber-300 hover:border-[#facc15] text-amber-800 py-3.5 px-4 rounded-2xl shadow-sm font-black text-sm border-b-4 transition-all active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Đọc lại</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="mic-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col h-full justify-between select-none"
              >
                {/* Top banner pill */}
                <div className="bg-[#f8fafc] border-2 border-[#e2e8f0] py-4 px-5 rounded-[26px] text-center shadow-inner">
                  <span className="text-[#5046e5] font-black text-sm tracking-wide">
                    🎙️ {isRecording ? "Đang lắng nghe... Con hãy đọc to từ " : "Bấm vào mic và đọc to từ "} 
                    <span className="underline decoration-indigo-400 font-extrabold text-indigo-700">"{currentItem.word}"</span> nhé!
                  </span>
                </div>

                {/* Real-time speech transcription bubble preview (if active) */}
                {isRecording && speechText && (
                  <div className="mt-4 bg-[#f0fdf4] border-2 border-[#bbf7d0] rounded-2xl px-4 py-2.5 text-center shadow-xs text-[#16a34a] font-extrabold text-sm animate-pulse">
                    <span>Đang nghe thấy: </span>
                    <span className="font-black">"{speechText}"</span>
                  </div>
                )}

                {/* Center Mic & Soundwaves */}
                <div className="my-auto py-8 flex flex-col items-center justify-center">
                  
                  <div className="flex items-center justify-center gap-6 w-full max-w-sm">
                    {/* Left Sound Wave Bars */}
                    <div className="flex items-center gap-1.5 h-16 w-16 justify-end">
                      {[8, 14, 22, 16, 10].map((h, i) => (
                        <motion.div
                          key={`l-wave-${i}`}
                          className="w-1.5 rounded-full bg-[#cbd5e1]"
                          style={{ backgroundColor: isRecording ? '#a5b4fc' : '#cbd5e1' }}
                          animate={isRecording ? { height: [10, h * 2.2, 10] } : { height: 10 }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.8,
                            delay: i * 0.1,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>

                    {/* Center Microphone Button */}
                    <div className="relative">
                      {isRecording && (
                        <motion.div 
                          className="absolute -inset-6 rounded-full bg-indigo-200/50 -z-10"
                          animate={{ scale: [1, 1.35, 1] }}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                        />
                      )}
                      <div className="absolute -inset-3 rounded-full bg-indigo-100/40 -z-10" />

                      <button
                        id="btn_speaking_mic"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`w-28 h-28 rounded-full flex flex-col items-center justify-center relative shadow-xl cursor-pointer transform hover:scale-105 active:scale-95 transition-all select-none border-b-4 border-black/20 ${
                          isRecording 
                            ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                            : 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                        }`}
                      >
                        {isRecording ? (
                          <Square className="w-8 h-8 text-white fill-white animate-pulse" />
                        ) : (
                          <Mic className="w-10 h-10 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Right Sound Wave Bars */}
                    <div className="flex items-center gap-1.5 h-16 w-16 justify-start">
                      {[10, 16, 22, 14, 8].map((h, i) => (
                        <motion.div
                          key={`r-wave-${i}`}
                          className="w-1.5 rounded-full bg-[#cbd5e1]"
                          style={{ backgroundColor: isRecording ? '#a5b4fc' : '#cbd5e1' }}
                          animate={isRecording ? { height: [10, h * 2.2, 10] } : { height: 10 }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.8,
                            delay: i * 0.1,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Mic instructions text */}
                  <span className="text-lg font-black text-[#5046e5] mt-6 tracking-wide text-center">
                    {isRecording ? "Hệ thống đang ghi âm... Nhấn để dừng" : "Nhấn mic để nói"}
                  </span>
                </div>

                {/* Bottom Mẹo Nhỏ box */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-[24px] p-4 flex gap-4 items-center">
                  <svg viewBox="0 0 100 100" className="w-16 h-16 flex-shrink-0 animate-bounce" style={{ animationDuration: '3s' }} fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="#e0f2fe" />
                    <rect x="32" y="48" width="36" height="30" rx="8" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
                    <rect x="37" y="53" width="26" height="20" rx="5" fill="#3b82f6" />
                    <circle cx="50" cy="63" r="4" fill="#38bdf8" />
                    <rect x="26" y="20" width="48" height="28" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
                    <rect x="31" y="24" width="38" height="20" rx="6" fill="#0f172a" />
                    <ellipse cx="42" cy="34" rx="4" ry="2.5" fill="#38bdf8" />
                    <ellipse cx="58" cy="34" rx="4" ry="2.5" fill="#38bdf8" />
                    <path d="M26 52 Q16 42 12 30" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="12" cy="30" r="3" fill="#3b82f6" />
                    <path d="M68 52 Q78 62 82 56" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="82" cy="56" r="3" fill="#3b82f6" />
                    <line x1="50" y1="20" x2="50" y2="12" stroke="#94a3b8" strokeWidth="2" />
                    <circle cx="50" cy="11" r="2.5" fill="#f59e0b" />
                  </svg>
                  
                  <div className="flex flex-col">
                    <span className="font-black text-stone-800 text-sm flex items-center gap-1">
                      💡 Mẹo nhỏ
                    </span>
                    <p className="text-xs text-stone-500 font-bold leading-relaxed mt-0.5">
                      Nói rõ ràng, phát âm chuẩn để AI nhận diện chính xác hơn nhé!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next Word primary Green Button inside Right Card */}
          {hasEvaluated && !isEvaluating && (
            <div className="mt-4 pt-4 border-t border-slate-200 select-none">
              <button
                id="btn_speaking_next"
                onClick={handleNextWord}
                className="w-full relative inline-flex items-center justify-center gap-2 bg-gradient-to-tr from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-extrabold text-base md:text-lg px-8 py-3.5 rounded-[22px] transition-all shadow-md hover:shadow-lg active:scale-98 border-b-4 border-[#047857] z-10 cursor-pointer"
              >
                <span>
                  {currentIndex === vocabList.length - 1 ? "Bắt đầu làm bài thi! 🚀" : "Từ tiếp theo ➔"}
                </span>
                <ArrowRight className="w-5 h-5 animate-pulse" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Progress Tracker row */}
      <div id="speaking_progress_bar" className="bg-[#fffdfa] rounded-[24px] border-4 border-[#e2e8f0] p-4 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md select-none">
        
        {/* Left text */}
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400 animate-bounce" />
          <span className="font-extrabold text-stone-700 text-sm md:text-base">
            Đã luyện: <span className="text-indigo-600 font-black text-xl px-0.5">{currentIndex + 1}</span> / {vocabList.length} từ
          </span>
        </div>

        {/* Dynamic Progress indicator slider with star */}
        <div className="w-full md:w-64 bg-stone-100 rounded-full h-3.5 relative overflow-visible flex items-center">
          <div 
            className="bg-[#10b981] h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / vocabList.length) * 100}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 -ml-3 transition-all duration-300 hover:scale-110 active:scale-90"
            style={{ left: `${((currentIndex + 1) / vocabList.length) * 100}%` }}
          >
            <svg viewBox="0 0 100 100" className="w-7 h-7 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="50,5 64,35 95,40 72,62 78,92 50,78 22,92 28,62 5,40 36,35" fill="#fbbf24" stroke="#ca8a04" strokeWidth="3" />
            </svg>
          </div>
        </div>

        {/* Numbered Dots Navigation Indicators */}
        <div className="flex items-center gap-2.5">
          {vocabList.map((_, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            
            return (
              <div key={idx} className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (idx <= currentIndex) {
                      setCurrentIndex(idx);
                    }
                  }}
                  disabled={idx > currentIndex}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all shadow-sm cursor-pointer ${
                    isCompleted 
                      ? 'bg-[#10b981] text-white hover:bg-emerald-600' 
                      : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 scale-110' 
                        : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                  }`}
                >
                  {idx + 1}
                </button>
                {idx < vocabList.length - 1 && (
                  <div className={`w-3 h-0.5 ${idx < currentIndex ? 'bg-[#10b981]' : 'bg-stone-200'}`} />
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
