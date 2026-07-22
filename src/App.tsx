import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, addDoc, collection, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { Subject, Question, UserProfile, Assignment } from './types';
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

type AppState = 'DASHBOARD' | 'TOPIC_SELECTOR' | 'QUIZ' | 'RESULT' | 'HISTORY' | 'ADMIN';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>('DASHBOARD');
  
  // Quiz State
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizScore, setQuizScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null);

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
            if (profile.role === 'admin') {
              setAppState('ADMIN');
            } else {
              setAppState('DASHBOARD');
            }
          } else {
            setUser({ uid: localData.uid, email: localData.email } as any);
            setUserProfile(localData);
            if (localData.role === 'admin') {
              setAppState('ADMIN');
            } else {
              setAppState('DASHBOARD');
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
      if (profile.role === 'admin') {
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
              
              if (profile.role === 'admin') {
                setAppState('ADMIN');
              } else {
                setAppState('DASHBOARD');
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
                setAppState('ADMIN');
              } else {
                const defaultProfile: UserProfile = {
                  uid: currentUser.uid,
                  email: currentUser.email || '',
                  displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                  role: 'student'
                };
                await setDoc(userRef, cleanFirestoreData(defaultProfile), { merge: true });
                setUserProfile(defaultProfile);
                setAppState('DASHBOARD');
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

  const handleSelectSubject = (subject: Subject, topic?: string, count?: number, difficulty?: string) => {
    setSelectedSubject(subject);
    if (topic) {
      handleStartQuiz(topic, count || 5, difficulty);
    } else {
      setAppState('TOPIC_SELECTOR');
    }
  };

  const handleSelectAssignment = (assignment: Assignment) => {
    setSelectedSubject(assignment.subject);
    setSelectedTopic(assignment.title);
    setQuestions(assignment.questions);
    setCurrentAssignmentId(assignment.id);
    setAppState('QUIZ');
  };

  const handleStartQuiz = async (topic: string, count: number, difficulty?: string) => {
    if (!selectedSubject) return;
    
    setSelectedTopic(topic);
    setAppState('QUIZ');
    setIsGenerating(true);
    setCurrentAssignmentId(null);
    
    try {
      const generatedQuestions = await generateQuestions(selectedSubject, topic, count, undefined, difficulty);
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
    
    // Save result to Firestore
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

        await addDoc(collection(db, 'results'), cleanFirestoreData({
          uid: user.uid,
          assignmentId: currentAssignmentId || null,
          classId: userProfile.classId || null,
          subject: selectedSubject,
          topic: selectedTopic,
          score: score,
          points: calculatedPoints,
          totalQuestions: questions.length,
          timestamp: serverTimestamp()
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'results');
      }
    }
  };

  const handleRetry = () => {
    if (currentAssignmentId) {
      setAppState('QUIZ');
    } else {
      handleStartQuiz(selectedTopic, questions.length);
    }
  };

  const handleHome = () => {
    if (userProfile?.role === 'admin') {
      setAppState('ADMIN');
    } else {
      setAppState('DASHBOARD');
    }
    setSelectedSubject(null);
    setSelectedTopic('');
    setQuestions([]);
    setCurrentAssignmentId(null);
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
    return <Login />;
  }

  const isStudentDashboard = userProfile?.role === 'student' && appState === 'DASHBOARD';

  return (
    <div className="min-h-screen bg-[#FFF9E6] text-stone-900 font-sans">
      {!isStudentDashboard && <Navbar user={user} onHome={handleHome} />}
      
      <main className={isStudentDashboard ? "min-h-screen" : "container mx-auto pb-20 px-4"}>
        {appState === 'ADMIN' && userProfile.role === 'admin' && (
          <AdminDashboard />
        )}

        {appState === 'DASHBOARD' && (
          userProfile.role === 'teacher' ? (
            <TeacherDashboard userProfile={userProfile} />
          ) : (
            <StudentDashboard 
              userProfile={userProfile}
              onSelectSubject={handleSelectSubject} 
              onSelectAssignment={handleSelectAssignment}
              onViewHistory={() => alert('Chức năng lịch sử đang được phát triển')} 
            />
          )
        )}
        
        {appState === 'TOPIC_SELECTOR' && selectedSubject && (
          <TopicSelector 
            subject={selectedSubject} 
            userProfile={userProfile}
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
          />
        )}
      </main>
    </div>
  );
}
