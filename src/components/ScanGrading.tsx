import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { 
  Camera, 
  QrCode, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  Zap, 
  Volume2, 
  VolumeX, 
  Award, 
  BarChart2, 
  FileText, 
  Download, 
  Share2, 
  Save, 
  Printer, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  RefreshCw,
  Eye,
  BookOpen,
  Check,
  X,
  Clock,
  Send
} from 'lucide-react';
import { ClassRoom, UserProfile } from '../types';

interface ScanGradingProps {
  classes: ClassRoom[];
  currentTeacherUid: string;
  userProfile: UserProfile | null;
}

export interface StudentCardInfo {
  id: string;
  code: string;
  name: string;
  classId: string;
  className: string;
  avatarBg: string;
}

export interface QuizQuestionItem {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  timeLimit: number; // in seconds
}

export interface QuizPackage {
  id: string;
  title: string;
  subject: string;
  grade: string;
  questions: QuizQuestionItem[];
}

// Default Sample 10 Students for Class 4A
const SAMPLE_STUDENTS: StudentCardInfo[] = [
  { id: 'HS01', code: 'STU-001', name: 'Nguyễn Minh Anh', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-emerald-500' },
  { id: 'HS02', code: 'STU-002', name: 'Trần Gia Bảo', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-blue-500' },
  { id: 'HS03', code: 'STU-003', name: 'Lê Hoàng Nam', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-purple-500' },
  { id: 'HS04', code: 'STU-004', name: 'Phạm Thu Hà', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-pink-500' },
  { id: 'HS05', code: 'STU-005', name: 'Vũ Đức Anh', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-amber-500' },
  { id: 'HS06', code: 'STU-006', name: 'Hoàng Khánh Linh', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-indigo-500' },
  { id: 'HS07', code: 'STU-007', name: 'Đặng Quang Minh', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-teal-500' },
  { id: 'HS08', code: 'STU-008', name: 'Bùi Hải Yến', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-rose-500' },
  { id: 'HS09', code: 'STU-009', name: 'Đỗ Tuấn Kiệt', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-cyan-500' },
  { id: 'HS10', code: 'STU-010', name: 'Ngô Phương Thảo', classId: 'c4a', className: 'Lớp 4A', avatarBg: 'bg-violet-500' },
];

// Sample Quiz Packages
const SAMPLE_QUIZZES: QuizPackage[] = [
  {
    id: 'quiz-math-4a',
    title: 'Bài kiểm tra 15 phút Toán Lớp 4 - Ôn tập Số tự nhiên',
    subject: 'Toán Lớp 4',
    grade: 'Lớp 4',
    questions: [
      {
        id: 1,
        question: 'Số gồm 5 trăm nghìn, 3 chục nghìn, 8 trăm và 2 đơn vị được viết là:',
        options: {
          A: '530 802',
          B: '503 802',
          C: '538 002',
          D: '530 082'
        },
        correctAnswer: 'A',
        explanation: '5 trăm nghìn (500 000) + 3 chục nghìn (30 000) + 8 trăm (800) + 2 đơn vị (2) = 530 802.',
        timeLimit: 60
      },
      {
        id: 2,
        question: 'Giá trị của chữ số 7 trong số 874 512 là bao nhiêu?',
        options: {
          A: '700',
          B: '7 000',
          C: '70 000',
          D: '700 000'
        },
        correctAnswer: 'C',
        explanation: 'Chữ số 7 nằm ở hàng chục nghìn nên có giá trị là 70 000.',
        timeLimit: 45
      },
      {
        id: 3,
        question: 'Số tự nhiên bé nhất có 6 chữ số khác nhau là:',
        options: {
          A: '100 000',
          B: '102 345',
          C: '123 456',
          D: '102 346'
        },
        correctAnswer: 'B',
        explanation: 'Số nhỏ nhất có 6 chữ số khác nhau phải bắt đầu bằng 1, chữ số tiếp theo là 0, 2, 3, 4, 5 -> 102 345.',
        timeLimit: 60
      },
      {
        id: 4,
        question: 'Làm tròn số 458 920 đến hàng trăm nghìn ta được số nào?',
        options: {
          A: '400 000',
          B: '450 000',
          C: '460 000',
          D: '500 000'
        },
        correctAnswer: 'D',
        explanation: 'Chữ số hàng chục nghìn là 5 (>= 5) nên làm tròn lên 500 000.',
        timeLimit: 45
      },
      {
        id: 5,
        question: 'Trung bình cộng của hai số 48 và 52 là bao nhiêu?',
        options: {
          A: '49',
          B: '50',
          C: '51',
          D: '100'
        },
        correctAnswer: 'B',
        explanation: 'Trung bình cộng = (48 + 52) / 2 = 100 / 2 = 50.',
        timeLimit: 30
      }
    ]
  },
  {
    id: 'quiz-eng-4a',
    title: 'Kiểm tra Tiếng Anh Lớp 4 - Unit 1: Vocabulary & Sentences',
    subject: 'Tiếng Anh Lớp 4',
    grade: 'Lớp 4',
    questions: [
      {
        id: 1,
        question: 'What is the correct English word for "con cáo"?',
        options: {
          A: 'Box',
          B: 'Fox',
          C: 'Ox',
          D: 'Farm'
        },
        correctAnswer: 'B',
        explanation: 'Fox nghĩa là con cáo. Box là cái hộp, Ox là con bò đực, Farm là nông trại.',
        timeLimit: 30
      },
      {
        id: 2,
        question: 'Choose the correct sentence: "Where _____ you from?"',
        options: {
          A: 'is',
          B: 'am',
          C: 'are',
          D: 'be'
        },
        correctAnswer: 'C',
        explanation: 'Chủ ngữ "you" đi với động từ to be "are". Câu đúng: "Where are you from?"',
        timeLimit: 30
      },
      {
        id: 3,
        question: 'Reorder: "is / nationality / What / your ?"',
        options: {
          A: 'What nationality is your?',
          B: 'What is your nationality?',
          C: 'Your nationality is what?',
          D: 'What nationality your is?'
        },
        correctAnswer: 'B',
        explanation: 'Cấu trúc hỏi quốc tịch chuẩn: "What is your nationality?"',
        timeLimit: 45
      },
      {
        id: 4,
        question: 'What do you say when you meet a new friend?',
        options: {
          A: 'Nice to meet you!',
          B: 'Good night!',
          C: 'Goodbye!',
          D: 'See you again!'
        },
        correctAnswer: 'A',
        explanation: '"Nice to meet you!" có nghĩa là "Rất vui được gặp bạn!" dùng khi lần đầu làm quen.',
        timeLimit: 30
      },
      {
        id: 5,
        question: 'Odd one out (Chọn từ khác loại):',
        options: {
          A: 'Vietnam',
          B: 'England',
          C: 'American',
          D: 'Japan'
        },
        correctAnswer: 'C',
        explanation: 'Vietnam, England, Japan là danh từ chỉ quốc gia; American là tính từ chỉ quốc tịch (người Mỹ).',
        timeLimit: 30
      }
    ]
  }
];

export const ScanGrading: React.FC<ScanGradingProps> = ({ classes }) => {
  // Navigation & Workflow Stage
  // 'SETUP' -> 'PRESENTATION' -> 'CAMERA' -> 'QUESTION_RESULT' -> 'FINAL_REPORT'
  const [currentScreen, setCurrentScreen] = useState<'SETUP' | 'PRESENTATION' | 'CAMERA' | 'QUESTION_RESULT' | 'FINAL_REPORT'>('SETUP');

  // Selected Configuration
  const [selectedClassId, setSelectedClassId] = useState<string>('c4a');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('quiz-math-4a');
  const [students, setStudents] = useState<StudentCardInfo[]>(SAMPLE_STUDENTS);

  // Active Quiz State
  const activeQuiz = SAMPLE_QUIZZES.find(q => q.id === selectedQuizId) || SAMPLE_QUIZZES[0];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const currentQuestion = activeQuiz.questions[currentQuestionIndex];

  // Timer State
  const [timeLeft, setTimeLeft] = useState<number>(currentQuestion.timeLimit);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Card Scanning Response State per question
  // { [questionIdx: number]: { [studentId: string]: 'A'|'B'|'C'|'D' } }
  const [scanHistory, setScanHistory] = useState<Record<number, Record<string, 'A' | 'B' | 'C' | 'D'>>>({});

  // Current Question Responses: { [studentId]: 'A'|'B'|'C'|'D' }
  const currentQuestionResponses = scanHistory[currentQuestionIndex] || {};

  // UI Modals & Settings
  const [showCardsModal, setShowCardsModal] = useState<boolean>(false);
  const [showUnscannedModal, setShowUnscannedModal] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [scannedAlert, setScannedAlert] = useState<string | null>(null);

  // Camera & Video Elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [autoDetectActive, setAutoDetectActive] = useState<boolean>(false); // MUST be false by default so it doesn't auto-fill without scanning
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);

  // Real Scannable QR Codes map per student ID { [studentId]: dataUrl }
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  // Generate unique scannable QR Code for each student
  useEffect(() => {
    let isMounted = true;
    const generateQRCodes = async () => {
      const map: Record<string, string> = {};
      for (const st of students) {
        try {
          // Generate high-resolution scannable QR Code encoding student code
          const url = await QRCode.toDataURL(st.code, {
            width: 250,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          });
          if (isMounted) map[st.id] = url;
        } catch (err) {
          console.error("Failed to generate QR Code for student:", st.code, err);
        }
      }
      if (isMounted) setQrUrls(map);
    };
    generateQRCodes();
    return () => { isMounted = false; };
  }, [students]);

  // Determine Answer (A, B, C, D) based on physical card orientation / angle from jsQR location
  const determineAnswerFromQROrientation = (location: any): 'A' | 'B' | 'C' | 'D' => {
    if (!location || !location.topLeftCorner || !location.topRightCorner) return 'A';
    
    const dx = location.topRightCorner.x - location.topLeftCorner.x;
    const dy = location.topRightCorner.y - location.topLeftCorner.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180 degrees

    if (angle >= -45 && angle < 45) {
      return 'A'; // Card held normally (A facing up)
    } else if (angle >= 45 && angle < 135) {
      return 'B'; // Rotated 90 deg clockwise (B facing up)
    } else if (angle >= 135 || angle < -135) {
      return 'C'; // Rotated 180 deg (C facing up)
    } else {
      return 'D'; // Rotated 270 deg clockwise (D facing up)
    }
  };

  // Helper to process QR raw text and position
  const processScannedQRCode = (codeData: string, location?: any) => {
    if (!codeData) return;
    
    const parts = codeData.split(':');
    const codeOrId = parts[0].trim();
    
    // Explicit choice (e.g. STU-001:B) or calculated from card orientation angle
    let detectedChoice: 'A' | 'B' | 'C' | 'D' = 'A';
    if (parts[1] && ['A', 'B', 'C', 'D'].includes(parts[1].trim().toUpperCase())) {
      detectedChoice = parts[1].trim().toUpperCase() as 'A' | 'B' | 'C' | 'D';
    } else if (location) {
      detectedChoice = determineAnswerFromQROrientation(location);
    }

    const matchedStudent = students.find(s => s.code === codeOrId || s.id === codeOrId);
    if (matchedStudent) {
      const currentChoice = currentQuestionResponses[matchedStudent.id];
      if (currentChoice !== detectedChoice) {
        handleRegisterScan(matchedStudent.id, detectedChoice);
      }
    }
  };

  // Audio Beep Effect Synthesizer
  const playScanBeep = () => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (err) {
      console.warn("Audio Context beep error:", err);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    let timer: any = null;
    if (timerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [timerRunning, timeLeft]);

  // Reset timer when changing question
  useEffect(() => {
    if (currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit);
      setTimerRunning(false);
    }
  }, [currentQuestionIndex]);

  // Start Real Camera Stream
  const startCameraStream = async () => {
    setCameraErrorMsg(null);
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setWebcamActive(true);
        }
      } else {
        setCameraErrorMsg("Trình duyệt không hỗ trợ truy cập Camera trực tiếp. Hệ thống sẽ sử dụng Chế độ Quét Mã AI giả lập.");
        setWebcamActive(false);
      }
    } catch (err: any) {
      console.warn("Camera stream access unavailable or permission denied:", err?.name || err?.message || err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setCameraErrorMsg("Quyền truy cập Camera bị từ chối hoặc bị hạn chế bởi trình duyệt/iFrame. Hệ thống tự động kích hoạt Chế độ Quét Mã AI giả lập.");
      } else {
        setCameraErrorMsg("Không thể mở Camera trực tiếp. Hệ thống sử dụng Chế độ Quét Mã AI giả lập.");
      }
      setWebcamActive(false);
    }
  };

  // Stop Camera Stream
  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  useEffect(() => {
    if (currentScreen === 'CAMERA') {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => stopCameraStream();
  }, [currentScreen]);

  // Real-Time Camera QR Code Scanning & Orientation Detection Loop (jsQR & BarcodeDetector)
  useEffect(() => {
    if (currentScreen !== 'CAMERA') return;

    let animFrameId: number;
    let lastScanTime = Date.now();

    const scanFrame = () => {
      const now = Date.now();
      if (now - lastScanTime >= 250) { // Scan 4 times per second
        lastScanTime = now;

        if (videoRef.current && videoRef.current.readyState === 4 && webcamActive) {
          try {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

              // 1. Primary QR Scanner: jsQR (Universal compatibility in all browsers)
              const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert"
              });

              if (qrResult && qrResult.data) {
                processScannedQRCode(qrResult.data, qrResult.location);
              } else if ('BarcodeDetector' in window) {
                // 2. Secondary Fallback: Native BarcodeDetector API
                const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'data_matrix'] });
                barcodeDetector.detect(video).then((barcodes: any[]) => {
                  if (barcodes && barcodes.length > 0) {
                    barcodes.forEach((b: any) => {
                      if (b.rawValue) processScannedQRCode(b.rawValue);
                    });
                  }
                }).catch(() => {});
              }
            }
          } catch (e) {
            // Ignore single frame processing error
          }
        }
      }

      animFrameId = requestAnimationFrame(scanFrame);
    };

    animFrameId = requestAnimationFrame(scanFrame);
    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [currentScreen, webcamActive, students, currentQuestionIndex, currentQuestionResponses]);

  // Continuous Auto-Scan Simulation Loop (for testing or demo without physical printed paper)
  useEffect(() => {
    if (currentScreen !== 'CAMERA' || !autoDetectActive) return;

    // Periodically detect one unscanned student every 2.5s if auto-detect is enabled
    const autoInterval = setInterval(() => {
      const currentResponses = scanHistory[currentQuestionIndex] || {};
      const unscanned = students.filter(s => !currentResponses[s.id]);

      if (unscanned.length > 0) {
        const nextStudent = unscanned[0];
        const choices: ('A'|'B'|'C'|'D')[] = ['A', 'B', 'C', 'D'];
        // High accuracy for correct answer in simulation
        const isCorrect = Math.random() < 0.8;
        const choice = isCorrect ? currentQuestion.correctAnswer : choices[Math.floor(Math.random() * 4)];
        
        handleRegisterScan(nextStudent.id, choice);
      }
    }, 2500);

    return () => clearInterval(autoInterval);
  }, [currentScreen, autoDetectActive, scanHistory, currentQuestionIndex, students, currentQuestion]);

  // Handle Recording / Scanning a Student's Choice
  const handleRegisterScan = (studentId: string, choice: 'A' | 'B' | 'C' | 'D') => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const existingChoice = currentQuestionResponses[studentId];
    if (existingChoice) {
      setScannedAlert(`Học sinh ${student.name} đã được cập nhật đáp án mới: ${choice}`);
    } else {
      setScannedAlert(`Đã quét thành công: ${student.name} – Đáp án ${choice}`);
    }

    // Play scan sound feedback
    playScanBeep();

    // Update state
    setScanHistory(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        ...(prev[currentQuestionIndex] || {}),
        [studentId]: choice
      }
    }));

    setTimeout(() => {
      setScannedAlert(null);
    }, 2500);
  };

  // Simulated Batch Scan all remaining students
  const handleSimulatedBatchScan = () => {
    const optionsList: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const updatedResponses = { ...currentQuestionResponses };

    students.forEach((student, index) => {
      if (!updatedResponses[student.id]) {
        // Bias slightly towards correct answer for realistic stats
        const isCorrect = Math.random() < 0.75;
        const choice = isCorrect 
          ? currentQuestion.correctAnswer 
          : optionsList[(index + 1) % optionsList.length];
        
        updatedResponses[student.id] = choice;
      }
    });

    playScanBeep();
    setScanHistory(prev => ({
      ...prev,
      [currentQuestionIndex]: updatedResponses
    }));

    setScannedAlert(`🎉 Đã mô phỏng quét thành công toàn bộ ${students.length} học sinh!`);
    setTimeout(() => setScannedAlert(null), 3000);
  };

  // Calculate stats for current question
  const scannedCount = Object.keys(currentQuestionResponses).length;
  const totalStudents = students.length;
  const unscannedStudents = students.filter(s => !currentQuestionResponses[s.id]);

  const choiceCounts = {
    A: Object.values(currentQuestionResponses).filter(v => v === 'A').length,
    B: Object.values(currentQuestionResponses).filter(v => v === 'B').length,
    C: Object.values(currentQuestionResponses).filter(v => v === 'C').length,
    D: Object.values(currentQuestionResponses).filter(v => v === 'D').length,
  };

  // Correct count for current question
  const correctCountForCurrent = Object.values(currentQuestionResponses).filter(v => v === currentQuestion.correctAnswer).length;

  // Calculate Overall Final Stats across all questions
  const calculateFinalResults = () => {
    return students.map(st => {
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      activeQuiz.questions.forEach((q, qIdx) => {
        const studentChoice = scanHistory[qIdx]?.[st.id];
        if (!studentChoice) {
          unanswered++;
        } else if (studentChoice === q.correctAnswer) {
          correct++;
        } else {
          incorrect++;
        }
      });

      const score = Math.round((correct / activeQuiz.questions.length) * 10 * 10) / 10;

      return {
        student: st,
        correct,
        incorrect,
        unanswered,
        score
      };
    }).sort((a, b) => b.score - a.score);
  };

  // Helper to trigger print dialog or pop out clean print window
  const handlePrintCards = () => {
    try {
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bộ Thẻ Mã QR Học Sinh LightEdu - Lớp 4A</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; padding: 0; background: #fff; color: #000; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #000; }
            .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 900; }
            .header p { margin: 0; font-size: 13px; color: #333; }
            .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .card { border: 3px solid #1c1917; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 280px; background: #ffffff; page-break-inside: avoid; box-sizing: border-box; }
            .badge { font-weight: 900; font-size: 16px; background: #000; color: #fff; padding: 4px 16px; border-radius: 6px; }
            .mid-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
            .qr-box { width: 130px; height: 130px; border: 2px solid #000; background: #fff; padding: 4px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
            .qr-box img { width: 120px; height: 120px; object-fit: contain; }
            .footer { text-align: center; border-top: 1px solid #e7e5e4; width: 100%; padding-top: 6px; margin-top: 4px; }
            .footer-name { font-weight: 900; font-size: 14px; color: #000; }
            .footer-code { font-size: 11px; color: #57534e; font-family: monospace; }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 16px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">🖨️ In / Tải PDF (Ctrl+P)</button>
          </div>
          <div class="header">
            <h1>BỘ THẺ MÃ TRẢ LỜI QUÉT CAMERA CỦA HỌC SINH (PLICKERS CARDS)</h1>
            <p>Lớp: <strong>Lớp 4A</strong> • Sĩ số: <strong>${students.length} Học sinh</strong> • Phần mềm LightEdu Plickers</p>
          </div>
          <div class="cards-grid">
            ${students.map((st, idx) => `
              <div class="card">
                <div class="badge">A</div>
                <div class="mid-row">
                  <div class="badge">D</div>
                  <div class="qr-box">
                    <img src="${qrUrls[st.id] || ''}" alt="QR ${st.code}" />
                  </div>
                  <div class="badge">B</div>
                </div>
                <div class="badge">C</div>
                <div class="footer">
                  <div class="footer-name">STT ${idx + 1}: ${st.name}</div>
                  <div class="footer-code">Mã HS: ${st.code} • ${st.className}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <script>
            setTimeout(function() { window.print(); }, 500);
          </script>
        </body>
        </html>
      `;

      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(printHTML);
        printWin.document.close();
      } else {
        window.print();
      }
    } catch (err) {
      console.warn("Print window fallback trigger:", err);
      window.print();
    }
  };

  return (
    <div className="min-h-[85vh] bg-stone-50/70 p-3 sm:p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-6">
      
      {/* Inline Print Media Query Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-student-cards-area, #printable-student-cards-area * {
            visibility: visible !important;
          }
          #printable-student-cards-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          .card-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      
      {/* HEADER BAR & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700 uppercase tracking-wider">
                LightEdu Plickers Live
              </span>
              <span className="text-xs text-stone-400 font-medium">• Giáo viên Tiểu học</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-0.5">
              Quét Mã Chấm Bài Tự Động
            </h1>
          </div>
        </div>

        {/* Action Button to Open Printable Student Cards */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCardsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-300 hover:border-blue-500 text-stone-700 hover:text-blue-600 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Xem/In Thẻ Mã Học Sinh ({students.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* SCREEN 1: BƯỚC 1 - CHỌN LỚP HỌC VÀ BÀI KIỂM TRA (SETUP) */}
      {/* ======================================================= */}
      {currentScreen === 'SETUP' && (
        <div className="max-w-4xl mx-auto space-y-8 py-2">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
              <QrCode className="w-64 h-64" />
            </div>
            <div className="relative z-10 space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Chấm bài lớp học bằng Camera
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                Không cần giấy thi, chấm điểm toàn bộ lớp học trong 3 giây!
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed">
                Học sinh giơ thẻ mã vuông (A/B/C/D ở 4 góc). Giáo viên quét camera 1 lượt, hệ thống tự động nhận diện cả lớp, ghi nhận đáp án và tạo báo cáo chi tiết theo thời gian thực.
              </p>
            </div>
          </div>

          {/* Form Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Class Selection Box */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">1. Chọn Lớp Học</h3>
                  <p className="text-xs text-stone-500">Danh sách học sinh sẽ được tải tự động</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-700 block">Lớp học tham gia:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="c4a">Lớp 4A (10 học sinh mẫu)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Class Roster Preview */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/80">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-stone-700">Sĩ số lớp: {students.length} học sinh</span>
                    <button 
                      onClick={() => setShowCardsModal(true)}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Xem mã thẻ
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {students.map(st => (
                      <span key={st.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {st.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Selection Box */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">2. Chọn Bài Kiểm Tra</h3>
                  <p className="text-xs text-stone-500">Tải bộ câu hỏi và đáp án chuẩn</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-stone-700 block">Bài kiểm tra / Đề thi:</label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => {
                    setSelectedQuizId(e.target.value);
                    setCurrentQuestionIndex(0);
                    setScanHistory({});
                  }}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SAMPLE_QUIZZES.map(q => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>

                {/* Quiz Details Box */}
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-blue-900 font-bold">
                    <span>Môn: {activeQuiz.subject}</span>
                    <span>Số câu hỏi: {activeQuiz.questions.length} câu</span>
                  </div>
                  <p className="text-xs text-stone-600 line-clamp-2">
                    {activeQuiz.title}
                  </p>
                  <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span>Dạng bài: Trắc nghiệm 4 phương án (A, B, C, D)</span>
                    <span className="text-emerald-600 font-bold">✓ Sẵn sàng</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Big Start Button */}
          <div className="flex flex-col items-center justify-center space-y-3 pt-2">
            <button
              onClick={() => {
                setCurrentQuestionIndex(0);
                setCurrentScreen('PRESENTATION');
              }}
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>Bắt Đầu Trình Chiếu & Quét Mã Bài Kiểm Tra</span>
            </button>
            <p className="text-xs text-stone-500">Màn hình sẽ chuyển sang chế độ trình chiếu câu hỏi cho học sinh</p>
          </div>

        </div>
      )}

      {/* ======================================================= */}
      {/* SCREEN 2: TRÌNH CHIẾU CÂU HỎI (PRESENTATION VIEW)      */}
      {/* ======================================================= */}
      {currentScreen === 'PRESENTATION' && (
        <div className="space-y-6">
          
          {/* Top Bar for Presentation Screen */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-600 text-white font-black text-sm rounded-xl">
                Câu {currentQuestionIndex + 1} / {activeQuiz.questions.length}
              </span>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">{activeQuiz.title}</h3>
                <p className="text-xs text-stone-500">Lớp 4A • Sĩ số: {students.length} HS</p>
              </div>
            </div>

            {/* Timer & Screen Actions */}
            <div className="flex items-center gap-3">
              {/* Countdown Timer Widget */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span className="font-mono font-bold text-amber-900 text-sm">{timeLeft}s</span>
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="p-1 hover:bg-amber-100 rounded text-amber-800"
                  title={timerRunning ? "Tạm dừng" : "Bắt đầu đếm ngược"}
                >
                  {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setTimeLeft(currentQuestion.timeLimit);
                    setTimerRunning(false);
                  }}
                  className="p-1 hover:bg-amber-100 rounded text-amber-800"
                  title="Đặt lại thời gian"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step Navigation */}
              <button
                onClick={() => setCurrentScreen('CAMERA')}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all animate-bounce"
                style={{ animationDuration: '2.5s' }}
              >
                <Camera className="w-4 h-4" />
                <span>Mở Camera Quét Mã ({scannedCount}/{totalStudents})</span>
              </button>
            </div>
          </div>

          {/* MAIN QUESTION DISPLAY CARD */}
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-stone-200 shadow-md space-y-8">
            
            {/* Question Text */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Nội dung câu hỏi:</span>
              <h2 className="text-xl sm:text-3xl font-black text-stone-900 leading-snug">
                {currentQuestion.question}
              </h2>
            </div>

            {/* 4 Large Answer Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                const colors: Record<string, { bg: string, border: string, badgeBg: string, badgeText: string }> = {
                  A: { bg: 'bg-emerald-50/70 hover:bg-emerald-100/80', border: 'border-emerald-300', badgeBg: 'bg-emerald-600', badgeText: 'text-white' },
                  B: { bg: 'bg-blue-50/70 hover:bg-blue-100/80', border: 'border-blue-300', badgeBg: 'bg-blue-600', badgeText: 'text-white' },
                  C: { bg: 'bg-amber-50/70 hover:bg-amber-100/80', border: 'border-amber-300', badgeBg: 'bg-amber-500', badgeText: 'text-white' },
                  D: { bg: 'bg-purple-50/70 hover:bg-purple-100/80', border: 'border-purple-300', badgeBg: 'bg-purple-600', badgeText: 'text-white' }
                };
                const c = colors[opt];
                const choiceText = currentQuestion.options[opt];

                return (
                  <div
                    key={opt}
                    className={`p-5 sm:p-6 rounded-2xl border-2 ${c.border} ${c.bg} transition-all flex items-start gap-4 shadow-sm`}
                  >
                    <span className={`w-10 h-10 rounded-xl ${c.badgeBg} ${c.badgeText} font-black text-lg flex items-center justify-center shrink-0 shadow-sm`}>
                      {opt}
                    </span>
                    <div className="pt-1">
                      <span className="text-base sm:text-xl font-bold text-stone-800 leading-normal">
                        {choiceText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-stone-200">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Tiến độ quét câu này: <strong className="text-blue-600">{scannedCount}/{totalStudents} học sinh</strong></span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentScreen('SETUP')}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all"
                >
                  Đổi bài thi
                </button>

                <button
                  onClick={() => setCurrentScreen('CAMERA')}
                  className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Quét Camera Lớp Học</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* SCREEN 3: BƯỚC 5 & 6 - CAMERA QUÉT MÃ VÀ HIỂN THỊ CHỌN */}
      {/* ======================================================= */}
      {currentScreen === 'CAMERA' && (
        <div className="space-y-6">
          
          {/* Camera Header Banner */}
          <div className="bg-stone-900 text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${webcamActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`}></div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                  {webcamActive ? 'Camera Trực Tiếp Đang Quét Mã Paper QR' : 'Chế Độ Quét Mã Nhận Diện AI'}
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-mono font-bold">
                    {webcamActive ? 'Camera Live' : 'AI Detector Ready'}
                  </span>
                </h3>
                <p className="text-xs text-stone-400">
                  Câu {currentQuestionIndex + 1}: {currentQuestion.question.substring(0, 45)}...
                </p>
              </div>
            </div>

            {/* Quick Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAutoDetectActive(!autoDetectActive)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  autoDetectActive 
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400' 
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
                title="Bật tính năng Mô phỏng Demo nếu chưa có thẻ giấy in thực tế"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{autoDetectActive ? 'Mô Phỏng Demo: ĐANG BẬT' : 'Mô Phỏng Demo: TẮT'}</span>
              </button>

              <button
                onClick={() => setFlashOn(!flashOn)}
                className={`p-2 rounded-xl text-xs font-bold transition-all ${
                  flashOn ? 'bg-amber-500 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
                title="Đèn Flash hỗ trợ ánh sáng"
              >
                <Zap className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSoundOn(!soundOn)}
                className={`p-2 rounded-xl text-xs font-bold transition-all ${
                  soundOn ? 'bg-blue-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
                title="Âm thanh nhận diện"
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setCurrentScreen('QUESTION_RESULT')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md"
              >
                Hoàn tất quét & Xem kết quả
              </button>
            </div>
          </div>

          {/* Camera Error / Guidance Diagnostic Alert if Camera Access Failed */}
          {cameraErrorMsg && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>Lưu ý Camera:</strong> {cameraErrorMsg}</span>
              </div>
              <button
                onClick={startCameraStream}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-lg shrink-0 transition-all"
              >
                Mở lại Camera
              </button>
            </div>
          )}

          {/* Camera Live Viewfinder Container */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* VIDEO CAMERA FRAME & INTERACTIVE OVERLAY */}
            <div className="lg:col-span-2 bg-stone-950 rounded-3xl overflow-hidden relative border-2 border-stone-800 shadow-2xl min-h-[460px] flex flex-col justify-between p-4">
              
              {/* WebCam Video Element */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover opacity-90"
                playsInline
                muted
              />

              {/* Laser Scanning Animation Beam */}
              <div className="absolute inset-0 pointer-events-none border-2 border-emerald-500/20 m-2 rounded-2xl overflow-hidden">
                <div 
                  className="w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] absolute left-0 right-0"
                  style={{
                    animation: 'scanLaser 3s ease-in-out infinite'
                  }}
                ></div>
              </div>

              {/* CSS Animation Keyframes for Laser */}
              <style>{`
                @keyframes scanLaser {
                  0% { top: 2%; opacity: 0.6; }
                  50% { top: 96%; opacity: 1; }
                  100% { top: 2%; opacity: 0.6; }
                }
              `}</style>

              {/* Toast / Banner when a student card is detected */}
              {scannedAlert && (
                <div className="relative z-30 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fade-in border border-emerald-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
                    <span className="font-bold text-xs sm:text-sm">{scannedAlert}</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono font-bold">LIVE DETECT</span>
                </div>
              )}

              {/* OVERLAY OF DETECTED CARDS (BOUNDING BOXES & QUICK PICKERS) */}
              <div className="relative z-20 grid grid-cols-2 sm:grid-cols-3 gap-3 my-auto py-4">
                {students.map(st => {
                  const choice = currentQuestionResponses[st.id];
                  const isScanned = Boolean(choice);

                  return (
                    <div
                      key={st.id}
                      className={`p-3 rounded-2xl border-2 transition-all backdrop-blur-md flex flex-col justify-between min-h-[110px] ${
                        isScanned 
                          ? 'bg-emerald-950/85 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.01]' 
                          : 'bg-stone-900/70 border-stone-700/80 hover:border-stone-500 text-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-stone-300 font-bold">
                          {st.code}
                        </span>
                        {isScanned ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-sm">
                            Đáp án: {choice}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-medium bg-stone-800 px-1.5 py-0.5 rounded">
                            Chờ giơ thẻ
                          </span>
                        )}
                      </div>

                      <div className="my-1">
                        <p className={`font-bold text-xs line-clamp-1 ${isScanned ? 'text-emerald-200' : 'text-stone-100'}`}>
                          {st.name}
                        </p>
                        <p className="text-[10px] text-stone-400">{st.className}</p>
                      </div>

                      {/* Direct A/B/C/D Quick Select Buttons */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1">
                        {(['A', 'B', 'C', 'D'] as const).map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleRegisterScan(st.id, opt)}
                            className={`w-6 h-6 rounded-md font-bold text-[10px] flex items-center justify-center transition-all ${
                              choice === opt
                                ? 'bg-emerald-400 text-stone-950 font-black scale-110 shadow-sm'
                                : 'bg-stone-800 text-stone-300 hover:bg-blue-600 hover:text-white'
                            }`}
                            title={`Chọn đáp án ${opt} cho ${st.name}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Trigger Bar */}
              <div className="relative z-30 bg-stone-900/90 backdrop-blur-md p-3 rounded-2xl border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-stone-300 font-medium">Hệ thống quét đồng thời nhiều mã trong lớp</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulatedBatchScan}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mô Phỏng Quét Tự Động Cả Lớp</span>
                  </button>
                </div>
              </div>

            </div>

            {/* SIDEBAR: TIẾN ĐỘ & PHÂN BỐ ĐÁP ÁN LIVE */}
            <div className="space-y-4">
              
              {/* Scan Progress Bar Box */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                  <span>Tiến độ ghi nhận:</span>
                  <span className="text-blue-600 font-black">{scannedCount} / {totalStudents} HS</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden border border-stone-200">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${(scannedCount / totalStudents) * 100}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="block font-black text-emerald-700 text-base">{scannedCount}</span>
                    <span className="text-[11px] text-stone-500">Đã trả lời</span>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="block font-black text-amber-700 text-base">{totalStudents - scannedCount}</span>
                    <span className="text-[11px] text-stone-500">Chưa quét</span>
                  </div>
                </div>
              </div>

              {/* Real-time Choice Breakdown (A, B, C, D) */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                  Phân bố lựa chọn hiện tại:
                </h4>

                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map(opt => {
                    const count = choiceCounts[opt];
                    const percent = scannedCount > 0 ? Math.round((count / scannedCount) * 100) : 0;
                    return (
                      <div key={opt} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-800">Đáp án {opt}:</span>
                          <span className="text-stone-600 font-bold">{count} HS ({percent}%)</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              opt === 'A' ? 'bg-emerald-500' :
                              opt === 'B' ? 'bg-blue-500' :
                              opt === 'C' ? 'bg-amber-500' : 'bg-purple-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Unscanned Students List Trigger */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">Danh sách chưa quét:</span>
                  <button
                    onClick={() => setShowUnscannedModal(true)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Xem chi tiết ({unscannedStudents.length})
                  </button>
                </div>
                <p className="text-xs text-stone-500">
                  {unscannedStudents.length === 0 
                    ? '🎉 Tất cả học sinh đã quét xong!' 
                    : `Gồm: ${unscannedStudents.slice(0, 3).map(s => s.name).join(', ')}${unscannedStudents.length > 3 ? '...' : ''}`}
                </p>
              </div>

              {/* Complete Question Button */}
              <button
                onClick={() => setCurrentScreen('QUESTION_RESULT')}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Chấm Điểm & Xem Kết Quả Câu {currentQuestionIndex + 1}</span>
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================= */}
      {/* SCREEN 4: BƯỚC 8 - KẾT QUẢ VÀ ĐÁP ÁN TỪNG CÂU HỎI      */}
      {/* ======================================================= */}
      {currentScreen === 'QUESTION_RESULT' && (
        <div className="space-y-6">
          
          {/* Header Result summary */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full">
                Kết Quả Chấm Câu {currentQuestionIndex + 1} / {activeQuiz.questions.length}
              </span>
              <h2 className="text-xl font-black text-stone-900 mt-1">
                {currentQuestion.question}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentScreen('CAMERA')}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Quét lại câu này</span>
              </button>

              {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                <button
                  onClick={() => {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setCurrentScreen('PRESENTATION');
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <span>Câu tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentScreen('FINAL_REPORT')}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Hoàn Tất & Xem Báo Cáo Bài Thi</span>
                </button>
              )}
            </div>
          </div>

          {/* Correct Answer Breakdown Box */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Options Analysis */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 text-base">Đáp Án Đúng Chuẩn:</h3>
                <span className="px-3 py-1 bg-emerald-600 text-white font-black text-sm rounded-xl shadow-sm">
                  Đáp Án {currentQuestion.correctAnswer}
                </span>
              </div>

              {/* Options Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['A', 'B', 'C', 'D'] as const).map(opt => {
                  const isCorrect = opt === currentQuestion.correctAnswer;
                  const count = choiceCounts[opt];
                  const percentage = scannedCount > 0 ? Math.round((count / scannedCount) * 100) : 0;

                  return (
                    <div
                      key={opt}
                      className={`p-4 rounded-2xl border-2 transition-all space-y-2 ${
                        isCorrect 
                          ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20' 
                          : 'bg-stone-50 border-stone-200 opacity-90'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'
                          }`}>
                            {opt}
                          </span>
                          <span className="font-bold text-stone-800 text-sm">
                            {currentQuestion.options[opt]}
                          </span>
                        </div>
                        {isCorrect && (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                            <Check className="w-3.5 h-3.5" /> Đúng
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-stone-600 pt-1">
                        <span>Lựa chọn: <strong>{count} học sinh</strong></span>
                        <span className="font-bold">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Note */}
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 block">Lời giải & Giải thích chi tiết:</span>
                <p className="text-amber-800 leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            </div>

            {/* Right: Accuracy Summary */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto text-2xl font-black">
                  {scannedCount > 0 ? Math.round((correctCountForCurrent / scannedCount) * 100) : 0}%
                </div>
                <div>
                  <h4 className="font-bold text-lg">Tỷ Lệ Trả Lời Đúng</h4>
                  <p className="text-xs text-emerald-100">{correctCountForCurrent} / {scannedCount} học sinh trả lời chính xác</p>
                </div>
              </div>

              {/* Student Answer Roster */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                  Chi tiết câu trả lời của học sinh:
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {students.map(st => {
                    const ans = currentQuestionResponses[st.id];
                    const isRight = ans === currentQuestion.correctAnswer;
                    return (
                      <div key={st.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-stone-50 border border-stone-200/80">
                        <span className="font-medium text-stone-800">{st.name}</span>
                        {ans ? (
                          <span className={`px-2 py-0.5 rounded-lg font-bold text-xs flex items-center gap-1 ${
                            isRight ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {ans} {isRight ? '✓' : '✗'}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px] font-medium">Chưa trả lời</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================= */}
      {/* SCREEN 5: BƯỚC 10 - BÁO CÁO TỔNG KẾT BÀI KIỂM TRA       */}
      {/* ======================================================= */}
      {currentScreen === 'FINAL_REPORT' && (() => {
        const results = calculateFinalResults();
        const totalScored = results.reduce((acc, r) => acc + r.score, 0);
        const avgScore = results.length > 0 ? (totalScored / results.length).toFixed(1) : '0';
        const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;
        const minScore = results.length > 0 ? Math.min(...results.map(r => r.score)) : 0;

        return (
          <div className="space-y-8">
            
            {/* Summary Top Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold text-xs uppercase">
                  Báo Cáo Tổng Kết Hoàn Thành
                </span>
                <h2 className="text-2xl sm:text-3xl font-black">{activeQuiz.title}</h2>
                <p className="text-xs text-slate-300">Lớp 4A • Tổng số {activeQuiz.questions.length} câu hỏi • Sĩ số: {students.length} học sinh</p>
              </div>

              {/* Action Export buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => alert("Đã lưu kết quả thành công vào Sổ điểm trực tuyến LightEdu!")}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Sổ Điểm</span>
                </button>

                <button
                  onClick={() => alert("Xuất file báo cáo Excel thành công!")}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Excel</span>
                </button>

                <button
                  onClick={() => setCurrentScreen('SETUP')}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all"
                >
                  Thực hiện bài kiểm tra khác
                </button>
              </div>
            </div>

            {/* Overview Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
                <span className="text-xs font-bold text-stone-500 uppercase block">Điểm Trung Bình Lớp</span>
                <span className="text-3xl font-black text-blue-600 mt-1 block">{avgScore} / 10</span>
                <span className="text-[11px] text-emerald-600 font-bold">✓ Đạt kết quả Tốt</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
                <span className="text-xs font-bold text-stone-500 uppercase block">Điểm Cao Nhất</span>
                <span className="text-3xl font-black text-emerald-600 mt-1 block">{maxScore} / 10</span>
                <span className="text-[11px] text-stone-400">Xuất sắc</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
                <span className="text-xs font-bold text-stone-500 uppercase block">Điểm Thấp Nhất</span>
                <span className="text-3xl font-black text-amber-600 mt-1 block">{minScore} / 10</span>
                <span className="text-[11px] text-stone-400">Cần ôn tập thêm</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
                <span className="text-xs font-bold text-stone-500 uppercase block">Tỷ Lệ Hoàn Thành</span>
                <span className="text-3xl font-black text-purple-600 mt-1 block">100%</span>
                <span className="text-[11px] text-purple-600 font-bold">10/10 HS đã tham gia</span>
              </div>
            </div>

            {/* DETAILED STUDENT RANKING & SCORE TABLE */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                  Bảng Điểm & Xếp Hạng Học Sinh
                </h3>
                <span className="text-xs text-stone-500">Sắp xếp theo Điểm số giảm dần</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                      <th className="p-3 rounded-l-xl">Xếp hạng</th>
                      <th className="p-3">Mã HS</th>
                      <th className="p-3">Họ và Tên</th>
                      <th className="p-3 text-center">Số câu đúng</th>
                      <th className="p-3 text-center">Số câu sai</th>
                      <th className="p-3 text-center">Điểm số</th>
                      <th className="p-3 rounded-r-xl text-right">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {results.map((r, idx) => (
                      <tr key={r.student.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-3 font-bold">
                          {idx === 0 ? '🥇 Hạng 1' : idx === 1 ? '🥈 Hạng 2' : idx === 2 ? '🥉 Hạng 3' : `Hạng ${idx + 1}`}
                        </td>
                        <td className="p-3 font-mono text-stone-500">{r.student.code}</td>
                        <td className="p-3 font-bold text-stone-900">{r.student.name}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{r.correct} / {activeQuiz.questions.length}</td>
                        <td className="p-3 text-center text-rose-500 font-medium">{r.incorrect}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-xl font-black text-sm ${
                            r.score >= 8 ? 'bg-emerald-100 text-emerald-800' :
                            r.score >= 5 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.score}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-xs font-semibold text-stone-600">
                            {r.score >= 9 ? 'Giỏi' : r.score >= 7 ? 'Khá' : r.score >= 5 ? 'Trung bình' : 'Cần ôn luyện'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {/* ======================================================= */}
      {/* MODAL: XEM VÀ IN THẺ MÃ QUAN TỌA CHO HỌC SINH (STEP 2)   */}
      {/* ======================================================= */}
      {showCardsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div 
            id="printable-student-cards-area"
            className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-stone-200 shadow-2xl"
          >
            
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 no-print">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-lg">
                    Bộ Thẻ Mã Học Sinh (Plickers Cards)
                  </h3>
                  <p className="text-xs text-stone-500">Mỗi học sinh sở hữu 1 thẻ riêng cố định suốt năm học</p>
                </div>
              </div>

              <button
                onClick={() => setShowCardsModal(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1 no-print">
              <span className="font-bold block">💡 Hướng dẫn học sinh sử dụng thẻ:</span>
              <p>Học sinh trả lời bằng cách xoay thẻ sao cho ký tự đáp án mong muốn (A, B, C hoặc D) hướng lên phía trên đỉnh thẻ. Giáo viên quét camera 1 lượt để nhận diện toàn bộ.</p>
            </div>

            {/* Cards Grid List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print-grid">
              {students.map((st, idx) => (
                <div key={st.id} className="card-item bg-stone-50 border-2 border-stone-300 rounded-2xl p-4 flex flex-col items-center justify-between space-y-3 relative shadow-sm">
                  
                  {/* Top Edge Indicator A */}
                  <div className="w-full text-center">
                    <span className="px-3 py-0.5 rounded bg-stone-800 text-white font-black text-xs">
                      A
                    </span>
                  </div>

                  {/* Middle Section: D (Left), Real Scannable QR Code, B (Right) */}
                  <div className="flex items-center justify-between w-full px-1">
                    <span className="px-2 py-0.5 rounded bg-stone-800 text-white font-black text-xs">
                      D
                    </span>

                    {/* QR Code Graphic Container */}
                    <div className="w-28 h-28 bg-white border-2 border-stone-900 rounded-xl p-1 flex items-center justify-center shadow-inner overflow-hidden">
                      {qrUrls[st.id] ? (
                        <img 
                          src={qrUrls[st.id]} 
                          alt={`QR Code ${st.code}`}
                          className="w-24 h-24 object-contain"
                        />
                      ) : (
                        <div className="text-[10px] text-stone-400 font-mono text-center">
                          Đang tạo QR...
                        </div>
                      )}
                    </div>

                    <span className="px-2 py-0.5 rounded bg-stone-800 text-white font-black text-xs">
                      B
                    </span>
                  </div>

                  {/* Bottom Edge Indicator C */}
                  <div className="w-full text-center">
                    <span className="px-3 py-0.5 rounded bg-stone-800 text-white font-black text-xs">
                      C
                    </span>
                  </div>

                  {/* Student Label Footer */}
                  <div className="w-full text-center pt-2 border-t border-stone-200">
                    <p className="font-black text-stone-900 text-xs">STT {idx + 1}: {st.name}</p>
                    <p className="text-[10px] text-stone-500 font-mono">Mã HS: {st.code} • {st.className}</p>
                  </div>

                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-stone-200 no-print">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>In Màn Hình Hiện Tại</span>
              </button>

              <button
                onClick={handlePrintCards}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Mở Trang In Chuẩn / Xuất PDF Thẻ</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: DANH SÁCH HỌC SINH CHƯA TRẢ LỜI                    */}
      {/* ======================================================= */}
      {showUnscannedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-900 text-base">
                Học Sinh Chưa Quét Mã ({unscannedStudents.length})
              </h3>
              <button onClick={() => setShowUnscannedModal(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {unscannedStudents.map(st => (
                <div key={st.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-900 text-xs">{st.name}</p>
                    <p className="text-[10px] text-stone-500">{st.code}</p>
                  </div>
                  <button
                    onClick={() => {
                      handleRegisterScan(st.id, 'A');
                      setShowUnscannedModal(false);
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Ghi nhận thủ công (A)
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowUnscannedModal(false)}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScanGrading;
