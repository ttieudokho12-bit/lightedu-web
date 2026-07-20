import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, Send, BookOpen, Trash2, CheckCircle, Loader2, Sparkles, FileText, BarChart3, ChevronRight, User, Clock, Award, BrainCircuit, X, Library, Upload, FileUp, Download, CheckSquare, Square, Eye, Copy, HelpCircle, Home } from 'lucide-react';
import { db, auth, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDocs, orderBy, writeBatch } from 'firebase/firestore';
import { ClassRoom, Subject, SUBJECTS, Question, Assignment, QuizResult, UserProfile, QuizTemplate } from '../types';
import { generateQuestions, generateQuestionsFromContent, analyzeStudentPerformance, generateQuestionsFromFiles } from '../services/gemini';
import { LazyQuestionImage } from './LazyQuestionImage';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { formatMathSymbols } from '../services/mathUtils';
import * as XLSX from 'xlsx';

type TeacherTab = 'CLASSES' | 'CREATE_QUIZ' | 'LIBRARY' | 'STUDENTS' | 'RESULTS';

export default function TeacherDashboard() {
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
  const [creationMode, setCreationMode] = useState<'topic' | 'content' | 'file'>('topic');
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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
  const [reassigningAssignment, setReassigningAssignment] = useState<Assignment | null>(null);
  const [reassignToClasses, setReassignToClasses] = useState<string[]>([]);
  const [isReassigning, setIsReassigning] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

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
    if (!auth.currentUser) return;
    
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

    const qAssignments = query(
      collection(db, 'assignments'), 
      where('teacherId', '==', auth.currentUser.uid)
    );
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

    const qTemplates = query(collection(db, 'quiz_templates'), where('teacherId', '==', auth.currentUser.uid));
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
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
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
        questions = await generateQuestions(selectedSubject, topic, questionCount, customInstructions);
      } else if (creationMode === 'content') {
        questions = await generateQuestionsFromContent(selectedSubject, manualContent, questionCount, customInstructions);
      } else {
        questions = await generateQuestionsFromFiles(selectedSubject, uploadedFiles, questionCount, customInstructions);
      }
      setGeneratedQuestions(questions);
      
      // Only set default title if the teacher hasn't provided one
      if (!assignmentTitle.trim()) {
        if (creationMode === 'topic') {
          setAssignmentTitle(`Đề ôn tập: ${topic}`);
        } else if (creationMode === 'content') {
          setAssignmentTitle(`Đề ôn tập từ nội dung đã nhập`);
        } else {
          setAssignmentTitle(`Đề ôn tập từ tài liệu: ${uploadedFiles.map(f => f.name).join(', ')}`);
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Lỗi khi tạo câu hỏi. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!assignmentTitle || generatedQuestions.length === 0 || !auth.currentUser) return;
    
    try {
      await addDoc(collection(db, 'quiz_templates'), {
        teacherId: auth.currentUser.uid,
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
    if (assignToClasses.length === 0 || !auth.currentUser) {
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
          teacherId: auth.currentUser!.uid,
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

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề thi này khỏi thư viện?')) return;
    try {
      await deleteDoc(doc(db, 'quiz_templates', id));
      setToast({ message: 'Đã xóa đề thi khỏi thư viện thành công!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quiz_templates/${id}`);
      setToast({ message: 'Lỗi khi xóa đề thi.', type: 'error' });
    }
  };

  const handleSendToClass = async () => {
    if (!selectedClass || !assignmentTitle || generatedQuestions.length === 0 || !auth.currentUser) return;
    
    try {
      await addDoc(collection(db, 'assignments'), {
        classId: selectedClass,
        teacherId: auth.currentUser.uid,
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

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề thi này?')) return;
    try {
      await deleteDoc(doc(db, 'assignments', id));
      setToast({ message: 'Đã xóa đề thi thành công!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignments/${id}`);
      setToast({ message: 'Lỗi khi xóa đề thi.', type: 'error' });
    }
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
    if (!reassigningAssignment || reassignToClasses.length === 0 || !auth.currentUser) return;

    setIsReassigning(true);
    try {
      const batch = writeBatch(db);
      reassignToClasses.forEach(classId => {
        const newAssignmentRef = doc(collection(db, 'assignments'));
        batch.set(newAssignmentRef, {
          classId,
          teacherId: auth.currentUser!.uid,
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
      <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shadow-md w-full md:w-fit mx-auto overflow-x-auto no-scrollbar">
        <div className="flex min-w-max md:min-w-0 w-full justify-center gap-1">
          <button 
            onClick={() => setActiveTab('CLASSES')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'CLASSES' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
                : 'text-stone-500 hover:bg-indigo-50 hover:text-indigo-600'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'CLASSES' ? 'animate-pulse' : ''}`} />
            Lớp học & Đề thi
          </button>
          <button 
            onClick={() => setActiveTab('CREATE_QUIZ')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'CREATE_QUIZ' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105' 
                : 'text-stone-500 hover:bg-emerald-50 hover:text-emerald-600'
            }`}
          >
            <Plus className={`w-4 h-4 ${activeTab === 'CREATE_QUIZ' ? 'animate-bounce' : ''}`} />
            Tạo đề thi AI
          </button>
          <button 
            onClick={() => setActiveTab('LIBRARY')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'LIBRARY' 
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-105' 
                : 'text-stone-500 hover:bg-amber-50 hover:text-amber-600'
            }`}
          >
            <Library className={`w-4 h-4 ${activeTab === 'LIBRARY' ? 'animate-pulse' : ''}`} />
            Thư viện đề thi
          </button>
          <button 
            onClick={() => setActiveTab('STUDENTS')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'STUDENTS' 
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105' 
                : 'text-stone-500 hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            <User className={`w-4 h-4 ${activeTab === 'STUDENTS' ? 'animate-pulse' : ''}`} />
            Học sinh
          </button>
          <button 
            onClick={() => setActiveTab('RESULTS')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'RESULTS' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
                : 'text-stone-500 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'RESULTS' ? 'animate-pulse' : ''}`} />
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
                      className="flex items-center justify-between p-6 bg-white border border-stone-100 rounded-2xl hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest font-bold">{as.subject}</span>
                            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">Lớp: {classes.find(c => c.id === as.classId)?.name || 'N/A'}</span>
                          </div>
                          <h4 className="font-bold text-stone-900 group-hover:text-indigo-600 transition-colors">{as.title}</h4>
                          <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {as.questions.length} câu hỏi • {as.createdAt?.toDate?.() ? as.createdAt.toDate().toLocaleDateString('vi-VN') : 'Đang xử lý...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setViewingQuiz(as.questions);
                            setViewingQuizTitle(as.title);
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
                          onClick={() => handleDeleteAssignment(as.id)}
                          className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm bg-white border border-stone-50"
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
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
            <h3 className="text-2xl font-bold text-stone-900 mb-8 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              Thiết kế đề thi AI
            </h3>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-2 flex items-center gap-2">
                    <BookOpen className="w-3 h-3" />
                    Môn học
                  </label>
                  <select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                    className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-stone-50 font-bold transition-all"
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-2 flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    Số lượng câu hỏi
                  </label>
                  <select 
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-stone-50 font-bold transition-all"
                  >
                    {[10, 20, 30].map(n => <option key={n} value={n}>{n} câu trắc nghiệm</option>)}
                  </select>
                  <p className="text-[10px] text-stone-400 mt-1.5 ml-2 italic">Gợi ý: Chọn 10 câu hỏi để tạo đề thi nhanh chóng và hiệu quả!</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 p-1.5 bg-stone-100 rounded-2xl w-fit shadow-inner">
                  <button 
                    onClick={() => setCreationMode('topic')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${creationMode === 'topic' ? 'bg-white text-emerald-600 shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    Nhập chủ đề
                  </button>
                  <button 
                    onClick={() => setCreationMode('content')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${creationMode === 'content' ? 'bg-white text-emerald-600 shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    Nhập văn bản
                  </button>
                  <button 
                    onClick={() => setCreationMode('file')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${creationMode === 'file' ? 'bg-white text-emerald-600 shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    Tải tệp lên
                  </button>
                </div>

                {creationMode === 'topic' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-stone-400 ml-2">Chủ đề bài học</label>
                    <input 
                      type="text" 
                      placeholder="VD: Phương trình bậc hai, Câu bị động..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full p-5 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                    />
                  </div>
                ) : creationMode === 'content' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-stone-400 ml-2">Nội dung văn bản (AI sẽ tạo câu hỏi từ đây)</label>
                    <textarea 
                      rows={6}
                      placeholder="Dán nội dung bài học, đoạn văn hoặc kiến thức cần kiểm tra vào đây..."
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      className="w-full p-5 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-sans"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="text-xs font-mono uppercase tracking-widest text-stone-400 ml-2">Tải tệp lên (Word, PDF, JPG...)</label>
                    <div className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors bg-stone-50">
                      <input 
                        type="file" 
                        id="file-upload"
                        multiple
                        accept=".doc,.docx,.pdf,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-stone-400" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-stone-700">Nhấn để chọn tệp hoặc kéo thả vào đây</p>
                          <p className="text-[10px] text-stone-400 font-mono uppercase tracking-widest">Hỗ trợ Word, PDF, Hình ảnh</p>
                        </div>
                      </label>
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2">
                              <FileUp className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-bold text-blue-900 truncate max-w-[200px]">{file.name}</span>
                            </div>
                            <button onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 p-1 hover:bg-red-100 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-stone-400 ml-2">Tiêu đề đề thi (Tùy chọn)</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên đề thi hoặc để trống để AI tự đặt tên..."
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-stone-400 ml-2">Yêu cầu bổ sung (Tùy chọn)</label>
                <textarea 
                  rows={2}
                  placeholder="VD: Tập trung vào từ vựng, độ khó nâng cao, có câu hỏi về ngữ pháp..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-sans text-sm"
                />
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || (creationMode === 'topic' ? !topic : creationMode === 'content' ? !manualContent : uploadedFiles.length === 0)}
                className="w-full py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 disabled:bg-stone-200 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 group active:scale-95"
              >
                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
                Tạo đề thi tự động
              </button>
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
                  <div key={template.id} className="p-6 bg-white border border-stone-100 rounded-2xl hover:shadow-xl hover:border-amber-200 transition-all space-y-4 group">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-widest">{template.subject}</span>
                          <h4 className="text-lg font-bold text-stone-900 mt-1">{template.title}</h4>
                          <p className="text-xs text-stone-500">{template.questions.length} câu hỏi • {template.createdAt?.toDate?.() ? template.createdAt.toDate().toLocaleDateString('vi-VN') : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setViewingQuiz(template.questions);
                            setViewingQuizTitle(template.title);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Xem nội dung"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(template.id!)}
                          className="text-stone-300 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-all"
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

              <div className="p-6 border-t border-stone-100 bg-white flex justify-end">
                <button 
                  onClick={() => setViewingQuiz(null)}
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
    </div>
  );
}
