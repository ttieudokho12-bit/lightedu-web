import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, Send, BookOpen, Trash2, CheckCircle, CheckCircle2, Loader2, Sparkles, FileText, BarChart3, ChevronRight, User, Clock, Award, BrainCircuit, X, Library, Upload, FileUp, Download, CheckSquare, Square, Eye, Copy, HelpCircle, Home, Volume2, Mic, Play, Languages, Camera, Folder, Target, Pencil } from 'lucide-react';
import { db, auth, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDocs, orderBy, writeBatch } from 'firebase/firestore';
import { ClassRoom, Subject, SUBJECTS, Question, Assignment, QuizResult, UserProfile, QuizTemplate, PREDEFINED_TOPICS } from '../types';
import { generateQuestions, generateQuestionsFromContent, analyzeStudentPerformance, generateQuestionsFromFiles } from '../services/gemini';
import { LazyQuestionImage } from './LazyQuestionImage';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { formatMathSymbols } from '../services/mathUtils';
import * as XLSX from 'xlsx';
import { VocabularyIllustration } from './VocabularyIllustration';
import { SpeakingPractice } from './SpeakingPractice';
import Quiz from './Quiz';

type TeacherTab = 'CLASSES' | 'CREATE_QUIZ' | 'LIBRARY' | 'STUDENTS' | 'RESULTS';

interface TeacherDashboardProps {
  userProfile?: UserProfile | null;
}

export default function TeacherDashboard({ userProfile }: TeacherDashboardProps) {
  const currentTeacherUid = userProfile?.uid || auth.currentUser?.uid || (() => {
    try {
      const local = localStorage.getItem('localUserSession');
      if (local) return JSON.parse(local).uid;
    } catch (e) {}
    return null;
  })();

  const [teacherProfile, setTeacherProfile] = useState<UserProfile | null>(userProfile || null);

  useEffect(() => {
    if (userProfile) {
      setTeacherProfile(userProfile);
    }
    if (!currentTeacherUid) return;
    const unsub = onSnapshot(doc(db, 'users', currentTeacherUid), (docSnap) => {
      if (docSnap.exists()) {
        setTeacherProfile(docSnap.data() as UserProfile);
      }
    });
    return () => unsub();
  }, [currentTeacherUid, userProfile]);

  const teacherAllowedSubjects: Subject[] = (teacherProfile?.allowedSubjects && teacherProfile.allowedSubjects.length > 0)
    ? teacherProfile.allowedSubjects
    : SUBJECTS;

  const [activeTab, setActiveTab] = useState<TeacherTab>('CLASSES');
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string | null>(null);
  
  // AI Analysis State
  const [analyzingStudent, setAnalyzingStudent] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<{ name: string, email: string, class: string, analysis: string }[]>([]);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  
  // Quiz Creation State
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Toán Lớp 2');
  const [topic, setTopic] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [creationMode, setCreationMode] = useState<'topic' | 'content' | 'file'>('file');

  useEffect(() => {
    if (teacherAllowedSubjects.length > 0 && !teacherAllowedSubjects.includes(selectedSubject)) {
      setSelectedSubject(teacherAllowedSubjects[0]);
    }
  }, [teacherAllowedSubjects]);
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Preview & Interactive Quiz Trial State
  const [previewTab, setPreviewTab] = useState<'QUESTIONS' | 'VOCABULARY' | 'PRONUNCIATION'>('QUESTIONS');
  const [viewingQuizSubject, setViewingQuizSubject] = useState<string>('');
  const [interactiveQuizPreview, setInteractiveQuizPreview] = useState<{ questions: Question[]; subject: string; title: string } | null>(null);

  // Library State
  const [quizTemplates, setQuizTemplates] = useState<QuizTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isAssigningFromLibrary, setIsAssigningFromLibrary] = useState(false);
  const [assignToClasses, setAssignToClasses] = useState<string[]>([]);

  // Results State
  const [results, setResults] = useState<QuizResult[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // View & Re-assign State
  const [viewingQuiz, setViewingQuiz] = useState<Question[] | null>(null);
  const [viewingQuizTitle, setViewingQuizTitle] = useState('');
  const [viewingQuizId, setViewingQuizId] = useState<string | null>(null);
  const [viewingQuizType, setViewingQuizType] = useState<'assignment' | 'template' | null>(null);
  const [reassigningAssignment, setReassigningAssignment] = useState<Assignment | null>(null);
  const [reassignToClasses, setReassignToClasses] = useState<string[]>([]);
  const [isReassigning, setIsReassigning] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const handleSpeakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getEnglishVocabList = (questions: Question[]) => {
    if (!questions || questions.length === 0) return [];
    let list = questions[0]?.vocabularyList || [];
    if (list.length === 0) {
      const extracted: { word: string; meaning: string }[] = [];
      const seenWords = new Set<string>();
      
      questions.forEach(q => {
        const qText = q.question || "";
        const quoteRegex = /['"“‘]([^'"“”’]{2,})['"”’]/;
        const match = qText.match(quoteRegex);
        if (match) {
          const word = match[1].trim();
          if (/^[a-zA-Z\s\-!?,.]+$/.test(word) && !seenWords.has(word.toLowerCase()) && word.length < 25) {
            seenWords.add(word.toLowerCase());
            const correctOptionText = q.options ? q.options[q.correctAnswer] : "";
            const hasVietnamese = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(correctOptionText);
            let meaning = "Từ mới trong bài học";
            if (hasVietnamese && correctOptionText.length < 50) {
              meaning = correctOptionText;
            } else if (q.explanation) {
              meaning = q.explanation.replace(/^[’'"]|[’'"]$/g, '');
            }
            extracted.push({ word, meaning });
          }
        }
      });
      list = extracted;
    }

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
    return list;
  };

  const getTopicsForSubject = (subj: Subject, diff: string) => {
    const isEng = subj.toLowerCase().includes('anh') || subj.toLowerCase().includes('english');
    if (isEng) {
      switch (diff) {
        case 'Easy':
          return ['Nhận biết từ vựng', 'Điền chữ cái còn thiếu', 'Dịch từ Việt - Anh', 'Chọn đáp án đúng', 'Bài nghe (Listening)', 'Từ vựng & Phát âm cơ bản'];
        case 'Medium':
          return ['Hoàn thành câu tiếng Anh', 'Sắp xếp từ thành câu', 'Từ vựng theo chủ đề', 'Bài tập Đúng/Sai', 'Luyện nghe & Điền từ', 'Từ vựng & Luyện phát âm'];
        case 'Hard':
          return ['Sắp xếp câu hoàn chỉnh', 'Chọn câu đúng ngữ pháp', 'Sửa lỗi chính tả & Từ vựng', 'Phân loại từ vựng', 'Đọc hiểu đoạn văn ngắn', 'Luyện nghe & Ngữ âm nâng cao'];
        default:
          return [
            'Tổng hợp kiến thức & Từ vựng',
            'Nhận biết từ vựng', 'Điền chữ cái', 'Dịch từ vựng',
            'Hoàn thành câu', 'Sắp xếp từ', 'Từ vựng theo chủ đề',
            'Sắp xếp câu', 'Đọc hiểu & Ngữ pháp', 'Bài nghe (Listening)',
            'Từ vựng & Luyện phát âm'
          ];
      }
    }
    return PREDEFINED_TOPICS[subj] && PREDEFINED_TOPICS[subj].length > 0
      ? PREDEFINED_TOPICS[subj]
      : [
          'Ôn tập tổng hợp kiến thức',
          'Luyện tập kỹ năng cơ bản',
          'Vận dụng giải bài tập',
          'Kiểm tra định kỳ',
          'Đề thi nâng cao'
        ];
  };

  const displayedTeacherTopics = getTopicsForSubject(selectedSubject, selectedDifficulty);

  const handleImageLoaded = (index: number, imageUrl: string) => {
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], image: imageUrl };
      }
      return updated;
    });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    let snapshotsReceived = 0;
    const totalSnapshots = 5;

    const checkLoading = () => {
      snapshotsReceived++;
      if (snapshotsReceived >= totalSnapshots) {
        setLoading(false);
      }
    };

    const q = query(collection(db, 'classes'));
    const unsubscribeClasses = onSnapshot(q, (snapshot) => {
      const classList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom));
      setClasses(classList);
      checkLoading();
    }, (error) => {
      console.error('Error fetching classes:', error);
      checkLoading();
    });

    const qAssignments = currentTeacherUid
      ? query(collection(db, 'assignments'), where('teacherId', '==', currentTeacherUid))
      : query(collection(db, 'assignments'));

    const unsubscribeAssignments = onSnapshot(qAssignments, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setAssignments(list);
      checkLoading();
    }, (error) => {
      console.error('Error fetching assignments:', error);
      checkLoading();
    });

    const qResults = query(collection(db, 'results'));
    const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      list.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      setResults(list);
      checkLoading();
    }, (error) => {
      console.error('Error fetching results:', error);
      checkLoading();
    });

    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllStudents(list);
      checkLoading();
    }, (error) => {
      console.error('Error fetching students:', error);
      checkLoading();
    });

    const qTemplates = currentTeacherUid
      ? query(collection(db, 'quiz_templates'), where('teacherId', '==', currentTeacherUid))
      : query(collection(db, 'quiz_templates'));

    const unsubscribeTemplates = onSnapshot(qTemplates, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizTemplate));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setQuizTemplates(list);
      checkLoading();
    }, (error) => {
      console.error('Error fetching templates:', error);
      checkLoading();
    });

    return () => {
      unsubscribeClasses();
      unsubscribeAssignments();
      unsubscribeResults();
      unsubscribeStudents();
      unsubscribeTemplates();
    };
  }, [currentTeacherUid]);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Không thể mở camera tự động. Vui lòng cấp quyền truy cập camera hoặc nhấn "Mở camera thiết bị" bên dưới.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-');
          const file = new File([blob], `Anh_chup_camera_${timestamp}.jpg`, { type: 'image/jpeg' });
          setUploadedFiles(prev => [...prev, file]);
          stopCamera();
          setToast({ message: 'Đã chụp và lưu ảnh tài liệu thành công!', type: 'success' });
        }
      }, 'image/jpeg', 0.92);
    }
  };

  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setToast({ message: 'Đã thêm ảnh chụp camera!', type: 'success' });
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleGenerate = async () => {
    if (creationMode === 'topic' && !topic) return;
    if (creationMode === 'content' && !manualContent) return;
    if (creationMode === 'file' && uploadedFiles.length === 0) return;
    
    setIsGenerating(true);
    try {
      let questions: Question[];
      if (creationMode === 'topic') {
        questions = await generateQuestions(selectedSubject, topic, questionCount, customInstructions, selectedDifficulty);
      } else if (creationMode === 'content') {
        questions = await generateQuestionsFromContent(selectedSubject, manualContent, questionCount, customInstructions, selectedDifficulty);
      } else {
        questions = await generateQuestionsFromFiles(selectedSubject, uploadedFiles, questionCount, customInstructions, selectedDifficulty);
      }
      setGeneratedQuestions(questions);
      
      // Only set default title if the teacher hasn't provided one
      if (!assignmentTitle.trim()) {
        if (creationMode === 'topic') {
          setAssignmentTitle(topic.trim() ? `Đề ôn tập: ${topic.trim()}` : `Đề ôn tập ${selectedSubject}`);
        } else if (creationMode === 'content') {
          setAssignmentTitle(`Đề ôn tập ${selectedSubject}`);
        } else {
          setAssignmentTitle(`Đề ôn tập ${selectedSubject}`);
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Lỗi khi tạo câu hỏi. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!assignmentTitle || generatedQuestions.length === 0 || !currentTeacherUid) return;
    
    try {
      await addDoc(collection(db, 'quiz_templates'), {
        teacherId: currentTeacherUid,
        title: assignmentTitle,
        subject: selectedSubject,
        questions: generatedQuestions,
        createdAt: serverTimestamp()
      });
      setToast({ message: 'Đã lưu đề thi vào thư viện thành công!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quiz_templates');
      setToast({ message: 'Lỗi khi lưu đề thi.', type: 'error' });
    }
  };

  const handleAssignFromLibrary = async (template: QuizTemplate) => {
    if (assignToClasses.length === 0 || !currentTeacherUid) {
      alert('Vui lòng chọn ít nhất một lớp học.');
      return;
    }

    setIsAssigningFromLibrary(true);
    try {
      const batch = writeBatch(db);
      assignToClasses.forEach(classId => {
        const newAssignmentRef = doc(collection(db, 'assignments'));
        batch.set(newAssignmentRef, {
          classId,
          teacherId: currentTeacherUid,
          title: template.title,
          subject: template.subject,
          questions: template.questions,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      setToast({ message: `Đã giao đề thi cho ${assignToClasses.length} lớp thành công!`, type: 'success' });
      setAssignToClasses([]);
      setIsAssigningFromLibrary(false);
      setActiveTab('CLASSES');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
      setToast({ message: 'Lỗi khi giao đề thi.', type: 'error' });
      setIsAssigningFromLibrary(false);
    }
  };

  const handleDeleteTemplate = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!id) return;
    const template = quizTemplates.find(t => t.id === id);
    setConfirmDeleteModal({
      isOpen: true,
      title: 'Xác nhận xóa mẫu đề thi',
      message: `Bạn có đồng ý xóa đề thi "${template?.title || ''}" khỏi thư viện không?`,
      onConfirm: async () => {
        // Optimistic UI update
        setQuizTemplates(prev => prev.filter(t => t.id !== id));
        if (viewingQuizId === id) {
          setViewingQuiz(null);
          setViewingQuizId(null);
        }
        try {
          await deleteDoc(doc(db, 'quiz_templates', id));
          setToast({ message: 'Đã xóa đề thi khỏi thư viện thành công!', type: 'success' });
        } catch (error) {
          console.error('Lỗi khi xóa mẫu đề:', error);
          handleFirestoreError(error, OperationType.DELETE, `quiz_templates/${id}`);
          setToast({ message: 'Lỗi khi xóa đề thi.', type: 'error' });
        }
      }
    });
  };

  const handleSendToClass = async () => {
    if (!selectedClass || !assignmentTitle || generatedQuestions.length === 0 || !currentTeacherUid) return;
    
    try {
      await addDoc(collection(db, 'assignments'), {
        classId: selectedClass,
        teacherId: currentTeacherUid,
        title: assignmentTitle,
        subject: selectedSubject,
        questions: generatedQuestions,
        createdAt: serverTimestamp()
      });
      setToast({ message: 'Đã gửi đề bài vào lớp thành công!', type: 'success' });
      setGeneratedQuestions([]);
      setAssignmentTitle('');
      setTopic('');
      setManualContent('');
      setActiveTab('CLASSES');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
      setToast({ message: 'Lỗi khi gửi đề bài.', type: 'error' });
    }
  };

  const handleDeleteAssignment = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!id) return;
    const assignment = assignments.find(a => a.id === id);
    setConfirmDeleteModal({
      isOpen: true,
      title: 'Xác nhận xóa đề thi',
      message: `Bạn có đồng ý xóa đề thi "${assignment?.title || ''}" không?`,
      onConfirm: async () => {
        // Optimistic UI update
        setAssignments(prev => prev.filter(a => a.id !== id));
        if (viewingQuizId === id) {
          setViewingQuiz(null);
          setViewingQuizId(null);
        }
        try {
          await deleteDoc(doc(db, 'assignments', id));
          setToast({ message: 'Đã xóa đề thi thành công!', type: 'success' });
        } catch (error) {
          console.error('Lỗi khi xóa đề thi:', error);
          handleFirestoreError(error, OperationType.DELETE, `assignments/${id}`);
          setToast({ message: 'Lỗi khi xóa đề thi.', type: 'error' });
        }
      }
    });
  };

  const handleAnalyze = async (student: UserProfile) => {
    const studentResults = results.filter(r => r.uid === student.uid);
    if (studentResults.length === 0) {
      alert('Học sinh này chưa có kết quả làm bài để phân tích.');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingStudent(student.displayName || student.email);
    try {
      const analysis = await analyzeStudentPerformance(student.displayName || student.email, studentResults);
      setAnalysisResult(analysis);
    } catch (error) {
      alert('Lỗi khi phân tích dữ liệu AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBatchAnalyze = async () => {
    if (selectedStudents.length === 0) return;
    
    setIsBatchAnalyzing(true);
    const newBatchResults: { name: string, email: string, class: string, analysis: string }[] = [];
    
    try {
      for (const studentUid of selectedStudents) {
        const student = allStudents.find(s => s.uid === studentUid);
        if (!student) continue;
        
        const studentResults = results.filter(r => r.uid === studentUid);
        if (studentResults.length === 0) continue;
        
        const analysis = await analyzeStudentPerformance(student.displayName || student.email, studentResults);
        newBatchResults.push({
          name: student.displayName || 'N/A',
          email: student.email,
          class: classes.find(c => c.id === student.classId)?.name || 'Chưa xếp lớp',
          analysis
        });
      }
      setBatchAnalysisResults(newBatchResults);
      setToast({ message: `Đã hoàn thành phân tích cho ${newBatchResults.length} học sinh.`, type: 'success' });
    } catch (error) {
      setToast({ message: 'Lỗi khi phân tích hàng loạt.', type: 'error' });
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const handleReassign = async () => {
    if (!reassigningAssignment || reassignToClasses.length === 0 || !currentTeacherUid) return;

    setIsReassigning(true);
    try {
      const batch = writeBatch(db);
      reassignToClasses.forEach(classId => {
        const newAssignmentRef = doc(collection(db, 'assignments'));
        batch.set(newAssignmentRef, {
          classId,
          teacherId: currentTeacherUid,
          title: reassigningAssignment.title,
          subject: reassigningAssignment.subject,
          questions: reassigningAssignment.questions,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      setToast({ message: `Đã giao lại đề thi cho ${reassignToClasses.length} lớp thành công!`, type: 'success' });
      setReassigningAssignment(null);
      setReassignToClasses([]);
      setActiveTab('CLASSES');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
      setToast({ message: 'Lỗi khi giao lại đề thi.', type: 'error' });
    } finally {
      setIsReassigning(false);
    }
  };

  const exportToExcel = () => {
    if (batchAnalysisResults.length === 0) return;
    
    const data = batchAnalysisResults.map(r => ({
      'Họ tên': r.name,
      'Email': r.email,
      'Lớp': r.class,
      'Kết quả phân tích': r.analysis
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Phân tích học sinh");
    
    XLSX.writeFile(workbook, `Phan_tich_hoc_sinh_${new Date().toLocaleDateString('vi-VN')}.xlsx`);
  };

  const filteredResults = selectedAssignment 
    ? results.filter(r => r.assignmentId === selectedAssignment)
    : results;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-stone-900 animate-spin mb-4" />
        <p className="text-stone-500 font-mono uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
      {/* Home button when not on main classes tab */}
      {activeTab !== 'CLASSES' && (
        <div className="flex justify-start">
          <button
            onClick={() => setActiveTab('CLASSES')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all shadow-sm border border-indigo-100"
          >
            <Home className="w-4 h-4" />
            <span>Quay lại Trang chủ</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-full border border-stone-200/90 shadow-sm w-full md:w-fit mx-auto overflow-x-auto no-scrollbar">
        <div className="flex min-w-max md:min-w-0 w-full justify-center gap-1">
          <button 
            onClick={() => setActiveTab('CLASSES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'CLASSES' 
                ? 'bg-[#00A66C] text-white shadow-md shadow-emerald-600/20' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Lớp học & Đề thi
          </button>
          <button 
            onClick={() => setActiveTab('CREATE_QUIZ')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'CREATE_QUIZ' 
                ? 'bg-[#00A66C] text-white shadow-md shadow-emerald-600/20' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Tạo đề thi AI
          </button>
          <button 
            onClick={() => setActiveTab('LIBRARY')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'LIBRARY' 
                ? 'bg-[#00A66C] text-white shadow-md shadow-emerald-600/20' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Thư viện đề thi
          </button>
          <button 
            onClick={() => setActiveTab('STUDENTS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'STUDENTS' 
                ? 'bg-[#00A66C] text-white shadow-md shadow-emerald-600/20' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <User className="w-4 h-4" />
            Học sinh
          </button>
          <button 
            onClick={() => setActiveTab('RESULTS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'RESULTS' 
                ? 'bg-[#00A66C] text-white shadow-md shadow-emerald-600/20' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Kết quả học tập
          </button>
        </div>
      </div>

      {activeTab === 'CLASSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Classes List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Danh sách lớp học
                </h3>
              </div>

              <div className="space-y-2">
                {classes.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-stone-100 rounded-xl">
                    <p className="text-xs text-stone-400 italic">Chưa có lớp học nào.</p>
                    <p className="text-[10px] text-stone-400 mt-1">Vui lòng liên hệ Admin để tạo lớp.</p>
                  </div>
                ) : (
                  classes.map(cls => (
                    <motion.div 
                      whileHover={{ scale: 1.02, x: 5 }}
                      key={cls.id} 
                      className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 hover:bg-white hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                            <Users className="w-4 h-4" />
                          </div>
                          <p className="font-bold text-stone-900 group-hover:text-indigo-600 transition-colors">{cls.name}</p>
                        </div>
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded uppercase font-bold">Mã: {cls.id}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Assignments List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-8 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Đề thi đã giao
              </h3>

              <div className="space-y-4">
                {assignments.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-stone-100 rounded-2xl">
                    <p className="text-stone-400 italic">Bạn chưa giao đề thi nào.</p>
                    <button onClick={() => setActiveTab('CREATE_QUIZ')} className="mt-4 text-indigo-600 font-bold hover:underline flex items-center gap-2 mx-auto">
                      <Plus className="w-4 h-4" />
                      Tạo đề ngay
                    </button>
                  </div>
                ) : (
                  assignments.map(as => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      key={as.id} 
                      className="flex items-center justify-between p-6 bg-white border border-stone-100 rounded-2xl hover:border-indigo-200 transition-all group overflow-hidden gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest font-bold">{as.subject}</span>
                            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">Lớp: {classes.find(c => c.id === as.classId)?.name || 'N/A'}</span>
                          </div>
                          <h4 className="font-bold text-stone-900 group-hover:text-indigo-600 transition-colors break-all line-clamp-2" title={as.title}>{as.title}</h4>
                          <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {as.questions.length} câu hỏi • {as.createdAt?.toDate?.() ? as.createdAt.toDate().toLocaleDateString('vi-VN') : 'Đang xử lý...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 relative z-10">
                        <button 
                          onClick={() => {
                            setViewingQuiz(as.questions);
                            setViewingQuizTitle(as.title);
                            setViewingQuizId(as.id);
                            setViewingQuizType('assignment');
                          }}
                          className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm bg-white border border-stone-50"
                          title="Xem nội dung đề"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setReassigningAssignment(as);
                            setReassignToClasses([]);
                          }}
                          className="p-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm bg-white border border-stone-50"
                          title="Giao lại cho lớp khác"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedAssignment(as.id);
                            setActiveTab('RESULTS');
                          }}
                          className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm bg-white border border-stone-50"
                          title="Xem kết quả"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteAssignment(as.id, e)}
                          className="p-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm bg-white border border-stone-50"
                          title="Xóa đề thi"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CREATE_QUIZ' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 sm:p-10 rounded-[28px] border border-stone-200/80 shadow-sm space-y-8">
            {/* Header Banner */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#E6F7F0] border border-[#CCF0E1] flex items-center justify-center text-[#00A66C] shrink-0 shadow-xs">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">Thiết kế đề thi AI</h3>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">Tạo đề thi phù hợp với nhu cầu học tập của bạn</p>
                </div>
              </div>

              {/* Decorative AI Cute Graphic Badge */}
              <div className="hidden sm:flex items-center justify-center relative w-28 h-20 shrink-0 select-none">
                <div className="absolute top-1 right-2 w-14 h-16 bg-[#E6F7F0] border border-[#CCF0E1] rounded-xl p-2 shadow-xs transform rotate-6">
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-1 bg-[#00A66C] rounded-full" />
                    <div className="w-3/4 h-1 bg-[#00A66C]/40 rounded-full" />
                    <div className="w-4/5 h-1 bg-[#00A66C]/40 rounded-full" />
                  </div>
                </div>
                <div className="relative z-10 w-11 h-11 bg-white border-2 border-stone-200 rounded-2xl shadow-md flex items-center justify-center -rotate-3">
                  <div className="w-7 h-5 bg-stone-900 rounded-md flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  </div>
                </div>
                <div className="absolute bottom-1 left-2 w-10 h-2.5 bg-amber-400 rounded-full border border-amber-500 rotate-45 shadow-xs" />
              </div>
            </div>

            <div className="space-y-8">
              {/* Subject & Question Count Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* MÔN HỌC */}
                <div className="bg-white border border-stone-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#E6F7F0] flex items-center justify-center text-[#00A66C] shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">MÔN HỌC</span>
                  </div>
                  <div className="relative">
                    <select 
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                      className="w-full p-3.5 pr-10 rounded-xl border border-stone-200 outline-none focus:border-[#00A66C] focus:ring-1 focus:ring-[#00A66C] appearance-none bg-stone-50/50 font-bold text-stone-800 text-sm transition-all cursor-pointer"
                    >
                      {teacherAllowedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>

                {/* SỐ LƯỢNG CÂU HỎI */}
                <div className="bg-white border border-stone-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#EBF5FF] flex items-center justify-center text-[#2563EB] shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">SỐ LƯỢNG CÂU HỎI</span>
                  </div>
                  <div className="relative">
                    <select 
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full p-3.5 pr-10 rounded-xl border border-stone-200 outline-none focus:border-[#00A66C] focus:ring-1 focus:ring-[#00A66C] appearance-none bg-stone-50/50 font-bold text-stone-800 text-sm transition-all cursor-pointer"
                    >
                      {[5, 10, 15, 20, 30].map(n => <option key={n} value={n}>{n} câu trắc nghiệm</option>)}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 pt-0.5">
                    Gợi ý: Chọn <strong className="text-[#00A66C] font-bold">10</strong> câu hỏi để tạo đề thi nhanh chóng và hiệu quả!
                  </p>
                </div>
              </div>

              {/* CHỌN NGUỒN TÀI LIỆU */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                  <Folder className="w-4 h-4 text-amber-700 fill-amber-100" />
                  CHỌN NGUỒN TÀI LIỆU
                </div>

                {/* Segmented Pills Bar */}
                <div className="bg-[#F3F4F6] p-1.5 rounded-full flex items-center gap-1.5 w-full">
                  <button 
                    onClick={() => setCreationMode('file')}
                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
                      creationMode === 'file' 
                        ? 'bg-white text-[#00A66C] border-2 border-[#00A66C] shadow-xs' 
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Tải tệp lên
                  </button>
                  <button 
                    onClick={() => setCreationMode('topic')}
                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
                      creationMode === 'topic' 
                        ? 'bg-white text-[#00A66C] border-2 border-[#00A66C] shadow-xs' 
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Pencil className="w-4 h-4" />
                    Nhập chủ đề
                  </button>
                  <button 
                    onClick={() => setCreationMode('content')}
                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer ${
                      creationMode === 'content' 
                        ? 'bg-white text-[#00A66C] border-2 border-[#00A66C] shadow-xs' 
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Nhập văn bản
                  </button>
                </div>

                {/* Mode Content */}
                {creationMode === 'file' ? (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Upload Files Option */}
                      <div className="relative group">
                        <input 
                          type="file" 
                          id="file-upload"
                          multiple
                          accept=".doc,.docx,.pdf,image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label 
                          htmlFor="file-upload" 
                          className="cursor-pointer flex flex-col items-center justify-center text-center p-6 bg-[#E6F7F0]/40 border-2 border-[#00A66C] rounded-2xl hover:bg-[#E6F7F0] transition-all min-h-[170px]"
                        >
                          <div className="w-12 h-12 rounded-full bg-[#E6F7F0] text-[#00A66C] flex items-center justify-center mb-3 shadow-xs">
                            <Upload className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-extrabold text-[#00A66C] mb-1">Upload Files</p>
                          <p className="text-[11px] text-stone-500 leading-tight">Tải lên PDF, Word, ảnh từ máy tính</p>
                        </label>
                      </div>

                      {/* Camera Option */}
                      <div 
                        onClick={startCamera}
                        className="cursor-pointer flex flex-col items-center justify-center text-center p-6 bg-[#F3E8FF]/30 border-2 border-[#D8B4FE] hover:border-[#A855F7] rounded-2xl hover:bg-[#F3E8FF]/60 transition-all min-h-[170px]"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#F3E8FF] text-[#A855F7] flex items-center justify-center mb-3 shadow-xs">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-extrabold text-[#9333EA] mb-1">Camera</p>
                        <p className="text-[11px] text-stone-500 leading-tight">Mở camera chụp ảnh tài liệu trực tiếp</p>
                      </div>

                      {/* Drag & Drop Area */}
                      <div className="relative border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[170px] bg-stone-50/50 hover:border-stone-300 transition-all">
                        <input 
                          type="file" 
                          id="file-upload-drag"
                          multiple
                          accept=".doc,.docx,.pdf,image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label htmlFor="file-upload-drag" className="cursor-pointer flex flex-col items-center justify-center text-center w-full h-full">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 border border-amber-200/80 flex items-center justify-center mb-2.5">
                            <Folder className="w-5 h-5 fill-amber-100" />
                          </div>
                          <p className="text-xs font-bold text-stone-700 mb-1">Hoặc kéo thả tệp tài liệu vào đây</p>
                          <p className="text-[10px] text-stone-400">Hỗ trợ: Word, PDF, TXT, ảnh (JPG, PNG)</p>
                        </label>
                      </div>
                    </div>

                    {/* Hidden Native Camera Input */}
                    <input 
                      type="file" 
                      id="native-camera-input"
                      accept="image/*"
                      capture="environment"
                      onChange={handleNativeCameraCapture}
                      className="hidden"
                    />

                    {/* File List if files exist */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2 mt-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-700">Danh sách tệp/ảnh đã chọn ({uploadedFiles.length}):</span>
                          <button onClick={() => setUploadedFiles([])} className="text-[10px] text-red-500 font-bold hover:underline">Xóa tất cả</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {file.type?.startsWith('image/') ? (
                                  <Camera className="w-4 h-4 text-purple-600 shrink-0" />
                                ) : (
                                  <FileUp className="w-4 h-4 text-[#00A66C] shrink-0" />
                                )}
                                <span className="text-xs font-bold text-stone-800 truncate max-w-[160px]">{file.name}</span>
                                <span className="text-[10px] text-stone-400 shrink-0">({(file.size / 1024).toFixed(0)}KB)</span>
                              </div>
                              <button 
                                onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))} 
                                className="text-stone-400 hover:text-red-500 p-1 hover:bg-stone-100 rounded transition-colors"
                                title="Xóa tệp này"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : creationMode === 'topic' ? (
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-stone-700">Chủ đề bài học / Nội dung kiến thức</label>
                    <input 
                      type="text" 
                      placeholder="VD: Phương trình bậc hai, Câu bị động, Thì hiện tại đơn..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full p-4 rounded-2xl border-2 border-[#00A66C] outline-none bg-white text-sm font-medium text-stone-800 shadow-xs"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-bold text-stone-700">Nội dung văn bản (AI sẽ tạo câu hỏi từ đây)</label>
                    <textarea 
                      rows={5}
                      placeholder="Dán nội dung bài học, đoạn văn hoặc kiến thức cần kiểm tra vào đây..."
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      className="w-full p-4 rounded-2xl border-2 border-[#00A66C] outline-none bg-white text-sm font-medium text-stone-800 shadow-xs resize-none"
                    />
                  </div>
                )}
              </div>

              {/* TIÊU ĐỀ ĐỀ THI (TÙY CHỌN) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                  <div className="w-4 h-4 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                    <FileText className="w-3 h-3" />
                  </div>
                  TIÊU ĐỀ ĐỀ THI (TÙY CHỌN)
                </div>
                <div className="relative flex items-center border-2 border-[#00A66C] rounded-2xl bg-white p-1 transition-all">
                  <input 
                    type="text" 
                    placeholder="Nhập tên đề thi hoặc để trống để AI tự đặt tên..."
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-transparent text-sm font-medium text-stone-800 placeholder-stone-400 outline-none"
                  />
                  <span className="px-2.5 py-1 mr-2 rounded-lg bg-[#E6F7F0] text-[#00A66C] text-xs font-bold font-mono shrink-0 select-none">
                    Aa
                  </span>
                </div>
              </div>

              {/* YÊU CẦU BỔ SUNG (TÙY CHỌN) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                  <Target className="w-4 h-4 text-amber-600 shrink-0" />
                  YÊU CẦU BỔ SUNG (TÙY CHỌN)
                </div>
                <div className="relative border border-stone-200 rounded-2xl bg-white p-4 hover:border-stone-300 transition-all">
                  <textarea 
                    rows={3}
                    placeholder="VD: Tập trung vào từ vựng, độ khó nâng cao, có câu hỏi về ngữ pháp..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full bg-transparent text-sm text-stone-800 placeholder-stone-400 outline-none resize-none font-sans pr-6"
                  />
                  <Pencil className="w-4 h-4 text-stone-400 absolute bottom-3 right-3 pointer-events-none" />
                </div>
              </div>

              {/* CTA Button & Footer Disclaimer */}
              <div className="space-y-3 pt-2">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || (creationMode === 'topic' ? !topic : creationMode === 'content' ? !manualContent : uploadedFiles.length === 0)}
                  className="w-full py-4 sm:py-4.5 bg-[#00A66C] hover:bg-[#00905D] text-white font-extrabold text-base sm:text-lg rounded-2xl disabled:bg-stone-200 disabled:text-stone-400 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[#00A66C]/20 active:scale-[0.99] cursor-pointer"
                >
                  {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-5 h-5 text-white" />}
                  Tạo đề thi tự động
                </button>
                <p className="text-xs text-stone-500 flex items-center justify-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#00A66C]" />
                  AI sẽ phân tích tài liệu và tạo đề thi phù hợp nhất cho bạn
                </p>
              </div>
            </div>
          </div>

          {generatedQuestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-lg space-y-8">
              <div className="flex items-center justify-between border-b border-stone-100 pb-6">
                <h4 className="text-xl font-bold text-stone-900">Xem trước & Giao bài</h4>
                <button onClick={() => setGeneratedQuestions([])} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors">
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-stone-400 ml-2">Tiêu đề đề thi</label>
                  <input 
                    type="text" 
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-stone-400 ml-2">Giao cho lớp</label>
                  <select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-4 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                {generatedQuestions.map((q, i) => (
                  <div key={i} className="p-4 bg-white rounded-xl border border-stone-100 shadow-sm">
                    <div className="font-bold text-stone-800 mb-2 flex gap-2">
                      <span>{i + 1}.</span>
                      <div className="flex-1 space-y-3">
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(q.question)}</Markdown>
                        <LazyQuestionImage 
                          imagePrompt={q.imagePrompt} 
                          questionText={q.question} 
                          initialImage={q.image} 
                          onImageLoaded={(url) => handleImageLoaded(i, url)} 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 mb-2 ml-6">
                      <div className="flex gap-2">
                        <span className="font-bold">A.</span>
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(q.options.A)}</Markdown>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold">B.</span>
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(q.options.B)}</Markdown>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold">C.</span>
                        <span className="flex-1">
                          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(q.options.C)}</Markdown>
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold">D.</span>
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(q.options.D)}</Markdown>
                      </div>
                    </div>
                    <p className="text-emerald-600 text-xs font-bold ml-6">Đáp án đúng: {q.correctAnswer}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleSendToClass}
                disabled={!selectedClass || !assignmentTitle}
                className="w-full py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 disabled:bg-stone-200 transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                <Send className="w-6 h-6" />
                Giao bài cho lớp ngay
              </button>

              <button 
                onClick={handleSaveToLibrary}
                className="w-full py-4 border-2 border-stone-900 text-stone-900 font-bold rounded-2xl hover:bg-stone-50 transition-all flex items-center justify-center gap-3"
              >
                <Library className="w-6 h-6" />
                Lưu vào thư viện đề thi
              </button>
            </motion.div>
          )}
        </div>
      )}

      {activeTab === 'LIBRARY' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
            <h3 className="text-2xl font-bold text-stone-900 mb-8 flex items-center gap-3">
              <Library className="w-8 h-8 text-indigo-600" />
              Thư viện đề thi của bạn
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizTemplates.length === 0 ? (
                <div className="col-span-full text-center py-20 border-2 border-dashed border-stone-100 rounded-3xl">
                  <Library className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                  <p className="text-stone-400 italic">Thư viện của bạn đang trống.</p>
                  <button onClick={() => setActiveTab('CREATE_QUIZ')} className="mt-4 text-indigo-600 font-bold hover:underline">Tạo đề thi mới</button>
                </div>
              ) : (
                quizTemplates.map(template => (
                  <div key={template.id} className="p-6 bg-white border border-stone-100 rounded-2xl hover:shadow-xl hover:border-amber-200 transition-all space-y-4 group overflow-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-widest font-bold">{template.subject}</span>
                          <h4 className="text-lg font-bold text-stone-900 mt-1 break-all line-clamp-2" title={template.title}>{template.title}</h4>
                          <p className="text-xs text-stone-500 mt-1">{template.questions.length} câu hỏi • {template.createdAt?.toDate?.() ? template.createdAt.toDate().toLocaleDateString('vi-VN') : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 relative z-10">
                        <button 
                          onClick={() => {
                            setViewingQuiz(template.questions);
                            setViewingQuizTitle(template.title);
                            setViewingQuizId(template.id!);
                            setViewingQuizType('template');
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                          title="Xem nội dung"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteTemplate(template.id!, e)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-xl transition-all cursor-pointer"
                          title="Xóa mẫu đề"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-stone-50">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Giao cho lớp:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {classes.map(cls => (
                          <button
                            key={cls.id}
                            onClick={() => {
                              setAssignToClasses(prev => 
                                prev.includes(cls.id!) ? prev.filter(id => id !== cls.id) : [...prev, cls.id!]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              assignToClasses.includes(cls.id!) 
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-100' 
                                : 'bg-stone-100 text-stone-500 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                          >
                            {cls.name}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => handleAssignFromLibrary(template)}
                        disabled={isAssigningFromLibrary || assignToClasses.length === 0}
                        className="w-full py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 disabled:bg-stone-100 disabled:text-stone-400 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg"
                      >
                        {isAssigningFromLibrary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Giao đề thi đã chọn
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'STUDENTS' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                  <Users className="w-8 h-8 text-emerald-600" />
                  Danh sách học sinh
                </h3>
                {allStudents.length > 0 && (
                  <button 
                    onClick={() => {
                      const filtered = allStudents.filter(s => !selectedClassForStudents || s.classId === selectedClassForStudents);
                      if (selectedStudents.length === filtered.length) {
                        setSelectedStudents([]);
                      } else {
                        setSelectedStudents(filtered.map(s => s.uid));
                      }
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    {selectedStudents.length === allStudents.filter(s => !selectedClassForStudents || s.classId === selectedClassForStudents).length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    Chọn tất cả
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <select 
                  value={selectedClassForStudents || ''}
                  onChange={(e) => {
                    setSelectedClassForStudents(e.target.value || null);
                    setSelectedStudents([]);
                  }}
                  className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px] font-bold text-sm"
                >
                  <option value="">Tất cả các lớp</option>
                  {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                </select>
                <button 
                  onClick={handleBatchAnalyze}
                  disabled={selectedStudents.length === 0 || isBatchAnalyzing}
                  className="px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 disabled:bg-stone-100 disabled:text-stone-400 transition-all flex items-center gap-2 shadow-lg shadow-rose-100"
                >
                  {isBatchAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                  Phân tích ({selectedStudents.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allStudents
                .filter(s => !selectedClassForStudents || s.classId === selectedClassForStudents)
                .map(student => {
                  const studentResults = results.filter(r => r.uid === student.uid);
                  const avgScore = studentResults.length > 0 
                    ? (studentResults.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / studentResults.length * 10).toFixed(1)
                    : '---';
                  const isSelected = selectedStudents.includes(student.uid);

                  return (
                    <div 
                      key={student.uid} 
                      className={`p-6 rounded-2xl border transition-all relative cursor-pointer group ${isSelected ? 'border-rose-500 bg-rose-50/30 shadow-md shadow-rose-50' : 'border-stone-100 bg-stone-50 hover:shadow-lg hover:border-rose-200'}`}
                      onClick={() => {
                        setSelectedStudents(prev => 
                          prev.includes(student.uid) ? prev.filter(id => id !== student.uid) : [...prev, student.uid]
                        );
                      }}
                    >
                      <div className="absolute top-4 right-4">
                        {isSelected ? <CheckSquare className="w-5 h-5 text-rose-600" /> : <Square className="w-5 h-5 text-stone-300 group-hover:text-rose-300" />}
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-rose-600 text-white' : 'bg-white text-stone-400 border border-stone-100 group-hover:text-rose-500'}`}>
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900">{student.displayName}</h4>
                          <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                            {classes.find(c => c.id === student.classId)?.name || 'Chưa xếp lớp'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200 mb-4">
                        <div className="text-center">
                          <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mb-1">Bài đã làm</p>
                          <p className="text-lg font-bold text-stone-900">{studentResults.length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mb-1">Điểm TB (10)</p>
                          <p className="text-lg font-bold text-rose-600">{avgScore}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyze(student);
                        }}
                        disabled={studentResults.length === 0}
                        className="w-full py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800 disabled:bg-stone-100 disabled:text-stone-400 transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        Phân tích AI
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          {batchAnalysisResults.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-stone-900 flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-emerald-600" />
                  Kết quả phân tích hàng loạt
                </h3>
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Xuất Excel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="py-4 px-4 text-xs font-mono uppercase tracking-widest text-stone-400">Học sinh</th>
                      <th className="py-4 px-4 text-xs font-mono uppercase tracking-widest text-stone-400">Lớp</th>
                      <th className="py-4 px-4 text-xs font-mono uppercase tracking-widest text-stone-400">Kết quả phân tích</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchAnalysisResults.map((res, idx) => (
                      <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-bold text-stone-900">{res.name}</p>
                          <p className="text-[10px] text-stone-400">{res.email?.replace('@tuanlo.vn', '')}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-bold text-stone-600">{res.class}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="max-w-md">
                            <p className="text-xs text-stone-600 line-clamp-3">{res.analysis}</p>
                            <button 
                              onClick={() => {
                                setAnalyzingStudent(res.name);
                                setAnalysisResult(res.analysis);
                              }}
                              className="text-[10px] text-blue-600 font-bold hover:underline mt-1"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {activeTab === 'RESULTS' && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                  <BarChart3 className="w-7 h-7" />
                </div>
                Kết quả học tập
              </h3>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest hidden md:block">Lọc theo đề thi:</label>
                <select 
                  value={selectedAssignment || ''}
                  onChange={(e) => setSelectedAssignment(e.target.value || null)}
                  className="p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px] font-bold text-sm bg-stone-50 transition-all"
                >
                  <option value="">Tất cả đề thi</option>
                  {assignments.map(as => <option key={as.id} value={as.id}>{as.title}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/50">
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-stone-400">Học sinh</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-stone-400">Đề thi</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-stone-400 text-center">Điểm số</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-stone-400 text-center">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-stone-400 italic">Chưa có kết quả nào được ghi nhận.</td>
                    </tr>
                  ) : (
                    filteredResults.map((res) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={res.id} 
                        className="border-b border-stone-50 hover:bg-blue-50/30 transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white border border-stone-100 flex items-center justify-center text-stone-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-all shadow-sm">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-stone-900 group-hover:text-blue-600 transition-colors">
                                {allStudents.find(s => s.uid === res.uid)?.displayName || `ID: ${res.uid.substring(0, 5)}`}
                              </p>
                              <p className="text-[10px] text-stone-400 font-mono">{res.uid.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm font-bold text-stone-800 group-hover:text-blue-600 transition-colors">{res.topic}</p>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{res.subject}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-sm shadow-sm border border-emerald-100">
                            <Award className="w-4 h-4" />
                            {res.score}/{res.totalQuestions}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex flex-col items-center justify-center gap-1 text-xs text-stone-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {res.timestamp?.toDate?.() ? res.timestamp.toDate().toLocaleDateString('vi-VN') : 'N/A'}
                            </div>
                            <span className="text-[10px] font-mono opacity-60">{res.timestamp?.toDate?.() ? res.timestamp.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                        </td>
                      </motion.tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Toast Notification */}
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-8 right-8 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span className="font-bold text-sm">{toast.message}</span>
        </motion.div>
      )}

      {/* AI Analysis Modal */}
      <AnimatePresence>
        {(isAnalyzing || analysisResult) && (
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
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-100"
            >
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-stone-900 to-stone-800 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner">
                    <BrainCircuit className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Phân tích AI</h3>
                    <p className="text-xs text-stone-300 font-bold uppercase tracking-widest flex items-center gap-2">
                      <User className="w-3 h-3" />
                      Học sinh: {analyzingStudent}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAnalysisResult(null);
                    setAnalyzingStudent(null);
                  }}
                  className="p-3 hover:bg-white/10 rounded-2xl transition-all hover:rotate-90"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-stone-50/30">
                {isAnalyzing ? (
                  <div className="py-20 text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                      <BrainCircuit className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-stone-900 font-bold text-lg">Đang xử lý dữ liệu...</p>
                      <p className="text-stone-400 text-xs font-bold uppercase tracking-widest animate-pulse">AI đang phân tích kết quả học tập</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-stone max-w-none">
                    <div className="markdown-body p-6 bg-white rounded-3xl border border-stone-100 shadow-sm leading-relaxed">
                      <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(analysisResult || '')}</Markdown>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-stone-100 bg-white flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setAnalysisResult(null);
                    setAnalyzingStudent(null);
                  }}
                  className="px-10 py-4 bg-stone-900 text-white font-bold rounded-2xl hover:bg-stone-800 transition-all shadow-lg hover:shadow-stone-200 active:scale-95"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Preview Modal */}
      <AnimatePresence>
        {viewingQuiz && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100"
            >
              <div className="p-8 bg-emerald-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Xem nội dung đề thi</h3>
                    <p className="text-xs text-emerald-100 font-bold uppercase tracking-widest">{viewingQuizTitle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingQuiz(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-stone-50">
                <div className="space-y-6">
                  {viewingQuiz.map((q, i) => (
                    <div key={i} className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
                      <div className="font-bold text-stone-900 mb-4 flex gap-3">
                        <span className="text-emerald-600">Câu {i + 1}.</span>
                        <div className="flex-1 space-y-3">
                          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(q.question)}</Markdown>
                          <LazyQuestionImage 
                            imagePrompt={q.imagePrompt} 
                            questionText={q.question} 
                            initialImage={q.image} 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-10">
                        {Object.entries(q.options).map(([key, value]) => (
                          <div key={key} className={`p-3 rounded-xl border text-sm flex gap-3 ${key === q.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-stone-50 border-stone-100 text-stone-600'}`}>
                            <span className="opacity-50">{key}.</span>
                            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(value)}</Markdown>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 ml-10 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-700 leading-relaxed">
                        <p className="font-bold mb-1 flex items-center gap-2">
                          <HelpCircle className="w-3 h-3" />
                          Giải thích:
                        </p>
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMathSymbols(q.explanation)}</Markdown>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-stone-100 bg-white flex justify-between items-center">
                {viewingQuizId ? (
                  <button 
                    onClick={() => {
                      if (viewingQuizType === 'assignment') {
                        handleDeleteAssignment(viewingQuizId);
                      } else {
                        handleDeleteTemplate(viewingQuizId);
                      }
                    }}
                    className="px-6 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Xóa đề thi này
                  </button>
                ) : <div />}
                <button 
                  onClick={() => {
                    setViewingQuiz(null);
                    setViewingQuizId(null);
                  }}
                  className="px-8 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reassign Modal */}
      <AnimatePresence>
        {reassigningAssignment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-stone-100"
            >
              <div className="p-8 bg-amber-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Copy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Giao lại đề thi</h3>
                    <p className="text-xs text-amber-100 font-bold uppercase tracking-widest">Chọn lớp để giao lại</p>
                  </div>
                </div>
                <button 
                  onClick={() => setReassigningAssignment(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs text-amber-700 font-bold uppercase tracking-widest mb-1">Đang chọn đề:</p>
                  <p className="font-bold text-stone-900">{reassigningAssignment.title}</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-2">Chọn lớp học:</label>
                  <div className="grid grid-cols-1 gap-2">
                    {classes.map(cls => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          setReassignToClasses(prev => 
                            prev.includes(cls.id!) ? prev.filter(id => id !== cls.id) : [...prev, cls.id!]
                          );
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          reassignToClasses.includes(cls.id!) 
                            ? 'bg-amber-50 border-amber-500 text-amber-700' 
                            : 'bg-white border-stone-100 text-stone-600 hover:border-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4" />
                          <span className="font-bold">{cls.name}</span>
                        </div>
                        {reassignToClasses.includes(cls.id!) && <CheckCircle className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleReassign}
                  disabled={isReassigning || reassignToClasses.length === 0}
                  className="w-full py-5 bg-stone-900 text-white font-bold rounded-2xl hover:bg-stone-800 disabled:bg-stone-100 disabled:text-stone-400 transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  {isReassigning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  Giao đề thi ngay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteModal && confirmDeleteModal.isOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-100 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{confirmDeleteModal.title}</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{confirmDeleteModal.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteModal(null)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all text-sm cursor-pointer"
                >
                  Không
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmDeleteModal.onConfirm;
                    setConfirmDeleteModal(null);
                    action();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-md hover:shadow-lg text-sm cursor-pointer"
                >
                  Có, xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Live Camera Capture Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-stone-100"
            >
              <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm">Chụp ảnh tài liệu / Bài tập</span>
                </div>
                <button 
                  onClick={stopCamera} 
                  className="p-1 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                  title="Đóng camera"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative bg-black flex items-center justify-center min-h-[320px] overflow-hidden">
                {cameraError ? (
                  <div className="p-6 text-center space-y-4 max-w-xs">
                    <p className="text-xs text-stone-300 font-medium leading-relaxed">{cameraError}</p>
                    <label 
                      htmlFor="native-camera-input" 
                      onClick={() => stopCamera()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      Dùng máy ảnh thiết bị
                    </label>
                  </div>
                ) : (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-[360px] object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Camera Trực Tiếp
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                <label 
                  htmlFor="native-camera-input"
                  onClick={() => stopCamera()}
                  className="text-xs text-stone-600 font-bold hover:text-emerald-600 flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-stone-400" />
                  Mở camera hệ thống
                </label>

                {!cameraError && (
                  <button 
                    onClick={capturePhoto}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Chụp ảnh ngay
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
