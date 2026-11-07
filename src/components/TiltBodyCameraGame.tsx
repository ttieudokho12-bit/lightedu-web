import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Eye, CheckCircle, XCircle, RefreshCw, Volume2, VolumeX, 
  Sparkles, Trophy, Award, ArrowLeft, ArrowRight, Play, Zap, 
  Maximize2, Minimize2, ChevronLeft, HelpCircle, Check, Flame, Clock,
  Video, VideoOff, Settings2, Sliders, AlertCircle, Edit3, Plus, Trash2,
  BookOpen, Loader2, ListFilter, X, Lightbulb, GraduationCap, FolderDown,
  ExternalLink, MousePointer, Info
} from 'lucide-react';
import { QuizTemplate, Question } from '../types';
import { generateTiltQuestions, TiltQuestionItem } from '../services/gemini';

interface TiltBodyCameraGameProps {
  quizTemplates?: QuizTemplate[];
  onBack: () => void;
}

export type QuizItem = TiltQuestionItem;

const QUICK_TOPICS = [
  { label: '📐 Bảng cửu chương & Phép nhân', subject: 'math', grade: '3' },
  { label: '🐶 Từ vựng con vật Tiếng Anh', subject: 'english', grade: 'all' },
  { label: '🇻🇳 Lịch sử & Địa lý Việt Nam', subject: 'general', grade: '4' },
  { label: '🌿 Khoa học Tự nhiên & Đời sống', subject: 'general', grade: 'all' },
  { label: '💡 Đố vui mẹo phát triển IQ', subject: 'general', grade: 'all' },
  { label: '📚 Thành ngữ & Chính tả Tiếng Việt', subject: 'vietnamese', grade: 'all' },
  { label: '⏰ Xem đồng hồ & Đơn vị đo', subject: 'math', grade: '2' },
  { label: '➕ Phép tính cộng trừ 100', subject: 'math', grade: '2' },
  { label: '⚡ Phương trình bậc nhất (THCS)', subject: 'math', grade: 'thcs' },
];

const DEFAULT_TILT_QUESTIONS: QuizItem[] = [
  {
    id: 't1',
    subject: 'math',
    question: 'Phương trình x² - 5x + 6 = 0 có nghiệm x = 2 và x = 3 đúng hay sai?',
    optionA: 'ĐÚNG (Nghiêng Trái ⬅️)',
    optionB: 'SAI (Nghiêng Phải ➡️)',
    correctOption: 'A',
    explanation: 'Thay x=2: 4 - 10 + 6 = 0 (đúng). Thay x=3: 9 - 15 + 6 = 0 (đúng). Phương trình có 2 nghiệm x=2 và x=3.'
  },
  {
    id: 't2',
    subject: 'vietnamese',
    question: 'Từ nào sau đây là Danh từ trong câu: "Chiếc xe hoa chạy rất nhanh trên phố"?',
    optionA: 'Nhanh (Nghiêng Trái ⬅️)',
    optionB: 'Chiếc xe hoa (Nghiêng Phải ➡️)',
    correctOption: 'B',
    explanation: '"Chiếc xe hoa" là cụm danh từ chỉ sự vật, còn "Nhanh" là tính từ chỉ đặc điểm vận tốc.'
  },
  {
    id: 't3',
    subject: 'english',
    question: 'Trong Tiếng Anh, từ trái nghĩa với "Difficult" là từ nào?',
    optionA: 'Easy (Nghiêng Trái ⬅️)',
    optionB: 'Hard (Nghiêng Phải ➡️)',
    correctOption: 'A',
    explanation: 'Difficult = Khó khăn; Trái nghĩa là Easy = Dễ dàng. (Hard đồng nghĩa với Difficult).'
  },
  {
    id: 't4',
    subject: 'math',
    question: 'Căn bậc hai số học của 81 là bao nhiêu?',
    optionA: '9 (Nghiêng Trái ⬅️)',
    optionB: '18 (Nghiêng Phải ➡️)',
    correctOption: 'A',
    explanation: '√81 = 9 vì 9 > 0 và 9² = 81.'
  },
  {
    id: 't5',
    subject: 'vietnamese',
    question: 'Tác giả kiệt tác văn học "Truyện Kiều" là danh nhân nào?',
    optionA: 'Nguyễn Du (Nghiêng Trái ⬅️)',
    optionB: 'Nguyễn Trãi (Nghiêng Phải ➡️)',
    correctOption: 'A',
    explanation: 'Đại thi hào Nguyễn Du (1765–1820) là tác giả của Đoạn trường tân thanh (Truyện Kiều).'
  },
  {
    id: 't6',
    subject: 'english',
    question: 'Chọn từ đúng: "She _____ to school by bicycle every morning."',
    optionA: 'goes (Nghiêng Trái ⬅️)',
    optionB: 'go (Nghiêng Phải ➡️)',
    correctOption: 'A',
    explanation: 'Chủ ngữ "She" ngôi thứ 3 số ít ở thì hiện tại đơn đi với động từ thêm -es: "goes".'
  },
  {
    id: 't7',
    subject: 'general',
    question: 'Nhiệt độ sôi của nước tinh khiết ở áp suất tiêu chuẩn (1 atm) là bao nhiêu?',
    optionA: '50°C (Nghiêng Trái ⬅️)',
    optionB: '100°C (Nghiêng Phải ➡️)',
    correctOption: 'B',
    explanation: 'Nước tinh khiết sôi ở 100°C (212°F) ở điều kiện áp suất tiêu chuẩn 1 atm.'
  },
  {
    id: 't8',
    subject: 'math',
    question: 'Hình vuông có cạnh dài 5cm thì diện tích bằng bao nhiêu?',
    optionA: '25 cm² (Nghiêng Trái ⬅️)',
    optionB: '20 cm² (Nghiêng Phải ➡️)',
    correctOption: 'A',
    explanation: 'Diện tích hình vuông S = cạnh × cạnh = 5 × 5 = 25 cm².'
  }
];

export default function TiltBodyCameraGame({ quizTemplates = [], onBack }: TiltBodyCameraGameProps) {
  // Game Setup & Questions State
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'math' | 'vietnamese' | 'english'>('all');
  const [questions, setQuestions] = useState<QuizItem[]>(DEFAULT_TILT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'FEEDBACK' | 'SUMMARY'>('SETUP');
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Custom Topic & AI Generation State
  const [currentTopicTitle, setCurrentTopicTitle] = useState<string>('Toán, Tiếng Việt & Tiếng Anh Tổng hợp');
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [isCustomTopicLoaded, setIsCustomTopicLoaded] = useState<boolean>(false);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState<boolean>(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<'all' | '1' | '2' | '3' | '4' | '5' | 'thcs'>('all');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(8);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  // Modals for Reviewing Questions, Adding Manual Question, and Importing from Saved Templates
  const [showQuestionListModal, setShowQuestionListModal] = useState<boolean>(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<boolean>(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState<boolean>(false);

  // Manual Question Form State
  const [manualQText, setManualQText] = useState<string>('');
  const [manualOptionA, setManualOptionA] = useState<string>('');
  const [manualOptionB, setManualOptionB] = useState<string>('');
  const [manualCorrectOption, setManualCorrectOption] = useState<'A' | 'B'>('A');
  const [manualExplanation, setManualExplanation] = useState<string>('');
  
  // Timer State
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(15);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Motion Detection Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tiltScore, setTiltScore] = useState<number>(0); // -100 (Left) to +100 (Right)
  const [detectedZone, setDetectedZone] = useState<'A' | 'B' | 'CENTER'>('CENTER');
  const [holdProgress, setHoldProgress] = useState<number>(0); // 0 to 100% hold confirm
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sensitivity & Device settings
  const [sensitivity, setSensitivity] = useState<'high' | 'normal' | 'low'>('normal');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [appUrl, setAppUrl] = useState<string>('');

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);

  // Filter questions based on selected subject only if custom topic is not active
  useEffect(() => {
    if (isCustomTopicLoaded) return;
    let pool = DEFAULT_TILT_QUESTIONS;
    if (selectedSubject !== 'all') {
      pool = DEFAULT_TILT_QUESTIONS.filter(q => q.subject === selectedSubject || q.subject === 'general');
    }
    setQuestions(pool);
    setCurrentIndex(0);
  }, [selectedSubject, isCustomTopicLoaded]);

  // Sound Synth Generator
  const playSound = (type: 'tick' | 'hold' | 'correct' | 'wrong' | 'victory') => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'hold') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(750, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      } else if (type === 'correct') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.28);
        });
      } else if (type === 'wrong') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.setValueAtTime(130, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'victory') {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.45);
        });
      }
    } catch {
      // Audio fallback
    }
  };

  // Mouse virtual motion handler for mouse/trackpad play
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCameraActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const x = e.clientX - rect.left;
    const ratio = (x / rect.width) * 2 - 1; // -1 (left) to +1 (right)
    const score = Math.max(-100, Math.min(100, Math.round(ratio * 90)));
    setTiltScore(score);
    if (score < -22) {
      setDetectedZone('A');
    } else if (score > 22) {
      setDetectedZone('B');
    } else {
      setDetectedZone('CENTER');
    }
  };

  const handleMouseLeave = () => {
    if (isCameraActive) return;
    setTiltScore(0);
    setDetectedZone('CENTER');
  };

  // Robust Camera Starter
  const startCamera = async (deviceId?: string, isUserGesture: boolean = false) => {
    setIsLoadingCamera(true);
    if (isUserGesture) {
      setCameraError(null);
    }

    // Check mediaDevices support
    if (!navigator?.mediaDevices?.getUserMedia) {
      if (isUserGesture) {
        setCameraError('Trình duyệt không hỗ trợ WebRTC/getUserMedia. Bạn có thể dùng chuột hoặc phím Mũi tên ⬅️ ➡️ để chơi rất vui!');
      }
      setIsCameraActive(false);
      setIsLoadingCamera(false);
      return;
    }

    // Stop existing stream if switching
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      let mediaStream: MediaStream;
      const targetDeviceId = deviceId || selectedCameraId;

      // Strategy 1: Specific device or flexible dimensions without rigid facingMode constraints
      try {
        const constraints: MediaStreamConstraints = {
          video: targetDeviceId 
            ? { deviceId: { exact: targetDeviceId } }
            : {
                width: { ideal: 640 },
                height: { ideal: 480 }
              },
          audio: false
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        console.warn('Strategy 1 failed, trying fallback to basic video constraint:', firstErr);
        // Strategy 2: Fallback to basic { video: true } constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = mediaStream;
      setIsCameraActive(true);
      setCameraError(null);

      // Attach stream to video element immediately if mounted
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play triggered exception:', playErr);
        }
      }

      // Enumerate available video input devices for user switching
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (!selectedCameraId && videoDevices.length > 0) {
          const currentTrack = mediaStream.getVideoTracks()[0];
          const currentId = currentTrack?.getSettings()?.deviceId || videoDevices[0].deviceId;
          setSelectedCameraId(currentId);
        }
      } catch (enumErr) {
        console.warn('Device enumeration error:', enumErr);
      }

    } catch (err: any) {
      console.warn('Camera access unavailable:', err?.name || err?.message || err);
      setIsCameraActive(false);
      
      // ONLY set user-visible error when user actively clicked a button (not on silent auto-attempt on mount)
      if (isUserGesture) {
        const inIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.message?.includes('Permission denied')) {
          if (inIframe) {
            setCameraError('Trình duyệt đang chặn Camera bên trong khung nhúng (iFrame). Bạn chỉ cần bấm nút "🚀 Mở trong Tab mới" bên dưới để Chrome cấp quyền Camera 100%, hoặc chơi ngay bằng Chuột & Bàn phím ⬅️ ➡️!');
          } else {
            setCameraError('Quyền truy cập Camera bị từ chối. Bạn hãy bấm vào biểu tượng Khóa 🔒 trên thanh địa chỉ, chọn Cho phép (Allow) Camera, rồi bấm "Thử lại kết nối", hoặc dùng chuột / phím ⬅️ ➡️ để chơi!');
          }
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          setCameraError('Không tìm thấy thiết bị Camera trên máy tính. Bạn có thể rê chuột hoặc dùng phím ⬅️ ➡️ để chơi!');
        } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
          setCameraError('Camera đang bị ứng dụng khác (Zoom, Teams, Meet...) chiếm dụng. Vui lòng tắt ứng dụng khác rồi bấm "Thử lại kết nối", hoặc dùng phím ⬅️ ➡️ để chơi!');
        } else {
          setCameraError('Chưa kết nối được Camera (' + (err?.message || 'Lỗi thiết bị') + '). Bạn có thể bấm "Thử lại kết nối", "Mở trong Tab mới" hoặc dùng phím ⬅️ ➡️ để chơi!');
        }
      }
    } finally {
      setIsLoadingCamera(false);
    }
  };

  // Stop Webcam Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Initialize iframe context and attempt silent camera start on mount
  useEffect(() => {
    try {
      const inIframe = window.self !== window.top;
      setIsInIframe(inIframe);
      setAppUrl(window.location.href);
    } catch {
      setIsInIframe(true);
    }

    // Silent attempt without raising false error alerts
    startCamera(undefined, false);

    return () => {
      stopCamera();
    };
  }, []);

  // GUARANTEE: Whenever video element mounts/updates or camera is active, bind stream and play
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.muted = true;
      node.play().catch(e => console.warn('Play in callback ref failed:', e));
    }
  }, []);

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.warn('Play in effect failed:', e));
    }
  }, [isCameraActive, gameState]);

  // Motion & Tilt Processing Loop (Runs in both SETUP for live test preview, and PLAYING for gameplay)
  useEffect(() => {
    if (!isCameraActive) return;

    let smoothedTilt = 0;

    const threshold = sensitivity === 'high' ? 18 : sensitivity === 'low' ? 38 : 26;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        animFrameIdRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        animFrameIdRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const w = 160;
      const h = 120;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      try {
        ctx.drawImage(video, 0, 0, w, h);
        const frameData = ctx.getImageData(0, 0, w, h);
        const data = frameData.data;

        let leftWeight = 0;
        let rightWeight = 0;

        const prevData = prevFrameDataRef.current;
        const step = 2; // Sample every 2nd pixel for high 60fps performance

        for (let y = 0; y < h * 0.85; y += step) {
          for (let x = 0; x < w; x += step) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            const brightness = (r + g + b) / 3;

            let motionVal = 0;
            if (prevData) {
              const pr = prevData[idx];
              const pg = prevData[idx + 1];
              const pb = prevData[idx + 2];
              motionVal = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
            }

            // Combine brightness & motion
            const pixelWeight = brightness * 0.3 + motionVal * 0.7;

            // Video is mirrored horizontally: Left side on canvas corresponds to Option A, Right to Option B
            if (x < w * 0.42) {
              leftWeight += pixelWeight;
            } else if (x > w * 0.58) {
              rightWeight += pixelWeight;
            }
          }
        }

        prevFrameDataRef.current = new Uint8ClampedArray(data);

        const totalWeight = leftWeight + rightWeight + 0.001;
        // Calculate ratio (-100 to +100)
        const rawTilt = ((rightWeight - leftWeight) / totalWeight) * 160;
        // Exponential smoothing for steady UI control
        smoothedTilt = smoothedTilt * 0.7 + rawTilt * 0.3;
        const clampedTilt = Math.max(-100, Math.min(100, Math.round(smoothedTilt)));

        setTiltScore(clampedTilt);

        if (clampedTilt < -threshold) {
          setDetectedZone('A');
        } else if (clampedTilt > threshold) {
          setDetectedZone('B');
        } else {
          setDetectedZone('CENTER');
        }
      } catch (err) {
        console.warn('Canvas frame processing error:', err);
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isCameraActive, sensitivity]);

  // Hold Tilt Confirmation Counter Loop (Only in PLAYING state)
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      setHoldProgress(0);
      return;
    }

    if (detectedZone === 'A' || detectedZone === 'B') {
      const interval = setInterval(() => {
        setHoldProgress(prev => {
          const step = sensitivity === 'high' ? 22 : sensitivity === 'low' ? 12 : 16;
          const next = prev + step;
          if (next >= 100) {
            clearInterval(interval);
            handleConfirmAnswer(detectedZone);
            return 100;
          }
          playSound('hold');
          return next;
        });
      }, 150);

      return () => clearInterval(interval);
    } else {
      setHoldProgress(0);
    }
  }, [detectedZone, gameState, sensitivity]);

  // Question Countdown Timer
  useEffect(() => {
    if (gameState !== 'PLAYING' || !timerRunning) return;

    const timer = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const chosen = detectedZone === 'CENTER' ? 'A' : detectedZone;
          handleConfirmAnswer(chosen);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, timerRunning, detectedZone]);

  // Keyboard shortcut controls (Arrow Left / Arrow Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (e.key === 'ArrowLeft') {
        handleConfirmAnswer('A');
      } else if (e.key === 'ArrowRight') {
        handleConfirmAnswer('B');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentIndex]);

  // Topic AI Generation Handler
  const handleGenerateTopicQuestions = async (topicToGen?: string) => {
    const targetTopic = (topicToGen || customTopicInput).trim();
    if (!targetTopic) {
      setTopicError('Vui lòng nhập chủ đề trước khi tạo câu hỏi.');
      return;
    }

    setIsGeneratingWithAI(true);
    setTopicError(null);

    try {
      const res = await generateTiltQuestions({
        topic: targetTopic,
        subject: selectedSubject === 'all' ? undefined : selectedSubject,
        grade: selectedGrade === 'all' ? undefined : selectedGrade,
        count: selectedQuestionCount,
        difficulty: selectedDifficulty
      });

      if (res && res.length > 0) {
        setQuestions(res);
        setCurrentTopicTitle(targetTopic);
        setIsCustomTopicLoaded(true);
        setCurrentIndex(0);
        playSound('correct');
      } else {
        throw new Error('Không tạo được câu hỏi. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.warn('AI topic generation error:', err);
      setTopicError(err.message || 'Chưa thể tạo tự động từ AI. Vui lòng thử lại hoặc thêm câu hỏi thủ công.');
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  // Quick Preset Selection
  const handleSelectQuickTopic = (item: { label: string; subject: string; grade: string }) => {
    setCustomTopicInput(item.label);
    if (item.subject && ['all', 'math', 'vietnamese', 'english'].includes(item.subject)) {
      setSelectedSubject(item.subject as any);
    }
    if (item.grade && ['all', '1', '2', '3', '4', '5', 'thcs'].includes(item.grade)) {
      setSelectedGrade(item.grade as any);
    }
    handleGenerateTopicQuestions(item.label);
  };

  // Add Manual 2-choice Question
  const handleAddManualQuestion = () => {
    if (!manualQText.trim() || !manualOptionA.trim() || !manualOptionB.trim()) {
      alert('Vui lòng nhập đầy đủ câu hỏi, đáp án A và đáp án B!');
      return;
    }

    const newQ: QuizItem = {
      id: `manual_${Date.now()}`,
      subject: selectedSubject === 'all' ? 'general' : selectedSubject,
      question: manualQText.trim(),
      optionA: manualOptionA.trim(),
      optionB: manualOptionB.trim(),
      correctOption: manualCorrectOption,
      explanation: manualExplanation.trim() || 'Lựa chọn hoàn toàn chính xác!'
    };

    setQuestions(prev => [newQ, ...prev]);
    setIsCustomTopicLoaded(true);
    setManualQText('');
    setManualOptionA('');
    setManualOptionB('');
    setManualExplanation('');
    setShowAddQuestionModal(false);
    playSound('correct');
  };

  // Remove Question from Pool
  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 2) {
      alert('Trò chơi cần tối thiểu 2 câu hỏi để diễn ra!');
      return;
    }
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Reset to Default Questions
  const handleResetToDefaults = () => {
    setQuestions(DEFAULT_TILT_QUESTIONS);
    setCurrentTopicTitle('Toán, Tiếng Việt & Tiếng Anh Tổng hợp');
    setCustomTopicInput('');
    setIsCustomTopicLoaded(false);
    setCurrentIndex(0);
    setSelectedSubject('all');
    setShowQuestionListModal(false);
  };

  // Import from saved Quiz Template
  const handleImportFromTemplate = (template: QuizTemplate) => {
    if (!template.questions || template.questions.length === 0) return;

    const converted: QuizItem[] = template.questions.map((q, idx) => {
      const opts = q.options as any;
      const correctLetter = q.correctAnswer;
      const correctText = opts?.[correctLetter] || 'Đáp án đúng';

      const distractors = (['A', 'B', 'C', 'D'] as const)
        .filter(l => l !== correctLetter && opts?.[l])
        .map(l => opts[l]);
      const distractorText = distractors.length > 0 ? distractors[0] : 'Phương án khác';

      const isCorrectA = Math.random() < 0.5;
      return {
        id: `imported_${idx}_${Date.now()}`,
        subject: (template.subject as any) || 'general',
        question: q.question,
        optionA: isCorrectA ? correctText : distractorText,
        optionB: isCorrectA ? distractorText : correctText,
        correctOption: isCorrectA ? 'A' : 'B',
        explanation: q.explanation || 'Đáp án chính xác theo đề thi đã chọn.'
      };
    });

    setQuestions(converted);
    setCurrentTopicTitle(template.title || 'Đề thi đã lưu');
    setIsCustomTopicLoaded(true);
    setCurrentIndex(0);
    setShowTemplateSelector(false);
    playSound('victory');
  };

  const handleStartGame = () => {
    if (questions.length === 0) {
      alert('Chưa có câu hỏi nào trong danh sách. Vui lòng nạp hoặc tạo câu hỏi!');
      return;
    }
    setGameState('PLAYING');
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setQuestionTimeLeft(15);
    setTimerRunning(true);
    setSelectedOption(null);
    setIsCorrect(null);
  };

  const handleConfirmAnswer = (option: 'A' | 'B') => {
    if (gameState !== 'PLAYING') return;

    setTimerRunning(false);
    setSelectedOption(option);
    
    const currentQ = questions[currentIndex];
    const correct = option === currentQ.correctOption;
    setIsCorrect(correct);

    if (correct) {
      const speedBonus = questionTimeLeft * 10;
      setScore(prev => prev + 100 + speedBonus);
      setStreak(prev => prev + 1);
      playSound('correct');
    } else {
      setStreak(0);
      playSound('wrong');
    }

    setGameState('FEEDBACK');
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
      setHoldProgress(0);
      setQuestionTimeLeft(15);
      setGameState('PLAYING');
      setTimerRunning(true);
    } else {
      setGameState('SUMMARY');
      playSound('victory');
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div ref={containerRef} className="bg-stone-900 text-white rounded-[28px] p-4 sm:p-7 min-h-[680px] flex flex-col justify-between relative overflow-hidden border border-stone-800 shadow-2xl">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Background Decorative Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-stone-800/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-stone-700/60 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
            title="Quay lại danh sách trò chơi"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              Nghiêng Người Chọn Đáp Án (Camera AI)
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-400 hidden sm:block">
              Nghiêng người sang Trái ⬅️ chọn [A] | Nghiêng người sang Phải ➡️ chọn [B]
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Camera Quick Toggle Button */}
          <button
            onClick={() => {
              if (isCameraActive) {
                stopCamera();
              } else {
                startCamera();
              }
            }}
            disabled={isLoadingCamera}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isCameraActive 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 hover:bg-emerald-900' 
                : 'bg-amber-950/80 text-amber-300 border-amber-600/60 hover:bg-amber-900'
            }`}
            title={isCameraActive ? 'Bấm để tắt Camera' : 'Bấm để mở Camera'}
          >
            {isLoadingCamera ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : isCameraActive ? (
              <Video className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VideoOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden md:inline">
              {isLoadingCamera ? 'Đang mở...' : isCameraActive ? 'Camera: Đang Bật' : 'Bật Camera'}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSoundEnabled 
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/50' 
                : 'bg-stone-800 text-stone-400 border-stone-700'
            }`}
            title="Âm thanh"
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-white transition-colors cursor-pointer"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* SCREEN 1: GAME SETUP / LOBBY              */}
      {/* ========================================== */}
      {gameState === 'SETUP' && (
        <div className="relative z-10 my-auto py-6 max-w-3xl mx-auto w-full space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-cyan-500/20">
              <Camera className="w-8 h-8" />
            </div>
            <span className="inline-block text-[11px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-3.5 py-1 rounded-full border border-cyan-800">
              TRÒ CHƠI VẬN ĐỘNG TƯƠNG TÁC LỚP HỌC
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Nghiêng Người Chọn Đáp Án (AI Motion)
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto leading-relaxed">
              Học sinh đứng hoặc ngồi trước Camera, nghiêng đầu hoặc thân người sang <strong>TRÁI (Đáp án A)</strong> hoặc <strong>PHẢI (Đáp án B)</strong> để trả lời câu hỏi!
            </p>
          </div>

          {/* TOPIC INPUT & AI QUESTION GENERATOR CARD */}
          <div className="bg-stone-800/95 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-700/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                    Nhập chủ đề & Tạo câu hỏi (AI Gemini)
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Tùy chỉnh linh hoạt
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Nhập chủ đề bất kỳ để AI tạo ngay câu hỏi 2 đáp án (A Trái ⬅️ | B Phải ➡️)
                  </p>
                </div>
              </div>

              {/* Active topic status chip */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-stone-900 px-3 py-1 rounded-xl border border-stone-700 text-stone-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Chủ đề: <strong className="text-cyan-300 truncate max-w-[150px]">{currentTopicTitle}</strong>
                </span>
              </div>
            </div>

            {/* Topic Input Box + Submit Button */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleGenerateTopicQuestions();
                      }
                    }}
                    placeholder="Nhập chủ đề... (VD: Phép nhân phân số, Từ vựng động vật tiếng Anh, Lịch sử nhà Trần, Thơ Lục bát...)"
                    className="w-full bg-stone-900 border border-stone-700 focus:border-cyan-400 text-stone-100 placeholder-stone-500 text-xs sm:text-sm rounded-xl px-3.5 py-3 outline-none transition-colors"
                  />
                  {customTopicInput && (
                    <button
                      onClick={() => setCustomTopicInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleGenerateTopicQuestions()}
                  disabled={isGeneratingWithAI || !customTopicInput.trim()}
                  className={`px-5 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer shrink-0 ${
                    isGeneratingWithAI || !customTopicInput.trim()
                      ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 shadow-cyan-500/20'
                  }`}
                >
                  {isGeneratingWithAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                      <span>AI Đang tạo câu hỏi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Tạo câu hỏi AI</span>
                    </>
                  )}
                </button>
              </div>

              {topicError && (
                <div className="text-xs text-amber-300 bg-amber-950/70 border border-amber-800 p-2.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{topicError}</span>
                </div>
              )}
            </div>

            {/* Filter Settings: Subject + Grade + Count + Difficulty */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Môn học:</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-200 text-xs outline-none"
                >
                  <option value="all">Tất cả môn (Tổng hợp)</option>
                  <option value="math">Toán học</option>
                  <option value="vietnamese">Tiếng Việt</option>
                  <option value="english">Tiếng Anh</option>
                </select>
              </div>

              {/* Grade */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Khối lớp:</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-200 text-xs outline-none"
                >
                  <option value="all">Mọi lứa tuổi / Tổng hợp</option>
                  <option value="1">Lớp 1</option>
                  <option value="2">Lớp 2</option>
                  <option value="3">Lớp 3</option>
                  <option value="4">Lớp 4</option>
                  <option value="5">Lớp 5</option>
                  <option value="thcs">Khối THCS (Lớp 6-9)</option>
                </select>
              </div>

              {/* Count */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Số lượng câu:</label>
                <select
                  value={selectedQuestionCount}
                  onChange={(e) => setSelectedQuestionCount(Number(e.target.value))}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-200 text-xs outline-none"
                >
                  <option value={5}>5 câu hỏi (Nhanh)</option>
                  <option value={8}>8 câu hỏi (Tiêu chuẩn)</option>
                  <option value={10}>10 câu hỏi (Đầy đủ)</option>
                  <option value={12}>12 câu hỏi (Thử thách)</option>
                </select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase">Độ khó:</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-stone-200 text-xs outline-none"
                >
                  <option value="Easy">Dễ (Nhận biết)</option>
                  <option value="Medium">Vừa (Thông hiểu)</option>
                  <option value="Hard">Nâng cao (Vận dụng)</option>
                </select>
              </div>
            </div>

            {/* Quick Topic Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-stone-400 font-bold">
                <span className="flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Gợi ý chủ đề nhanh (Bấm để tạo ngay):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectQuickTopic(t)}
                    disabled={isGeneratingWithAI}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-cyan-950 border border-stone-700 hover:border-cyan-500 text-stone-300 hover:text-cyan-300 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar: Manage Questions, Manual Add, Import Templates, Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-700/60">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowQuestionListModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-750 text-stone-200 text-xs font-bold border border-stone-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ListFilter className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Xem & Chỉnh sửa ({questions.length} câu)</span>
                </button>

                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-750 text-stone-200 text-xs font-bold border border-stone-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Thêm câu hỏi thủ công</span>
                </button>

                {quizTemplates && quizTemplates.length > 0 && (
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-700 text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FolderDown className="w-3.5 h-3.5 text-purple-400" />
                    <span>Nạp từ Đề thi đã lưu ({quizTemplates.length})</span>
                  </button>
                )}
              </div>

              {isCustomTopicLoaded && (
                <button
                  onClick={handleResetToDefaults}
                  className="text-xs text-stone-400 hover:text-amber-400 underline cursor-pointer"
                >
                  Khôi phục câu hỏi mặc định
                </button>
              )}
            </div>
          </div>

          {/* Live Camera Preview & Calibration Card */}
          <div className="bg-stone-800/90 p-4 sm:p-5 rounded-2xl border border-stone-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-stone-200">
                  Kiểm tra Camera & Thử nghiêng người trước khi chơi:
                </span>
              </div>

              {isCameraActive ? (
                <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Camera đã sẵn sàng 🟢
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => startCamera(undefined, true)}
                    disabled={isLoadingCamera}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{isLoadingCamera ? 'Đang mở Camera...' : 'Bật & Cho phép Camera'}</span>
                  </button>

                  <a
                    href={appUrl || window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-cyan-300 rounded-lg text-xs font-bold border border-cyan-700/60 transition-all flex items-center gap-1.5 shadow"
                    title="Mở trong tab trình duyệt mới để sử dụng camera 100% không bị giới hạn bởi iFrame"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở Tab mới (Camera 100%)</span>
                  </a>
                </div>
              )}
            </div>

            {/* Camera Error Alert & Detailed Guidance */}
            {cameraError && (
              <div className="text-xs bg-amber-950/80 border border-amber-700 text-amber-200 p-3.5 sm:p-4 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-300">
                      {isInIframe ? 'Trình duyệt đang hạn chế Camera trong khung nhúng (iFrame)' : 'Thông báo kết nối Camera:'}
                    </p>
                    <p className="leading-relaxed text-stone-300">{cameraError}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-800/60">
                  <button
                    onClick={() => startCamera(undefined, true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shadow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử lại kết nối</span>
                  </button>

                  <a
                    href={appUrl || window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>🚀 Mở trong Tab mới (Khuyên dùng để bật Camera)</span>
                  </a>

                  <button
                    onClick={() => setCameraError(null)}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-lg text-xs border border-stone-600 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Đã hiểu, dùng Chuột / Bàn phím</span>
                  </button>
                </div>
              </div>
            )}

            {/* Live Video Preview Box in Setup */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div 
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="md:col-span-7 bg-stone-950 rounded-xl border border-stone-700 h-48 sm:h-56 relative overflow-hidden flex items-center justify-center cursor-default"
              >
                {isCameraActive ? (
                  <>
                    <video
                      ref={setVideoRef}
                      playsInline
                      autoPlay
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    {/* Visual Overlay Zones */}
                    <div className="absolute inset-0 border-2 border-cyan-500/20 pointer-events-none flex">
                      <div className={`w-1/2 border-r border-dashed border-cyan-500/40 flex items-center justify-center transition-colors ${
                        detectedZone === 'A' ? 'bg-emerald-500/25' : ''
                      }`}>
                        <span className={`font-black text-xs px-2 py-1 rounded bg-stone-900/80 ${
                          detectedZone === 'A' ? 'text-emerald-400 border border-emerald-500' : 'text-stone-400'
                        }`}>
                          ⬅️ VÙNG A (TRÁI)
                        </span>
                      </div>
                      <div className={`w-1/2 flex items-center justify-center transition-colors ${
                        detectedZone === 'B' ? 'bg-blue-500/25' : ''
                      }`}>
                        <span className={`font-black text-xs px-2 py-1 rounded bg-stone-900/80 ${
                          detectedZone === 'B' ? 'text-blue-400 border border-blue-500' : 'text-stone-400'
                        }`}>
                          VÙNG B (PHẢI) ➡️
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center space-y-2.5 w-full flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black transition-transform ${
                        detectedZone === 'A' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500 -rotate-12' 
                          : detectedZone === 'B' 
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500 rotate-12' 
                          : 'bg-stone-800 text-stone-400 border border-stone-700'
                      }`}>
                        {detectedZone === 'A' ? '⬅️' : detectedZone === 'B' ? '➡️' : '🧍'}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-stone-200">
                          {detectedZone === 'A' ? 'Đang nghiêng TRÁI (Chọn A)' : detectedZone === 'B' ? 'Đang nghiêng PHẢI (Chọn B)' : 'Chế độ Nghiêng ảo (Chuột / Phím)'}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          Rê chuột trái/phải hoặc bấm phím ⬅️ ➡️ để thử
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => startCamera(undefined, true)}
                        disabled={isLoadingCamera}
                        className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>{isLoadingCamera ? 'Đang kết nối...' : 'Bật Camera'}</span>
                      </button>

                      <a
                        href={appUrl || window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-cyan-300 text-xs font-bold border border-cyan-800 transition-all flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở Tab mới (Camera 100%)</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Realtime Calibration & Sensitivity Settings */}
              <div className="md:col-span-5 space-y-3">
                {/* Meter status */}
                <div className="bg-stone-900/90 p-3 rounded-xl border border-stone-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-400">Thước đo nghiêng:</span>
                    <span className="font-bold text-cyan-400">
                      {detectedZone === 'A' ? '⬅️ ĐANG NGHIÊNG TRÁI' : detectedZone === 'B' ? '➡️ ĐANG NGHIÊNG PHẢI' : 'ĐỨNG GIỮA (THẲNG)'}
                    </span>
                  </div>

                  <div className="w-full bg-stone-800 rounded-full h-3 relative overflow-hidden border border-stone-700">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-stone-500 z-10" />
                    <div 
                      className="absolute top-0 bottom-0 w-3.5 bg-cyan-400 rounded-full shadow-md transform -translate-x-1/2 transition-all duration-75"
                      style={{ left: `${((tiltScore + 100) / 200) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-500 font-bold">
                    <span>Trái: -100</span>
                    <span>0</span>
                    <span>Phải: +100</span>
                  </div>
                </div>

                {/* Sensitivity Choice */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-400 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Độ nhạy nghiêng:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'high', label: 'Rất nhạy (Ngồi học)' },
                      { id: 'normal', label: 'Vừa (Mặc định)' },
                      { id: 'low', label: 'Nhẹ (Đứng xa)' },
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSensitivity(s.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer ${
                          sensitivity === s.id
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                            : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Device Selector (If multiple cameras detected) */}
                {availableCameras.length > 1 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-400">Chọn thiết bị Camera:</label>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedCameraId(newId);
                        startCamera(newId, true);
                      }}
                      className="w-full bg-stone-900 border border-stone-700 text-xs rounded-lg p-1.5 text-stone-200 outline-none"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.deviceId} value={cam.deviceId}>
                          {cam.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-stone-400 space-y-1 border-t border-stone-700/60 pt-2.5">
              <p>💡 <strong>Mẹo vận động:</strong> Đặt máy tính ở góc nhìn bao quát thân trên, chiếu đủ ánh sáng và đứng cách camera 1–2 mét.</p>
              <p>⌨️ <strong>Dự phòng không cần camera:</strong> Trong lúc chơi, bạn luôn có thể bấm vào thẻ đáp án hoặc dùng phím <strong>⬅️ ➡️</strong> trên bàn phím.</p>
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 font-black text-lg text-white shadow-xl shadow-cyan-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>BẮT ĐẦU CHƠI NGAY ({questions.length} CÂU)</span>
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* SCREEN 2: GAMEPLAY (QUESTION + CAMERA)     */}
      {/* ========================================== */}
      {(gameState === 'PLAYING' || gameState === 'FEEDBACK') && currentQ && (
        <div className="relative z-10 flex-1 flex flex-col justify-between my-2 gap-4">
          {/* Top Bar: Question Counter & Timer & Topic */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-stone-800 text-stone-300 font-bold text-xs border border-stone-700">
                Câu {currentIndex + 1} / {questions.length}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-cyan-950/90 text-cyan-300 border border-cyan-700 text-xs font-bold truncate max-w-[180px] sm:max-w-[320px] flex items-center gap-1">
                <span>🎯</span>
                <span className="truncate">{currentTopicTitle}</span>
              </span>
              {streak > 1 && (
                <span className="px-3 py-1 rounded-xl bg-amber-950 text-amber-300 border border-amber-700 font-black text-xs flex items-center gap-1 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Chuỗi x{streak}!
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-cyan-400 font-black text-xs sm:text-sm">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{score} điểm</span>
              </div>

              <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm shadow-md border ${
                questionTimeLeft <= 5 
                  ? 'bg-red-950 text-red-400 border-red-800 animate-pulse' 
                  : 'bg-cyan-950 text-cyan-300 border-cyan-800'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{questionTimeLeft}s</span>
              </div>
            </div>
          </div>

          {/* Question Text Box */}
          <div className="bg-stone-800/90 p-4 sm:p-6 rounded-2xl border border-stone-700/80 text-center shadow-lg space-y-1">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">CÂU HỎI {currentIndex + 1}:</span>
            <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug">
              {currentQ.question}
            </h2>
          </div>

          {/* Main Stage: Camera + Option Cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center my-auto">
            {/* OPTION A (LEFT) */}
            <div 
              onClick={() => handleConfirmAnswer('A')}
              className={`md:col-span-3 p-4 sm:p-5 rounded-2xl border-4 transition-all duration-200 cursor-pointer flex flex-col justify-between h-48 sm:h-64 relative overflow-hidden ${
                gameState === 'FEEDBACK'
                  ? currentQ.correctOption === 'A'
                    ? 'bg-emerald-950/90 border-emerald-500 shadow-2xl shadow-emerald-500/40 scale-102'
                    : selectedOption === 'A'
                    ? 'bg-red-950/90 border-red-500 opacity-60'
                    : 'bg-stone-800/50 border-stone-700 opacity-40'
                  : detectedZone === 'A'
                  ? 'bg-emerald-950/80 border-emerald-400 shadow-xl shadow-emerald-500/30 scale-102'
                  : 'bg-stone-800/80 border-stone-700 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-stone-900 font-black text-xs uppercase tracking-wider">
                  ĐÁP ÁN A
                </span>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  ⬅️ Nghiêng Trái
                </span>
              </div>

              <div className="my-auto text-center space-y-2">
                <p className="text-sm sm:text-base md:text-lg font-black text-white">
                  {currentQ.optionA}
                </p>
              </div>

              {/* Hold Progress Bar for Option A */}
              {detectedZone === 'A' && gameState === 'PLAYING' && (
                <div className="w-full bg-stone-900 rounded-full h-3 overflow-hidden border border-emerald-500/50">
                  <div 
                    className="bg-emerald-400 h-full transition-all duration-150"
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              )}

              {gameState === 'FEEDBACK' && currentQ.correctOption === 'A' && (
                <div className="absolute top-3 right-3 text-emerald-400">
                  <CheckCircle className="w-7 h-7" />
                </div>
              )}
            </div>

            {/* LIVE CAMERA FEED OR FALLBACK (CENTER) */}
            <div className="md:col-span-6 bg-stone-950 rounded-2xl border-2 border-stone-700 overflow-hidden relative flex flex-col items-center justify-center h-52 sm:h-64 shadow-xl">
              {isCameraActive ? (
                <>
                  <video
                    ref={setVideoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />

                  {/* Camera Visual Overlay Boundaries */}
                  <div className="absolute inset-0 border-2 border-cyan-500/30 pointer-events-none flex">
                    <div className={`w-1/2 border-r border-dashed border-cyan-500/40 flex items-center justify-center transition-colors ${
                      detectedZone === 'A' ? 'bg-emerald-500/20' : ''
                    }`}>
                      <span className="text-emerald-400 font-black text-xs opacity-75">⬅️ KHU VỰC A (TRÁI)</span>
                    </div>
                    <div className={`w-1/2 flex items-center justify-center transition-colors ${
                      detectedZone === 'B' ? 'bg-blue-500/20' : ''
                    }`}>
                      <span className="text-blue-400 font-black text-xs opacity-75">KHU VỰC B (PHẢI) ➡️</span>
                    </div>
                  </div>

                  {/* Realtime Tilt Meter Overlay */}
                  <div className="absolute bottom-2 inset-x-3 sm:inset-x-4 bg-stone-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-stone-700/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={detectedZone === 'A' ? 'text-emerald-400 font-black' : 'text-stone-400'}>
                        ⬅️ [A] Nghiêng Trái
                      </span>
                      <span className="text-stone-200">
                        {tiltScore < -20 ? '🟢 ĐANG NGHIÊNG TRÁI' : tiltScore > 20 ? '🔵 ĐANG NGHIÊNG PHẢI' : '⚪ ĐỨNG THẲNG'}
                      </span>
                      <span className={detectedZone === 'B' ? 'text-blue-400 font-black' : 'text-stone-400'}>
                        Nghiêng Phải [B] ➡️
                      </span>
                    </div>

                    {/* Meter Bar */}
                    <div className="w-full bg-stone-800 rounded-full h-2.5 relative overflow-hidden border border-stone-700">
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-stone-500 z-10" />
                      <div 
                        className="absolute top-0 bottom-0 w-4 bg-cyan-400 rounded-full shadow-md transform -translate-x-1/2 transition-all duration-75"
                        style={{ left: `${((tiltScore + 100) / 200) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div 
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  className="p-3.5 sm:p-4 text-center flex flex-col items-center justify-between w-full h-full bg-gradient-to-b from-stone-900 to-stone-950 select-none cursor-ew-resize"
                >
                  <div className="flex items-center justify-between w-full text-[11px] font-bold px-1 text-stone-400">
                    <span className={detectedZone === 'A' ? 'text-emerald-400 font-black' : ''}>⬅️ [A] Nghiêng Trái</span>
                    <span className="text-cyan-300">
                      {detectedZone === 'A' ? 'ĐANG NGHIÊNG TRÁI' : detectedZone === 'B' ? 'ĐANG NGHIÊNG PHẢI' : 'ĐỨNG GIỮA (THẲNG)'}
                    </span>
                    <span className={detectedZone === 'B' ? 'text-blue-400 font-black' : ''}>Nghiêng Phải [B] ➡️</span>
                  </div>

                  {/* Virtual Tilt Character Avatar */}
                  <div className="my-auto flex flex-col items-center justify-center space-y-1.5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black transition-transform duration-100 shadow-lg ${
                      detectedZone === 'A'
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 -rotate-12 scale-105 shadow-emerald-500/20'
                        : detectedZone === 'B'
                        ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500 rotate-12 scale-105 shadow-blue-500/20'
                        : 'bg-stone-800 text-stone-300 border border-stone-700'
                    }`}>
                      {detectedZone === 'A' ? '⬅️' : detectedZone === 'B' ? '➡️' : '🧍'}
                    </div>

                    <p className="text-[11px] font-medium text-stone-400">
                      Rê chuột hoặc dùng phím <strong className="text-cyan-300">⬅️ ➡️</strong> để nghiêng
                    </p>
                  </div>

                  {/* Realtime Tilt Meter Bar */}
                  <div className="w-full bg-stone-800 rounded-full h-2.5 relative overflow-hidden border border-stone-700 mb-1">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-stone-500 z-10" />
                    <div 
                      className="absolute top-0 bottom-0 w-4 bg-cyan-400 rounded-full shadow-md transform -translate-x-1/2 transition-all duration-75"
                      style={{ left: `${((tiltScore + 100) / 200) * 100}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-1.5 w-full pt-1">
                    <button
                      onClick={() => startCamera(undefined, true)}
                      disabled={isLoadingCamera}
                      className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-bold rounded-lg transition-all shadow flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{isLoadingCamera ? 'Đang mở...' : 'Mở lại Camera'}</span>
                    </button>

                    <a
                      href={appUrl || window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-750 text-cyan-300 text-[11px] font-bold rounded-lg border border-cyan-800 transition-all flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Mở Tab mới (Camera 100%)</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* OPTION B (RIGHT) */}
            <div 
              onClick={() => handleConfirmAnswer('B')}
              className={`md:col-span-3 p-4 sm:p-5 rounded-2xl border-4 transition-all duration-200 cursor-pointer flex flex-col justify-between h-48 sm:h-64 relative overflow-hidden ${
                gameState === 'FEEDBACK'
                  ? currentQ.correctOption === 'B'
                    ? 'bg-emerald-950/90 border-emerald-500 shadow-2xl shadow-emerald-500/40 scale-102'
                    : selectedOption === 'B'
                    ? 'bg-red-950/90 border-red-500 opacity-60'
                    : 'bg-stone-800/50 border-stone-700 opacity-40'
                  : detectedZone === 'B'
                  ? 'bg-blue-950/80 border-blue-400 shadow-xl shadow-blue-500/30 scale-102'
                  : 'bg-stone-800/80 border-stone-700 hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-blue-500 text-stone-900 font-black text-xs uppercase tracking-wider">
                  ĐÁP ÁN B
                </span>
                <span className="text-xs text-blue-400 font-bold flex items-center gap-1">
                  Nghiêng Phải ➡️
                </span>
              </div>

              <div className="my-auto text-center space-y-2">
                <p className="text-sm sm:text-base md:text-lg font-black text-white">
                  {currentQ.optionB}
                </p>
              </div>

              {/* Hold Progress Bar for Option B */}
              {detectedZone === 'B' && gameState === 'PLAYING' && (
                <div className="w-full bg-stone-900 rounded-full h-3 overflow-hidden border border-blue-500/50">
                  <div 
                    className="bg-blue-400 h-full transition-all duration-150"
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              )}

              {gameState === 'FEEDBACK' && currentQ.correctOption === 'B' && (
                <div className="absolute top-3 right-3 text-emerald-400">
                  <CheckCircle className="w-7 h-7" />
                </div>
              )}
            </div>
          </div>

          {/* Feedback Section Banner */}
          {gameState === 'FEEDBACK' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isCorrect 
                  ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200' 
                  : 'bg-red-950/90 border-red-500/80 text-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isCorrect ? 'bg-emerald-500 text-stone-900' : 'bg-red-500 text-white'}`}>
                  {isCorrect ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-black text-base">
                    {isCorrect ? 'CHÍNH XÁC! XUẤT SẮC 🌟' : 'CHƯA CHÍNH XÁC ❌'}
                  </h4>
                  {currentQ.explanation && (
                    <p className="text-xs text-stone-300 mt-0.5">{currentQ.explanation}</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleNextQuestion}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-stone-900 font-black text-xs hover:bg-stone-100 transition-all shadow-md shrink-0 cursor-pointer"
              >
                {currentIndex + 1 < questions.length ? 'CÂU TIẾP THEO ➡️' : 'XEM KẾT QUẢ 🏆'}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* SCREEN 3: QUIZ SUMMARY & LEADERBOARD       */}
      {/* ========================================== */}
      {gameState === 'SUMMARY' && (
        <div className="relative z-10 my-auto py-8 max-w-xl mx-auto w-full text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-stone-900 mx-auto shadow-2xl shadow-yellow-500/30 animate-bounce text-5xl">
            🏆
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-950 px-3.5 py-1 rounded-full border border-amber-800">
              HOÀN THÀNH LƯỢT CHƠI
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Chúc Mừng Đã Hoàn Thành!
            </h2>
            <div className="inline-block px-4 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-700 text-cyan-300 text-xs font-bold">
              🎯 Chủ đề: {currentTopicTitle}
            </div>
            <p className="text-xs sm:text-sm text-stone-400">
              Học sinh đã hoàn thành thử thách nghiêng người chọn đáp án vận động xuất sắc!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-stone-800/90 p-5 rounded-2xl border border-stone-700">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-stone-400">TỔNG ĐIỂM ĐẠT ĐƯỢC</span>
              <p className="text-3xl font-black text-yellow-400">{score}</p>
            </div>
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-stone-400">SỐ CÂU HOÀN THÀNH</span>
              <p className="text-3xl font-black text-cyan-400">{questions.length} / {questions.length}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartGame}
              className="flex-1 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Chơi lại chủ đề này
            </button>
            <button
              onClick={() => setGameState('SETUP')}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Đổi / Nhập chủ đề khác
            </button>
            <button
              onClick={onBack}
              className="py-3.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm border border-stone-700 transition-all cursor-pointer"
            >
              Quay lại Kho
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 1: VIEW & EDIT QUESTIONS LIST        */}
      {/* ========================================== */}
      <AnimatePresence>
        {showQuestionListModal && (
          <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 border border-stone-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col text-white"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <ListFilter className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Danh sách câu hỏi trong chủ đề</h3>
                    <p className="text-xs text-stone-400 truncate max-w-xs sm:max-w-md">
                      Chủ đề: <strong className="text-cyan-300">{currentTopicTitle}</strong> ({questions.length} câu)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuestionListModal(false)}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Questions List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 custom-scrollbar">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-stone-850 p-4 rounded-2xl border border-stone-800 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                          {q.subject}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-stone-500 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h5 className="font-bold text-sm text-stone-100 leading-snug">
                      {q.question}
                    </h5>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        q.correctOption === 'A'
                          ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 font-bold'
                          : 'bg-stone-900 border-stone-800 text-stone-400'
                      }`}>
                        <span className="truncate">⬅️ [A] {q.optionA}</span>
                        {q.correctOption === 'A' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>

                      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        q.correctOption === 'B'
                          ? 'bg-blue-950/70 border-blue-500/80 text-blue-300 font-bold'
                          : 'bg-stone-900 border-stone-800 text-stone-400'
                      }`}>
                        <span className="truncate">[B] {q.optionB} ➡️</span>
                        {q.correctOption === 'B' && <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />}
                      </div>
                    </div>

                    {q.explanation && (
                      <p className="text-[11px] text-stone-400 italic bg-stone-900/60 p-2 rounded-lg">
                        💡 Giải thích: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-800 pt-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowQuestionListModal(false);
                      setShowAddQuestionModal(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm câu hỏi
                  </button>
                  <button
                    onClick={handleResetToDefaults}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Khôi phục mặc định
                  </button>
                </div>

                <button
                  onClick={() => setShowQuestionListModal(false)}
                  className="px-5 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Xong & Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL 2: ADD MANUAL 2-CHOICE QUESTION      */}
      {/* ========================================== */}
      <AnimatePresence>
        {showAddQuestionModal && (
          <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 border border-stone-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Thêm câu hỏi 2 đáp án thủ công</h3>
                    <p className="text-xs text-stone-400">Dành cho trò chơi nghiêng người Trái/Phải</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddQuestionModal(false)}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Question Text */}
                <div className="space-y-1">
                  <label className="font-bold text-stone-300">Nội dung câu hỏi: *</label>
                  <textarea
                    rows={3}
                    value={manualQText}
                    onChange={(e) => setManualQText(e.target.value)}
                    placeholder="Nhập câu hỏi (Ví dụ: Số 17 là số nguyên tố đúng hay sai?)"
                    className="w-full bg-stone-850 border border-stone-700 rounded-xl p-3 text-stone-100 outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Option A & Option B */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-emerald-400">Đáp án A (Nghiêng Trái ⬅️): *</label>
                    <input
                      type="text"
                      value={manualOptionA}
                      onChange={(e) => setManualOptionA(e.target.value)}
                      placeholder="VD: ĐÚNG"
                      className="w-full bg-stone-850 border border-emerald-500/50 rounded-xl p-2.5 text-stone-100 outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-blue-400">Đáp án B (Nghiêng Phải ➡️): *</label>
                    <input
                      type="text"
                      value={manualOptionB}
                      onChange={(e) => setManualOptionB(e.target.value)}
                      placeholder="VD: SAI"
                      className="w-full bg-stone-850 border border-blue-500/50 rounded-xl p-2.5 text-stone-100 outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Correct Option Selector */}
                <div className="space-y-1 pt-1">
                  <label className="font-bold text-stone-300">Chọn đáp án ĐÚNG: *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setManualCorrectOption('A')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        manualCorrectOption === 'A'
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                          : 'bg-stone-850 border-stone-700 text-stone-400'
                      }`}
                    >
                      Đáp án A là ĐÚNG ⬅️
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualCorrectOption('B')}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        manualCorrectOption === 'B'
                          ? 'bg-blue-950 border-blue-400 text-blue-300'
                          : 'bg-stone-850 border-stone-700 text-stone-400'
                      }`}
                    >
                      Đáp án B là ĐÚNG ➡️
                    </button>
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1">
                  <label className="font-bold text-stone-300">Lời giải thích ngắn gọn (tùy chọn):</label>
                  <input
                    type="text"
                    value={manualExplanation}
                    onChange={(e) => setManualExplanation(e.target.value)}
                    placeholder="VD: Số 17 chỉ chia hết cho 1 và chính nó nên là số nguyên tố."
                    className="w-full bg-stone-850 border border-stone-700 rounded-xl p-2.5 text-stone-100 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 border-t border-stone-800 pt-3">
                <button
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleAddManualQuestion}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  Lưu vào bộ câu hỏi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL 3: IMPORT FROM SAVED QUIZ TEMPLATES  */}
      {/* ========================================== */}
      <AnimatePresence>
        {showTemplateSelector && quizTemplates && quizTemplates.length > 0 && (
          <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-stone-900 border border-stone-700 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-white max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <FolderDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Nạp từ Đề thi đã lưu</h3>
                    <p className="text-xs text-stone-400">Tự động chuyển đổi các câu hỏi trắc nghiệm thành 2 đáp án (A Trái | B Phải)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {quizTemplates.map(tpl => (
                  <div
                    key={tpl.id}
                    className="p-3.5 rounded-2xl bg-stone-850 hover:bg-stone-800 border border-stone-800 hover:border-purple-500 flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        {tpl.subject}
                      </span>
                      <h5 className="font-bold text-sm text-stone-100 mt-1">{tpl.title}</h5>
                      <p className="text-xs text-stone-400 mt-0.5">{tpl.questions.length} câu hỏi</p>
                    </div>

                    <button
                      onClick={() => handleImportFromTemplate(tpl)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
                    >
                      Nạp đề thi này ➡️
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-stone-800 pt-3">
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="px-5 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
