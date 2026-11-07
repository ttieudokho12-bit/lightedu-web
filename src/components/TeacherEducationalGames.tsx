import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, ScanLine, RotateCw, Trophy, Puzzle, Zap, Volume2, Mic, CheckCircle, 
  X, ChevronLeft, Play, Sparkles, RefreshCw, Users, Award, Flame, Clock, 
  Check, Star, Brain, Plus, Trash2, VolumeX, Eye, HelpCircle, ArrowRight, Flag,
  Maximize2, Minimize2, Music, Upload
} from 'lucide-react';
import { ClassRoom, Assignment, UserProfile, QuizTemplate, Question } from '../types';
import ScanGrading from './ScanGrading';
import TiltBodyCameraGame from './TiltBodyCameraGame';

interface TeacherEducationalGamesProps {
  classes: ClassRoom[];
  allStudents: UserProfile[];
  assignments: Assignment[];
  quizTemplates: QuizTemplate[];
  currentTeacherUid: string | null;
  userProfile: UserProfile | null;
  initialGame?: string | null;
  onBackToDashboard?: () => void;
}

export default function TeacherEducationalGames({
  classes,
  allStudents,
  assignments,
  quizTemplates,
  currentTeacherUid,
  userProfile,
  initialGame = null,
  onBackToDashboard
}: TeacherEducationalGamesProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(initialGame);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  useEffect(() => {
    if (initialGame) {
      setSelectedGame(initialGame);
    }
  }, [initialGame]);

  // ==========================================
  // STATE FOR WHEEL OF FORTUNE (VÒNG QUAY MAY MẮN)
  // ==========================================
  const [selectedClassForWheel, setSelectedClassForWheel] = useState<string>('');
  const [wheelItems, setWheelItems] = useState<string[]>([
    'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường', 'Đỗ Minh Đức',
    'Phạm Thanh Thảo', 'Vũ Quốc Anh', 'Cộng 10 Điểm Bàn Tay Vàng 🌟', 'Trả lời câu hỏi may mắn ❓'
  ]);
  const [newItemInput, setNewItemInput] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);
  const [rotationDegree, setRotationDegree] = useState<number>(0);
  const [isWheelSoundEnabled, setIsWheelSoundEnabled] = useState<boolean>(true);
  const [showWheelBulkModal, setShowWheelBulkModal] = useState<boolean>(false);
  const [bulkWheelInput, setBulkWheelInput] = useState<string>('');
  const [wheelTimeLeft, setWheelTimeLeft] = useState<number>(20);
  const [customWheelAudioUrl, setCustomWheelAudioUrl] = useState<string | null>(null);
  const [customWheelAudioName, setCustomWheelAudioName] = useState<string | null>(null);
  const [isPlayingAudioPreview, setIsPlayingAudioPreview] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelAudioRef = useRef<HTMLAudioElement | null>(null);
  const wheelFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleWheelAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomWheelAudioUrl(url);
      setCustomWheelAudioName(file.name);
      if (wheelAudioRef.current) {
        wheelAudioRef.current.src = url;
      } else {
        wheelAudioRef.current = new Audio(url);
      }
    }
  };

  const handleRemoveCustomAudio = () => {
    if (wheelAudioRef.current) {
      wheelAudioRef.current.pause();
      wheelAudioRef.current.currentTime = 0;
    }
    setCustomWheelAudioUrl(null);
    setCustomWheelAudioName(null);
    setIsPlayingAudioPreview(false);
    if (wheelFileInputRef.current) {
      wheelFileInputRef.current.value = '';
    }
  };

  const togglePreviewAudio = () => {
    if (!customWheelAudioUrl) return;
    if (!wheelAudioRef.current) {
      wheelAudioRef.current = new Audio(customWheelAudioUrl);
    }
    if (isPlayingAudioPreview) {
      wheelAudioRef.current.pause();
      setIsPlayingAudioPreview(false);
    } else {
      wheelAudioRef.current.currentTime = 0;
      wheelAudioRef.current.play().catch(() => {});
      setIsPlayingAudioPreview(true);
      wheelAudioRef.current.onended = () => setIsPlayingAudioPreview(false);
    }
  };

  // Audio Synth Helper for Wheel Sound Effects
  const triggerWheelSound = (type: 'tick' | 'victory') => {
    if (!isWheelSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'victory') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.6);
        });
      }
    } catch {
      // Audio fallback
    }
  };

  // Auto populate student list when teacher selects a class
  useEffect(() => {
    if (selectedClassForWheel) {
      const classStudents = allStudents.filter(s => s.classId === selectedClassForWheel);
      if (classStudents.length > 0) {
        const names = classStudents.map(s => s.displayName || s.email.split('@')[0]);
        // Add fun prizes/bonus
        names.push('🌟 Tặng 10 điểm cộng!', '🎁 Phần thưởng may mắn!');
        setWheelItems(names);
      }
    }
  }, [selectedClassForWheel, allStudents]);

  // Draw Lucky Wheel Canvas
  useEffect(() => {
    if (selectedGame !== 'wheel' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const numSlices = wheelItems.length || 1;
    const sliceAngle = (2 * Math.PI) / numSlices;

    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#F39C12', '#9B59B6', 
      '#1ABC9C', '#E74C3C', '#34495E', '#2ECC71', '#E67E22'
    ];

    ctx.clearRect(0, 0, width, height);

    // Draw slices
    for (let i = 0; i < numSlices; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = (i + 1) * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      
      const itemText = wheelItems[i] || '';
      const truncatedText = itemText.length > 18 ? itemText.substring(0, 16) + '...' : itemText;
      ctx.fillText(truncatedText, radius - 20, 5);
      ctx.restore();
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00A66C';
    ctx.stroke();

    ctx.fillStyle = '#00A66C';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO!', centerX, centerY);
  }, [selectedGame, wheelItems, rotationDegree]);

  const handleSpinWheel = () => {
    if (isSpinning || wheelItems.length === 0) return;
    setIsSpinning(true);
    setWheelWinner(null);
    setWheelTimeLeft(20);

    // Calculate spin angles for 20-second spin (15 to 25 full turns)
    const extraSpins = 15 + Math.floor(Math.random() * 10);
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = rotationDegree + extraSpins * 360 + randomAngle;
    
    setRotationDegree(totalRotation);

    // 20 Seconds Countdown Timer
    let timerCount = 20;
    const countInterval = setInterval(() => {
      timerCount -= 1;
      if (timerCount >= 0) {
        setWheelTimeLeft(timerCount);
      } else {
        clearInterval(countInterval);
      }
    }, 1000);

    // Audio effect: Custom uploaded track OR synth ticking
    if (isWheelSoundEnabled) {
      if (customWheelAudioUrl) {
        if (!wheelAudioRef.current) {
          wheelAudioRef.current = new Audio(customWheelAudioUrl);
        }
        wheelAudioRef.current.currentTime = 0;
        wheelAudioRef.current.loop = true;
        wheelAudioRef.current.play().catch(() => {});
      } else {
        let elapsed = 0;
        const spinDuration = 20000;
        const playTickLoop = () => {
          if (elapsed >= spinDuration) return;
          triggerWheelSound('tick');
          const progress = elapsed / spinDuration;
          const nextInterval = 120 + Math.pow(progress, 2.5) * 750;
          elapsed += nextInterval;
          setTimeout(playTickLoop, nextInterval);
        };
        playTickLoop();
      }
    }

    setTimeout(() => {
      setIsSpinning(false);
      clearInterval(countInterval);
      setWheelTimeLeft(0);

      // Stop custom audio if playing
      if (wheelAudioRef.current) {
        wheelAudioRef.current.pause();
        wheelAudioRef.current.currentTime = 0;
        setIsPlayingAudioPreview(false);
      }

      // Determine winner slice (Pointer is at top / 270 deg or right / 0 deg. In canvas 0 is right. Top pointer = 270 deg)
      const normalizedDegree = (360 - (totalRotation % 360)) % 360;
      const sliceAngle = 360 / wheelItems.length;
      const winningIndex = Math.floor(normalizedDegree / sliceAngle) % wheelItems.length;
      const winner = wheelItems[winningIndex];
      setWheelWinner(winner);
      triggerWheelSound('victory');
    }, 20000);
  };

  const handleApplyBulkWheelItems = () => {
    if (!bulkWheelInput.trim()) return;
    const parsedItems = bulkWheelInput
      .split(/[\n,;\t]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (parsedItems.length > 0) {
      setWheelItems(parsedItems);
      setShowWheelBulkModal(false);
      setBulkWheelInput('');
    }
  };

  const handleClearAllWheelItems = () => {
    setWheelItems([]);
  };

  const handleLoadSampleWheelItems = () => {
    const samples = [
      'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường', 'Đỗ Minh Đức',
      'Phạm Thanh Thảo', 'Vũ Quốc Anh', 'Bùi Ngọc Mai', 'Hoàng Văn Nam',
      '🌟 Tặng 10 điểm cộng!', '❓ Câu hỏi may mắn!'
    ];
    setWheelItems(samples);
  };

  const handleAddWheelItem = () => {
    if (!newItemInput.trim()) return;
    setWheelItems(prev => [...prev, newItemInput.trim()]);
    setNewItemInput('');
  };

  const handleRemoveWheelItem = (index: number) => {
    setWheelItems(prev => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // STATE FOR QUIZ ARCADE (ĐẤU TRƯỜNG TRẮC NGHIỆM)
  // ==========================================
  const [selectedAssignmentForArcade, setSelectedAssignmentForArcade] = useState<Assignment | null>(null);
  const [arcadeModeStarted, setArcadeModeStarted] = useState<boolean>(false);
  const [arcadeCurrentIndex, setArcadeCurrentIndex] = useState<number>(0);
  const [arcadeScore, setArcadeScore] = useState<number>(0);
  const [arcadeStreak, setArcadeStreak] = useState<number>(0);
  const [arcadeTimer, setArcadeTimer] = useState<number>(20);
  const [arcadeSelectedOption, setArcadeSelectedOption] = useState<number | null>(null);
  const [arcadeIsFinished, setArcadeIsFinished] = useState<boolean>(false);

  // Timer loop for arcade mode
  useEffect(() => {
    let timerId: any;
    if (arcadeModeStarted && !arcadeIsFinished && arcadeSelectedOption === null && arcadeTimer > 0) {
      timerId = setInterval(() => {
        setArcadeTimer(prev => {
          if (prev <= 1) {
            // Time up! Count as incorrect
            handleSelectArcadeOption(-1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [arcadeModeStarted, arcadeIsFinished, arcadeSelectedOption, arcadeTimer]);

  const handleStartArcade = (assignment: Assignment) => {
    setSelectedAssignmentForArcade(assignment);
    setArcadeModeStarted(true);
    setArcadeCurrentIndex(0);
    setArcadeScore(0);
    setArcadeStreak(0);
    setArcadeTimer(20);
    setArcadeSelectedOption(null);
    setArcadeIsFinished(false);
  };

  const handleSelectArcadeOption = (optionIndex: number) => {
    if (!selectedAssignmentForArcade || arcadeSelectedOption !== null) return;
    setArcadeSelectedOption(optionIndex);

    const currentQuestion = selectedAssignmentForArcade.questions[arcadeCurrentIndex];
    const optionKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const selectedKey = optionKeys[optionIndex];
    const isCorrect = selectedKey === currentQuestion.correctAnswer || String(optionIndex) === String(currentQuestion.correctAnswer);

    if (isCorrect) {
      const speedBonus = arcadeTimer * 10;
      const streakBonus = arcadeStreak * 50;
      setArcadeScore(prev => prev + 100 + speedBonus + streakBonus);
      setArcadeStreak(prev => prev + 1);
    } else {
      setArcadeStreak(0);
    }

    setTimeout(() => {
      if (arcadeCurrentIndex + 1 < selectedAssignmentForArcade.questions.length) {
        setArcadeCurrentIndex(prev => prev + 1);
        setArcadeSelectedOption(null);
        setArcadeTimer(20);
      } else {
        setArcadeIsFinished(true);
      }
    }, 1500);
  };

  // ==========================================
  // STATE FOR MEMORY FLIP GAME (LẬT THẺ GHI NHỚ)
  // ==========================================
  type MemoryCard = { id: number; content: string; pairId: number; isFlipped: boolean; isMatched: boolean; type: 'EN' | 'VI' };
  
  const SAMPLE_VOCAB_PAIRS = [
    { en: 'Apple 🍎', vi: 'Quả Táo' },
    { en: 'Square 🟦', vi: 'Hình Vuông' },
    { en: 'Circle 🔴', vi: 'Hình Tròn' },
    { en: 'Triangle 🔺', vi: 'Hình Tam Giác' },
    { en: 'Book 📚', vi: 'Quyển Sách' },
    { en: 'Teacher 👩‍🏫', vi: 'Giáo Viên' }
  ];

  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState<number>(0);
  const [memoryIsWon, setMemoryIsWon] = useState<boolean>(false);

  const initMemoryGame = () => {
    let cards: MemoryCard[] = [];
    let idCounter = 1;
    SAMPLE_VOCAB_PAIRS.forEach((pair, index) => {
      cards.push({ id: idCounter++, content: pair.en, pairId: index, isFlipped: false, isMatched: false, type: 'EN' });
      cards.push({ id: idCounter++, content: pair.vi, pairId: index, isFlipped: false, isMatched: false, type: 'VI' });
    });
    // Shuffle cards
    cards = cards.sort(() => Math.random() - 0.5);
    setMemoryCards(cards);
    setFlippedCards([]);
    setMemoryMoves(0);
    setMemoryIsWon(false);
  };

  useEffect(() => {
    if (selectedGame === 'memory' && memoryCards.length === 0) {
      initMemoryGame();
    }
  }, [selectedGame]);

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2) return;
    const targetCard = memoryCards.find(c => c.id === cardId);
    if (!targetCard || targetCard.isFlipped || targetCard.isMatched) return;

    const newCards = memoryCards.map(c => c.id === cardId ? { ...c, isFlipped: true } : c);
    setMemoryCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryMoves(m => m + 1);
      const card1 = newCards.find(c => c.id === newFlipped[0]);
      const card2 = newCards.find(c => c.id === newFlipped[1]);

      if (card1 && card2 && card1.pairId === card2.pairId) {
        // Matched!
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => c.pairId === card1.pairId ? { ...c, isMatched: true } : c));
          setFlippedCards([]);
          // Check win condition
          if (newCards.filter(c => c.isMatched || c.pairId === card1.pairId).length === newCards.length) {
            setMemoryIsWon(true);
          }
        }, 500);
      } else {
        // Not matched, flip back
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === newFlipped[0] || c.id === newFlipped[1]) ? { ...c, isFlipped: false } : c));
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  // ==========================================
  // STATE FOR SPEED MATH (TÍNH NHẨM SIÊU TỐC)
  // ==========================================
  const [mathTimer, setMathTimer] = useState<number>(60);
  const [mathActive, setMathActive] = useState<boolean>(false);
  const [mathScore, setMathScore] = useState<number>(0);
  const [mathStreak, setMathStreak] = useState<number>(0);
  const [mathQuestion, setMathQuestion] = useState<{ expr: string; ans: number; options: number[] } | null>(null);
  const [mathFinished, setMathFinished] = useState<boolean>(false);

  const generateMathQuestion = () => {
    const ops = ['+', '-', 'x'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = 1, b = 1, ans = 0;

    if (op === '+') {
      a = Math.floor(Math.random() * 45) + 5;
      b = Math.floor(Math.random() * 45) + 5;
      ans = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * a);
      ans = a - b;
    } else {
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      ans = a * b;
    }

    const optionsSet = new Set<number>();
    optionsSet.add(ans);
    while (optionsSet.size < 4) {
      const delta = (Math.floor(Math.random() * 10) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const fakeAns = ans + delta;
      if (fakeAns >= 0) optionsSet.add(fakeAns);
    }

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);
    setMathQuestion({ expr: `${a} ${op === 'x' ? '×' : op} ${b} = ?`, ans, options });
  };

  const startMathGame = () => {
    setMathScore(0);
    setMathStreak(0);
    setMathTimer(60);
    setMathFinished(false);
    setMathActive(true);
    generateMathQuestion();
  };

  useEffect(() => {
    let interval: any;
    if (mathActive && mathTimer > 0 && !mathFinished) {
      interval = setInterval(() => {
        setMathTimer(t => {
          if (t <= 1) {
            setMathActive(false);
            setMathFinished(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mathActive, mathTimer, mathFinished]);

  const handleAnswerMath = (selectedAns: number) => {
    if (!mathQuestion || !mathActive) return;

    if (selectedAns === mathQuestion.ans) {
      setMathScore(s => s + 10 * (mathStreak + 1));
      setMathStreak(st => st + 1);
    } else {
      setMathStreak(0);
    }
    generateMathQuestion();
  };

  // ==========================================
  // STATE FOR DUCK RACE (ĐUA VỊT CHỌN HỌC SINH)
  // ==========================================
  type DuckRacer = {
    id: string;
    name: string;
    progress: number;
    color: string;
    rank: number | null;
    speedFactor: number;
  };

  const DUCK_COLORS = [
    '#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1'
  ];

  const [selectedClassForDuck, setSelectedClassForDuck] = useState<string>('');
  const [duckStudents, setDuckStudents] = useState<string[]>([
    'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường',
    'Đỗ Minh Đức', 'Phạm Thanh Thảo', 'Vũ Quốc Anh'
  ]);
  const [newDuckInput, setNewDuckInput] = useState<string>('');
  const [bulkDuckInput, setBulkDuckInput] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [isDuckSoundEnabled, setIsDuckSoundEnabled] = useState<boolean>(true);
  const [isDuckFullScreen, setIsDuckFullScreen] = useState<boolean>(false);

  const [duckRacers, setDuckRacers] = useState<DuckRacer[]>([]);
  const [isDuckRacing, setIsDuckRacing] = useState<boolean>(false);
  const [duckRaceCountdown, setDuckRaceCountdown] = useState<number | null>(null);
  const [duckRaceTimeLeft, setDuckRaceTimeLeft] = useState<number>(20); // 20-second race duration
  const [duckWinner, setDuckWinner] = useState<DuckRacer | null>(null);

  // Close full screen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDuckFullScreen) {
        setIsDuckFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDuckFullScreen]);

  // Audio Synth Helper for Duck Race Effects
  const triggerDuckSound = (type: 'tick' | 'cheer' | 'victory') => {
    if (!isDuckSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'cheer') {
        // Synthesize cheer whistle & crowd excitement
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.35); // G5

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.35); // C6

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.35);
      } else if (type === 'victory') {
        // Victory Fanfare sequence: C5 - E5 - G5 - C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const times = [0, 0.15, 0.3, 0.45];
        const durations = [0.12, 0.12, 0.12, 0.7];

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + times[i]);
          gain.gain.setValueAtTime(0.4, ctx.currentTime + times[i]);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + times[i] + durations[i]);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + times[i]);
          osc.stop(ctx.currentTime + times[i] + durations[i]);
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auto populate student list for duck race when teacher selects a class
  useEffect(() => {
    if (selectedClassForDuck) {
      const classStudents = allStudents.filter(s => s.classId === selectedClassForDuck);
      if (classStudents.length > 0) {
        const names = classStudents.map(s => s.displayName || s.email.split('@')[0]);
        setDuckStudents(names);
      }
    }
  }, [selectedClassForDuck, allStudents]);

  // Reset/Initialize Duck racers list from duckStudents
  useEffect(() => {
    if (selectedGame === 'duck_race') {
      const initialRacers: DuckRacer[] = duckStudents.map((name, idx) => ({
        id: `duck-${idx}-${Date.now()}`,
        name,
        progress: 0,
        color: DUCK_COLORS[idx % DUCK_COLORS.length],
        rank: null,
        speedFactor: 0.85 + Math.random() * 0.3
      }));
      setDuckRacers(initialRacers);
      setDuckWinner(null);
      setIsDuckRacing(false);
      setDuckRaceCountdown(null);
      setDuckRaceTimeLeft(20);
    }
  }, [selectedGame, duckStudents]);

  const handleStartDuckRace = () => {
    if (isDuckRacing || duckStudents.length === 0) return;
    setDuckWinner(null);

    const freshRacers: DuckRacer[] = duckStudents.map((name, idx) => ({
      id: `duck-${idx}-${Date.now()}`,
      name,
      progress: 0,
      color: DUCK_COLORS[idx % DUCK_COLORS.length],
      rank: null,
      speedFactor: 0.85 + Math.random() * 0.3
    }));
    setDuckRacers(freshRacers);
    setDuckRaceTimeLeft(20);

    setDuckRaceCountdown(3);
    triggerDuckSound('tick');

    const countTimer = setInterval(() => {
      setDuckRaceCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countTimer);
          triggerDuckSound('tick');
          startDuckRaceLoop(freshRacers);
          return null;
        }
        triggerDuckSound('tick');
        return prev - 1;
      });
    }, 900);
  };

  const startDuckRaceLoop = (initialRacers: DuckRacer[]) => {
    setIsDuckRacing(true);
    let currentRacers = [...initialRacers];
    let nextRank = 1;
    let winnerFound: DuckRacer | null = null;
    let secondsElapsed = 0;

    // Total 20 seconds race duration (20,000 ms) -> 200 ticks of 100ms
    const totalDurationSeconds = 20;
    const intervalMs = 100;
    const totalTicks = (totalDurationSeconds * 1000) / intervalMs; // 200 ticks
    let tickCount = 0;

    const raceInterval = setInterval(() => {
      tickCount++;
      const currentSecLeft = Math.max(0, Math.ceil(totalDurationSeconds - (tickCount * intervalMs) / 1000));
      setDuckRaceTimeLeft(currentSecLeft);

      // Play cheering sound periodically during the race
      if (tickCount % 15 === 0) {
        triggerDuckSound('cheer');
      }

      let allFinished = true;

      currentRacers = currentRacers.map(duck => {
        if (duck.progress >= 100) return duck;
        allFinished = false;

        // Base progress speed for 20s = ~0.5% per tick + random burst
        const baseSpeed = (100 / totalTicks) * duck.speedFactor;
        const burst = Math.random() > 0.6 ? (Math.random() * 0.45) : 0;
        const newProgress = Math.min(100, duck.progress + baseSpeed + burst);

        let rank = duck.rank;
        if (newProgress >= 100 && rank === null) {
          rank = nextRank;
          nextRank++;
          if (!winnerFound) {
            winnerFound = { ...duck, progress: 100, rank: 1 };
          }
        }

        return {
          ...duck,
          progress: newProgress,
          rank
        };
      });

      setDuckRacers([...currentRacers]);

      // If time reached 20s or someone crossed finish line
      if (tickCount >= totalTicks || winnerFound || allFinished) {
        clearInterval(raceInterval);
        setIsDuckRacing(false);
        setDuckRaceTimeLeft(0);

        // If time ended but no one crossed 100%, pick highest progress duck as winner
        if (!winnerFound) {
          const sorted = [...currentRacers].sort((a, b) => b.progress - a.progress);
          if (sorted.length > 0) {
            winnerFound = { ...sorted[0], progress: 100, rank: 1 };
          }
        }

        if (winnerFound) {
          setDuckWinner(winnerFound);
          triggerDuckSound('victory');
        }
      }
    }, intervalMs);
  };

  const handleAddDuckStudent = () => {
    if (!newDuckInput.trim()) return;
    setDuckStudents(prev => [...prev, newDuckInput.trim()]);
    setNewDuckInput('');
  };

  const handleApplyBulkDuckStudents = () => {
    if (!bulkDuckInput.trim()) return;
    // Split by newlines, commas, or semicolons for flexible copy-pasting from Excel/Word
    const parsedNames = bulkDuckInput
      .split(/[\n,;\t]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (parsedNames.length > 0) {
      setDuckStudents(parsedNames);
      setShowBulkModal(false);
      setBulkDuckInput('');
    }
  };

  const handleClearAllDuckStudents = () => {
    setDuckStudents([]);
  };

  const handleLoadSampleDuckStudents = () => {
    const samples = [
      'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường', 'Đỗ Minh Đức', 
      'Phạm Thanh Thảo', 'Vũ Quốc Anh', 'Bùi Ngọc Mai', 'Hoàng Văn Nam',
      'Đặng Thu Hà', 'Nông Văn Tiến'
    ];
    setDuckStudents(samples);
  };

  const handleRemoveDuckStudent = (index: number) => {
    setDuckStudents(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveWinnerAndRaceAgain = () => {
    if (duckWinner) {
      setDuckStudents(prev => prev.filter(name => name !== duckWinner.name));
      setDuckWinner(null);
    }
  };

  // List of Available Games
  const GAME_LIST = [
    {
      id: 'scan',
      title: 'Quét mã chấm bài tự động AI (OMR)',
      category: 'GRADING',
      badge: 'Chấm bài thi',
      icon: ScanLine,
      color: 'from-blue-600 to-indigo-700',
      bgColor: 'bg-blue-50 border-blue-200 text-blue-700',
      description: 'Quét phiếu trả lời trắc nghiệm giấy bằng Camera hoặc hình ảnh tải lên, tự động chấm điểm và tổng hợp báo cáo tức thì.'
    },
    {
      id: 'duck_race',
      title: 'Đua vịt chọn tên học sinh',
      category: 'CLASSROOM',
      badge: 'Tương tác lớp học',
      icon: Flag,
      color: 'from-amber-400 to-yellow-500',
      bgColor: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      description: 'Đường đua chú vịt vàng bơi lội sinh động chọn ngẫu nhiên học sinh lên bảng trả lời bài hoặc nhận phần thưởng.'
    },
    {
      id: 'tilt_body',
      title: 'Nghiêng người chọn đáp án (Camera AI)',
      category: 'CLASSROOM',
      badge: 'Camera nhận diện',
      icon: Eye,
      color: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      description: 'Học sinh nghiêng người sang Trái (Đáp án A) hoặc Phải (Đáp án B) trước Camera máy tính để trả lời câu hỏi trắc nghiệm sôi động.'
    },
    {
      id: 'wheel',
      title: 'Vòng quay may mắn gọi tên & Chọn câu hỏi',
      category: 'CLASSROOM',
      badge: 'Tương tác lớp học',
      icon: RotateCw,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50 border-amber-200 text-amber-700',
      description: 'Vòng quay may mắn chọn ngẫu nhiên tên học sinh trong lớp trả lời bài, chọn câu hỏi ngẫu nhiên hoặc tặng điểm phần thưởng sinh động.'
    },
    {
      id: 'arcade',
      title: 'Đấu trường Trắc nghiệm Arcade',
      category: 'QUIZ',
      badge: 'Thi đấu trắc nghiệm',
      icon: Trophy,
      color: 'from-emerald-500 to-teal-700',
      bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      description: 'Chuyển các bài kiểm tra đã tạo thành trò chơi chạy đua tính điểm với thời gian đếm ngược, combo nhân điểm và bảng vinh danh.'
    },
    {
      id: 'memory',
      title: 'Lật thẻ ghi nhớ & Ghép từ vựng',
      category: 'MEMORIZE',
      badge: 'Trí nhớ & Từ vựng',
      icon: Puzzle,
      color: 'from-purple-600 to-indigo-800',
      bgColor: 'bg-purple-50 border-purple-200 text-purple-700',
      description: 'Trò chơi tìm cặp thẻ khớp nhau (Từ vựng Tiếng Anh - Tiếng Việt, Khái niệm - Công thức Toán) giúp rèn luyện trí nhớ siêu tốc.'
    },
    {
      id: 'speed_math',
      title: 'Thử thách Tính nhẩm siêu tốc 60 giây',
      category: 'MEMORIZE',
      badge: 'Tư duy Toán học',
      icon: Zap,
      color: 'from-rose-500 to-red-600',
      bgColor: 'bg-rose-50 border-rose-200 text-rose-700',
      description: 'Cuộc đua tính nhẩm liên tục trong 60 giây rèn luyện khả năng phản xạ phép tính cộng, trừ, nhân nhanh cho học sinh.'
    }
  ];

  const filteredGames = GAME_LIST.filter(g => {
    if (activeCategory === 'ALL') return true;
    return g.category === activeCategory;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-stone-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              Trò chơi học tập & Chấm bài
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                Interactive Arcade
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Kho công cụ tương tác lớp học, vòng quay gọi tên, đấu trường trắc nghiệm & Quét mã chấm bài tự động.
            </p>
          </div>
        </div>

        {selectedGame && (
          <button
            onClick={() => setSelectedGame(null)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all shadow-xs border border-stone-300 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại Kho trò chơi</span>
          </button>
        )}
      </div>

      {/* ========================================== */}
      {/* VIEW 1: GAME HUB GALLERY (SELECT A GAME)   */}
      {/* ========================================== */}
      {!selectedGame && (
        <div className="space-y-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { id: 'ALL', label: 'Tất cả hoạt động' },
              { id: 'GRADING', label: 'Công cụ chấm bài' },
              { id: 'CLASSROOM', label: 'Tương tác lớp học' },
              { id: 'QUIZ', label: 'Đấu trường Trắc nghiệm' },
              { id: 'MEMORIZE', label: 'Tư duy & Trí nhớ' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map(game => {
              const IconComponent = game.icon;
              return (
                <motion.div
                  key={game.id}
                  whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  className="bg-white rounded-3xl border border-stone-200/90 p-6 flex flex-col justify-between shadow-xs transition-all group overflow-hidden relative"
                >
                  <div className="space-y-4">
                    {/* Top Bar inside Card */}
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${game.color} text-white flex items-center justify-center shadow-md`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${game.bgColor}`}>
                        {game.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-stone-900 group-hover:text-amber-600 transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                        {game.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Sẵn sàng tạo / chơi
                    </span>
                    <button
                      onClick={() => setSelectedGame(game.id)}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all group-hover:translate-x-1"
                    >
                      <span>Mở giao diện</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 1: SCAN GRADING (QUÉT MÃ CHẤM BÀI)   */}
      {/* ========================================== */}
      {selectedGame === 'scan' && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <ScanGrading 
            classes={classes} 
            currentTeacherUid={currentTeacherUid} 
            userProfile={userProfile} 
          />
        </div>
      )}

      {/* ========================================== */}
      {/* GAME: TILT BODY CAMERA GAME               */}
      {/* ========================================== */}
      {selectedGame === 'tilt_body' && (
        <TiltBodyCameraGame 
          quizTemplates={quizTemplates}
          onBack={() => setSelectedGame(null)}
        />
      )}

      {/* ========================================== */}
      {/* GAME 2: LUCKY WHEEL (VÒNG QUAY MAY MẮN)   */}
      {/* ========================================== */}
      {selectedGame === 'wheel' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
            <div>
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                <RotateCw className="w-7 h-7 text-amber-500" />
                Vòng quay may mắn Lớp học
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Tải danh sách học sinh theo lớp hoặc tùy chỉnh các mục phần thưởng / câu hỏi ngẫu nhiên.
              </p>
            </div>

            {/* Class Selector, Sound Toggle & Custom Audio Upload for Wheel */}
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="file" 
                ref={wheelFileInputRef} 
                accept="audio/*" 
                onChange={handleWheelAudioUpload} 
                className="hidden" 
              />

              <button
                onClick={() => setIsWheelSoundEnabled(!isWheelSoundEnabled)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isWheelSoundEnabled 
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                    : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                }`}
                title="Bật/Tắt âm thanh quay"
              >
                {isWheelSoundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                <span>{isWheelSoundEnabled ? 'Âm thanh: Bật' : 'Tắt'}</span>
              </button>

              <button
                onClick={() => wheelFileInputRef.current?.click()}
                className="px-3 py-2.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 hover:from-amber-100 hover:to-yellow-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Tải tệp âm thanh quay tùy chỉnh (MP3, WAV, AAC...)"
              >
                <Upload className="w-4 h-4 text-amber-600" />
                <span>{customWheelAudioName ? 'Đổi nhạc quay' : 'Tải âm thanh lên'}</span>
              </button>

              {customWheelAudioUrl && (
                <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300 text-xs text-amber-900 font-bold shadow-2xs">
                  <Music className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                  <span className="truncate max-w-[110px]" title={customWheelAudioName || ''}>
                    {customWheelAudioName}
                  </span>
                  <button
                    onClick={togglePreviewAudio}
                    className="p-1 hover:bg-amber-200 rounded-lg text-amber-800 transition-colors cursor-pointer"
                    title={isPlayingAudioPreview ? 'Tạm dừng nghe thử' : 'Nghe thử âm thanh'}
                  >
                    {isPlayingAudioPreview ? <VolumeX className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-amber-800" />}
                  </button>
                  <button
                    onClick={handleRemoveCustomAudio}
                    className="p-1 hover:bg-amber-200 rounded-lg text-red-600 transition-colors cursor-pointer"
                    title="Xóa tệp âm thanh này, dùng lại hiệu ứng mặc định"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Chọn Lớp:</label>
              <select
                value={selectedClassForWheel}
                onChange={(e) => setSelectedClassForWheel(e.target.value)}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-amber-500 min-w-[180px]"
              >
                <option value="">Tất cả / Mặc định</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Wheel Canvas Section */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-amber-50/40 p-8 rounded-3xl border border-amber-100 relative overflow-hidden">
              {/* 20s Timer Badge Header */}
              <div className="w-full flex items-center justify-between mb-4 z-10">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Thời gian quay: 20 giây
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 text-stone-900 rounded-lg font-black text-xs shadow-xs animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  THỜI GIAN: {wheelTimeLeft}s
                </span>
              </div>

              {/* Top Pointer Arrow */}
              <div className="absolute top-16 z-20 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-amber-600 drop-shadow-md" />

              <div className="relative flex items-center justify-center mt-2">
                <motion.div
                  animate={{ rotate: rotationDegree }}
                  transition={{ duration: 20, ease: [0.15, 0.85, 0.35, 1] }}
                  className="rounded-full shadow-2xl p-2 bg-white border-4 border-amber-400"
                >
                  <canvas ref={canvasRef} width={380} height={380} className="rounded-full max-w-full h-auto" />
                </motion.div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleSpinWheel}
                  disabled={isSpinning || wheelItems.length === 0}
                  className={`px-8 py-4 rounded-2xl font-black text-lg text-white shadow-xl transition-all transform active:scale-95 flex items-center gap-3 cursor-pointer ${
                    isSpinning ? 'bg-stone-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/30 animate-pulse'
                  }`}
                >
                  <RotateCw className={`w-6 h-6 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? `Đang quay (${wheelTimeLeft}s)...` : 'BẮT ĐẦU QUAY (20S)!'}</span>
                </button>
              </div>
            </div>

            {/* Custom Items Manager */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    Danh sách mục ({wheelItems.length})
                  </h4>
                  {wheelItems.length > 0 && (
                    <button
                      onClick={handleClearAllWheelItems}
                      className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      title="Xóa tất cả mục"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa tất cả
                    </button>
                  )}
                </div>

                {/* Bulk Paste Prominent Button */}
                <button
                  onClick={() => {
                    setBulkWheelInput(wheelItems.join('\n'));
                    setShowWheelBulkModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📋 Dán danh sách nhiều học sinh (Excel/Word)</span>
                </button>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemInput}
                    onChange={(e) => setNewItemInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWheelItem()}
                    placeholder="Thêm 1 tên học sinh hoặc mục mới..."
                    className="flex-1 p-2.5 rounded-xl border border-stone-200 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleAddWheelItem}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {wheelItems.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-white rounded-2xl border border-dashed border-stone-200 space-y-2">
                      <p className="text-xs text-stone-400 font-medium">Chưa có mục nào trong vòng quay</p>
                      <button
                        onClick={handleLoadSampleWheelItems}
                        className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                      >
                        + Nạp danh sách mẫu 10 học sinh
                      </button>
                    </div>
                  ) : (
                    wheelItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-800 shadow-2xs">
                        <span className="truncate max-w-[200px]">{idx + 1}. {item}</span>
                        <button
                          onClick={() => handleRemoveWheelItem(idx)}
                          className="text-stone-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Import Modal for Wheel */}
          <AnimatePresence>
            {showWheelBulkModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl border border-stone-200"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
                      📋 Dán danh sách nhiều học sinh vào Vòng quay
                    </h3>
                    <button 
                      onClick={() => setShowWheelBulkModal(false)}
                      className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-stone-500 leading-relaxed">
                    Dán danh sách tên học sinh (sao chép trực tiếp từ <strong>Excel, Word, Google Sheets</strong> hoặc văn bản). Các tên phân cách bởi dòng mới, dấu phẩy hoặc dấu chấm phẩy sẽ được tự động đưa vào ô vòng quay.
                  </p>

                  <textarea
                    rows={8}
                    value={bulkWheelInput}
                    onChange={(e) => setBulkWheelInput(e.target.value)}
                    placeholder={`Nguyễn Văn An\nTrần Thị Bích\nLê Hoàng Cường\nĐỗ Minh Đức\nPhạm Thanh Thảo\n🌟 Tặng 10 điểm cộng!\n❓ Câu hỏi may mắn!`}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleLoadSampleWheelItems}
                      className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                    >
                      + Nạp danh sách mẫu
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowWheelBulkModal(false)}
                        className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        onClick={handleApplyBulkWheelItems}
                        className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Lưu vào vòng quay
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Winner Modal */}
          <AnimatePresence>
            {wheelWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl border-4 border-amber-400 relative overflow-hidden">
                  <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                    <Trophy className="w-10 h-10" />
                  </div>

                  <div>
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">KẾT QUẢ VÒNG QUAY</span>
                    <h3 className="text-2xl font-black text-stone-900 mt-2 text-amber-600">
                      🎉 {wheelWinner} 🎉
                    </h3>
                    <p className="text-xs text-stone-500 mt-2">
                      Chúc mừng học sinh / kết quả may mắn nhận thưởng!
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setWheelWinner(null)}
                      className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition-all shadow-md"
                    >
                      Đóng & Tiếp tục quay
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 3: QUIZ ARCADE (ĐẤU TRƯỜNG TRẮC NGHIỆM) */}
      {/* ========================================== */}
      {selectedGame === 'arcade' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
            <div>
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                <Trophy className="w-7 h-7 text-emerald-600" />
                Đấu trường Trắc nghiệm Arcade
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Chọn một bài thi đã có để khởi chạy trò chơi trắc nghiệm tính điểm trực tiếp.
              </p>
            </div>
          </div>

          {!arcadeModeStarted ? (
            <div className="space-y-6">
              <h4 className="font-bold text-stone-800 text-sm">Chọn đề thi để bắt đầu trò chơi:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.length === 0 ? (
                  <div className="col-span-2 text-center py-12 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-sm">
                    Bạn chưa giao đề thi nào. Vui lòng tạo đề thi trước trong mục "Tạo đề thi tự động".
                  </div>
                ) : (
                  assignments.map(as => (
                    <div
                      key={as.id}
                      className="p-5 rounded-2xl border border-stone-200 hover:border-emerald-500 bg-stone-50/50 hover:bg-emerald-50/30 transition-all flex items-center justify-between gap-4"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {as.subject}
                        </span>
                        <h5 className="font-bold text-stone-900 text-base mt-1">{as.title}</h5>
                        <p className="text-xs text-stone-400 mt-0.5">{as.questions.length} câu hỏi</p>
                      </div>
                      <button
                        onClick={() => handleStartArcade(as)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                      >
                        <Play className="w-4 h-4" /> Bắt đầu
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            selectedAssignmentForArcade && (
              <div className="max-w-3xl mx-auto space-y-6">
                {!arcadeIsFinished ? (
                  <div className="space-y-6">
                    {/* Header Score & Timer Bar */}
                    <div className="flex items-center justify-between bg-stone-900 text-white p-4 rounded-2xl shadow-md">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-stone-800 px-3 py-1 rounded-xl">
                          Câu {arcadeCurrentIndex + 1}/{selectedAssignmentForArcade.questions.length}
                        </span>
                        {arcadeStreak > 1 && (
                          <span className="text-xs font-black bg-amber-500 text-stone-950 px-2.5 py-0.5 rounded-full animate-bounce flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" /> {arcadeStreak}x COMBO
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm">
                          <Clock className="w-4 h-4" /> {arcadeTimer}s
                        </div>
                        <div className="text-emerald-400 font-black text-lg">
                          {arcadeScore} điểm
                        </div>
                      </div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-stone-50 p-8 rounded-3xl border border-stone-200 space-y-6">
                      <h4 className="text-xl font-extrabold text-stone-900 leading-relaxed">
                        {selectedAssignmentForArcade.questions[arcadeCurrentIndex].question}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(() => {
                          const currentQ = selectedAssignmentForArcade.questions[arcadeCurrentIndex];
                          const rawOpts = currentQ.options as any;
                          const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
                          const optsList = Array.isArray(rawOpts)
                            ? rawOpts.map((text, idx) => ({ key: keys[idx] || String(idx), text }))
                            : keys.map(k => ({ key: k, text: rawOpts ? rawOpts[k] : '' }));

                          return optsList.map((optObj, idx) => {
                            const isSelected = arcadeSelectedOption === idx;
                            const isCorrect = optObj.key === currentQ.correctAnswer || String(idx) === String(currentQ.correctAnswer);
                            
                            let btnClass = "bg-white border-stone-200 text-stone-800 hover:border-emerald-500 hover:bg-emerald-50/40";
                            if (arcadeSelectedOption !== null) {
                              if (isCorrect) btnClass = "bg-emerald-600 border-emerald-600 text-white font-black shadow-md";
                              else if (isSelected) btnClass = "bg-rose-600 border-rose-600 text-white font-black";
                              else btnClass = "bg-stone-100 border-stone-200 text-stone-400 opacity-50";
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => handleSelectArcadeOption(idx)}
                                disabled={arcadeSelectedOption !== null}
                                className={`p-5 rounded-2xl border-2 text-left text-sm font-bold transition-all shadow-xs flex items-center justify-between ${btnClass}`}
                              >
                                <span>{optObj.key}. {optObj.text}</span>
                                {arcadeSelectedOption !== null && isCorrect && <CheckCircle className="w-5 h-5 text-white" />}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Arcade Finished Summary */
                  <div className="bg-stone-50 p-8 rounded-3xl border border-stone-200 text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                      <Trophy className="w-10 h-10" />
                    </div>

                    <div>
                      <h4 className="text-2xl font-black text-stone-900">HOÀN THÀNH ĐẤU TRƯỜNG!</h4>
                      <p className="text-sm text-stone-500 mt-1">Kết quả lượt chơi trò chơi trắc nghiệm:</p>
                    </div>

                    <div className="inline-block px-8 py-4 bg-emerald-600 text-white font-black text-3xl rounded-2xl shadow-lg">
                      {arcadeScore} ĐIỂM
                    </div>

                    <div className="pt-4 flex justify-center gap-4">
                      <button
                        onClick={() => handleStartArcade(selectedAssignmentForArcade)}
                        className="px-6 py-3 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-all"
                      >
                        Chơi lại bài này
                      </button>
                      <button
                        onClick={() => setArcadeModeStarted(false)}
                        className="px-6 py-3 bg-stone-200 text-stone-800 font-bold text-xs rounded-xl hover:bg-stone-300 transition-all"
                      >
                        Chọn bài khác
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 4: MEMORY CARD (LẬT THẺ GHI NHỚ)      */}
      {/* ========================================== */}
      {selectedGame === 'memory' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
            <div>
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                <Puzzle className="w-7 h-7 text-purple-600" />
                Lật thẻ ghi nhớ Từ vựng & Khái niệm
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Tìm các cặp từ tiếng Anh và nghĩa Tiếng Việt tương ứng. Số lần lật: <strong className="text-purple-600">{memoryMoves}</strong>
              </p>
            </div>

            <button
              onClick={initMemoryGame}
              className="px-4 py-2.5 bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Chơi lượt mới
            </button>
          </div>

          {!memoryIsWon ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {memoryCards.map(card => (
                <motion.div
                  key={card.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCardClick(card.id)}
                  className={`h-28 rounded-2xl border-2 flex items-center justify-center p-3 text-center cursor-pointer select-none font-bold text-xs sm:text-sm transition-all shadow-xs ${
                    card.isMatched
                      ? 'bg-emerald-500 border-emerald-500 text-white cursor-default'
                      : card.isFlipped
                      ? 'bg-white border-purple-500 text-stone-900 shadow-md'
                      : 'bg-purple-600 border-purple-700 text-white hover:bg-purple-700'
                  }`}
                >
                  {card.isFlipped || card.isMatched ? (
                    <span>{card.content}</span>
                  ) : (
                    <HelpCircle className="w-8 h-8 opacity-40" />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-purple-50 p-8 rounded-3xl border border-purple-200 text-center space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center mx-auto shadow-inner">
                <Star className="w-10 h-10 fill-purple-700" />
              </div>

              <div>
                <h4 className="text-2xl font-black text-stone-900">XUẤT SẮC!</h4>
                <p className="text-sm text-stone-600 mt-1">Bạn đã ghép thành công tất cả các thẻ ghi nhớ sau {memoryMoves} lượt lật!</p>
              </div>

              <button
                onClick={initMemoryGame}
                className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md"
              >
                Chơi lại lượt mới
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 5: SPEED MATH (TÍNH NHẨM SIÊU TỐC)    */}
      {/* ========================================== */}
      {selectedGame === 'speed_math' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
            <div>
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                <Zap className="w-7 h-7 text-rose-600" />
                Thử thách Tính nhẩm siêu tốc 60s
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Giải nhanh các phép tính trong 60 giây để đạt điểm số cao nhất.
              </p>
            </div>
          </div>

          {!mathActive && !mathFinished ? (
            <div className="text-center py-12 space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Brain className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-stone-900">Sẵn sàng phản xạ tính nhẩm?</h4>
              <button
                onClick={startMathGame}
                className="px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-lg transition-all shadow-lg shadow-rose-600/30"
              >
                BẮT ĐẦU 60 GiÂY!
              </button>
            </div>
          ) : mathActive && mathQuestion ? (
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex items-center justify-between bg-stone-900 text-white p-4 rounded-2xl">
                <div className="flex items-center gap-2 font-black text-rose-400">
                  <Clock className="w-4 h-4" /> {mathTimer}s
                </div>
                {mathStreak > 1 && (
                  <div className="text-xs font-black bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full">
                    🔥 {mathStreak} Combo
                  </div>
                )}
                <div className="font-black text-emerald-400 text-lg">
                  {mathScore} Điểm
                </div>
              </div>

              <div className="bg-rose-50 p-8 rounded-3xl border border-rose-200 text-center space-y-6">
                <div className="text-4xl font-black text-stone-900 tracking-wider">
                  {mathQuestion.expr}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {mathQuestion.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswerMath(opt)}
                      className="p-5 rounded-2xl bg-white border-2 border-stone-200 hover:border-rose-500 hover:bg-rose-100/40 text-stone-900 font-black text-xl transition-all shadow-xs"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-6 max-w-md mx-auto">
              <div className="text-2xl font-black text-stone-900">HẾT GIỜ!</div>
              <div className="text-4xl font-black text-rose-600">{mathScore} ĐIỂM</div>
              <button
                onClick={startMathGame}
                className="px-8 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm"
              >
                Thử lại lượt mới
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 6: DUCK RACE (ĐUA VỊT CHỌN HỌC SINH)  */}
      {/* ========================================== */}
      {selectedGame === 'duck_race' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
            <div>
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                <span className="text-3xl">🦆</span>
                Đua vịt chọn tên học sinh
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Cuộc đua chú vịt bơi trên đường đua nước ngẫu nhiên chọn học sinh gọi tên.
              </p>
            </div>

            {/* Class Selector, Sound Toggle & Full Screen for Duck Race */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsDuckFullScreen(true)}
                className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Mở chế độ toàn màn hình"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Toàn màn hình</span>
              </button>

              <button
                onClick={() => setIsDuckSoundEnabled(!isDuckSoundEnabled)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isDuckSoundEnabled 
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                    : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                }`}
                title="Bật/Tắt âm thanh đua vịt"
              >
                {isDuckSoundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                <span>{isDuckSoundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
              </button>

              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Chọn Lớp:</label>
              <select
                value={selectedClassForDuck}
                onChange={(e) => setSelectedClassForDuck(e.target.value)}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-yellow-500 min-w-[180px]"
              >
                <option value="">Tất cả / Mặc định</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Race Track Canvas/DOM Section */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 p-6 rounded-3xl border-4 border-sky-300 shadow-xl relative overflow-hidden min-h-[420px] flex flex-col justify-between">
                
                {/* Dynamic Waves Background animation effect */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Track Header & Finish line Indicator & 20s Timer & Fullscreen button */}
                <div className="flex items-center justify-between text-white font-black text-xs z-10 bg-sky-900/40 px-4 py-2 rounded-xl backdrop-blur-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    ĐƯỜNG ĐUA BƠI LỘI TRỰC TIẾP
                  </span>

                  {/* 20 Seconds Countdown Display */}
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 text-stone-900 rounded-lg font-black text-xs shadow-xs animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    THỜI GIAN: {duckRaceTimeLeft}s
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-yellow-300">
                      <Flag className="w-4 h-4 fill-yellow-300" /> ĐÍCH ĐẾN (100%)
                    </span>
                    <button
                      onClick={() => setIsDuckFullScreen(true)}
                      className="p-1 rounded-md bg-sky-800/80 hover:bg-sky-700 text-yellow-300 transition-colors"
                      title="Chế độ toàn màn hình"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Racer Lanes */}
                <div className="space-y-4 my-4 relative z-10 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {duckRacers.map((duck, idx) => (
                    <div key={duck.id} className="relative bg-sky-800/50 backdrop-blur-xs p-2 rounded-2xl border border-sky-300/40">
                      {/* Lane Label */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-sky-100 mb-1 px-1">
                        <span className="truncate max-w-[200px]">{idx + 1}. {duck.name}</span>
                        {duck.rank && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-stone-900 font-black text-[10px]">
                            Hạng #{duck.rank}
                          </span>
                        )}
                      </div>

                      {/* Swimming Track & Duck Progress */}
                      <div className="w-full bg-sky-950/60 h-10 rounded-xl relative overflow-hidden flex items-center px-1 border border-sky-400/30">
                        {/* Swimming Water Ripple fill */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-sky-400/40 transition-all duration-100 rounded-l-xl"
                          style={{ width: `${duck.progress}%` }}
                        />

                        {/* Animated Swimming Duck */}
                        <div 
                          className="absolute transition-all duration-150 flex items-center gap-1.5 z-20"
                          style={{ left: `calc(${Math.min(92, duck.progress)}%)` }}
                        >
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-md border-2 border-white animate-bounce"
                            style={{ backgroundColor: duck.color }}
                          >
                            🦆
                          </div>
                          <span className="bg-white/95 text-stone-900 font-black text-[10px] px-2 py-0.5 rounded-md shadow-xs whitespace-nowrap border border-stone-200">
                            {duck.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Track Footer / Start Button */}
                <div className="z-10 flex items-center justify-between pt-2">
                  <div className="text-white font-bold text-xs">
                    Số lượng chú vịt: <strong className="text-yellow-300 font-black text-sm">{duckRacers.length}</strong>
                  </div>

                  <button
                    onClick={handleStartDuckRace}
                    disabled={isDuckRacing || duckStudents.length === 0}
                    className={`px-8 py-3.5 rounded-2xl font-black text-base text-white shadow-xl transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer ${
                      isDuckRacing 
                        ? 'bg-stone-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-amber-500/30'
                    }`}
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>{isDuckRacing ? `Đang đua vịt (${duckRaceTimeLeft}s)...` : 'BẮT ĐẦU ĐUA VỊT (20S)!'}</span>
                  </button>
                </div>

                {/* 3..2..1 Countdown Overlay */}
                <AnimatePresence>
                  {duckRaceCountdown !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      className="absolute inset-0 z-40 bg-sky-950/75 backdrop-blur-xs flex items-center justify-center"
                    >
                      <div className="text-center space-y-2">
                        <span className="text-xs font-black uppercase text-yellow-300 tracking-widest">SẴN SÀNG...</span>
                        <div className="text-7xl font-black text-white animate-ping">
                          {duckRaceCountdown}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Custom Student Names Manager */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    Danh sách đua ({duckStudents.length})
                  </h4>
                  {duckStudents.length > 0 && (
                    <button
                      onClick={handleClearAllDuckStudents}
                      className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      title="Xóa tất cả danh sách"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa tất cả
                    </button>
                  )}
                </div>

                {/* Bulk Paste Prominent Button */}
                <button
                  onClick={() => {
                    setBulkDuckInput(duckStudents.join('\n'));
                    setShowBulkModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📋 Dán danh sách nhiều học sinh (Excel/Word)</span>
                </button>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDuckInput}
                    onChange={(e) => setNewDuckInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDuckStudent()}
                    placeholder="Nhập 1 tên học sinh..."
                    className="flex-1 p-2.5 rounded-xl border border-stone-200 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <button
                    onClick={handleAddDuckStudent}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {duckStudents.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-white rounded-2xl border border-dashed border-stone-200 space-y-2">
                      <p className="text-xs text-stone-400 font-medium">Chưa có học sinh nào trong danh sách đua</p>
                      <button
                        onClick={handleLoadSampleDuckStudents}
                        className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                      >
                        + Tải mẫu 10 học sinh
                      </button>
                    </div>
                  ) : (
                    duckStudents.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-stone-200 text-xs font-bold text-stone-800 shadow-2xs">
                        <span className="truncate max-w-[180px] flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DUCK_COLORS[idx % DUCK_COLORS.length] }} />
                          {idx + 1}. {item}
                        </span>
                        <button
                          onClick={() => handleRemoveDuckStudent(idx)}
                          className="text-stone-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Import Names Modal */}
          <AnimatePresence>
            {showBulkModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-white p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl border border-stone-200"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
                      📋 Dán danh sách nhiều học sinh
                    </h3>
                    <button 
                      onClick={() => setShowBulkModal(false)}
                      className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-stone-500 leading-relaxed">
                    Dán danh sách tên học sinh (sao chép trực tiếp từ <strong>Excel, Word, Google Sheets</strong> hoặc danh sách văn bản). Mỗi dòng hoặc ngăn cách bởi dấu phẩy, dấu chấm phẩy sẽ tự động tách thành 1 học sinh vịt đua.
                  </p>

                  <textarea
                    rows={8}
                    value={bulkDuckInput}
                    onChange={(e) => setBulkDuckInput(e.target.value)}
                    placeholder={`Nguyễn Văn An\nTrần Thị Bích\nLê Hoàng Cường\nĐỗ Minh Đức\nPhạm Thanh Thảo\nVũ Quốc Anh...`}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleLoadSampleDuckStudents}
                      className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                    >
                      + Nạp danh sách mẫu
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowBulkModal(false)}
                        className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        onClick={handleApplyBulkDuckStudents}
                        className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Lưu danh sách vịt đua
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FULL SCREEN DUCK RACE MODE */}
          <AnimatePresence>
            {isDuckFullScreen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="fixed inset-0 z-50 bg-gradient-to-b from-sky-400 via-sky-600 to-blue-800 text-white p-4 md:p-6 flex flex-col justify-between overflow-hidden shadow-2xl"
              >
                {/* Dynamic Waves Background */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

                {/* Top Header Bar */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-950/60 backdrop-blur-md p-4 rounded-2xl border border-sky-300/40 shadow-lg shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl animate-bounce">🦆</span>
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        ĐƯỜNG ĐUA VỊT TOÀN MÀN HÌNH
                      </h2>
                      <p className="text-xs text-sky-200">
                        Số lượng vịt đua: <strong className="text-yellow-300 font-bold">{duckRacers.length} học sinh</strong>
                      </p>
                    </div>
                  </div>

                  {/* Countdown Timer Display */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-stone-900 rounded-xl font-black text-sm shadow-md animate-pulse">
                    <Clock className="w-4 h-4" />
                    <span>THỜI GIAN BƠI: {duckRaceTimeLeft}s</span>
                  </div>

                  {/* Actions & Exit Full Screen */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setIsDuckSoundEnabled(!isDuckSoundEnabled)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isDuckSoundEnabled 
                          ? 'bg-amber-500 text-white border-amber-400' 
                          : 'bg-stone-800 text-stone-300 border-stone-700'
                      }`}
                    >
                      {isDuckSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      <span>{isDuckSoundEnabled ? 'Âm thanh: Bật' : 'Tắt'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setBulkDuckInput(duckStudents.join('\n'));
                        setShowBulkModal(true);
                      }}
                      className="px-3 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold border border-sky-400/40 transition-colors cursor-pointer"
                    >
                      📋 Sửa danh sách
                    </button>

                    <button
                      onClick={() => setIsDuckFullScreen(false)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Thu nhỏ màn hình (Escape)"
                    >
                      <Minimize2 className="w-4 h-4" />
                      <span>Thu nhỏ (Esc)</span>
                    </button>
                  </div>
                </div>

                {/* Main Swimming Track Area (Fills screen height) */}
                <div className="relative z-10 flex-1 my-4 bg-sky-950/40 backdrop-blur-xs p-4 rounded-3xl border-2 border-sky-300/30 overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-black text-yellow-300 border-b border-sky-400/30 pb-2 mb-2">
                    <span className="flex items-center gap-2">🌐 VẠCH XUẤT PHÁT (0%)</span>
                    <span className="flex items-center gap-1.5 text-yellow-300">
                      <Flag className="w-4 h-4 fill-yellow-300" /> ĐÍCH ĐẾN BƠI LỘI (100%)
                    </span>
                  </div>

                  {/* Lanes Container */}
                  <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                    {duckRacers.map((duck, idx) => (
                      <div key={duck.id} className="relative bg-sky-900/60 p-2.5 rounded-2xl border border-sky-400/30 shadow-xs">
                        {/* Name and Rank */}
                        <div className="flex items-center justify-between text-xs font-bold text-sky-100 mb-1 px-1">
                          <span className="truncate max-w-[280px]">{idx + 1}. {duck.name}</span>
                          {duck.rank && (
                            <span className="px-2.5 py-0.5 rounded-full bg-yellow-400 text-stone-900 font-black text-xs shadow-xs">
                              🏆 Hạng #{duck.rank}
                            </span>
                          )}
                        </div>

                        {/* Swimming Lane Progress */}
                        <div className="w-full bg-sky-950/80 h-12 rounded-xl relative overflow-hidden flex items-center px-2 border border-sky-400/40">
                          {/* Ripple Fill */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-sky-400/40 transition-all duration-100 rounded-l-xl"
                            style={{ width: `${duck.progress}%` }}
                          />

                          {/* Duck Avatar */}
                          <div 
                            className="absolute transition-all duration-150 flex items-center gap-2 z-20"
                            style={{ left: `calc(${Math.min(92, duck.progress)}%)` }}
                          >
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-white animate-bounce"
                              style={{ backgroundColor: duck.color }}
                            >
                              🦆
                            </div>
                            <span className="bg-white text-stone-900 font-black text-xs px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap border border-stone-200">
                              {duck.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="relative z-10 flex items-center justify-between bg-sky-950/70 backdrop-blur-md p-4 rounded-2xl border border-sky-300/40 shrink-0">
                  <div className="text-xs font-bold text-sky-200">
                    Nhấn nút bên cạnh để bắt đầu lượt đua vịt 20 giây chọn học sinh ngẫu nhiên.
                  </div>

                  <button
                    onClick={handleStartDuckRace}
                    disabled={isDuckRacing || duckStudents.length === 0}
                    className={`px-10 py-4 rounded-2xl font-black text-lg text-white shadow-2xl transition-all transform active:scale-95 flex items-center gap-3 cursor-pointer ${
                      isDuckRacing 
                        ? 'bg-stone-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-600 shadow-yellow-500/40 animate-pulse'
                    }`}
                  >
                    <Play className="w-6 h-6 fill-white" />
                    <span>{isDuckRacing ? `ĐANG ĐUA VỊT (${duckRaceTimeLeft}S)...` : 'BẮT ĐẦU ĐUA VỊT (20S)!'}</span>
                  </button>
                </div>

                {/* Countdown Overlay in Fullscreen */}
                <AnimatePresence>
                  {duckRaceCountdown !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      className="absolute inset-0 z-50 bg-sky-950/85 backdrop-blur-md flex items-center justify-center"
                    >
                      <div className="text-center space-y-4">
                        <span className="text-sm font-black uppercase text-yellow-300 tracking-widest">SẴN SÀNG...</span>
                        <div className="text-9xl font-black text-yellow-400 animate-ping drop-shadow-2xl">
                          {duckRaceCountdown}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Winner Modal */}
          <AnimatePresence>
            {duckWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl border-4 border-yellow-400 relative overflow-hidden">
                  <div className="w-24 h-24 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto shadow-inner animate-bounce text-5xl">
                    🦆
                  </div>

                  <div>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest bg-yellow-100 px-3 py-1 rounded-full border border-yellow-200">
                      QUÁN QUÂN ĐƯỜNG ĐUA VỊT
                    </span>
                    <h3 className="text-2xl font-black text-stone-900 mt-3 text-amber-600">
                      🎉 {duckWinner.name} 🎉
                    </h3>
                    <p className="text-xs text-stone-500 mt-2">
                      Chú vịt đại diện cho học sinh <strong className="text-stone-800">{duckWinner.name}</strong> đã bơi về đích đầu tiên!
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => setDuckWinner(null)}
                      className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-md"
                    >
                      Đóng & Giữ nguyên danh sách
                    </button>
                    <button
                      onClick={handleRemoveWinnerAndRaceAgain}
                      className="w-full py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-all border border-stone-200"
                    >
                      Loại {duckWinner.name} & Đua lượt tiếp theo
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
