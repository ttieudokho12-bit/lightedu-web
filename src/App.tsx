import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, getDocs, query, where, serverTimestamp, addDoc, collection, setDoc, onSnapshot } from 'firebase/firestore';
import { BookOpen, Play, LogOut, Home, Link2, CheckCircle2, AlertCircle, User as UserIcon } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { Subject, Question, UserProfile, Assignment, QuizTemplate, DEFAULT_SCHOOL_YEAR, DEFAULT_USER_SCHOOL_YEAR } from './types';
import { generateQuestions } from './services/gemini';

// Components
import Login from './components/Login';
import Navbar from './components/Navbar';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import TopicSelector from './components/TopicSelector';
import Quiz from './components/Quiz';
import Result from './components/Result';
import AdminDashboard from './components/AdminDashboard';

type AppState = 'DASHBOARD' | 'TOPIC_SELECTOR' | 'QUIZ' | 'RESULT' | 'HISTORY' | 'ADMIN' | 'SHARED_EXAM_READY';

interface PendingSharedRef {
  id: string;
  source: 'assignment' | 'template';
}

const extractExamRefFromInput = (raw: string): PendingSharedRef | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes('exam=') || trimmed.includes('assignment=')) {
      const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://dummy.local/${trimmed.replace(/^\/+/, '')}`);
      const qAssignment = url.searchParams.get('assignment')?.trim();
      if (qAssignment) return { id: qAssignment, source: 'assignment' };
      const qExam = url.searchParams.get('exam')?.trim();
      if (qExam) return { id: qExam, source: 'template' };
      const hashAssignMatch = url.hash.match(/assignment=([^&]+)/i);
      if (hashAssignMatch && hashAssignMatch[1]) return { id: decodeURIComponent(hashAssignMatch[1]).trim(), source: 'assignment' };
      const hashMatch = url.hash.match(/exam=([^&]+)/i);
      if (hashMatch && hashMatch[1]) return { id: decodeURIComponent(hashMatch[1]).trim(), source: 'template' };
    }
  } catch {
    const assignMatch = trimmed.match(/assignment=([^&#\s]+)/i);
    if (assignMatch && assignMatch[1]) return { id: decodeURIComponent(assignMatch[1]).trim(), source: 'assignment' };
    const match = trimmed.match(/exam=([^&#\s]+)/i);
    if (match && match[1]) return { id: decodeURIComponent(match[1]).trim(), source: 'template' };
  }
  return { id: trimmed, source: 'template' };
};

const getInitialSharedExamRef = (): PendingSharedRef | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const urlAssignmentId = params.get('assignment')?.trim();
  if (urlAssignmentId) {
    sessionStorage.setItem('pendingSharedExamId', urlAssignmentId);
    sessionStorage.setItem('pendingSharedExamSource', 'assignment');
    return { id: urlAssignmentId, source: 'assignment' };
  }
  const urlExamId = params.get('exam')?.trim();
  if (urlExamId) {
    sessionStorage.setItem('pendingSharedExamId', urlExamId);
    sessionStorage.setItem('pendingSharedExamSource', 'template');
    return { id: urlExamId, source: 'template' };
  }
  const hashAssignMatch = window.location.hash.match(/assignment=([^&]+)/i);
  if (hashAssignMatch && hashAssignMatch[1]) {
    const id = decodeURIComponent(hashAssignMatch[1]).trim();
    sessionStorage.setItem('pendingSharedExamId', id);
    sessionStorage.setItem('pendingSharedExamSource', 'assignment');
    return { id, source: 'assignment' };
  }
  const hashMatch = window.location.hash.match(/exam=([^&]+)/i);
  if (hashMatch && hashMatch[1]) {
    const id = decodeURIComponent(hashMatch[1]).trim();
    sessionStorage.setItem('pendingSharedExamId', id);
    sessionStorage.setItem('pendingSharedExamSource', 'template');
    return { id, source: 'template' };
  }
  const storedId = sessionStorage.getItem('pendingSharedExamId');
  if (storedId) {
    const storedSource = sessionStorage.getItem('pendingSharedExamSource') === 'assignment' ? 'assignment' : 'template';
    return { id: storedId, source: storedSource };
  }
  return null;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>('DASHBOARD');
  const [studentInitialTab, setStudentInitialTab] = useState<'de-kiem-tra' | 'ket-qua'>('de-kiem-tra');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(DEFAULT_USER_SCHOOL_YEAR);

  // Sync default school year when user profile changes:
  // - Teacher & Student default to 2026-2027 when not explicitly selected
  // - Admin defaults to 2025-2026 (where migrated classes/accounts live)
  useEffect(() => {
    if (!userProfile?.uid) return;
    const storageKey = `selectedSchoolYear_${userProfile.uid}`;
    const savedChoice = sessionStorage.getItem(storageKey);
    const nextYear = savedChoice
      ? savedChoice
      : userProfile.role === 'admin'
        ? DEFAULT_SCHOOL_YEAR
        : DEFAULT_USER_SCHOOL_YEAR;
    setSelectedSchoolYear(nextYear);
    sessionStorage.setItem('activeSchoolYear', nextYear);
  }, [userProfile?.uid, userProfile?.role]);

  const handleChangeSchoolYear = (year: string) => {
    setSelectedSchoolYear(year);
    sessionStorage.setItem('activeSchoolYear', year);
    if (userProfile?.uid) {
      sessionStorage.setItem(`selectedSchoolYear_${userProfile.uid}`, year);
    }
  };

  // Shared Exam Link State
  const initialSharedRef = getInitialSharedExamRef();
  const [sharedExamId, setSharedExamId] = useState<string | null>(() => initialSharedRef?.id || null);
  const [sharedExamSource, setSharedExamSource] = useState<'assignment' | 'template'>(() => initialSharedRef?.source || 'template');
  const [sharedExamTemplate, setSharedExamTemplate] = useState<QuizTemplate | null>(null);
  const [sharedExamResolvedSource, setSharedExamResolvedSource] = useState<'assignment' | 'template'>('template');
  const [sharedExamLoading, setSharedExamLoading] = useState<boolean>(false);
  const [sharedExamError, setSharedExamError] = useState<string | null>(null);

  // Quiz State
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizScore, setQuizScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null);
  const [currentSharedTemplateId, setCurrentSharedTemplateId] = useState<string | null>(null);
  const [currentAssignmentClassId, setCurrentAssignmentClassId] = useState<string | null>(null);
  const [currentAssignmentSchoolYear, setCurrentAssignmentSchoolYear] = useState<string | null>(null);
  const [savedToProgress, setSavedToProgress] = useState<boolean>(false);

  // Fetch shared exam from assignments or quiz_templates when ?assignment= or ?exam= is present
  useEffect(() => {
    if (!sharedExamId) {
      setSharedExamTemplate(null);
      setSharedExamError(null);
      setSharedExamLoading(false);
      return;
    }

    let cancelled = false;
    const loadSharedExam = async () => {
      setSharedExamLoading(true);
      setSharedExamError(null);
      try {
        const primaryCollection = sharedExamSource === 'assignment' ? 'assignments' : 'quiz_templates';
        const fallbackCollection = sharedExamSource === 'assignment' ? 'quiz_templates' : 'assignments';

        const primarySnap = await getDoc(doc(db, primaryCollection, sharedExamId));
        if (cancelled) return;
        if (primarySnap.exists()) {
          const data = primarySnap.data() as QuizTemplate;
          setSharedExamTemplate({ id: primarySnap.id, ...data });
          setSharedExamResolvedSource(sharedExamSource);
          return;
        }

        const fallbackSnap = await getDoc(doc(db, fallbackCollection, sharedExamId));
        if (cancelled) return;
        if (fallbackSnap.exists()) {
          const data = fallbackSnap.data() as QuizTemplate;
          setSharedExamTemplate({ id: fallbackSnap.id, ...data });
          setSharedExamResolvedSource(fallbackCollection === 'assignments' ? 'assignment' : 'template');
        } else {
          setSharedExamTemplate(null);
          setSharedExamError('Không tìm thấy đề thi được chia sẻ. Đường link có thể đã bị xóa hoặc không chính xác.');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching shared exam:', err);
        setSharedExamError('Không thể tải đề thi được chia sẻ. Vui lòng thử tải lại trang.');
      } finally {
        if (!cancelled) setSharedExamLoading(false);
      }
    };

    loadSharedExam();
    return () => {
      cancelled = true;
    };
  }, [sharedExamId, sharedExamSource]);

  const clearSharedExamFromUrl = () => {
    sessionStorage.removeItem('pendingSharedExamId');
    sessionStorage.removeItem('pendingSharedExamSource');
    setSharedExamId(null);
    setSharedExamTemplate(null);
    setSharedExamError(null);
    if (
      typeof window !== 'undefined' &&
      (window.location.search.includes('exam=') ||
        window.location.search.includes('assignment=') ||
        window.location.hash.includes('exam=') ||
        window.location.hash.includes('assignment='))
    ) {
      const url = new URL(window.location.href);
      url.searchParams.delete('exam');
      url.searchParams.delete('assignment');
      const nextHash = url.hash.includes('exam=') || url.hash.includes('assignment=') ? '' : url.hash;
      window.history.replaceState({}, '', url.pathname + url.search + nextHash);
    }
  };

  useEffect(() => {
    // Check local session fallback on mount
    const checkLocalSession = async (): Promise<boolean> => {
      const cached = localStorage.getItem('localUserSession');
      if (cached) {
        try {
          const localData = JSON.parse(cached);
          // Fetch freshest profile from Firestore to keep role, classId, etc. updated
          const userRef = doc(db, 'users', localData.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            setUser({ uid: profile.uid, email: profile.email } as any);
            setUserProfile(profile);
            if (!sessionStorage.getItem('pendingSharedExamId')) {
              setAppState(profile.role === 'admin' ? 'ADMIN' : 'DASHBOARD');
            }
          } else {
            setUser({ uid: localData.uid, email: localData.email } as any);
            setUserProfile(localData);
            if (!sessionStorage.getItem('pendingSharedExamId')) {
              setAppState(localData.role === 'admin' ? 'ADMIN' : 'DASHBOARD');
            }
          }
          setLoading(false);
          return true;
        } catch (e) {
          console.error('Error parsing local session:', e);
        }
      }
      return false;
    };

    // Listen to custom local-login events
    const handleLocalLogin = (e: Event) => {
      const profile = (e as CustomEvent).detail;
      setUser({ uid: profile.uid, email: profile.email } as any);
      setUserProfile(profile);
      if (sessionStorage.getItem('pendingSharedExamId')) {
        setAppState('SHARED_EXAM_READY');
      } else if (profile.role === 'admin') {
        setAppState('ADMIN');
      } else {
        setAppState('DASHBOARD');
      }
    };
    window.addEventListener('local-login', handleLocalLogin);

    let isUnsubscribed = false;
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (isUnsubscribed) return;
      
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      const hasLocal = await checkLocalSession();
      if (hasLocal && !currentUser) {
        return;
      }

      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          
          unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
            if (isUnsubscribed) return;
            
            if (docSnap.exists()) {
              const profile = docSnap.data() as UserProfile;
              setUserProfile(profile);
              localStorage.setItem('localUserSession', JSON.stringify(profile));
              
              if (!sessionStorage.getItem('pendingSharedExamId')) {
                setAppState(prev => (prev === 'QUIZ' || prev === 'RESULT' ? prev : (profile.role === 'admin' ? 'ADMIN' : 'DASHBOARD')));
              }
              setUser(currentUser);
              setLoading(false);
            } else {
              // Create default profile if not exists
              const isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
              const isAdminEmail = currentUser.email === "ttieudokho12@gmail.com";
              
              if (isGoogleUser && !isAdminEmail) {
                await auth.signOut();
                setUserProfile(null);
                setUser(null);
                setLoading(false);
                return;
              }

              if (currentUser.email === "ttieudokho12@gmail.com") {
                const adminProfile: UserProfile = {
                  uid: currentUser.uid,
                  email: currentUser.email || '',
                  displayName: 'Quản trị viên',
                  role: 'admin'
                };
                await setDoc(userRef, cleanFirestoreData(adminProfile));
                setUserProfile(adminProfile);
                if (!sessionStorage.getItem('pendingSharedExamId')) {
                  setAppState('ADMIN');
                }
              } else {
                const defaultProfile: UserProfile = {
                  uid: currentUser.uid,
                  email: currentUser.email || '',
                  displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                  role: 'student',
                  schoolYear: DEFAULT_USER_SCHOOL_YEAR
                };
                await setDoc(userRef, cleanFirestoreData(defaultProfile), { merge: true });
                setUserProfile(defaultProfile);
                if (!sessionStorage.getItem('pendingSharedExamId')) {
                  setAppState('DASHBOARD');
                }
              }
              setUser(currentUser);
              setLoading(false);
            }
          }, (error) => {
            console.error("Error listening to user profile in real-time:", error);
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            setLoading(false);
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setAppState('DASHBOARD');
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => {
      isUnsubscribed = true;
      unsubscribe();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
      window.removeEventListener('local-login', handleLocalLogin);
    };
  }, []);

  // Automatically open Shared Exam Ready screen when logged in with a pending shared exam link
  useEffect(() => {
    if (!loading && user && userProfile && sharedExamId && appState !== 'QUIZ' && appState !== 'RESULT') {
      setAppState('SHARED_EXAM_READY');
    }
  }, [loading, user, userProfile, sharedExamId]);

  const normalizeExamText = (text?: string | null) =>
    (text || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const resolveClassSchoolYear = async (classId?: string | null): Promise<string | null> => {
    if (!classId) return null;
    try {
      const clsSnap = await getDoc(doc(db, 'classes', classId));
      if (clsSnap.exists()) {
        const clsData = clsSnap.data() as { schoolYear?: string };
        return clsData.schoolYear || DEFAULT_SCHOOL_YEAR;
      }
    } catch (err) {
      console.warn('Could not resolve class schoolYear:', err);
    }
    return null;
  };

  const handleStartSharedExam = async () => {
    if (!sharedExamTemplate) return;
    const resolvedId = sharedExamTemplate.id || sharedExamId;
    setSelectedSubject(sharedExamTemplate.subject);
    setSelectedTopic(sharedExamTemplate.title);
    setQuestions(sharedExamTemplate.questions);

    if (sharedExamResolvedSource === 'assignment') {
      const assignmentData = sharedExamTemplate as unknown as Assignment;
      const targetClassId = assignmentData.classId || userProfile?.classId || null;
      const resolvedYear =
        assignmentData.schoolYear ||
        (await resolveClassSchoolYear(targetClassId)) ||
        userProfile?.schoolYear ||
        selectedSchoolYear;
      setCurrentAssignmentId(resolvedId);
      setCurrentSharedTemplateId(assignmentData.templateId || null);
      setCurrentAssignmentClassId(targetClassId);
      setCurrentAssignmentSchoolYear(resolvedYear);
    } else {
      setCurrentSharedTemplateId(resolvedId);
      let matchedAssignmentId: string | null = null;
      let matchedClassId: string | null = userProfile?.classId || null;
      let matchedSchoolYear: string | null = null;

      if (userProfile?.classId && resolvedId) {
        try {
          const snap = await getDocs(
            query(collection(db, 'assignments'), where('classId', '==', userProfile.classId))
          );
          const normTitle = normalizeExamText(sharedExamTemplate.title);
          const normSubject = normalizeExamText(sharedExamTemplate.subject);

          const matchingDocs = snap.docs.filter((d) => {
            const data = d.data() as Assignment;
            return (
              data.templateId === resolvedId ||
              (normalizeExamText(data.title) === normTitle &&
                normalizeExamText(data.subject) === normSubject)
            );
          });

          if (matchingDocs.length > 0) {
            // Prefer assignment in the currently selected schoolYear, else most recently created
            const preferred =
              matchingDocs.find((d) => (d.data() as Assignment).schoolYear === selectedSchoolYear) ||
              matchingDocs.sort((a, b) => {
                const ta = (a.data() as any).createdAt?.toMillis?.() || 0;
                const tb = (b.data() as any).createdAt?.toMillis?.() || 0;
                return tb - ta;
              })[0];

            const matchedData = preferred.data() as Assignment;
            matchedAssignmentId = preferred.id;
            matchedClassId = matchedData.classId || userProfile.classId;
            matchedSchoolYear =
              matchedData.schoolYear ||
              (await resolveClassSchoolYear(matchedClassId)) ||
              userProfile.schoolYear ||
              DEFAULT_SCHOOL_YEAR;
          }
        } catch (err) {
          console.warn('Could not match class assignment for shared template:', err);
        }
      }

      setCurrentAssignmentId(matchedAssignmentId || `template_${resolvedId}`);
      setCurrentAssignmentClassId(matchedClassId);
      setCurrentAssignmentSchoolYear(matchedSchoolYear);
    }
    setSavedToProgress(false);
    setAppState('QUIZ');
  };

  const handleSwitchAccountForSharedExam = async () => {
    localStorage.removeItem('localUserSession');
    if (userProfile?.uid) {
      sessionStorage.removeItem(`selectedSchoolYear_${userProfile.uid}`);
    }
    sessionStorage.removeItem('activeSchoolYear');
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    setUserProfile(null);
    // Keep sharedExamId in state & sessionStorage so Login shows the shared exam banner
  };

  const handleOpenSharedExamCode = (rawInput: string) => {
    const ref = extractExamRefFromInput(rawInput);
    if (!ref) return;
    sessionStorage.setItem('pendingSharedExamId', ref.id);
    sessionStorage.setItem('pendingSharedExamSource', ref.source);
    setSharedExamSource(ref.source);
    setSharedExamId(ref.id);
    setAppState('SHARED_EXAM_READY');
  };

  const handleSelectSubject = (subject: Subject, topic?: string, count?: number, difficulty?: string, englishPercent?: number) => {
    setSelectedSubject(subject);
    if (topic) {
      handleStartQuiz(topic, count || 5, difficulty, englishPercent);
    } else {
      setAppState('TOPIC_SELECTOR');
    }
  };

  const handleSelectAssignment = (assignment: Assignment) => {
    setSelectedSubject(assignment.subject);
    setSelectedTopic(assignment.title);
    setQuestions(assignment.questions);
    setCurrentAssignmentId(assignment.id);
    setCurrentSharedTemplateId(assignment.templateId || null);
    setCurrentAssignmentClassId(assignment.classId || userProfile?.classId || null);
    setCurrentAssignmentSchoolYear(assignment.schoolYear || selectedSchoolYear);
    setSavedToProgress(false);
    setAppState('QUIZ');
  };

  const handleStartQuiz = async (topic: string, count: number, difficulty?: string, englishPercent?: number) => {
    if (!selectedSubject) return;
    
    setSelectedTopic(topic);
    setAppState('QUIZ');
    setIsGenerating(true);
    setCurrentAssignmentId(null);
    setCurrentSharedTemplateId(null);
    setCurrentAssignmentClassId(null);
    setCurrentAssignmentSchoolYear(null);
    setSavedToProgress(false);
    
    try {
      const generatedQuestions = await generateQuestions(selectedSubject, topic, count, undefined, difficulty, englishPercent);
      setQuestions(generatedQuestions);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Đã có lỗi xảy ra');
      setAppState('TOPIC_SELECTOR');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizComplete = async (score: number) => {
    setQuizScore(score);
    setAppState('RESULT');
    
    // Save result to Firestore so it appears in Student's Learning Progress & Teacher's Results
    if (user && selectedSubject && userProfile) {
      try {
        // Calculate points based on student grade level compared to subject grade level
        let calculatedPoints = score;
        if (userProfile.grade) {
          const studentGradeMatch = userProfile.grade.match(/\d+/);
          const studentGrade = studentGradeMatch ? parseInt(studentGradeMatch[0], 10) : null;
          
          const subjectGradeMatch = selectedSubject.match(/\d+/);
          const subjectGrade = subjectGradeMatch ? parseInt(subjectGradeMatch[0], 10) : null;
          
          if (studentGrade !== null && subjectGrade !== null) {
            if (subjectGrade > studentGrade) {
              calculatedPoints = score * 2; // vượt lớp
            } else if (subjectGrade < studentGrade) {
              calculatedPoints = score * 0.5; // nhỏ hơn lớp
            } else {
              calculatedPoints = score * 1; // đúng lớp
            }
          }
        }

        const effectiveSchoolYear = currentAssignmentSchoolYear || selectedSchoolYear;
        await addDoc(collection(db, 'results'), cleanFirestoreData({
          uid: userProfile.uid || user.uid,
          assignmentId: currentAssignmentId || null,
          sharedTemplateId: currentSharedTemplateId || null,
          classId: currentAssignmentClassId || userProfile.classId || null,
          schoolYear: effectiveSchoolYear,
          subject: selectedSubject,
          topic: selectedTopic,
          score: score,
          points: calculatedPoints,
          totalQuestions: questions.length,
          timestamp: serverTimestamp()
        }));
        if (currentAssignmentSchoolYear && currentAssignmentSchoolYear !== selectedSchoolYear) {
          handleChangeSchoolYear(currentAssignmentSchoolYear);
        }
        setSavedToProgress(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'results');
      }
    }
  };

  const handleRetry = () => {
    setSavedToProgress(false);
    if (currentAssignmentId || currentSharedTemplateId) {
      setAppState('QUIZ');
    } else {
      handleStartQuiz(selectedTopic, questions.length);
    }
  };

  const handleHome = () => {
    clearSharedExamFromUrl();
    setStudentInitialTab('de-kiem-tra');
    if (userProfile?.role === 'admin') {
      setAppState('ADMIN');
    } else {
      setAppState('DASHBOARD');
    }
    setSelectedSubject(null);
    setSelectedTopic('');
    setQuestions([]);
    setCurrentAssignmentId(null);
    setCurrentSharedTemplateId(null);
    setCurrentAssignmentClassId(null);
    setCurrentAssignmentSchoolYear(null);
    setSavedToProgress(false);
  };

  const handleViewLearningProgress = () => {
    clearSharedExamFromUrl();
    setStudentInitialTab('ket-qua');
    setAppState('DASHBOARD');
    setSelectedSubject(null);
    setSelectedTopic('');
    setQuestions([]);
    setCurrentAssignmentId(null);
    setCurrentSharedTemplateId(null);
    setCurrentAssignmentClassId(null);
    setCurrentAssignmentSchoolYear(null);
    setSavedToProgress(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 font-mono uppercase tracking-widest text-xs">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <Login
        sharedExamInfo={
          sharedExamTemplate
            ? {
                id: sharedExamTemplate.id || sharedExamId || '',
                title: sharedExamTemplate.title,
                subject: sharedExamTemplate.subject,
                questionCount: sharedExamTemplate.questions?.length || 0
              }
            : null
        }
        sharedExamLoading={sharedExamLoading}
        sharedExamError={sharedExamError}
      />
    );
  }

  const isStudentDashboard = userProfile?.role === 'student' && appState === 'DASHBOARD';

  return (
    <div className="min-h-screen bg-[#FFF9E6] text-stone-900 font-sans">
      {!isStudentDashboard && (
        <Navbar
          user={user}
          onHome={handleHome}
          selectedSchoolYear={selectedSchoolYear}
          onChangeSchoolYear={handleChangeSchoolYear}
        />
      )}
      
      <main className={isStudentDashboard ? "min-h-screen" : "container mx-auto pb-20 px-4"}>
        {appState === 'ADMIN' && userProfile.role === 'admin' && (
          <AdminDashboard
            selectedSchoolYear={selectedSchoolYear}
            onChangeSchoolYear={handleChangeSchoolYear}
          />
        )}

        {appState === 'SHARED_EXAM_READY' && (
          <div className="max-w-xl mx-auto px-4 py-10 sm:py-14">
            <div className="bg-white rounded-[32px] border-2 border-indigo-100 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 p-6 sm:p-8 text-white">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider mb-3">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Đề thi chia sẻ từ giáo viên</span>
                </div>
                {sharedExamLoading ? (
                  <div className="flex items-center gap-3 py-4">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="font-bold">Đang tải nội dung đề thi...</span>
                  </div>
                ) : sharedExamTemplate ? (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                      {sharedExamTemplate.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-bold">
                      <span className="px-3 py-1 rounded-full bg-white/20">
                        Môn: {sharedExamTemplate.subject}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/20">
                        {sharedExamTemplate.questions?.length || 0} câu hỏi trắc nghiệm
                      </span>
                    </div>
                  </>
                ) : (
                  <h2 className="text-xl font-extrabold">Không thể mở đề thi</h2>
                )}
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {sharedExamError ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="font-semibold leading-relaxed">{sharedExamError}</p>
                  </div>
                ) : (
                  <>
                    {/* Current Logged-in Account Info */}
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Tài khoản đang đăng nhập</p>
                          <p className="text-sm font-extrabold text-stone-900 truncate">
                            {userProfile.displayName || userProfile.email}
                          </p>
                          <p className="text-xs text-stone-500 truncate">
                            {userProfile.email}{userProfile.grade ? ` • ${userProfile.grade}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSwitchAccountForSharedExam}
                        className="px-3 py-2 text-xs font-bold text-stone-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-stone-200 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đổi tài khoản</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="font-semibold leading-relaxed">
                        Sau khi hoàn thành bài làm, điểm số sẽ tự động được lưu vào mục <strong>Kết quả & Tiến độ học tập</strong> của tài khoản này.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartSharedExam}
                      disabled={sharedExamLoading || !sharedExamTemplate}
                      className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>Bắt đầu làm bài ngay</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleHome}
                  className="w-full py-3 px-6 bg-white hover:bg-stone-50 text-stone-600 font-bold text-sm rounded-2xl border border-stone-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Về trang chủ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {appState === 'DASHBOARD' && (
          userProfile.role === 'teacher' ? (
            <TeacherDashboard
              userProfile={userProfile}
              selectedSchoolYear={selectedSchoolYear}
              onChangeSchoolYear={handleChangeSchoolYear}
            />
          ) : (
            <StudentDashboard 
              userProfile={userProfile}
              selectedSchoolYear={selectedSchoolYear}
              onChangeSchoolYear={handleChangeSchoolYear}
              onSelectSubject={handleSelectSubject} 
              onSelectAssignment={handleSelectAssignment}
              onViewHistory={handleViewLearningProgress}
              initialTab={studentInitialTab}
              onOpenSharedExam={handleOpenSharedExamCode}
            />
          )
        )}
        
        {appState === 'TOPIC_SELECTOR' && selectedSubject && (
          <TopicSelector 
            subject={selectedSubject} 
            userProfile={userProfile}
            selectedSchoolYear={selectedSchoolYear}
            onBack={() => setAppState('DASHBOARD')}
            onHome={handleHome}
            onStartQuiz={handleStartQuiz}
          />
        )}
        
        {appState === 'QUIZ' && (
          <Quiz 
            questions={questions} 
            onComplete={handleQuizComplete} 
            loading={isGenerating}
            onHome={handleHome}
            subject={selectedSubject || undefined}
          />
        )}
        
        {appState === 'RESULT' && selectedSubject && (
          <Result 
            score={quizScore} 
            total={questions.length} 
            subject={selectedSubject}
            topic={selectedTopic}
            onRetry={handleRetry}
            onHome={handleHome}
            onViewProgress={userProfile.role === 'student' ? handleViewLearningProgress : undefined}
            savedToProgress={savedToProgress}
          />
        )}
      </main>
    </div>
  );
}
