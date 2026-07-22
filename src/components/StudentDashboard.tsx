import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, BookOpen, FileText, BarChart2, Calendar, Trophy, Medal, Bell, User, Settings,
  LogOut, Calculator, Languages, Search, ChevronDown, ArrowRight, ShieldCheck, 
  Menu, X, Sparkles, BrainCircuit, Loader2, School, CheckCircle, ChevronRight,
  TrendingUp, Award, BookOpenCheck, Bookmark, Flame, Coins, Target, GraduationCap, Crown,
  Volume2, VolumeX
} from 'lucide-react';
import { Subject, SUBJECTS, Assignment, UserProfile, QuizResult, PREDEFINED_TOPICS, ClassRoom } from '../types';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, orderBy, limit, setDoc } from 'firebase/firestore';
import { analyzeStudentPerformance, getStudyAdvice } from '../services/gemini';
import { formatMathSymbols } from '../services/mathUtils';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { TransparentImage } from './Login';
// @ts-ignore
import studentBoyPng from '../assets/images/student_boy.png';
// @ts-ignore
import studentGirlPng from '../assets/images/student_girl.png';
// @ts-ignore
import studentAvatarJpg from '../assets/images/student_boy_avatar_1783521150254.jpg';
// @ts-ignore
import studentBannerJpg from '../assets/images/student_studying_banner_1783521112135.jpg';
// @ts-ignore
import studentSidebarIllustrationJpg from '../assets/images/student_laptop_sidebar_1783521130823.jpg';

interface StudentDashboardProps {
  userProfile: UserProfile;
  onSelectSubject: (subject: Subject, topic?: string, count?: number, difficulty?: string) => void;
  onSelectAssignment: (assignment: Assignment) => void;
  onViewHistory: () => void;
}

// Cute illustrations for selection screen matching mock
const CuteRobotSVG = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 md:w-20 md:h-20 drop-shadow-md shrink-0">
    <rect x="25" y="30" width="50" height="40" rx="15" fill="#E2E8F0" stroke="#3B82F6" strokeWidth="4" />
    <rect x="30" y="35" width="40" height="25" rx="10" fill="#1E293B" />
    <circle cx="42" cy="47" r="5" fill="#38BDF8" className="animate-pulse" />
    <circle cx="58" cy="47" r="5" fill="#38BDF8" className="animate-pulse" />
    <rect x="35" y="70" width="30" height="15" rx="5" fill="#CBD5E1" stroke="#3B82F6" strokeWidth="3" />
    <path d="M50 15 L80 25 L50 35 L20 25 Z" fill="#1E293B" />
    <rect x="47" y="25" width="6" height="6" fill="#1E293B" />
    <path d="M75 24 L78 38 L81 38" stroke="#F59E0B" strokeWidth="2" fill="none" />
    <path d="M35 73 Q50 78 65 73 L65 85 Q50 88 35 85 Z" fill="#3B82F6" />
    <path d="M38 75 Q50 79 62 75 L62 83 Q50 86 38 83 Z" fill="#FFFFFF" />
  </svg>
);

const CuteCalculatorSVG = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-lg">
    <g fill="#FBBF24">
      <path d="M12 12 L15 18 L21 15 L17 10 Z" />
      <path d="M100 15 L104 22 L111 18 L106 13 Z" />
      <path d="M95 95 L99 101 L105 97 L101 92 Z" />
    </g>
    <rect x="25" y="20" width="70" height="85" rx="18" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="4" />
    <rect x="35" y="32" width="50" height="22" rx="8" fill="#3B82F6" />
    <text x="60" y="48" fill="#FFFFFF" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="monospace">123</text>
    <rect x="36" y="62" width="12" height="10" rx="3" fill="#93C5FD" />
    <rect x="54" y="62" width="12" height="10" rx="3" fill="#93C5FD" />
    <rect x="72" y="62" width="12" height="10" rx="3" fill="#93C5FD" />
    <rect x="36" y="77" width="12" height="10" rx="3" fill="#93C5FD" />
    <rect x="54" y="77" width="12" height="10" rx="3" fill="#93C5FD" />
    <rect x="72" y="77" width="12" height="10" rx="3" fill="#3B82F6" />
    <circle cx="85" cy="15" r="4" fill="#60A5FA" />
    <circle cx="15" cy="85" r="5" fill="#34D399" />
    <polygon points="12,45 22,55 12,65" fill="#F87171" opacity="0.8" />
    <polygon points="105,65 115,75 105,85" fill="#60A5FA" opacity="0.8" />
  </svg>
);

const CuteBookSVG = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-lg">
    <g fill="#FBBF24">
      <path d="M15 15 L18 21 L24 18 L20 13 Z" />
      <path d="M102 20 L106 27 L113 23 L108 18 Z" />
    </g>
    <path d="M20 35 Q60 25 100 35 L100 95 Q60 85 20 95 Z" fill="#10B981" />
    <path d="M22 32 Q60 22 60 90 L22 90 Z" fill="#FFFFFF" stroke="#059669" strokeWidth="2" />
    <path d="M98 32 Q60 22 60 90 L98 90 Z" fill="#F0FDF4" stroke="#059669" strokeWidth="2" />
    <text x="40" y="68" fill="#EF4444" fontSize="30" fontWeight="900" fontFamily="sans-serif">Aa</text>
    <line x1="68" y1="48" x2="90" y2="48" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
    <line x1="68" y1="58" x2="85" y2="58" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
    <line x1="68" y1="68" x2="90" y2="68" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
    <circle cx="10" cy="80" r="5" fill="#F59E0B" />
    <circle cx="110" cy="70" r="4" fill="#3B82F6" />
  </svg>
);

const CuteEnglishSVG = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24 drop-shadow-lg">
    <g fill="#FBBF24">
      <path d="M18 10 L21 16 L27 13 L23 8 Z" />
      <path d="M98 95 L102 101 L108 97 L104 92 Z" />
    </g>
    <text x="15" y="70" fill="#FF8A65" fontSize="48" fontWeight="900" fontFamily="sans-serif" stroke="#E64A19" strokeWidth="3" paintOrder="stroke fill">A</text>
    <text x="50" y="65" fill="#FFD54F" fontSize="56" fontWeight="900" fontFamily="sans-serif" stroke="#F57F17" strokeWidth="3" paintOrder="stroke fill">B</text>
    <text x="82" y="80" fill="#F06292" fontSize="46" fontWeight="900" fontFamily="sans-serif" stroke="#C2185B" strokeWidth="3" paintOrder="stroke fill">C</text>
    <circle cx="10" cy="95" r="4" fill="#4ADE80" />
    <circle cx="110" cy="20" r="5" fill="#60A5FA" />
  </svg>
);

const StackedBooksSVG = () => (
  <svg viewBox="0 0 60 50" className="w-12 h-10 drop-shadow-sm">
    <path d="M5 25 Q30 18 55 25 L55 35 Q30 28 55 35 Z" fill="#1D4ED8" />
    <path d="M5 35 Q30 28 55 35" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
    <path d="M7 15 Q30 8 53 15 L53 25 Q30 18 7 25 Z" fill="#3B82F6" />
    <path d="M7 25 Q30 18 53 25" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
    <polygon points="30,13 32,17 36,17 33,20 34,24 30,22 26,24 27,20 24,17 28,17" fill="#FBBF24" />
  </svg>
);

const ClipboardSVG = () => (
  <svg viewBox="0 0 50 50" className="w-10 h-10 drop-shadow-sm">
    <rect x="12" y="8" width="26" height="34" rx="4" fill="#EEF2F6" stroke="#818CF8" strokeWidth="3" />
    <rect x="20" y="5" width="10" height="5" rx="2" fill="#4F46E5" />
    <circle cx="18" cy="18" r="2" fill="#4F46E5" />
    <line x1="23" y1="18" x2="33" y2="18" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="18" cy="26" r="2" fill="#4F46E5" />
    <line x1="23" y1="26" x2="33" y2="26" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="18" cy="34" r="2" fill="#4F46E5" />
    <line x1="23" y1="34" x2="33" y2="34" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const CuteSparkleMini = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-pulse text-amber-400`} style={{ animationDuration: '2s' }}>
    <path d="M12 2C12 2 12.5 8.5 14 10C15.5 11.5 22 12 22 12C22 12 15.5 12.5 14 14C12.5 15.5 12 22 12 22C12 22 11.5 15.5 10 14C8.5 12.5 2 12 2 12C2 12 8.5 11.5 10 10C11.5 8.5 12 2 12 2Z" fill="currentColor" />
  </svg>
);

const CuteSmallStar = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-bounce text-yellow-400`} style={{ animationDuration: '2.5s' }}>
    <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.62L12 2L9.19 8.62L2 9.24L7.45 13.97L5.82 21L12 17.27Z" fill="currentColor" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CutePencilMini = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`${className} text-orange-400 rotate-[-15deg] drop-shadow-sm`} style={{ animationDuration: '3s' }}>
    <path d="M13.5 3.5L16 6L6 16H3.5V13.5L13.5 3.5Z" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 13.5L6 16" stroke="#EA580C" strokeWidth="1.5" />
    <path d="M13.5 3.5L16 6" stroke="#EA580C" strokeWidth="1.5" />
    <path d="M16 6L18 8C18.5 8.5 18.5 9.5 18 10L17 11" stroke="#EA580C" strokeWidth="1.5" />
    <path d="M15 5L17.5 7.5" stroke="#EA580C" strokeWidth="1" />
  </svg>
);

const CuteRulerMini = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`${className} text-sky-400 rotate-[25deg] drop-shadow-sm`}>
    <rect x="2" y="8" width="20" height="8" rx="2" fill="#BAE6FD" stroke="#0284C7" strokeWidth="1.5" />
    <line x1="6" y1="8" x2="6" y2="12" stroke="#0284C7" strokeWidth="1.5" />
    <line x1="10" y1="8" x2="10" y2="11" stroke="#0284C7" strokeWidth="1.5" />
    <line x1="14" y1="8" x2="14" y2="12" stroke="#0284C7" strokeWidth="1.5" />
    <line x1="18" y1="8" x2="18" y2="11" stroke="#0284C7" strokeWidth="1.5" />
  </svg>
);

const CuteLightbulbMini = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`${className} text-yellow-300 animate-pulse`} style={{ animationDuration: '1.8s' }}>
    <path d="M9 21H15" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 18H14" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17H16V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" fill="#FEF08A" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 9H14" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 7V11" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const RocketSVG = () => (
  <svg viewBox="0 0 50 50" className="w-10 h-10 drop-shadow-sm animate-bounce" style={{ animationDuration: '3s' }}>
    <path d="M25 35 Q22 43 18 45 Q25 42 25 35" fill="#EF4444" />
    <path d="M25 35 Q28 43 32 45 Q25 42 25 35" fill="#F59E0B" />
    <path d="M25 5 Q35 20 32 35 L18 35 Q15 20 25 5" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
    <path d="M25 5 Q31 14 25 18 Q19 14 25 5" fill="#10B981" />
    <path d="M18 28 L12 35 L18 35 Z" fill="#059669" />
    <path d="M32 28 L38 35 L32 35 Z" fill="#059669" />
    <circle cx="25" cy="22" r="3" fill="#60A5FA" stroke="#10B981" strokeWidth="1.5" />
  </svg>
);

const getTopicIcon = (subject: string, isCompleted: boolean) => {
  if (subject.startsWith('Toán')) {
    return (
      <div className={`p-2.5 rounded-2xl ${isCompleted ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-blue-100 text-blue-600 border border-blue-200'} shrink-0 relative transition-transform hover:scale-110 duration-200`}>
        <Calculator className="w-5 h-5" />
        <CuteSparkleMini className="absolute -top-1 -right-1 w-3.5 h-3.5" />
      </div>
    );
  } else if (subject.startsWith('Tiếng Việt')) {
    return (
      <div className={`p-2.5 rounded-2xl ${isCompleted ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'} shrink-0 relative transition-transform hover:scale-110 duration-200`}>
        <BookOpen className="w-5 h-5" />
        <CuteSparkleMini className="absolute -top-1 -right-1 w-3.5 h-3.5" />
      </div>
    );
  } else {
    return (
      <div className={`p-2.5 rounded-2xl ${isCompleted ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-orange-100 text-orange-600 border border-orange-200'} shrink-0 relative transition-transform hover:scale-110 duration-200`}>
        <Languages className="w-5 h-5" />
        <CuteSparkleMini className="absolute -top-1 -right-1 w-3.5 h-3.5" />
      </div>
    );
  }
};

// Student avatar image paths (using imported images for robust Vite bundle resolution)
const studentAvatar = studentAvatarJpg;
const studentBanner = studentBannerJpg;
const studentSidebarIllustration = studentSidebarIllustrationJpg;

type StudentTab = 
  | 'trang-chu' 
  | 'bai-tap' 
  | 'de-kiem-tra' 
  | 'ket-qua' 
  | 'lich-hoc' 
  | 'bang-xep-hang' 
  | 'thanh-tich' 
  | 'thong-bao' 
  | 'tai-khoan' 
  | 'cai-dat'
  | 'huong-dan';

const BASE_EXAM_CATEGORIES: Record<string, { name: string; desc: string; iconKey: string; topics: string[] }[]> = {};

export const EXAM_CATEGORIES: Record<string, { name: string; desc: string; iconKey: string; topics: string[] }[]> = {};

SUBJECTS.forEach((subject) => {
  if (BASE_EXAM_CATEGORIES[subject]) {
    EXAM_CATEGORIES[subject] = BASE_EXAM_CATEGORIES[subject];
  } else {
    const topics = PREDEFINED_TOPICS[subject] || [];
    if (subject.startsWith('Toán')) {
      EXAM_CATEGORIES[subject] = [
        {
          name: 'Kiến thức trọng tâm',
          desc: `Ôn tập kiến thức Toán học ${subject}`,
          iconKey: '123',
          topics: topics.slice(0, Math.ceil(topics.length / 2))
        },
        {
          name: 'Luyện tập tổng hợp',
          desc: 'Các bài toán thực hành ứng dụng lý thuyết học được...',
          iconKey: '+-x/',
          topics: topics.slice(Math.ceil(topics.length / 2))
        }
      ];
    } else if (subject.startsWith('Tiếng Việt')) {
      EXAM_CATEGORIES[subject] = [
        {
          name: 'Từ vựng & Ngữ pháp',
          desc: 'Phần lý thuyết từ vựng, ngữ pháp cốt lõi tiếng Việt...',
          iconKey: 'book',
          topics: topics.slice(0, Math.ceil(topics.length / 2))
        },
        {
          name: 'Tập làm văn & Đọc hiểu',
          desc: 'Các dạng bài đọc hiểu, rèn luyện kỹ năng viết cảm thụ...',
          iconKey: 'feather',
          topics: topics.slice(Math.ceil(topics.length / 2))
        }
      ];
    } else {
      EXAM_CATEGORIES[subject] = [
        {
          name: 'Vocabulary & Pronunciation',
          desc: 'Từ vựng, mẫu câu đàm thoại giao tiếp hàng ngày...',
          iconKey: 'abc',
          topics: topics.slice(0, Math.ceil(topics.length / 2))
        },
        {
          name: 'Grammar & Practice',
          desc: 'Thì động từ, cấu trúc câu và bài tập trắc nghiệm tổng hợp...',
          iconKey: 'grammar',
          topics: topics.slice(Math.ceil(topics.length / 2))
        }
      ];
    }
  }
});

export default function StudentDashboard({ userProfile, onSelectSubject, onSelectAssignment, onViewHistory }: StudentDashboardProps) {
  // Grade and class handling
  const [studentGrade, setStudentGrade] = useState<string>(userProfile.grade || 'Lớp 2');
  const [className, setClassName] = useState<string>('');

  // Sync state with userProfile when updated in real-time
  useEffect(() => {
    if (userProfile.grade) {
      setStudentGrade(userProfile.grade);
    }
  }, [userProfile.grade]);

  // Allowed grades include student's current grade + any admin assigned allowedGrades
  const allowedGradesList = Array.from(new Set([
    studentGrade,
    ...(userProfile.allowedGrades || [])
  ])).filter(Boolean);

  const [classCustomTopics, setClassCustomTopics] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchAllCustomTopics = async () => {
      try {
        const classesSnap = await getDocs(collection(db, 'classes'));
        const customTopicsMap: Record<string, string[]> = {};
        
        classesSnap.docs.forEach(doc => {
          const data = doc.data();
          const className = data.name || '';
          
          // Check if this class is relevant to any allowed grade
          const isAllowed = allowedGradesList.some(grade => {
            const g = grade.toLowerCase();
            const c = className.toLowerCase();
            if (c.includes(g) || g.includes(c)) return true;
            
            const gMatch = g.match(/([1-9])/);
            const cMatch = c.match(/([1-9])/);
            return gMatch && cMatch && gMatch[1] === cMatch[1];
          });
          
          if (isAllowed || doc.id === userProfile.classId) {
            const custom = data.customTopics || {};
            Object.keys(custom).forEach((subj) => {
              if (Array.isArray(custom[subj])) {
                if (!customTopicsMap[subj]) {
                  customTopicsMap[subj] = [];
                }
                custom[subj].forEach((topic: string) => {
                  if (!customTopicsMap[subj].includes(topic)) {
                    customTopicsMap[subj].push(topic);
                  }
                });
              }
            });
          }
        });
        
        setClassCustomTopics(customTopicsMap);
      } catch (err) {
        console.error("Error fetching custom topics for allowed grades:", err);
      }
    };
    
    if (allowedGradesList.length > 0) {
      fetchAllCustomTopics();
    }
  }, [JSON.stringify(allowedGradesList), userProfile.classId]);

  const visibleSubjects = SUBJECTS.filter(subject => 
    allowedGradesList.some(grade => subject.includes(grade))
  );

  const [activeTab, setActiveTab] = useState<StudentTab>('de-kiem-tra');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentSubjectFilter, setAssignmentSubjectFilter] = useState<string>('Tất cả');
  const [results, setResults] = useState<QuizResult[]>([]);
  const [classCode, setClassCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);

  // States for dynamic leaderboard
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [allClasses, setAllClasses] = useState<ClassRoom[]>([]);
  const [leaderboardClassFilter, setLeaderboardClassFilter] = useState<string>('mine'); // Default to student's class
  const [leaderboardSubjectFilter, setLeaderboardSubjectFilter] = useState<string>('all');
  const [leaderboardSchoolFilter, setLeaderboardSchoolFilter] = useState<string>('mine'); // Default to student's school
  const [homeLeaderboardScope, setHomeLeaderboardScope] = useState<'all' | 'mine'>(userProfile.classId ? 'mine' : 'all');

  // Real-time listeners for the leaderboard
  useEffect(() => {
    if (!userProfile?.uid) return;

    // Subscribe to all users to filter students
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllStudents(list.filter(u => u.role === 'student'));
    });

    // Subscribe to all classes to display class names
    const qClasses = query(collection(db, 'classes'));
    const unsubscribeClasses = onSnapshot(qClasses, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom));
      setAllClasses(list);
    });

    // Subscribe to all quiz results to compile leaderboard points
    const qResults = query(collection(db, 'results'));
    const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      setAllResults(list);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeClasses();
      unsubscribeResults();
    };
  }, []);

  const calculatePointsForQuizResult = (studentGrade: string | undefined, subjectStr: string, score: number) => {
    if (!studentGrade || !subjectStr) return score;
    
    // Extract student's grade number (e.g. "Lớp 3" -> 3)
    const studentGradeMatch = studentGrade.match(/\d+/);
    const studentGradeNum = studentGradeMatch ? parseInt(studentGradeMatch[0], 10) : null;
    if (studentGradeNum === null) return score;
    
    // Extract subject's grade number (e.g. "Toán Lớp 4" -> 4)
    const subjectGradeMatch = subjectStr.match(/\d+/);
    const subjectGradeNum = subjectGradeMatch ? parseInt(subjectGradeMatch[0], 10) : null;
    if (subjectGradeNum === null) return score;
    
    if (subjectGradeNum > studentGradeNum) {
      return score * 2; // vượt lớp
    } else if (subjectGradeNum < studentGradeNum) {
      return score * 0.5; // nhỏ hơn lớp
    } else {
      return score * 1; // đúng lớp
    }
  };

  const getLeaderboardData = () => {
    // 1. Filter students
    let filteredStudents = [...allStudents];
    
    if (leaderboardClassFilter === 'mine' && userProfile.classId) {
      filteredStudents = filteredStudents.filter(s => s.classId === userProfile.classId);
    } else if (leaderboardClassFilter !== 'all' && leaderboardClassFilter !== 'mine') {
      filteredStudents = filteredStudents.filter(s => s.classId === leaderboardClassFilter);
    }
    
    if (leaderboardSchoolFilter === 'mine' && userProfile.schoolName) {
      filteredStudents = filteredStudents.filter(s => s.schoolName && s.schoolName.trim().toLowerCase() === userProfile.schoolName?.trim().toLowerCase());
    } else if (leaderboardSchoolFilter !== 'all' && leaderboardSchoolFilter !== 'mine') {
      filteredStudents = filteredStudents.filter(s => s.schoolName && s.schoolName.trim().toLowerCase() === leaderboardSchoolFilter.trim().toLowerCase());
    }
    
    // 2. Compute points for each student
    const studentPointsMap: Record<string, { points: number; count: number }> = {};
    
    // Initialize map
    filteredStudents.forEach(s => {
      studentPointsMap[s.uid] = { points: 0, count: 0 };
    });
    
    // Process results
    allResults.forEach(r => {
      if (!studentPointsMap[r.uid]) return;
      
      // Filter by subject
      if (leaderboardSubjectFilter !== 'all') {
        const normalizedSubject = r.subject.toLowerCase();
        if (leaderboardSubjectFilter === 'Toán' && !normalizedSubject.startsWith('toán')) return;
        if (leaderboardSubjectFilter === 'Tiếng Việt' && !normalizedSubject.startsWith('tiếng việt')) return;
        if (leaderboardSubjectFilter === 'Tiếng Anh' && !normalizedSubject.startsWith('tiếng anh')) return;
      }
      
      const student = allStudents.find(s => s.uid === r.uid);
      const studentGrade = student?.grade;
      const pts = calculatePointsForQuizResult(studentGrade, r.subject, r.score);
      
      studentPointsMap[r.uid].points += pts;
      studentPointsMap[r.uid].count += 1;
    });
    
    // 3. Map to final list
    const leaderboardList = filteredStudents.map(s => {
      const stats = studentPointsMap[s.uid] || { points: 0, count: 0 };
      const cls = allClasses.find(c => c.id === s.classId);
      
      return {
        uid: s.uid,
        name: s.displayName || 'Học sinh ẩn danh',
        className: cls ? cls.name : 'Chưa có lớp',
        schoolName: s.schoolName || 'Chưa cập nhật trường',
        points: stats.points,
        count: stats.count,
        isCurrent: s.uid === userProfile.uid
      };
    });
    
    // 4. Sort by points desc, then count desc, then name asc
    leaderboardList.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });
    
    // 5. Add ranking position
    return leaderboardList.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  };

  const getHomeLeaderboardData = (scope: 'all' | 'mine') => {
    // 1. Filter students
    let filteredStudents = [...allStudents];
    if (scope === 'mine' && userProfile.classId) {
      filteredStudents = filteredStudents.filter(s => s.classId === userProfile.classId);
    }
    
    // 2. Compute points for each student
    const studentPointsMap: Record<string, { points: number; count: number }> = {};
    
    // Initialize map
    filteredStudents.forEach(s => {
      studentPointsMap[s.uid] = { points: 0, count: 0 };
    });
    
    // Process results
    allResults.forEach(r => {
      if (!studentPointsMap[r.uid]) return;
      
      const student = allStudents.find(s => s.uid === r.uid);
      const studentGrade = student?.grade;
      const pts = calculatePointsForQuizResult(studentGrade, r.subject, r.score);
      
      studentPointsMap[r.uid].points += pts;
      studentPointsMap[r.uid].count += 1;
    });
    
    // 3. Map to final list
    const leaderboardList = filteredStudents.map(s => {
      const stats = studentPointsMap[s.uid] || { points: 0, count: 0 };
      const cls = allClasses.find(c => c.id === s.classId);
      
      return {
        uid: s.uid,
        name: s.displayName || 'Học sinh ẩn danh',
        className: cls ? cls.name : 'Chưa có lớp',
        schoolName: s.schoolName || 'Chưa cập nhật trường',
        points: stats.points,
        count: stats.count,
        isCurrent: s.uid === userProfile.uid
      };
    });
    
    // 4. Sort by points desc, then count desc, then name asc
    leaderboardList.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });
    
    // 5. Add ranking position
    return leaderboardList.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));
  };

  // Speech synthesis stop on unmount/analysis change
  useEffect(() => {
    return () => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch (err) {
        console.error("SpeechSynthesis error:", err);
      }
    };
  }, []);

  useEffect(() => {
    if (!analysisResult) {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch (err) {
        console.error("SpeechSynthesis error:", err);
      }
      setIsPlayingSpeech(false);
    }
  }, [analysisResult]);

  const toggleSpeakAnalysis = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Trình duyệt của bạn không hỗ trợ tính năng phát âm thanh (Text-to-Speech).");
      return;
    }

    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (err) {}

    // Clean markdown tags for natural speech reading
    const cleanText = text
      .replace(/[#*`_~]/g, ' ') // remove markdown styling characters with spaces
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // replace markdown links with label
      .replace(/\s+/g, ' ') // normalize whitespace
      .trim();

    if (!cleanText) return;

    // Split text into smaller sentences for robust playback in all browsers
    const rawSentences = cleanText.split(/[.!?\n]+/);
    const sentences: string[] = [];
    
    for (const raw of rawSentences) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      
      // If a sentence is extremely long, break it by comma or spaces
      if (trimmed.length > 150) {
        const parts = trimmed.split(/[,，]+/);
        for (const part of parts) {
          const pt = part.trim();
          if (pt.length > 0) {
            sentences.push(pt);
          }
        }
      } else {
        sentences.push(trimmed);
      }
    }

    if (sentences.length === 0) return;

    setIsPlayingSpeech(true);
    let activeIndex = 0;

    const playNext = () => {
      if (activeIndex >= sentences.length) {
        setIsPlayingSpeech(false);
        return;
      }

      const currentSentence = sentences[activeIndex];
      const utterance = new SpeechSynthesisUtterance(currentSentence);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;

      // Find Vietnamese female voice if available
      let voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        voices = window.speechSynthesis.getVoices();
      }
      const viVoices = voices.filter(voice => voice.lang.toLowerCase().includes('vi'));
      
      if (viVoices.length > 0) {
        const femaleVoice = viVoices.find(voice => {
          const nameLower = voice.name.toLowerCase();
          return nameLower.includes('female') ||
                 nameLower.includes('linh') ||
                 nameLower.includes('hoaimy') ||
                 nameLower.includes('an') ||
                 nameLower.includes('google');
        });
        
        utterance.voice = femaleVoice || viVoices[0];
      }

      utterance.onend = () => {
        activeIndex++;
        playNext();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn("SpeechSynthesisUtterance non-fatal warning/error:", e.error);
        }
        setIsPlayingSpeech(false);
      };

      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("SpeechSynthesis error:", err);
        setIsPlayingSpeech(false);
      }
    };

    // Start playing the first chunk with a short delay after cancel
    setTimeout(() => {
      playNext();
    }, 50);
  };

  // States for self-learning / test (de-kiem-tra)
  const [examStep, setExamStep] = useState<'subject' | 'topic' | 'config'>('subject');
  const [expandedSubject, setExpandedSubject] = useState<'Toán' | 'Tiếng Việt' | 'Tiếng Anh' | null>(null);

  // Helper to fetch subjects based on high-level categories
  const getAvailableSubjectsForCategory = (key: 'Toán' | 'Tiếng Việt' | 'Tiếng Anh') => {
    const matched = visibleSubjects.filter(subj => {
      if (key === 'Toán') return subj.startsWith('Toán');
      if (key === 'Tiếng Việt') return subj.startsWith('Tiếng Việt') || subj.startsWith('Ngữ văn');
      if (key === 'Tiếng Anh') return subj.startsWith('Tiếng Anh');
      return false;
    });
    
    if (matched.length > 0) return matched;
    
    const currentGradeNum = studentGrade || 'Lớp 2';
    if (key === 'Toán') return [`Toán ${currentGradeNum}` as Subject];
    if (key === 'Tiếng Việt') return [`Tiếng Việt ${currentGradeNum}` as Subject];
    if (key === 'Tiếng Anh') return [`Tiếng Anh ${currentGradeNum}` as Subject];
    return [];
  };

  const handleProceedWithSubject = (subj: Subject) => {
    setSelectedExamSubject(subj);
    setSelectedCategoryIdx(0);
    const baseCats = EXAM_CATEGORIES[subj] || [];
    const custom = classCustomTopics[subj] || [];
    const firstCat = baseCats[0];
    const customFirstTopic = custom[0];
    const defaultTopic = firstCat?.topics[0] || customFirstTopic || '';
    setSelectedExamTopic(defaultTopic);
    setExamStep('topic');
    setExpandedSubject(null);
  };

  const handleSelectCategory = (categoryKey: 'Toán' | 'Tiếng Việt' | 'Tiếng Anh') => {
    const subjects = getAvailableSubjectsForCategory(categoryKey);
    if (subjects.length > 1) {
      setExpandedSubject(categoryKey);
    } else {
      const chosenSubj = subjects[0];
      handleProceedWithSubject(chosenSubj);
    }
  };

  const [selectedExamSubject, setSelectedExamSubject] = useState<Subject>(() => {
    const initialGrade = userProfile.grade || 'Lớp 2';
    const match = SUBJECTS.find(s => s.includes(initialGrade));
    return (match || 'Toán Lớp 2') as Subject;
  });
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);
  const [selectedExamTopic, setSelectedExamTopic] = useState<string>(() => {
    const initialGrade = userProfile.grade || 'Lớp 2';
    const match = SUBJECTS.find(s => s.includes(initialGrade)) || 'Toán Lớp 2';
    const firstCat = EXAM_CATEGORIES[match]?.[0];
    return firstCat?.topics[0] || 'Ôn tập các số đến 100';
  });
  const [showAllTopics, setShowAllTopics] = useState<boolean>(false);
  const [selectedExamQuestionCount, setSelectedExamQuestionCount] = useState<number>(10);
  const [selectedExamDifficulty, setSelectedExamDifficulty] = useState<string>('All');
  const [studyAdvice, setStudyAdvice] = useState<string>('');
  const [isAdviceLoading, setIsAdviceLoading] = useState<boolean>(false);

  // Dynamically compute the categories and topics for selectedExamSubject
  const examCategories = React.useMemo(() => {
    const baseCats = EXAM_CATEGORIES[selectedExamSubject] || [];
    const customTopics = classCustomTopics[selectedExamSubject] || [];
    
    if (customTopics.length === 0) {
      return baseCats;
    }
    
    // Create a new list with the custom topics category appended
    return [
      ...baseCats,
      {
        name: 'Chủ đề của lớp',
        desc: 'Các chủ đề do Giáo viên hoặc Quản trị viên thiết kế riêng cho lớp học của bạn.',
        iconKey: 'custom',
        topics: customTopics
      }
    ];
  }, [selectedExamSubject, classCustomTopics]);

  // Sync selected subject when student grade changes
  useEffect(() => {
    const matchingSubjects = SUBJECTS.filter(s => s.includes(studentGrade));
    if (matchingSubjects.length > 0 && !matchingSubjects.includes(selectedExamSubject)) {
      const defaultSubj = matchingSubjects[0];
      setSelectedExamSubject(defaultSubj);
      setSelectedCategoryIdx(0);
      const firstCat = EXAM_CATEGORIES[defaultSubj]?.[0];
      if (firstCat) {
        setSelectedExamTopic(firstCat.topics[0] || '');
      }
    }
  }, [studentGrade]);

  // Fetch class details and auto detect grade
  useEffect(() => {
    if (!userProfile.classId) {
      setClassName('');
      return;
    }
    
    const fetchClassDetails = async () => {
      try {
        const classDocSnap = await getDocs(query(collection(db, 'classes'), where('__name__', '==', userProfile.classId)));
        if (!classDocSnap.empty) {
          const clsData = classDocSnap.docs[0].data();
          const clsName = clsData.name || '';
          setClassName(clsName);
          
          // Match "Lớp X" or "Lớp X..."
          const match = clsName.match(/Lớp\s*([1-5])/i);
          if (match && match[1]) {
            const detectedGrade = `Lớp ${match[1]}`;
            setStudentGrade(detectedGrade);
            
            // Save detected grade to user profile in DB
            if (userProfile?.uid && userProfile.grade !== detectedGrade) {
              await updateDoc(doc(db, 'users', userProfile.uid), {
                grade: detectedGrade
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching class details:", err);
      }
    };
    
    fetchClassDetails();
  }, [userProfile.classId, userProfile.grade]);

  // Load AI advice when tab, topic or subject changes (with a 600ms debounce to prevent API rate limiting)
  useEffect(() => {
    if (activeTab !== 'de-kiem-tra' || !selectedExamTopic) {
      return;
    }
    let active = true;
    
    const timer = setTimeout(async () => {
      setIsAdviceLoading(true);
      try {
        const advice = await getStudyAdvice(
          userProfile.displayName || 'Học sinh',
          selectedExamSubject,
          selectedExamTopic,
          results
        );
        if (active) {
          setStudyAdvice(advice);
        }
      } catch (err) {
        console.error("Failed to load study advice:", err);
        if (active) {
          setStudyAdvice("Chúc con ôn luyện thật vui vẻ và gặt hái được nhiều sao vàng 10 điểm nhé! 🌟");
        }
      } finally {
        if (active) {
          setIsAdviceLoading(false);
        }
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedExamTopic, selectedExamSubject, activeTab]);

  // Sync category and topic when selectedExamSubject changes
  useEffect(() => {
    setSelectedCategoryIdx(0);
    const firstCatWithTopics = examCategories?.find(cat => cat && Array.isArray(cat.topics) && cat.topics.length > 0);
    if (firstCatWithTopics) {
      setSelectedExamTopic(firstCatWithTopics.topics[0] || '');
    } else {
      setSelectedExamTopic('');
    }
  }, [selectedExamSubject, examCategories]);
  
  // Real-time listener for assignments
  useEffect(() => {
    if (!userProfile.classId) return;
    
    const q = query(collection(db, 'assignments'), where('classId', '==', userProfile.classId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      setAssignments(list);
    });

    return () => unsubscribe();
  }, [userProfile.classId]);

  // Real-time listener for test results
  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(
      collection(db, 'results'),
      where('uid', '==', userProfile.uid),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      setResults(list);
    }, (error) => {
      console.error('Error listening to results:', error);
    });
    return () => unsubscribe();
  }, [userProfile.uid]);

  const handleStartSelfQuiz = () => {
    onSelectSubject(selectedExamSubject, selectedExamTopic, selectedExamQuestionCount, selectedExamDifficulty);
  };

  const handleJoinClass = async () => {
    if (!classCode || !userProfile?.uid) return;
    setIsJoining(true);
    try {
      const classSnap = await getDocs(query(collection(db, 'classes'), where('__name__', '==', classCode)));
      
      if (classSnap.empty) {
        alert('Mã lớp không tồn tại. Vui lòng kiểm tra lại!');
      } else {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          classId: classCode
        });
        alert('Đã tham gia lớp học thành công!');
        setClassCode('');
      }
    } catch (error) {
      console.error('Error joining class:', error);
      alert('Đã có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setIsJoining(false);
    }
  };

  const handleAnalyzeSelf = async () => {
    if (!userProfile?.uid) return;
    
    setIsAnalyzing(true);
    try {
      if (results.length === 0) {
        alert('Bạn cần hoàn thành ít nhất một đề kiểm tra hoặc ôn tập để AI có thể phân tích kết quả.');
        setIsAnalyzing(false);
        return;
      }
      
      const analysis = await analyzeStudentPerformance(userProfile.displayName || 'Học sinh', results);
      setAnalysisResult(analysis);
    } catch (error) {
      console.error('Error analyzing performance:', error);
      alert('Đã có lỗi xảy ra khi phân tích kết quả. Vui lòng thử lại sau.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('localUserSession');
    signOut(auth).then(() => {
      window.location.reload();
    });
  };

  // Compute stats based on real data
  const actualCompletedCount = results.length;
  const actualAverageScore = results.length > 0 
    ? parseFloat((results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1))
    : null;

  // Format line chart data
  // If the user has real test sessions, we map them. Otherwise, we display the beautiful mockup data.
  const defaultChartData = [
    { name: 'Tháng 1', score: 7.2 },
    { name: 'Tháng 2', score: 7.6 },
    { name: 'Tháng 3', score: 8.1 },
    { name: 'Tháng 4', score: 7.9 },
    { name: 'Tháng 5', score: 8.3 },
    { name: 'Tháng 6', score: 8.6 }
  ];

  const getChartData = () => {
    if (results.length === 0) return defaultChartData;
    
    // Group results by month (for last 6 sessions or months)
    const recentResults = results.slice(-6);
    return recentResults.map((res, index) => {
      const date = res.timestamp ? res.timestamp.toDate() : new Date();
      const label = `Lần ${index + 1}`;
      return {
        name: label,
        score: parseFloat(res.score.toFixed(1))
      };
    });
  };

  const totalXuEdu = results.reduce((sum, r) => {
    const pts = r.points !== undefined ? r.points : calculatePointsForQuizResult(userProfile.grade, r.subject, r.score);
    return sum + pts;
  }, 0);

  const getStudentRankInfo = () => {
    const list = getLeaderboardData();
    const currentStudent = list.find(item => item.isCurrent);
    if (!currentStudent) {
      return { rank: '--', total: list.length || '--' };
    }
    return { rank: currentStudent.rank, total: list.length };
  };

  const mathResults = results.filter(r => r.subject.startsWith('Toán'));
  const vietResults = results.filter(r => r.subject === 'Tiếng Việt');
  const engResults = results.filter(r => r.subject === 'Tiếng Anh');

  const subjectAverages = {
    'Toán': mathResults.reduce((acc, r) => acc + r.score, 0) / (mathResults.length || 1),
    'Tiếng Việt': vietResults.reduce((acc, r) => acc + r.score, 0) / (vietResults.length || 1),
    'Tiếng Anh': engResults.reduce((acc, r) => acc + r.score, 0) / (engResults.length || 1),
  };

  const subjectsFeatured = [
    { name: 'Toán học', icon: Calculator, color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-600', score: mathResults.length > 0 ? parseFloat(subjectAverages['Toán'].toFixed(1)) : 9.2 },
    { name: 'Tiếng Việt', icon: BookOpen, color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-600', score: results.filter(r => r.subject === 'Tiếng Việt').length > 0 ? parseFloat(subjectAverages['Tiếng Việt'].toFixed(1)) : 8.4 },
    { name: 'Tiếng Anh', icon: Languages, color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-600', score: results.filter(r => r.subject === 'Tiếng Anh').length > 0 ? parseFloat(subjectAverages['Tiếng Anh'].toFixed(1)) : 8.8 },
    { name: 'Khoa học', icon: Sparkles, color: 'bg-purple-500', bgLight: 'bg-purple-50 text-purple-600', score: 8.1 }
  ];

  const renderTeacherAssignmentsSection = () => {
    return (
      <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-[28px] border border-stone-200/90 shadow-sm space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#E6F7F0] text-[#00A66C] rounded-2xl border border-[#CCF0E1] shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                  Bài tập giáo viên giao
                </h3>
                {assignments.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-[#E6F7F0] text-[#00A66C] text-xs font-black rounded-full border border-[#CCF0E1]">
                    {assignments.length} bài
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                {userProfile.classId ? `Lớp: ${userProfile.classId} • Đề kiểm tra & bài tập từ giáo viên bộ môn` : 'Nhập mã lớp để nhận bài tập do giáo viên giao'}
              </p>
            </div>
          </div>

          {userProfile.classId && assignments.length > 0 && (
            <button
              onClick={() => setActiveTab('bai-tap')}
              className="text-xs font-bold text-[#00A66C] hover:text-emerald-700 hover:underline flex items-center gap-1 shrink-0 self-start sm:self-center cursor-pointer"
            >
              <span>Xem tất cả ({assignments.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {!userProfile.classId ? (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50/40 rounded-2xl border border-emerald-100/90 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white text-[#00A66C] rounded-2xl shadow-xs border border-emerald-100 shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-800">Bạn chưa tham gia lớp học nào</h4>
                <p className="text-xs text-stone-500 mt-0.5">Nhập mã lớp do giáo viên cung cấp để nhận bài tập trực tiếp và đồng bộ bảng điểm lớp!</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <input 
                type="text" 
                placeholder="Nhập mã lớp..."
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-200 outline-none focus:border-[#00A66C] focus:ring-1 focus:ring-[#00A66C] bg-white w-full sm:w-40"
              />
              <button 
                onClick={handleJoinClass}
                disabled={isJoining || !classCode.trim()}
                className="px-4 py-2 bg-[#00A66C] hover:bg-[#00905D] text-white font-extrabold text-xs rounded-xl shadow-xs disabled:bg-stone-200 disabled:text-stone-400 transition-all shrink-0 cursor-pointer"
              >
                {isJoining ? 'Đang vào...' : 'Vào lớp'}
              </button>
            </div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-4 sm:p-5 bg-stone-50/80 rounded-2xl border border-stone-200/60 text-center flex flex-col sm:flex-row items-center justify-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#00A66C] shrink-0" />
            <p className="text-xs text-stone-600 font-medium">
              Hiện tại lớp <strong className="text-stone-800">{userProfile.classId}</strong> chưa có bài tập mới nào từ giáo viên. Hãy chọn bài bên dưới để tự ôn luyện nhé!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {assignments.slice(0, 3).map((assignment) => {
              const isCompleted = results.some(r => r.assignmentId === assignment.id);
              const myResult = results.find(r => r.assignmentId === assignment.id);
              
              return (
                <div
                  key={assignment.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group hover:shadow-md ${
                    isCompleted 
                      ? 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300' 
                      : 'bg-rose-50/30 border-rose-200/80 hover:border-rose-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white text-stone-700 border border-stone-200/80 uppercase tracking-wider truncate">
                        {assignment.subject}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isCompleted 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {isCompleted ? (myResult ? `Đã làm (${myResult.score}/10đ)` : 'Đã làm') : 'Chưa làm'}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-stone-800 group-hover:text-[#00A66C] line-clamp-2 leading-snug transition-colors">
                      {assignment.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-200/50 text-[11px]">
                    <span className="text-stone-400 font-medium">{assignment.questions.length} câu trắc nghiệm</span>
                    <button
                      onClick={() => onSelectAssignment(assignment)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                        isCompleted
                          ? 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                          : 'bg-[#00A66C] hover:bg-[#00905D] text-white shadow-emerald-200/50'
                      }`}
                    >
                      <span>{isCompleted ? 'Làm lại' : 'Làm bài'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const sidebarTabs = [
    { id: 'de-kiem-tra', label: 'Trang chủ', icon: Home },
    { id: 'ket-qua', label: 'Kết quả học tập', icon: BarChart2 },
    { id: 'bang-xep-hang', label: 'Bảng xếp hạng', icon: Trophy },
    { id: 'trang-chu', label: 'Tổng quan', icon: TrendingUp },
    { id: 'bai-tap', label: 'Đề kiểm tra của GV', icon: FileText, badge: assignments.length > 0 ? assignments.length : undefined },
    { id: 'huong-dan', label: 'Hướng dẫn học', icon: BookOpenCheck },
    { id: 'lich-hoc', label: 'Lịch học', icon: Calendar },
    { id: 'thanh-tich', label: 'Thành tích', icon: Medal },
    { id: 'thong-bao', label: 'Thông báo', icon: Bell, badge: 3 },
    { id: 'tai-khoan', label: 'Tài khoản', icon: User },
    { id: 'cai-dat', label: 'Cài đặt', icon: Settings }
  ];

  return (
    <div className="flex min-h-screen bg-[#FFF9E6] font-sans">
      
      {/* LEFT SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-stone-100 py-6 px-4 sticky top-0 h-screen overflow-y-auto shrink-0 select-none custom-scrollbar justify-between">
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="p-2.5 bg-[#2563eb] rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center">
              <CuteLightbulbMini className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight leading-tight">Lightedu</h1>
              <p className="text-[10px] text-stone-400 font-medium">Học tập thông minh</p>
              <p className="text-[10px] text-[#2563eb] font-bold mt-0.5">Zalo: 0359888795</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {sidebarTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as StudentTab)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 group ${
                    isActive 
                      ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-200/80' 
                      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-600'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      isActive 
                        ? 'bg-white text-[#2563eb]' 
                        : tab.id === 'thong-bao' ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Illustration */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-3xl border border-blue-100/50 flex flex-col items-center text-center relative overflow-hidden">
          <img 
            src={studentSidebarIllustration} 
            alt="Lightedu Companion" 
            className="w-24 h-24 object-contain mb-2"
            referrerPolicy="no-referrer"
          />
          <h4 className="text-xs font-bold text-stone-800">Cần trợ giúp học tập?</h4>
          <p className="text-[10px] text-stone-400 mt-1 leading-relaxed">Hãy trải nghiệm phân tích lộ trình của AI cố vấn!</p>
          <button 
            onClick={() => setActiveTab('ket-qua')}
            className="mt-3 w-full py-2 bg-white hover:bg-[#2563eb] hover:text-white border border-stone-100 font-bold text-[10px] uppercase tracking-wider text-stone-600 rounded-xl transition-all shadow-sm"
          >
            Thử ngay
          </button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR PANEL */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            {/* Sidebar drawer */}
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 max-w-[80vw] bg-white h-full p-6 flex flex-col justify-between overflow-y-auto select-none"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#2563eb] rounded-xl">
                      <CuteLightbulbMini className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-stone-900">Lightedu</h1>
                      <p className="text-[9px] text-stone-400">Học tập thông minh</p>
                      <p className="text-[9px] text-[#2563eb] font-bold mt-0.5">Zalo: 0359888795</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1.5 hover:bg-stone-50 rounded-lg text-stone-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {sidebarTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as StudentTab);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                          isActive 
                            ? 'bg-[#2563eb] text-white shadow-lg' 
                            : 'text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <span>{tab.label}</span>
                        </div>
                        {tab.badge !== undefined && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isActive 
                              ? 'bg-white text-[#2563eb]' 
                              : tab.id === 'thong-bao' ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="mt-8 border-t border-stone-100 pt-6">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-stone-500 hover:text-red-500 rounded-xl text-sm font-semibold transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOP BAR / HEADER */}
        <header className="bg-white border-b border-stone-100 py-4 px-6 md:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-stone-50 rounded-xl text-stone-500 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-stone-900 capitalize tracking-tight">
              {sidebarTabs.find(t => t.id === activeTab)?.label}
            </h2>
            {activeTab !== 'de-kiem-tra' && (
              <button
                onClick={() => setActiveTab('de-kiem-tra')}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all shadow-sm border border-emerald-100"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Quay lại Trang chủ</span>
              </button>
            )}
          </div>

          {/* Right Action blocks */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Streak Flame Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full text-orange-600">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500 animate-pulse" />
              <div className="text-left leading-none">
                <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider">Chuỗi ngày học tốt</p>
                <p className="text-xs font-black">7 ngày</p>
              </div>
            </div>

            {/* Xu Edu Coin Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full text-amber-600">
              <Coins className="w-4 h-4 text-amber-500" />
              <div className="text-left leading-none">
                <p className="text-[8px] text-stone-400 font-bold uppercase tracking-wider">Xu Edu</p>
                <p className="text-xs font-black">{totalXuEdu.toLocaleString()}</p>
              </div>
            </div>

            {/* Subject Progress Badge next to xuEdu */}
            {(() => {
              const allTopicsForSubject = examCategories.flatMap(cat => cat.topics) || [];
              const completedTopicsForSubject = allTopicsForSubject.filter(topic => 
                results.some(r => r.topic && r.topic.trim().toLowerCase() === topic.trim().toLowerCase())
              );
              const progressPercent = allTopicsForSubject.length > 0 
                ? Math.round((completedTopicsForSubject.length / allTopicsForSubject.length) * 100)
                : 0;
              return (
                <div className="hidden md:flex items-center gap-3 bg-emerald-50/80 border border-emerald-100/80 px-3.5 py-1.5 rounded-full text-emerald-800 shrink-0">
                  <Trophy className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />
                  <div className="text-left leading-none">
                    <p className="text-[8px] text-stone-500 font-extrabold uppercase tracking-wider">Tiến độ {selectedExamSubject ? selectedExamSubject.split(' ')[0] : 'môn học'}</p>
                    <p className="text-[11px] font-black text-emerald-700 mt-0.5">
                      Đã làm: <span className="font-extrabold text-emerald-600">{completedTopicsForSubject.length} / {allTopicsForSubject.length} ({progressPercent}%)</span>
                    </p>
                  </div>
                  <div className="hidden lg:block w-16 bg-stone-200/50 h-1.5 rounded-full overflow-hidden border border-stone-300/20">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Search Bar */}
            <div className="relative hidden xl:block w-60">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm đề kiểm tra, ôn tập..."
                className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-stone-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-[#f8fafc]"
              />
            </div>

            {/* Notification Bell */}
            <button 
              onClick={() => setActiveTab('thong-bao')}
              className="p-2 hover:bg-stone-50 rounded-xl relative text-stone-500 transition-colors"
            >
              <Bell className="w-5.5 h-5.5" />
              <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-white font-mono">3</span>
            </button>

            {/* User Profile Info Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 px-2.5 hover:bg-stone-50 rounded-full transition-all border border-stone-100"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500 shadow-sm">
                  <img
                    src={studentAvatar}
                    alt={userProfile.displayName || 'Avatar'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-stone-800 tracking-tight leading-none">{userProfile.displayName || 'Học sinh'}</p>
                  <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider mt-0.5 leading-none">Học sinh</p>
                </div>
                <ChevronDown className="w-4 h-4 text-stone-400" />
              </button>

              {/* Profile Dropdown Options */}
              <AnimatePresence>
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-stone-100 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setActiveTab('tai-khoan');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-stone-600 hover:bg-stone-50 flex items-center gap-2.5"
                      >
                        <User className="w-4 h-4 text-stone-400" />
                        <span>Hồ sơ cá nhân</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('cai-dat');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-stone-600 hover:bg-stone-50 flex items-center gap-2.5"
                      >
                        <Settings className="w-4 h-4 text-stone-400" />
                        <span>Cài đặt</span>
                      </button>
                      <div className="border-t border-stone-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2.5"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          
          {/* TAB 1: TRANG CHỦ & THỐNG KÊ (Mockup layout perfectly matched) */}
          {activeTab === 'trang-chu' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {/* HERO WELCOME BANNER */}
              <div className="bg-[#ebf3ff] rounded-3xl p-6 md:p-8 relative overflow-hidden border border-[#d2e3fc] flex flex-col md:flex-row md:items-center justify-between min-h-[220px]">
                <div className="relative z-10 max-w-xl space-y-2 md:space-y-3">
                  <span className="text-stone-500 font-medium text-lg md:text-xl">Xin chào,</span>
                  <h3 className="text-[#2563eb] font-extrabold text-2xl md:text-4xl tracking-tight leading-tight">
                    {userProfile.displayName || 'Nguyễn Minh Khang'}! 👋
                  </h3>
                  <p className="text-stone-600 font-medium text-xs md:text-sm">
                    Cố gắng mỗi ngày, tiến bộ từng bước!
                  </p>
                  <div>
                    <button 
                      onClick={() => setActiveTab('tai-khoan')}
                      className="inline-flex items-center gap-2 bg-white text-[#2563eb] px-4 py-2 rounded-2xl border border-[#d2e3fc] text-xs font-bold mt-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <School className="w-4 h-4" />
                      <span>{userProfile.classId ? `Lớp: ${userProfile.classId}` : 'Chưa tham gia lớp'} – Trường Tiểu Học Nguyễn Huệ</span>
                    </button>
                  </div>
                </div>

                {/* Right Illustration */}
                <div className="absolute right-4 bottom-0 md:relative md:right-0 md:bottom-0 flex justify-end">
                  <img 
                    src={studentBanner} 
                    alt="Studying Illustration" 
                    className="h-36 md:h-48 lg:h-52 object-contain pointer-events-none select-none opacity-40 md:opacity-100"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* QUICK STUDY TIPS */}
              <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 shrink-0">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1 text-center md:text-left flex-1">
                  <h4 className="text-sm font-bold text-stone-800">Lời khuyên học tập hôm nay từ trợ lý AI 🦉</h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Theo thống kê, ôn tập lại các bài kiểm tra bị điểm dưới 8 là phương pháp tốt nhất để cải thiện thứ hạng của bạn nhanh chóng. Hãy sử dụng tính năng **Lịch sử làm bài** hoặc **Kết quả học tập** để bắt đầu ôn tập ngay!
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('ket-qua')}
                  className="px-6 py-3 bg-[#2563eb] text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all shadow-md shrink-0 whitespace-nowrap"
                >
                  Bắt đầu ôn tập
                </button>
              </div>

              {/* BÀI TẬP GIÁO VIÊN GIAO */}
              {renderTeacherAssignmentsSection()}

              {/* THREE STAT CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Stat 1: Số bài đã làm */}
                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between relative group hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest font-mono">Số bài đã làm</p>
                    <h4 className="text-[#2563eb] text-3xl font-extrabold mt-1">{actualCompletedCount || 68} <span className="text-xs text-stone-400 font-bold">bài</span></h4>
                    <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+12 bài so với tuần trước</span>
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl text-[#2563eb] flex items-center justify-center">
                    <BookOpenCheck className="w-7 h-7" />
                  </div>
                  <button 
                    onClick={() => setActiveTab('bai-tap')}
                    className="absolute bottom-4 right-4 p-1.5 bg-[#f4f7fc] group-hover:bg-[#2563eb] group-hover:text-white text-[#2563eb] rounded-full transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Stat 2: Điểm trung bình */}
                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between relative group hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest font-mono">Điểm trung bình</p>
                    <h4 className="text-emerald-500 text-3xl font-extrabold mt-1">{actualAverageScore || 8.6} <span className="text-xs text-stone-400 font-bold">/10</span></h4>
                    <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Tốt hơn 0.7 điểm so với tháng trước</span>
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-500 flex items-center justify-center">
                    <BarChart2 className="w-7 h-7" />
                  </div>
                  <button 
                    onClick={() => setActiveTab('ket-qua')}
                    className="absolute bottom-4 right-4 p-1.5 bg-[#f4f7fc] group-hover:bg-[#2563eb] group-hover:text-white text-[#2563eb] rounded-full transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Stat 3: Hạng học tập */}
                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between relative group hover:shadow-md transition-all">
                  <div className="space-y-1">
                    <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest font-mono">Hạng học tập</p>
                    {(() => {
                      const { rank, total } = getStudentRankInfo();
                      const topPercent = typeof rank === 'number' && typeof total === 'number' && total > 0
                        ? Math.round((rank / total) * 100)
                        : null;
                      return (
                        <>
                          <h4 className="text-indigo-600 text-3xl font-extrabold mt-1">
                            {rank} <span className="text-xs text-stone-400 font-bold">/ {total}</span>
                          </h4>
                          <p className="text-[11px] text-indigo-500 font-bold flex items-center gap-1 mt-1">
                            <Award className="w-3.5 h-3.5" />
                            <span>{topPercent !== null ? `Top ${topPercent}% học sinh` : 'Chưa có xếp hạng'}</span>
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 flex items-center justify-center">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <button 
                    onClick={() => setActiveTab('bang-xep-hang')}
                    className="absolute bottom-4 right-4 p-1.5 bg-[#f4f7fc] group-hover:bg-[#2563eb] group-hover:text-white text-[#2563eb] rounded-full transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

              {/* TWO BOTTOM SECTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Line Chart */}
                <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-stone-800">Biểu đồ điểm trung bình</h3>
                    <select className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-50 border border-stone-200 text-stone-600 outline-none">
                      <option>6 tháng gần đây</option>
                      <option>Học kỳ này</option>
                    </select>
                  </div>
                  
                  {/* Recharts Line Chart */}
                  <div className="w-full h-64 md:h-72 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={getChartData()} 
                        margin={{ top: 25, right: 20, left: -25, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={11} 
                          domain={[0, 10]} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <Tooltip 
                          contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: 'white' }} 
                          labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#2563eb" 
                          strokeWidth={3} 
                          dot={{ r: 6, fill: '#fff', stroke: '#2563eb', strokeWidth: 3 }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                        >
                          <LabelList 
                            dataKey="score" 
                            position="top" 
                            style={{ fill: '#2563eb', fontWeight: 'bold', fontSize: '11px' }} 
                            offset={10}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right Column: Featured Subjects */}
                <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-stone-800">Môn học nổi bật</h3>
                    <button 
                      onClick={() => setActiveTab('de-kiem-tra')}
                      className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-0.5"
                    >
                      <span>Xem tất cả</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-5">
                    {subjectsFeatured.map((sub, idx) => {
                      const Icon = sub.icon;
                      return (
                        <div key={idx} className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${sub.bgLight} shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-stone-700">{sub.name}</span>
                              <span className="text-stone-900">{sub.score} <span className="text-[10px] text-stone-400">/10</span></span>
                            </div>
                            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${sub.color}`}
                                style={{ width: `${sub.score * 10}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Real-time Leaderboard at the bottom of Trang chu */}
              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-stone-100 shadow-sm flex flex-col space-y-6" id="home-leaderboard-section">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl border border-amber-100">
                      <Trophy className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-stone-800 font-sans tracking-tight">Đua Top Lightedu</h4>
                      <p className="text-xs text-stone-400 font-medium">Bảng xếp hạng ôn tập trực tuyến cập nhật liên tục</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-xs">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Trực tiếp</span>
                    </div>
                  </div>
                </div>

                {/* Filter and Scope Toggles */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <span className="text-xs font-bold text-stone-500 px-2">Phạm vi hiển thị:</span>
                  <div className="grid grid-cols-2 p-1 bg-white border border-stone-200/40 rounded-xl sm:w-64">
                    <button
                      onClick={() => setHomeLeaderboardScope('mine')}
                      disabled={!userProfile.classId}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        !userProfile.classId
                          ? 'text-stone-300 cursor-not-allowed'
                          : homeLeaderboardScope === 'mine'
                          ? 'bg-[#2563eb]/10 text-[#2563eb]'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Lớp của tôi
                    </button>
                    <button
                      onClick={() => setHomeLeaderboardScope('all')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        homeLeaderboardScope === 'all'
                          ? 'bg-[#2563eb]/10 text-[#2563eb]'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Toàn hệ thống
                    </button>
                  </div>
                </div>

                {/* Top list items */}
                <div className="space-y-2.5">
                  {(() => {
                    const data = getHomeLeaderboardData(homeLeaderboardScope);
                    const topList = data.slice(0, 5);
                    const myRankInfo = data.find(s => s.uid === userProfile.uid);
                    const isMyRankInTop = topList.some(s => s.uid === userProfile.uid);

                    return (
                      <>
                        {topList.length === 0 ? (
                          <div className="py-12 text-center text-stone-400 font-semibold flex flex-col items-center justify-center gap-3 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200/60">
                            <BookOpen className="w-8 h-8 text-stone-300" />
                            <p className="text-xs">Chưa có lượt thi nào trên hệ thống.</p>
                          </div>
                        ) : (
                          topList.map((student) => (
                            <div 
                              key={student.uid}
                              className={`p-4 rounded-2xl flex items-center justify-between border text-xs transition-all ${
                                student.isCurrent
                                  ? 'bg-blue-50/70 border-blue-200/60 shadow-sm shadow-blue-100/40'
                                  : 'bg-stone-50/40 border-stone-100/80 hover:bg-stone-50 hover:border-stone-200/50'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <span className="w-8 flex justify-center text-center font-black font-mono text-sm">
                                  {student.rank === 1 ? (
                                    <span className="text-lg">🥇</span>
                                  ) : student.rank === 2 ? (
                                    <span className="text-lg">🥈</span>
                                  ) : student.rank === 3 ? (
                                    <span className="text-lg">🥉</span>
                                  ) : (
                                    <span className="text-stone-400">{student.rank}</span>
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-bold text-sm truncate ${student.isCurrent ? 'text-[#2563eb]' : 'text-stone-800'}`}>
                                      {student.name}
                                    </span>
                                    {student.isCurrent && (
                                      <span className="text-[9px] font-extrabold bg-blue-100 text-[#2563eb] px-2 py-0.5 rounded-full">Bạn</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-stone-400 font-medium truncate mt-1">
                                    {student.className} • {student.schoolName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 font-bold text-stone-900 bg-stone-100/80 px-3 py-1.5 rounded-xl border border-stone-200/40 shrink-0">
                                <span className="text-amber-500 text-xs">★</span>
                                <span className="font-mono text-xs">{student.points.toLocaleString()} <span className="text-[9px] font-normal text-stone-400">điểm</span></span>
                              </div>
                            </div>
                          ))
                        )}

                        {/* If current user is not in top 5, show separator and their own position */}
                        {!isMyRankInTop && myRankInfo && (
                          <div className="pt-3 border-t border-dashed border-stone-200 mt-3">
                            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/40 flex items-center justify-between text-xs shadow-sm shadow-blue-50">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <span className="w-8 flex justify-center text-center font-bold font-mono text-stone-500 text-sm">
                                  {myRankInfo.rank}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-[#2563eb] text-sm truncate">
                                      {myRankInfo.name}
                                    </span>
                                    <span className="text-[9px] font-extrabold bg-blue-100 text-[#2563eb] px-2 py-0.5 rounded-full">Bạn</span>
                                  </div>
                                  <p className="text-xs text-stone-400 font-medium truncate mt-1">
                                    {myRankInfo.className} • {myRankInfo.schoolName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 font-bold text-stone-900 bg-stone-100/80 px-3 py-1.5 rounded-xl border border-stone-200/40 shrink-0">
                                <span className="text-amber-500 text-xs">★</span>
                                <span className="font-mono text-xs">{myRankInfo.points.toLocaleString()} <span className="text-[9px] font-normal text-stone-400">điểm</span></span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* View all button */}
                <button
                  onClick={() => setActiveTab('bang-xep-hang')}
                  className="w-full py-3 bg-stone-50 hover:bg-[#2563eb] hover:text-white border border-stone-200/60 hover:border-[#2563eb] text-stone-600 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Xem toàn bộ bảng xếp hạng</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          )}

          {/* TAB 2: BÀI TẬP (Teacher assigned) */}
          {activeTab === 'bai-tap' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              {!userProfile.classId ? (
                <div className="bg-white p-8 md:p-12 rounded-3xl border border-stone-200 text-center flex flex-col items-center max-w-md mx-auto my-12 shadow-sm">
                  <School className="w-14 h-14 text-emerald-400 mb-4 animate-bounce" />
                  <h3 className="text-xl font-bold text-stone-800">Chưa tham gia lớp học</h3>
                  <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                    Bạn cần nhập mã lớp học do giáo viên cung cấp để nhận đề kiểm tra của GV và được theo dõi tiến trình học tập.
                  </p>
                  <div className="mt-6 space-y-3 w-full">
                    <input 
                      type="text" 
                      placeholder="Mã lớp học (ví dụ: CLASS123)"
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value)}
                      className="w-full px-4 py-3 text-xs font-semibold rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center bg-stone-50"
                    />
                    <button 
                      onClick={handleJoinClass}
                      disabled={isJoining}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-200/50 disabled:bg-stone-300 transition-all"
                    >
                      {isJoining ? 'Đang tham gia...' : 'Tham gia lớp học'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Class Header info */}
                  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <School className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-xs font-bold text-stone-700">Lớp học hiện tại: {userProfile.classId}</h4>
                        <p className="text-[10px] text-stone-400 mt-0.5">Nhận các đề kiểm tra chính thức từ giáo viên của bạn tại đây</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-white text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">Đang hoạt động</span>
                  </div>

                  {/* Subject Filters */}
                  <div className="flex flex-wrap items-center gap-2 bg-stone-50 p-2 rounded-2xl border border-stone-100">
                    <span className="text-xs font-bold text-stone-500 px-3">Môn học:</span>
                    {['Tất cả', ...visibleSubjects].map((subject) => (
                      <button
                        key={subject}
                        onClick={() => setAssignmentSubjectFilter(subject)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          assignmentSubjectFilter === subject
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                            : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {subject.replace(` ${studentGrade}`, '')}
                      </button>
                    ))}
                  </div>

                  {assignments.length > 0 ? (
                    <>
                      {assignments.filter(a => assignmentSubjectFilter === 'Tất cả' || a.subject === assignmentSubjectFilter).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {assignments
                            .filter(a => assignmentSubjectFilter === 'Tất cả' || a.subject === assignmentSubjectFilter)
                            .map((assignment) => {
                              const isCompleted = results.some(r => r.assignmentId === assignment.id);
                              return (
                                <div
                                  key={assignment.id}
                                  className={`p-5 rounded-2xl border transition-all group flex flex-col justify-between min-h-[160px] ${
                                    isCompleted 
                                      ? 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-50/50' 
                                      : 'bg-rose-50/20 border-rose-100 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-50/50'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${
                                        isCompleted 
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                          : 'bg-rose-100 text-rose-800 border-rose-200'
                                      }`}>
                                        {assignment.subject}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                        }`}>
                                          {isCompleted ? 'Đã hoàn thành' : 'Chưa làm'}
                                        </span>
                                        <span className="text-[10px] text-stone-400 font-medium">{assignment.questions.length} câu hỏi</span>
                                      </div>
                                    </div>
                                    <h4 className={`text-sm font-bold line-clamp-2 leading-snug transition-colors ${
                                      isCompleted 
                                        ? 'text-emerald-700 group-hover:text-emerald-800' 
                                        : 'text-rose-700 group-hover:text-rose-800'
                                    }`}>
                                      {assignment.title}
                                    </h4>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-50">
                                    <span className="text-[10px] text-stone-400 font-medium italic">Bởi giáo viên bộ môn</span>
                                    <button 
                                      onClick={() => onSelectAssignment(assignment)}
                                      className={`px-4 py-2 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1 shadow-md ${
                                        isCompleted 
                                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100' 
                                          : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100'
                                      }`}
                                    >
                                      <span>{isCompleted ? 'Làm lại' : 'Làm bài'}</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="bg-white p-12 rounded-3xl border border-stone-100 text-center flex flex-col items-center">
                          <Bookmark className="w-12 h-12 text-stone-200 mb-4" />
                          <h4 className="text-sm font-bold text-stone-700">Không tìm thấy đề kiểm tra môn {assignmentSubjectFilter}</h4>
                          <p className="text-xs text-stone-400 mt-1 max-w-xs leading-relaxed">Hiện tại lớp chưa có đề kiểm tra nào cho môn học này. Hãy thử chọn môn học khác nhé!</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-stone-100 text-center flex flex-col items-center">
                      <Bookmark className="w-12 h-12 text-stone-200 mb-4" />
                      <h4 className="text-sm font-bold text-stone-700">Chưa có đề kiểm tra nào từ GV</h4>
                      <p className="text-xs text-stone-400 mt-1 max-w-xs leading-relaxed">Giáo viên chưa giao đề kiểm tra nào cho lớp của bạn. Hãy tự luyện tập ở tab "Trang chủ" nhé!</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: ĐỀ KIỂM TRA (Self-study / Review Section) */}
          {activeTab === 'de-kiem-tra' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative max-w-6xl mx-auto space-y-8 rounded-[40px] p-6 md:p-8 bg-gradient-to-b from-sky-100/60 via-emerald-50/20 to-white border border-sky-100/80 shadow-md overflow-hidden min-h-[700px]"
            >
              {/* Decorative floating clouds/shapes in background */}
              <div className="absolute top-10 left-4 opacity-20 w-24 h-16 bg-white rounded-full filter blur-md pointer-events-none select-none" />
              <div className="absolute top-32 right-12 opacity-35 w-32 h-20 bg-white rounded-full filter blur-md pointer-events-none select-none" />

              {/* BÀI TẬP GIÁO VIÊN GIAO */}
              {renderTeacherAssignmentsSection()}

              {/* STEP PROGRESS INDICATOR (Beautiful capsule layout from mock) */}
              <div className="max-w-2xl mx-auto bg-white/85 backdrop-blur-md p-4.5 rounded-[24px] border border-white/80 shadow-md relative z-10">
                <div className="flex items-center justify-between w-full">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="relative flex items-center justify-center mb-1">
                      <StackedBooksSVG />
                      <button 
                        onClick={() => setExamStep('subject')}
                        className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          examStep === 'subject' 
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110' 
                            : 'bg-emerald-500 text-white shadow-sm font-bold'
                        }`}
                      >
                        {examStep !== 'subject' ? '✓' : '1'}
                      </button>
                    </div>
                    <span className={`text-[11px] mt-1.5 ${examStep === 'subject' ? 'text-blue-600 font-black' : 'text-stone-500 font-extrabold'}`}>Chọn Môn</span>
                  </div>

                  {/* Connector 1 */}
                  <div className="hidden sm:flex items-center text-stone-300 font-bold tracking-widest text-xs select-none px-2">
                    ----------&gt;
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="relative flex items-center justify-center mb-1">
                      <ClipboardSVG />
                      <button 
                        onClick={() => {
                          if (selectedExamSubject) setExamStep('topic');
                        }}
                        disabled={!selectedExamSubject}
                        className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          examStep === 'topic' 
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110' 
                            : examStep === 'config'
                              ? 'bg-emerald-500 text-white shadow-sm font-bold'
                              : 'bg-stone-100 text-stone-300 border border-stone-200 cursor-not-allowed'
                        }`}
                      >
                        {examStep === 'config' ? '✓' : '2'}
                      </button>
                    </div>
                    <span className={`text-[11px] mt-1.5 ${examStep === 'topic' ? 'text-indigo-600 font-black' : 'text-stone-500 font-extrabold'}`}>Chọn Chủ Đề</span>
                  </div>

                  {/* Connector 2 */}
                  <div className="hidden sm:flex items-center text-stone-300 font-bold tracking-widest text-xs select-none px-2">
                    ----------&gt;
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="relative flex items-center justify-center mb-1">
                      <RocketSVG />
                      <button 
                        disabled={!selectedExamTopic}
                        className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          examStep === 'config' 
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110' 
                            : 'bg-stone-100 text-stone-300 border border-stone-200 cursor-not-allowed'
                        }`}
                      >
                        3
                      </button>
                    </div>
                    <span className={`text-[11px] mt-1.5 ${examStep === 'config' ? 'text-emerald-600 font-black' : 'text-stone-500 font-extrabold'}`}>Bắt đầu</span>
                  </div>
                </div>
              </div>

              {/* STEP Content Switcher */}
              <AnimatePresence mode="wait">
                {/* STEP 1: CHỌN MÔN HỌC */}
                {examStep === 'subject' && (
                  <motion.div 
                    key="step-subject"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 max-w-4xl mx-auto relative z-10"
                  >
                    {/* Cute floating background elements for Step 1 */}
                    <div className="absolute -top-6 -left-6 opacity-30 pointer-events-none select-none hidden lg:block animate-bounce" style={{ animationDuration: '4s' }}>
                      <CutePencilMini className="w-10 h-10" />
                    </div>
                    <div className="absolute -top-10 -right-6 opacity-35 pointer-events-none select-none hidden lg:block animate-pulse">
                      <CuteLightbulbMini className="w-10 h-10" />
                    </div>

                    <div className="relative max-w-xl mx-auto py-2">
                      {/* Cute student boy on left of Step 1 header */}
                      <div className="hidden lg:block absolute lg:left-[-120px] xl:left-[-140px] bottom-[-20px] lg:w-28 lg:h-48 xl:w-36 xl:h-60 select-none pointer-events-none z-10 transition-transform hover:scale-105 duration-300">
                        <TransparentImage 
                          src={studentBoyPng} 
                          onError={(e) => { e.currentTarget.src = studentAvatarJpg }} 
                          alt="Student Boy"
                          className="w-full h-full object-contain drop-shadow-xl"
                        />
                        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex flex-col items-center bg-pink-100 text-pink-600 px-3 py-1.5 rounded-xl border border-pink-200 text-[10px] font-black shadow-md rotate-[-12deg] whitespace-nowrap animate-bounce" style={{ animationDuration: '3s' }}>
                          <span>1+2 == 3</span>
                        </div>
                      </div>

                      {/* Cute student girl on right of Step 1 header */}
                      <div className="hidden lg:block absolute lg:right-[-120px] xl:right-[-140px] bottom-[-20px] lg:w-28 lg:h-48 xl:w-36 xl:h-60 select-none pointer-events-none z-10 transition-transform hover:scale-105 duration-300">
                        <TransparentImage 
                          src={studentGirlPng} 
                          onError={(e) => { e.currentTarget.src = studentAvatarJpg }} 
                          alt="Student Girl"
                          className="w-full h-full object-contain drop-shadow-xl"
                        />
                        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex flex-col items-center bg-purple-100 text-purple-600 px-3 py-1.5 rounded-xl border border-purple-200 text-[10px] font-black shadow-md rotate-[12deg] whitespace-nowrap animate-bounce" style={{ animationDuration: '3.5s' }}>
                          <span>ABC</span>
                        </div>
                      </div>

                      {expandedSubject !== null ? (
                        <div className="text-center max-w-md mx-auto space-y-2 relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white bg-indigo-500 px-3 py-1 rounded-full border border-indigo-600 shadow-sm">BƯỚC 1.1</span>
                          <h4 className="text-2xl font-black text-stone-850 pt-1">
                            Chọn lớp học môn {expandedSubject === 'Toán' ? 'Toán học' : expandedSubject} 🏫
                          </h4>
                          <p className="text-xs text-stone-500 font-extrabold leading-relaxed">Con đang học nhiều lớp môn này. Hãy chọn lớp con muốn ôn tập hôm nay nhé!</p>
                        </div>
                      ) : (
                        <div className="text-center max-w-md mx-auto space-y-2 relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white bg-blue-500 px-3 py-1 rounded-full border border-blue-600 shadow-sm">BƯỚC 1</span>
                          <h4 className="text-2xl font-black text-stone-850 pt-1">Chọn môn học ôn tập 🌟</h4>
                          <p className="text-xs text-stone-500 font-extrabold leading-relaxed">Hãy chọn môn học mà con mong muốn rèn luyện hôm nay để bắt đầu cuộc hành trình kiến thức nhé!</p>
                        </div>
                      )}
                    </div>

                    {expandedSubject !== null ? (
                      <motion.div
                        key="select-grade"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6 max-w-2xl mx-auto text-center py-4 relative z-10 w-full"
                      >

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 max-w-md mx-auto">
                          {getAvailableSubjectsForCategory(expandedSubject).map((subj) => {
                            const gradeName = subj.match(/Lớp \d+/)?.[0] || 'Lớp khác';
                            
                            let btnBg = "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-100";
                            if (expandedSubject === 'Tiếng Việt') {
                              btnBg = "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-100";
                            } else if (expandedSubject === 'Tiếng Anh') {
                              btnBg = "from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 shadow-orange-100";
                            }

                            return (
                              <button
                                key={subj}
                                onClick={() => handleProceedWithSubject(subj)}
                                className={`p-5 rounded-3xl text-white font-black text-lg bg-gradient-to-r ${btnBg} shadow-lg active:scale-95 transition-all transform hover:scale-105 duration-200 cursor-pointer border-b-4 border-black/10 flex flex-col items-center justify-center gap-2`}
                              >
                                <GraduationCap className="w-8 h-8 text-white/90" />
                                <span>{gradeName}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-6">
                          <button
                            type="button"
                            onClick={() => setExpandedSubject(null)}
                            className="px-6 py-2.5 text-xs font-black text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-full transition-all active:scale-95 cursor-pointer"
                          >
                            Quay lại chọn môn học
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-4">
                        {[
                          {
                            key: 'Toán' as const,
                            title: 'Toán học',
                            desc: 'Rèn luyện tư duy logic, tính nhẩm nhanh và giải toán hay!',
                            illustration: (
                              <div className="relative flex items-center justify-center">
                                <CuteCalculatorSVG />
                                <div className="absolute -bottom-1 -right-1">
                                  <CuteRulerMini className="w-8 h-8" />
                                </div>
                                <div className="absolute -top-2 -left-2">
                                  <CuteSparkleMini className="w-5 h-5 text-amber-400" />
                                </div>
                              </div>
                            ),
                            cardStyle: "border-blue-200 bg-gradient-to-b from-blue-50/40 to-white hover:border-blue-300 hover:shadow-xl hover:scale-[1.03] transition-all text-blue-950 shadow-sm relative overflow-hidden",
                            buttonStyle: "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100"
                          },
                          {
                            key: 'Tiếng Việt' as const,
                            title: 'Tiếng Việt',
                            desc: 'Bồi dưỡng tiếng mẹ đẻ, tự tin giao tiếp và cảm thụ văn học!',
                            illustration: (
                              <div className="relative flex items-center justify-center">
                                <CuteBookSVG />
                                <div className="absolute -bottom-1 -right-1">
                                  <CutePencilMini className="w-8 h-8" />
                                </div>
                                <div className="absolute -top-2 -left-2">
                                  <CuteSmallStar className="w-6 h-6 text-yellow-400" />
                                </div>
                              </div>
                            ),
                            cardStyle: "border-emerald-200 bg-gradient-to-b from-emerald-50/40 to-white hover:border-emerald-300 hover:shadow-xl hover:scale-[1.03] transition-all text-emerald-950 shadow-sm relative overflow-hidden",
                            buttonStyle: "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-100"
                          },
                          {
                            key: 'Tiếng Anh' as const,
                            title: 'Tiếng Anh',
                            desc: 'Bứt phá Anh ngữ toàn diện, tự tin phát âm chuẩn bản xứ!',
                            illustration: (
                              <div className="relative flex items-center justify-center">
                                <CuteEnglishSVG />
                                <div className="absolute -bottom-1 -right-1">
                                  <CuteLightbulbMini className="w-8 h-8" />
                                </div>
                                <div className="absolute -top-2 -left-2">
                                  <CuteSparkleMini className="w-5 h-5 text-orange-400" />
                                </div>
                              </div>
                            ),
                            cardStyle: "border-orange-200 bg-gradient-to-b from-orange-50/40 to-white hover:border-orange-300 hover:shadow-xl hover:scale-[1.03] transition-all text-orange-950 shadow-sm relative overflow-hidden",
                            buttonStyle: "bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-100"
                          }
                        ].map((category) => {
                          const matched = getAvailableSubjectsForCategory(category.key);
                          const singleSubj = matched[0];
                          const gradeText = matched.length === 1 && singleSubj ? singleSubj.match(/Lớp \d+/)?.[0] : null;

                          return (
                            <div 
                              key={category.key}
                              onClick={() => handleSelectCategory(category.key)}
                              className={`p-6 rounded-[32px] border-2 flex flex-col items-center text-center justify-between select-none w-full min-h-[290px] cursor-pointer active:scale-[0.98] transition-all ${category.cardStyle}`}
                            >
                              <div className="absolute top-4 right-4 opacity-50">
                                <CuteSparkleMini className="w-4 h-4" />
                              </div>
                              <div className="absolute bottom-16 left-4 opacity-30">
                                <CuteSmallStar className="w-3.5 h-3.5" />
                              </div>

                              <div className="flex items-center justify-center w-full h-28 relative">
                                {category.illustration}
                              </div>
                              
                              <div className="space-y-1 mt-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                  {gradeText ? `Ôn tập • ${gradeText}` : 'Nhiều lớp học'}
                                </p>
                                <h5 className="text-xl font-black">{category.title}</h5>
                                <p className="text-[11px] text-stone-500 font-bold px-2 line-clamp-2 leading-relaxed">
                                  {category.desc}
                                </p>
                              </div>

                              <div 
                                className={`mt-4 px-6 py-2.5 text-xs font-black text-white rounded-full flex items-center gap-2 transition-all ${category.buttonStyle}`}
                              >
                                <span>{matched.length > 1 ? 'Chọn lớp' : 'Chọn môn'}</span>
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: CHỌN CHỦ ĐỀ HỌC TẬP */}
                {examStep === 'topic' && (
                  <motion.div 
                    key="step-topic"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 max-w-4xl mx-auto relative z-10"
                  >
                    {/* Floating decorative elements around Step 2 */}
                    <div className="absolute -top-12 -left-8 opacity-25 pointer-events-none select-none hidden lg:block animate-pulse">
                      <CuteLightbulbMini className="w-12 h-12" />
                    </div>
                    <div className="absolute -bottom-10 -right-8 opacity-25 pointer-events-none select-none hidden lg:block animate-bounce" style={{ animationDuration: '3.5s' }}>
                      <CuteRulerMini className="w-12 h-12" />
                    </div>
                    <div className="absolute top-1/2 -right-12 opacity-20 pointer-events-none select-none hidden xl:block">
                      <CuteSparkleMini className="w-8 h-8" />
                    </div>

                    {/* Navigation and Back button */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <button 
                        onClick={() => setExamStep('subject')}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black text-stone-500 hover:text-stone-850 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer shadow-sm"
                      >
                        ← Quay lại chọn môn
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">Môn học đang chọn:</span>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm flex items-center gap-1.5">
                          {selectedExamSubject.startsWith('Toán') ? <CuteRulerMini className="w-4 h-4 text-blue-500" /> : selectedExamSubject.startsWith('Tiếng Việt') ? <CutePencilMini className="w-4 h-4 text-emerald-500" /> : <CuteLightbulbMini className="w-4 h-4 text-orange-500" />}
                          {selectedExamSubject}
                        </span>
                      </div>
                    </div>

                    <div className="relative max-w-xl mx-auto py-2">
                      {/* Cute student boy on left of Step 2 header */}
                      <div className="hidden lg:block absolute lg:left-[-120px] xl:left-[-140px] bottom-[-20px] lg:w-28 lg:h-48 xl:w-36 xl:h-60 select-none pointer-events-none z-10 transition-transform hover:scale-105 duration-300">
                        <TransparentImage 
                          src={studentBoyPng} 
                          onError={(e) => { e.currentTarget.src = studentAvatarJpg }} 
                          alt="Student Boy"
                          className="w-full h-full object-contain drop-shadow-xl"
                        />
                        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex flex-col items-center bg-pink-100 text-pink-600 px-3 py-1.5 rounded-xl border border-pink-200 text-[10px] font-black shadow-md rotate-[-12deg] whitespace-nowrap animate-bounce" style={{ animationDuration: '3s' }}>
                          <span>1+2 == 3</span>
                        </div>
                      </div>

                      {/* Cute student girl on right of Step 2 header */}
                      <div className="hidden lg:block absolute lg:right-[-120px] xl:right-[-140px] bottom-[-20px] lg:w-28 lg:h-48 xl:w-36 xl:h-60 select-none pointer-events-none z-10 transition-transform hover:scale-105 duration-300">
                        <TransparentImage 
                          src={studentGirlPng} 
                          onError={(e) => { e.currentTarget.src = studentAvatarJpg }} 
                          alt="Student Girl"
                          className="w-full h-full object-contain drop-shadow-xl"
                        />
                        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex flex-col items-center bg-purple-100 text-purple-600 px-3 py-1.5 rounded-xl border border-purple-200 text-[10px] font-black shadow-md rotate-[12deg] whitespace-nowrap animate-bounce" style={{ animationDuration: '3.5s' }}>
                          <span>ABC</span>
                        </div>
                      </div>

                      <div className="text-center max-w-md mx-auto space-y-2 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm">BƯỚC 2</span>
                        <h4 className="text-2xl font-black text-stone-850 pt-1">Chọn chủ đề bài học 📚</h4>
                        <p className="text-xs text-stone-500 font-extrabold leading-relaxed">Chọn chủ đề học tập để AI thiết kế đề ôn tập riêng cho con!</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {!examCategories || examCategories.every(cat => cat.topics.length === 0) ? (
                        <div className="md:col-span-2 text-center py-12 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                          <p className="text-xs font-bold text-stone-500">Chưa có chủ đề nào cho môn học này</p>
                          <p className="text-[10px] text-stone-400 mt-1">Vui lòng liên hệ Giáo viên hoặc Quản trị viên để thêm chủ đề tự luyện cho lớp học.</p>
                        </div>
                      ) : (
                        examCategories.flatMap((category) => {
                          return category.topics.map((topic) => {
                            const isSelected = selectedExamTopic === topic;
                            const isCompleted = results.some(r => r.topic && r.topic.trim().toLowerCase() === topic.trim().toLowerCase());
                            
                            // Text color rules: green for completed, dark stone for uncompleted
                            const textColorClass = isCompleted 
                              ? 'text-emerald-700 font-black' 
                              : 'text-stone-800 font-bold';

                            return (
                              <button
                                key={topic}
                                onClick={() => {
                                  setSelectedExamTopic(topic);
                                  setExamStep('config');
                                }}
                                className="text-left p-4.5 rounded-[24px] border-2 transition-all duration-150 flex items-center justify-between cursor-pointer bg-white border-stone-100 hover:border-blue-300 hover:shadow-lg hover:scale-[1.01] relative overflow-hidden"
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {getTopicIcon(selectedExamSubject, isCompleted)}
                                  
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-stone-400 mb-0.5">{category.name}</p>
                                    <h5 className={`text-xs md:text-sm font-extrabold truncate leading-snug ${textColorClass}`}>
                                      {topic}
                                    </h5>
                                  </div>
                                </div>

                                {/* Completion Badge */}
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {isCompleted ? (
                                    <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full border tracking-wide bg-emerald-50 text-emerald-600 border-emerald-100">
                                      ✓ Đã làm
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-full border tracking-wide bg-rose-50 text-rose-500 border-rose-100">
                                      ✗ Chưa làm
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          });
                        })
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: CHỌN SỐ LƯỢNG, ĐỘ KHÓ & BẮT ĐẦU */}
                {examStep === 'config' && (
                  <motion.div 
                    key="step-config"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 max-w-5xl mx-auto"
                  >
                    {/* Navigation and Back button */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <button 
                        onClick={() => setExamStep('topic')}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 transition-all cursor-pointer"
                      >
                        ← Quay lại chọn chủ đề
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Đang chọn:</span>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          {selectedExamSubject}
                        </span>
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 max-w-xs truncate">
                          {selectedExamTopic}
                        </span>
                      </div>
                    </div>

                    <div className="text-center max-w-md mx-auto space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">BƯỚC 3</span>
                      <h4 className="text-lg font-black text-stone-800 pt-1">Cấu hình câu hỏi & Bắt đầu 🚀</h4>
                      <p className="text-xs text-stone-500 font-semibold leading-relaxed">Chọn số lượng câu hỏi và độ khó con muốn ôn luyện nhé!</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Column 1: Config settings */}
                      <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                        {/* Big Question count cards */}
                        <div className="space-y-3">
                          <label className="text-xs font-black text-stone-700 block">
                            Số lượng câu hỏi con muốn ôn tập:
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { count: 10, label: 'Cơ bản', desc: 'Khoảng 10 phút', emoji: '⭐' },
                              { count: 20, label: 'Kiểm tra chuẩn', desc: 'Đầy đủ 20 phút', emoji: '🏆' },
                              { count: 30, label: 'Chuyên sâu', desc: 'Thử thách 30 phút', emoji: '🧠' }
                            ].map((item) => {
                              const isCountSelected = selectedExamQuestionCount === item.count;
                              return (
                                <button
                                  key={item.count}
                                  type="button"
                                  onClick={() => setSelectedExamQuestionCount(item.count)}
                                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 flex flex-col justify-between h-28 cursor-pointer ${
                                    isCountSelected
                                      ? 'border-blue-500 bg-blue-50/60 ring-4 ring-blue-500/10 shadow-sm scale-[1.02]'
                                      : 'border-stone-100 bg-stone-50/30 text-stone-500 hover:bg-stone-50 hover:border-stone-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-xl">{item.emoji}</span>
                                    {isCountSelected && (
                                      <span className="w-4.5 h-4.5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-black">✓</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className={`text-xs font-black ${isCountSelected ? 'text-blue-900' : 'text-stone-700'}`}>
                                      {item.count} câu hỏi
                                    </p>
                                    <p className="text-[9px] text-stone-400 font-semibold mt-0.5">
                                      {item.desc}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Difficulty selection cards */}
                        <div className="space-y-3">
                          <label className="text-xs font-black text-stone-700 block">
                            Độ khó câu hỏi con mong muốn:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: 'All', label: 'Tất cả (All)', color: 'bg-stone-800 border-stone-800 ring-stone-500/10' },
                              { value: 'Easy', label: 'Dễ (Easy)', color: 'bg-emerald-600 border-emerald-600 ring-emerald-500/10' },
                              { value: 'Medium', label: 'Vừa (Medium)', color: 'bg-amber-500 border-amber-500 ring-amber-500/10' },
                              { value: 'Hard', label: 'Khó (Hard)', color: 'bg-rose-600 border-rose-600 ring-rose-500/10' }
                            ].map((item) => {
                              const isDiffSelected = selectedExamDifficulty === item.value;
                              return (
                                <button
                                  key={item.value}
                                  type="button"
                                  onClick={() => setSelectedExamDifficulty(item.value)}
                                  className={`py-3.5 px-2 rounded-2xl border-2 text-center transition-all duration-150 text-xs font-extrabold cursor-pointer ${
                                    isDiffSelected
                                      ? `${item.color} text-white ring-4 shadow-sm scale-102`
                                      : 'border-stone-100 bg-stone-50/30 text-stone-500 hover:bg-stone-50 hover:border-stone-200'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Supporting encouragement card */}
                        <div className="bg-amber-50/50 border border-amber-100/50 p-4 rounded-2xl flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                            AI của Lightedu sẽ ngay lập tức biên soạn đề ngẫu nhiên bám sát cấu trúc của Bộ Giáo dục để giúp con tăng tốc tư duy tối đa!
                          </p>
                        </div>

                        {/* START ACTION BUTTON */}
                        <div className="pt-2">
                          <button
                            onClick={handleStartSelfQuiz}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-100 hover:shadow-xl transition-all flex items-center justify-center gap-3 group cursor-pointer"
                          >
                            <span className="tracking-widest">Bắt đầu ôn tập cùng AI 🚀</span>
                            <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1.5 transition-transform" />
                          </button>
                        </div>
                      </div>

                      {/* Column 2: AI Advice & Motivation */}
                      <div className="lg:col-span-6 space-y-6">
                        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/70 rounded-3xl p-6 border border-blue-100 shadow-md h-full flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-indigo-100/60">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-white shadow-md shadow-blue-200">
                                  <BrainCircuit className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                  <h4 className="text-sm md:text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                                    Trợ lý AI khuyên con 🦉
                                  </h4>
                                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5">
                                    Dựa trên lịch sử học tập của con đối với chủ đề: {selectedExamTopic}
                                  </p>
                                </div>
                              </div>
                              {isAdviceLoading && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 font-bold text-[9px] uppercase tracking-wider">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                </div>
                              )}
                            </div>

                            <div className="prose prose-sm max-w-none min-h-[180px]">
                              {isAdviceLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                  <p className="text-xs text-stone-400 font-semibold italic animate-pulse">Trợ lý AI đang nghiên cứu tiến trình học và chuẩn bị bí quyết cho con...</p>
                                </div>
                              ) : studyAdvice ? (
                                <div className="markdown-body text-xs md:text-sm text-stone-700 leading-relaxed bg-white/80 p-5 rounded-2xl border border-stone-100/50 shadow-inner max-h-[300px] overflow-y-auto custom-scrollbar">
                                  <Markdown>{studyAdvice}</Markdown>
                                </div>
                              ) : (
                                <div className="p-5 text-center text-xs text-stone-400 italic">
                                  Hãy chọn chủ đề bên dưới hoặc môn học khác để trợ lý AI chuẩn bị lời khuyên học tập phù hợp nhất nhé! 🌟
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-stone-50">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                              ✓
                            </div>
                            <div>
                              <p className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">Học chăm chỉ</p>
                              <p className="text-xs font-bold text-stone-600 mt-0.5">Luyện tập thường xuyên để nâng cao điểm xếp hạng của lớp nhé!</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}

          {/* TAB 4: KẾT QUẢ HỌC TẬP (Test history & AI study route) */}
          {activeTab === 'ket-qua' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              {/* AI performance analyzer action box */}
              <div className="bg-stone-900 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl shadow-stone-900/10 border border-stone-800">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 pointer-events-none"></div>
                <div className="space-y-2 relative z-10">
                  <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lộ trình cá nhân hóa</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold">Cố vấn học tập AI</h3>
                  <p className="text-xs text-stone-400 max-w-lg leading-relaxed">
                    Dựa trên toàn bộ kết quả luyện tập của bạn, AI sẽ phân tích chi tiết điểm mạnh, điểm yếu và gợi ý lộ trình ôn tập giúp bạn tiến bộ nhanh nhất!
                  </p>
                </div>
                <button
                  onClick={handleAnalyzeSelf}
                  disabled={isAnalyzing}
                  className="px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group shrink-0 relative z-10"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang phân tích...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4 text-blue-200 group-hover:rotate-12 transition-transform" />
                      <span>Phân tích lộ trình AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Study history table */}
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-stone-800">Lịch sử làm bài</h3>
                    <p className="text-[10px] text-stone-400 mt-0.5">Danh sách các bài luyện tập và bài thi đã hoàn thành</p>
                  </div>
                  <span className="text-[10px] font-bold bg-stone-50 text-stone-600 border border-stone-200 px-3 py-1 rounded-full font-mono">Tổng cộng: {results.length} bài</span>
                </div>

                {results.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 text-stone-400 font-bold text-[10px] uppercase tracking-wider font-mono border-b border-stone-100">
                          <th className="py-4 px-6">Ngày làm</th>
                          <th className="py-4 px-6">Môn học</th>
                          <th className="py-4 px-6">Chủ đề / Đề thi</th>
                          <th className="py-4 px-6">Điểm số</th>
                          <th className="py-4 px-6 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {results.map((res) => {
                          const date = res.timestamp ? res.timestamp.toDate() : new Date();
                          const scorePercent = (res.score / 10) * 100;
                          let statusColor = 'text-red-500 bg-red-50 border-red-100';
                          if (res.score >= 8.0) statusColor = 'text-emerald-500 bg-emerald-50 border-emerald-100';
                          else if (res.score >= 5.0) statusColor = 'text-amber-500 bg-amber-50 border-amber-100';

                          return (
                            <tr key={res.id} className="text-xs hover:bg-stone-50/50 transition-colors">
                              <td className="py-4 px-6 font-medium text-stone-500 font-mono">
                                {date.toLocaleDateString('vi-VN')} {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-4 px-6">
                                <span className="font-bold px-2 py-0.5 bg-stone-100 text-stone-600 rounded border border-stone-200">{res.subject}</span>
                              </td>
                              <td className="py-4 px-6 font-bold text-stone-800 line-clamp-1 max-w-[200px] md:max-w-xs">
                                {res.topic || 'Đề thi của giáo viên'}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-stone-800">{res.score}</span>
                                  <span className="text-stone-400">/10</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <span className={`px-2.5 py-1 rounded-full font-bold text-[9px] border uppercase ${statusColor}`}>
                                  {res.score >= 8.0 ? 'Xuất Sắc' : res.score >= 5.0 ? 'Đạt' : 'Cần cố gắng'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center flex flex-col items-center">
                    <BarChart2 className="w-12 h-12 text-stone-200 mb-4" />
                    <h4 className="text-sm font-bold text-stone-700">Chưa có kết quả học tập</h4>
                    <p className="text-xs text-stone-400 mt-1 max-w-xs leading-relaxed">Vui lòng hoàn thành ít nhất 1 đề kiểm tra trắc nghiệm để hệ thống cập nhật lịch sử tiến độ học tập!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: LỊCH HỌC */}
          {activeTab === 'lich-hoc' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-50 text-[#2563eb] rounded-xl">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-800">Lịch học & Deadline</h3>
                    <p className="text-[10px] text-stone-400 mt-0.5">Sắp xếp thời gian học tập khoa học mỗi ngày</p>
                  </div>
                </div>

                {/* Calendar View mock */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-stone-500 font-mono border-b border-stone-100 pb-3 mb-3">
                  <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const hasEvent = dayNum === 10 || dayNum === 15 || dayNum === 22;
                    return (
                      <div 
                        key={idx} 
                        className={`py-3.5 rounded-xl flex flex-col items-center justify-between min-h-[50px] relative border ${
                          hasEvent 
                            ? 'bg-blue-50/50 border-blue-100 text-[#2563eb] font-bold' 
                            : 'border-stone-50 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <span className="font-mono text-xs">{dayNum}</span>
                        {hasEvent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1"></span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 space-y-3 pt-6 border-t border-stone-100">
                  <h4 className="text-xs font-bold text-stone-700">Các mục tiêu học tập sắp tới</h4>
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                      <span className="text-stone-700 font-semibold">Tự ôn tập Tiếng Việt (Chủ đề: Từ đồng nghĩa, trái nghĩa)</span>
                    </div>
                    <span className="text-stone-400 font-bold font-mono">15/07</span>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-stone-700 font-semibold">Hạn chót làm bài kiểm tra Toán của Thầy Cô</span>
                    </div>
                    <span className="text-stone-400 font-bold font-mono">22/07</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: BẢNG XẾP HẠNG */}
          {activeTab === 'bang-xep-hang' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1e293b]">Bảng xếp hạng học sinh</h3>
                      <p className="text-[10px] text-stone-400 mt-0.5">Vinh danh các học sinh tích cực học tập & đạt điểm cao</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-amber-500 text-white px-3 py-1 rounded-full uppercase tracking-wider font-mono">Học tập</span>
                    {userProfile.grade && (
                      <span className="text-[10px] font-bold bg-indigo-500 text-white px-3 py-1 rounded-full uppercase tracking-wider font-mono">{userProfile.grade}</span>
                    )}
                  </div>
                </div>

                {/* FILTER CONTROLS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {/* Class Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Xếp hạng theo lớp</label>
                    <select
                      value={leaderboardClassFilter}
                      onChange={(e) => setLeaderboardClassFilter(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    >
                      <option value="all">Tất cả các lớp</option>
                      {userProfile.classId && (
                        <option value="mine">
                          Lớp của tôi ({allClasses.find(c => c.id === userProfile.classId)?.name || 'Đang tải...'})
                        </option>
                      )}
                      {allClasses
                        .filter(c => c.id !== userProfile.classId)
                        .map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Subject Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Xếp hạng theo môn</label>
                    <select
                      value={leaderboardSubjectFilter}
                      onChange={(e) => setLeaderboardSubjectFilter(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    >
                      <option value="all">Tất cả các môn</option>
                      <option value="Toán">Môn Toán</option>
                      <option value="Tiếng Việt">Môn Tiếng Việt</option>
                      <option value="Tiếng Anh">Môn Tiếng Anh</option>
                    </select>
                  </div>

                  {/* School Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Xếp hạng theo trường</label>
                    <select
                      value={leaderboardSchoolFilter}
                      onChange={(e) => setLeaderboardSchoolFilter(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                    >
                      <option value="all">Tất cả các trường</option>
                      {userProfile.schoolName && (
                        <option value="mine">Trường của tôi ({userProfile.schoolName})</option>
                      )}
                      {Array.from(new Set(allStudents.map(s => s.schoolName).filter(Boolean)))
                        .filter(school => school !== userProfile.schoolName)
                        .map(school => (
                          <option key={school} value={school}>
                            {school}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* SCORING RULES EXPLANATION */}
                <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl mb-6 text-stone-600 text-[11px] leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1 bg-amber-100 text-amber-600 rounded-lg mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-amber-800">Quy tắc tính điểm xếp hạng:</span>
                      <ul className="list-disc list-inside mt-1.5 space-y-1 text-stone-500 font-medium">
                        <li>Làm bài tập <span className="text-amber-800 font-bold">đúng khối lớp</span> của mình: Nhận <span className="text-[#2563eb] font-bold font-mono">+1 điểm</span> cho mỗi câu trả lời đúng.</li>
                        <li>Làm bài tập <span className="text-amber-800 font-bold">vượt khối lớp</span> (vượt lớp): Nhận <span className="text-[#2563eb] font-bold font-mono">+2 điểm</span> cho mỗi câu trả lời đúng.</li>
                        <li>Làm bài tập <span className="text-amber-800 font-bold">nhỏ hơn khối lớp</span> của mình: Nhận <span className="text-[#2563eb] font-bold font-mono">+0.5 điểm</span> cho mỗi câu trả lời đúng.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* LEADERBOARD LIST */}
                <div className="space-y-3">
                  {getLeaderboardData().length === 0 ? (
                    <div className="py-12 text-center text-stone-400 font-semibold flex flex-col items-center justify-center gap-2">
                      <BookOpen className="w-8 h-8 text-stone-300" />
                      <p className="text-xs">Chưa có kết quả học tập nào khớp với bộ lọc đã chọn.</p>
                    </div>
                  ) : (
                    getLeaderboardData().map((student) => (
                      <div 
                        key={student.uid} 
                        className={`p-4 rounded-2xl flex items-center justify-between border text-xs transition-all ${
                          student.isCurrent 
                            ? 'bg-blue-50/50 border-blue-200/50 shadow-sm shadow-blue-100/50' 
                            : 'bg-stone-50 border-stone-100 hover:bg-stone-100/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 flex justify-center text-center font-black font-mono text-sm">
                            {student.rank === 1 ? (
                              <span className="text-xl">🥇</span>
                            ) : student.rank === 2 ? (
                              <span className="text-xl">🥈</span>
                            ) : student.rank === 3 ? (
                              <span className="text-xl">🥉</span>
                            ) : (
                              <span className="text-stone-400">{student.rank}</span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold truncate ${student.isCurrent ? 'text-[#2563eb]' : 'text-stone-800'}`}>
                                {student.name}
                              </span>
                              {student.isCurrent && (
                                <span className="text-[9px] font-bold bg-blue-100 text-[#2563eb] px-1.5 py-0.5 rounded-full">Bạn</span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-400 font-medium truncate mt-0.5">
                              {student.className} • {student.schoolName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-stone-500 font-semibold font-mono shrink-0 pl-4">
                          <span className="hidden sm:inline text-[11px]">{student.count} lượt thi</span>
                          <span className="font-extrabold text-stone-900 text-sm bg-stone-100/80 px-3 py-1.5 rounded-xl border border-stone-200/50 flex items-center gap-1">
                            <span className="text-amber-500">★</span>
                            <span>{student.points.toLocaleString()} điểm</span>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 7: THÀNH TÍCH */}
          {activeTab === 'thanh-tich' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Chăm Chỉ Vô Song', desc: 'Đã hoàn thành hơn 5 bài trắc nghiệm tự chọn', unlocked: results.length >= 5, icon: Flame, color: 'text-amber-500 bg-amber-50' },
                  { title: 'Thủ Khoa Đề Thi', desc: 'Đạt điểm 10.0 tuyệt đối trong ít nhất 1 đề kiểm tra', unlocked: results.some(r => r.score === 10), icon: Trophy, color: 'text-red-500 bg-red-50' },
                  { title: 'Bạn Đồng Hành AI', desc: 'Đã sử dụng tư vấn học tập AI để phân tích kết quả', unlocked: results.length > 0, icon: Sparkles, color: 'text-blue-500 bg-blue-50' },
                  { title: 'Chuyên Gia Toán Học', desc: 'Đạt điểm trung bình Toán trên 8.0', unlocked: results.filter(r => r.subject.startsWith('Toán')).length > 0 && subjectAverages['Toán'] >= 8, icon: Calculator, color: 'text-indigo-500 bg-indigo-50' },
                  { title: 'Nhà Văn Nhí Tài Năng', desc: 'Đạt điểm trung bình Tiếng Việt trên 8.0', unlocked: results.filter(r => r.subject === 'Tiếng Việt').length > 0 && subjectAverages['Tiếng Việt'] >= 8, icon: BookOpen, color: 'text-emerald-500 bg-emerald-50' },
                  { title: 'Chiến Binh Đề Thi', desc: 'Đã tham gia lớp học và nhận đề thi của thầy cô', unlocked: !!userProfile.classId, icon: School, color: 'text-[#2563eb] bg-blue-50' }
                ].map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <div 
                      key={idx} 
                      className={`p-6 rounded-3xl border text-center flex flex-col items-center justify-between space-y-4 transition-all relative overflow-hidden bg-white ${
                        badge.unlocked 
                          ? 'border-stone-100 shadow-sm' 
                          : 'border-dashed border-stone-200 opacity-60'
                      }`}
                    >
                      <div className={`p-4 rounded-2xl ${badge.unlocked ? badge.color : 'bg-stone-50 text-stone-400'}`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-stone-800">{badge.title}</h4>
                        <p className="text-[11px] text-stone-400 leading-relaxed px-2">{badge.desc}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                        badge.unlocked 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-stone-50 text-stone-400'
                      }`}>
                        {badge.unlocked ? 'Đã mở khóa' : 'Chưa đạt'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 8: THÔNG BÁO */}
          {activeTab === 'thong-bao' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-4"
            >
              {[
                { title: 'Thầy cô vừa giao đề thi mới', desc: 'Bài ôn tập cuối học kỳ 2 môn Toán lớp 5 đã được mở. Con hãy cố gắng hoàn thành trước ngày 22/07 nhé.', time: '2 giờ trước', type: 'assignment' },
                { title: 'Trợ lý AI vừa phân tích kết quả mới', desc: 'Có tiến trình học tập vượt bậc trong môn Tiếng Anh! Hãy xem lộ trình để giữ vững phong độ.', time: '1 ngày trước', type: 'ai' },
                { title: 'Cập nhật hệ thống Lightedu v2.0', desc: 'Trải nghiệm giao diện học tập thế hệ mới, tối ưu hóa biểu đồ điểm và tốc độ chấm thi bằng AI.', time: '3 ngày trước', type: 'system' }
              ].map((notif, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-start gap-4 hover:border-blue-100 hover:shadow-md transition-all">
                  <div className={`p-3 rounded-xl shrink-0 ${
                    notif.type === 'assignment' ? 'bg-emerald-50 text-emerald-600' : notif.type === 'ai' ? 'bg-blue-50 text-[#2563eb]' : 'bg-stone-50 text-stone-500'
                  }`}>
                    {notif.type === 'assignment' ? <School className="w-5 h-5" /> : notif.type === 'ai' ? <BrainCircuit className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800">{notif.title}</span>
                      <span className="text-stone-400 font-semibold font-mono text-[10px]">{notif.time}</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">{notif.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* TAB 9: TÀI KHOẢN (Profile detail with class settings) */}
          {activeTab === 'tai-khoan' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm flex flex-col items-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg relative group">
                  <img
                    src={studentAvatar}
                    alt={userProfile.displayName || 'Avatar'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-stone-800">{userProfile.displayName || 'Học sinh'}</h3>
                  <p className="text-xs text-[#2563eb] font-bold uppercase tracking-wider">
                    {className ? `Học sinh lớp ${className}` : `Học sinh ${studentGrade}`}
                  </p>
                  <p className="text-xs text-stone-400 font-mono mt-1">{(userProfile.email || '').replace('@tuanlo.vn', '')}</p>
                </div>

                <div className="border-t border-stone-100 pt-6 w-full space-y-4 text-left">
                  <div className="flex items-center justify-between text-xs p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-stone-400 font-semibold">Trường học</span>
                    <span className="font-bold text-stone-700">{userProfile.schoolName || 'Chưa cập nhật'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-stone-400 font-semibold">Khối lớp học tập</span>
                    <select
                      value={studentGrade}
                      onChange={async (e) => {
                        const newGrade = e.target.value;
                        setStudentGrade(newGrade);
                        if (userProfile?.uid) {
                          try {
                            await updateDoc(doc(db, 'users', userProfile.uid), {
                              grade: newGrade
                            });
                          } catch (err) {
                            console.error("Error updating user grade:", err);
                          }
                        }
                      }}
                      className="font-bold text-stone-700 bg-white border border-stone-200 rounded-lg px-2 py-1 outline-none text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Lớp 1">Lớp 1</option>
                      <option value="Lớp 2">Lớp 2</option>
                      <option value="Lớp 3">Lớp 3</option>
                      <option value="Lớp 4">Lớp 4</option>
                      <option value="Lớp 5">Lớp 5</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-stone-400 font-semibold">Lớp học hiện tại</span>
                    <span className="font-bold text-stone-700">{className ? `${className} (Mã: ${userProfile.classId})` : 'Tự học tự do'}</span>
                  </div>
                </div>

                {!userProfile.classId && (
                  <div className="w-full space-y-2 pt-2">
                    <p className="text-[11px] text-stone-400 font-medium">Nhập mã lớp học để kết nối với Thầy Cô:</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="CLASS123"
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value)}
                        className="flex-1 px-4 py-3 text-xs font-semibold rounded-xl border border-stone-200 outline-none focus:ring-1 focus:ring-[#2563eb] bg-stone-50"
                      />
                      <button 
                        onClick={handleJoinClass}
                        disabled={isJoining}
                        className="px-6 bg-[#2563eb] hover:bg-blue-700 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap"
                      >
                        {isJoining ? '...' : 'Tham gia'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 10: CÀI ĐẶT */}
          {activeTab === 'cai-dat' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-stone-800">Cấu hình tài khoản</h3>
                  <p className="text-[10px] text-stone-400 mt-0.5">Tùy biến tài khoản ôn tập của bạn</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs">
                    <div>
                      <h4 className="font-bold text-stone-700">Thông báo qua Email</h4>
                      <p className="text-[10px] text-stone-400 mt-0.5">Gửi email khi thầy cô giao đề thi mới</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-[#2563eb]" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs">
                    <div>
                      <h4 className="font-bold text-stone-700">Tự động phát giọng đọc đề thi AI</h4>
                      <p className="text-[10px] text-stone-400 mt-0.5">Đọc câu hỏi bằng tiếng Việt khi làm đề</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-[#2563eb]" />
                  </div>
                </div>

                <div className="pt-6 border-t border-stone-100">
                  <button
                    onClick={handleLogout}
                    className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất khỏi thiết bị</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 11: HƯỚNG DẪN HỌC */}
          {activeTab === 'huong-dan' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto space-y-8"
              id="guide-tab-container"
            >
              {/* Header section */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 sm:p-8 rounded-[32px] text-white shadow-xl shadow-emerald-100/40 relative overflow-hidden" id="guide-header">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/10">Cẩm nang Lightedu</span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Giới Thiệu & Hướng Dẫn Sử Dụng</h2>
                    <p className="text-xs sm:text-sm text-emerald-100 max-w-xl font-medium leading-relaxed">
                      Chào mừng phụ huynh và các em học sinh đến với ứng dụng học tập thông minh. Xem hướng dẫn sử dụng tài khoản học sinh dưới đây để tối ưu hóa việc học tập.
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <button
                      id="btn-copy-advertising"
                      onClick={() => {
                        const adText = `🌟 GIỚI THIỆU ỨNG DỤNG HỌC TẬP THÔNG MINH LIGHTEDU
Giải Pháp Học Tập Toàn Diện – Đồng Hành Cùng Con Chinh Phục Tri Thức

Kính gửi Quý phụ huynh và các em học sinh thân mến,
Trong thời đại công nghệ số, việc tự học và ôn luyện kiến thức trực tiếp trực tuyến đã trở thành chìa khóa vàng giúp các em học sinh bứt phá trong học tập. Lightedu ra đời với sứ mệnh mang đến một môi trường học tập Chủ động – Sáng tạo – Đầy hứng khởi dành riêng cho học sinh Tiểu học và Trung học.

🚀 ƯU ĐIỂM VƯỢT TRỘI CỦA LIGHTEDU:
1. Tự Tạo Đề Ôn Luyện Bằng AI: Học sinh không còn bị bó buộc trong những bộ đề mẫu cũ kỹ. Với trí tuệ nhân tạo Gemini tích hợp, các em chỉ cần chọn môn học hoặc tự nhập chủ đề mong muốn (Ví dụ: "Phép cộng trong phạm vi 100", "Từ vựng tiếng Anh chủ đề gia đình", "Ki-lô-gam và Lít"), hệ thống sẽ ngay lập tức biên soạn một bộ đề trắc nghiệm chuẩn kiến thức với độ khó tùy chọn (Dễ, Vừa, Khó).
2. Nhận Đề Kiểm Tra Trực Tiếp Từ Giáo Viên: Học sinh dễ dàng tham gia lớp học bằng Mã Lớp (Class Code) để nhận bài tập, đề kiểm tra chính thức và ôn luyện theo đúng lộ trình trên lớp.
3. Nhận Diện Tiến Độ Bằng Màu Sắc Trực Quan:
   - 🟢 Màu xanh lá (Đã hoàn thành): Đánh dấu các bài tập, chủ đề đã hoàn thành xuất sắc, giúp con tự tin tiến bước.
   - 🔴 Màu đỏ (Chưa làm): Nhắc nhở trực quan những bài tập còn bỏ ngỏ, giúp phụ huynh và học sinh dễ dàng theo dõi mà không sợ bỏ sót bài vở.
4. Cố Vấn Học Tập AI Cá Nhân Hóa: Sau mỗi bài kiểm tra, trợ lý AI thông minh sẽ phân tích kết quả thực tế, chỉ ra điểm mạnh, điểm cần khắc phục và gợi ý lộ trình học tập tối ưu riêng cho từng em.
5. Hệ Thống Điểm Thưởng XuEdu & Bảng Xếp Hạng Đầy Động Lực: Khi hoàn thành tốt các bài làm, học sinh sẽ nhận được điểm thưởng XuEdu để tranh tài trên Bảng xếp hạng Lớp học và Trường học, tạo động lực cạnh tranh lành mạnh giúp các em say mê học tập hơn.

📖 HƯỚNG DẪN SỬ DỤNG CHI TIẾT DÀNH CHO HỌC SINH:
- Bước 1: Đăng nhập bằng tài khoản được cấp, cập nhật khối lớp của mình tại tab "Cài đặt" để hiển thị đúng chương trình học.
- Bước 2: Tại tab "Đề kiểm tra của GV", nhập Mã Lớp được Thầy/Cô cấp để đồng bộ hóa bài tập.
- Bước 3: Đề thi đã hoàn thành sẽ chuyển sang màu xanh lá (🟢 Đã hoàn thành). Đề thi chưa làm sẽ có màu đỏ (🔴 Chưa làm). Hãy cố gắng làm bài đầy đủ nhé!
- Bước 4: Tự ôn tập tại tab "Trang chủ" bằng cách chọn môn học, click các chủ đề gợi ý hoặc tự gõ chủ đề bất kỳ để AI tạo bộ câu hỏi chất lượng tức thì.
- Bước 5: Xem sự tiến bộ vượt bậc qua biểu đồ học tập tại tab "Kết quả học tập", và click "Cố vấn AI" để nhận lời khuyên đắt giá!`;
                        navigator.clipboard.writeText(adText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-5 py-3 bg-white text-emerald-700 font-bold text-xs rounded-2xl hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      <span>{copied ? '✓ Đã sao chép!' : '📋 Sao chép bài quảng cáo'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="guide-layout">
                {/* Column 1: Marketing / Advertising Article (Copier) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-4" id="guide-marketing-box">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <h3 className="text-sm font-bold text-stone-800">Bài giới thiệu cho Phụ huynh & Học sinh</h3>
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-400 font-medium">Bản thảo quảng cáo hoàn chỉnh được soạn thảo chuyên nghiệp. Thầy/Cô hoặc Học sinh có thể gửi qua Zalo, Facebook để quảng bá Lightedu.</p>
                    
                    <div className="bg-stone-50 border border-stone-100 p-5 rounded-2xl max-h-[480px] overflow-y-auto text-xs text-stone-600 leading-relaxed space-y-4 font-normal custom-scrollbar select-all" id="guide-marketing-content">
                      <p className="font-extrabold text-stone-800 text-center text-sm">🌟 GIỚI THIỆU ỨNG DỤNG HỌC TẬP THÔNG MINH LIGHTEDU</p>
                      <p className="font-bold text-stone-700 text-center">Giải Pháp Học Tập Toàn Diện – Đồng Hành Cùng Con Chinh Phục Tri Thức</p>
                      
                      <p className="italic">Kính gửi Quý phụ huynh và các em học sinh thân mến,</p>
                      <p>Trong thời đại công nghệ số, việc tự học và ôn luyện kiến thức trực tiếp trực tuyến đã trở thành chìa khóa vàng giúp các em học sinh bứt phá trong học tập. <strong>Lightedu</strong> ra đời với sứ mệnh mang đến một môi trường học tập <strong>Chủ động – Sáng tạo – Đầy hứng khởi</strong> dành riêng cho học sinh Tiểu học và Trung học.</p>
                      
                      <p className="font-bold text-stone-800">🚀 ƯU ĐIỂM VƯỢT TRỘI CỦA LIGHTEDU:</p>
                      <ul className="list-decimal pl-4 space-y-2">
                        <li><strong>Tự Tạo Đề Ôn Luyện Bằng AI</strong>: Học sinh không còn bị bó buộc trong các bộ đề mẫu cũ kỹ. Với trí tuệ nhân tạo Gemini tích hợp, các em chỉ cần chọn môn học hoặc tự nhập chủ đề mong muốn, hệ thống sẽ ngay lập tức biên soạn đề thi chuẩn.</li>
                        <li><strong>Nhận Đề Kiểm Tra Từ Giáo Viên</strong>: Tham gia lớp học bằng mã lớp để đồng bộ đề từ giáo viên.</li>
                        <li><strong>Màu Sắc Nhận Diện Tiến Độ</strong>: 
                          <br />🟢 <span className="text-emerald-600 font-bold">Màu xanh lá (Đã hoàn thành)</span>: Bài thi đã làm xong.
                          <br />🔴 <span className="text-rose-600 font-bold">Màu đỏ (Chưa làm)</span>: Bài thi cần hoàn thành, giúp dễ dàng kiểm soát bài vở.
                        </li>
                        <li><strong>Cố Vấn Học Tập AI Cá Nhân</strong>: Phân tích chi tiết và đề xuất lộ trình dựa trên kết quả thực tế.</li>
                        <li><strong>Tích Lũy XuEdu Đổi Điểm Thưởng</strong>: Tạo động lực cạnh tranh lành mạnh trên Bảng xếp hạng.</li>
                      </ul>

                      <p className="font-bold text-stone-800">📖 HƯỚNG DẪN SỬ DỤNG CHO HỌC SINH:</p>
                      <ol className="list-decimal pl-4 space-y-1.5">
                        <li>Chọn khối lớp phù hợp trong phần Cài đặt.</li>
                        <li>Nhập Mã Lớp của giáo viên tại tab "Đề kiểm tra của GV".</li>
                        <li>Làm bài tập: Bài đã làm hiện chữ xanh lá, chưa làm hiện chữ đỏ.</li>
                        <li>Ôn luyện tự do trên Trang chủ bằng các chủ đề gợi ý hoặc gõ chủ đề bất kỳ.</li>
                        <li>Xem biểu đồ học tập và click "Cố vấn AI" để thăng hạng tiến bộ.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Column 2: Visual Step-by-Step Instructions */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6" id="guide-steps-box">
                    <div>
                      <h3 className="text-base font-bold text-stone-800">Cách sử dụng tài khoản học sinh (On-boarding)</h3>
                      <p className="text-[10px] text-stone-400 mt-0.5">Hướng dẫn chi tiết từng bước hoạt động học tập trên hệ thống Lightedu</p>
                    </div>

                    <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-100">
                      
                      {/* Step 1 */}
                      <div className="flex gap-4 relative z-10" id="step-card-1">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563eb] font-bold text-sm flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                          01
                        </div>
                        <div className="space-y-1 pt-1.5">
                          <h4 className="text-xs font-bold text-stone-800 flex items-center gap-2">
                            Chọn Khối Lớp Học Tập
                            <span className="px-1.5 py-0.5 text-[8px] bg-blue-50 text-[#2563eb] rounded-md font-bold uppercase">Cài đặt</span>
                          </h4>
                          <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                            Đầu tiên, em vào tab <strong className="text-stone-700">Tài khoản</strong> hoặc <strong className="text-stone-700">Cài đặt</strong> để chọn khối lớp chính xác của mình (Lớp 1 đến Lớp 5). Hệ thống sẽ tự động điều chỉnh hệ thống chủ đề gợi ý và bộ câu hỏi AI sao cho phù hợp nhất với trình độ khối lớp của em.
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex gap-4 relative z-10" id="step-card-2">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
                          02
                        </div>
                        <div className="space-y-1 pt-1.5">
                          <h4 className="text-xs font-bold text-stone-800 flex items-center gap-2">
                            Kết Nối Mã Lớp Của Giáo Viên
                            <span className="px-1.5 py-0.5 text-[8px] bg-emerald-50 text-emerald-600 rounded-md font-bold uppercase">Mã lớp</span>
                          </h4>
                          <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                            Nếu thầy cô trên lớp có giao bài thi qua Lightedu, em hãy nhận Mã Lớp học từ thầy cô, nhập mã này vào ô tham gia lớp học ở tab <strong className="text-stone-700">Đề kiểm tra của GV</strong>. Tất cả đề bài thầy cô giao sẽ lập tức xuất hiện đồng bộ trong tài khoản của em.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-4 relative z-10" id="step-card-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 font-bold text-sm flex items-center justify-center shrink-0 border border-amber-100 shadow-sm">
                          03
                        </div>
                        <div className="space-y-1 pt-1.5">
                          <h4 className="text-xs font-bold text-stone-800 flex items-center gap-2">
                            Làm Bài Tập & Xem Trực Quan Màu Sắc
                            <span className="px-1.5 py-0.5 text-[8px] bg-amber-50 text-amber-600 rounded-md font-bold uppercase">Làm bài</span>
                          </h4>
                          <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                            Bất cứ khi nào có bài tập mới từ giáo viên hoặc chủ đề ôn tập gợi ý:
                            <br />- Những bài học hoặc đề thi em <span className="text-emerald-600 font-bold underline">Đã hoàn thành</span> sẽ hiển thị <strong className="text-emerald-600">chữ Xanh lá</strong> kèm dòng chữ "Đã hoàn thành".
                            <br />- Những bài học hoặc đề thi em <span className="text-rose-600 font-bold underline">Chưa làm</span> sẽ hiển thị <strong className="text-rose-600">chữ Đỏ</strong> kèm dòng chữ "Chưa làm".
                            <br />Báo cáo màu sắc trực quan này giúp em và phụ huynh không lo bị bỏ quên bài vở.
                          </p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="flex gap-4 relative z-10" id="step-card-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 font-bold text-sm flex items-center justify-center shrink-0 border border-purple-100 shadow-sm">
                          04
                        </div>
                        <div className="space-y-1 pt-1.5">
                          <h4 className="text-xs font-bold text-stone-800 flex items-center gap-2">
                            Tự Ôn Tập Tự Do Bằng AI
                            <span className="px-1.5 py-0.5 text-[8px] bg-purple-50 text-purple-600 rounded-md font-bold uppercase">Trang chủ</span>
                          </h4>
                          <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                            Ngoài các bài thi của GV, em hãy vào tab <strong className="text-stone-700">Trang chủ</strong>, chọn môn học (Toán học, Tiếng Việt, Tiếng Anh, Khoa học...), rồi click vào bất kỳ chủ đề nào có sẵn. Em cũng có thể tự gõ một chủ đề tùy thích (ví dụ: *"Bảng nhân 5"*, *"Câu ghép"*), trợ lý AI sẽ tự soạn bộ đề chất lượng cao cho em ngay tức thì.
                          </p>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div className="flex gap-4 relative z-10" id="step-card-5">
                        <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 font-bold text-sm flex items-center justify-center shrink-0 border border-pink-100 shadow-sm">
                          05
                        </div>
                        <div className="space-y-1 pt-1.5">
                          <h4 className="text-xs font-bold text-stone-800 flex items-center gap-2">
                            Lắng Nghe Lời Khuyên & Thăng Hạng
                            <span className="px-1.5 py-0.5 text-[8px] bg-pink-50 text-pink-600 rounded-md font-bold uppercase">Cố vấn AI</span>
                          </h4>
                          <p className="text-[11px] text-stone-500 leading-relaxed font-normal">
                            Sau khi em làm xong các đề thi, em sẽ nhận được điểm thưởng <strong className="text-amber-500 font-bold">XuEdu</strong>. Hãy xem biểu đồ thăng tiến tại tab <strong className="text-stone-700">Kết quả học tập</strong> và bấm nút <strong className="text-stone-700">Cố vấn AI</strong> để trợ lý Gemini thông minh đưa ra phân tích và lộ trình học tập cá nhân giúp em tiến bộ nhanh chóng nhé!
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </main>
      </div>

      {/* AI ANALYSIS ROADMAP MODAL (Full details rendering) */}
      <AnimatePresence>
        {analysisResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-100"
            >
              <div className="p-6 md:p-8 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-stone-900 to-stone-800 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20">
                    <BrainCircuit className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Cố vấn học tập AI</h3>
                    <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest">Phân tích lộ trình cá nhân</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSpeakAnalysis(analysisResult)}
                    title={isPlayingSpeech ? "Dừng đọc" : "Phát âm thanh nội dung"}
                    className={`p-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs ${
                      isPlayingSpeech
                        ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    {isPlayingSpeech ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span className="hidden sm:inline">Dừng đọc</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Nghe phân tích</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setAnalysisResult(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all text-stone-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-stone-50/30">
                <div className="prose prose-stone max-w-none">
                  <div className="markdown-body p-6 bg-white rounded-2xl border border-stone-100 shadow-sm leading-relaxed">
                    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(analysisResult || '')}</Markdown>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 border-t border-stone-100 bg-white flex justify-end">
                <button 
                  onClick={() => setAnalysisResult(null)}
                  className="px-8 py-3 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition-all shadow-md"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
