import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Send, Sparkles, ChevronRight, Home } from 'lucide-react';
import { Subject, PREDEFINED_TOPICS, UserProfile } from '../types';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

interface TopicSelectorProps {
  subject: Subject;
  userProfile?: UserProfile | null;
  onBack: () => void;
  onHome?: () => void;
  onStartQuiz: (topic: string, count: number, difficulty?: string) => void;
}

export default function TopicSelector({ subject, userProfile, onBack, onHome, onStartQuiz }: TopicSelectorProps) {
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('All');
  const [classCustomTopics, setClassCustomTopics] = useState<string[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  const [userResults, setUserResults] = useState<any[]>([]);

  const isEnglish = subject.startsWith('Tiếng Anh');

  const getEnglishTopics = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return ['Nhận biết từ', 'Điền chữ cái', 'Dịch từ', 'Chọn đáp án', 'Bài nghe (Listening)'];
      case 'Medium':
        return ['Hoàn thành câu', 'Sắp xếp từ', 'Chọn từ theo chủ đề', 'Đúng/Sai', 'Bài nghe (Listening)'];
      case 'Hard':
        return ['Sắp xếp câu', 'Chọn câu đúng', 'Chính tả', 'Phân loại từ', 'Đọc hiểu ngắn', 'Bài nghe (Listening)'];
      default: // 'All'
        return [
          'Tổng hợp tất cả các dạng bài',
          'Nhận biết từ', 'Điền chữ cái', 'Dịch từ', 'Chọn đáp án',
          'Hoàn thành câu', 'Sắp xếp từ', 'Chọn từ theo chủ đề', 'Đúng/Sai',
          'Sắp xếp câu', 'Chọn câu đúng', 'Chính tả', 'Phân loại từ', 'Đọc hiểu ngắn',
          'Bài nghe (Listening)'
        ];
    }
  };

  const displayedPredefinedTopics = isEnglish 
    ? getEnglishTopics(difficulty) 
    : (PREDEFINED_TOPICS[subject] || []);

  useEffect(() => {
    if (isEnglish && selectedTopic) {
      const allowed = getEnglishTopics(difficulty);
      if (!allowed.includes(selectedTopic)) {
        setSelectedTopic(null);
      }
    }
  }, [difficulty, subject]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(
      collection(db, 'results'),
      where('uid', '==', userProfile.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      setUserResults(list);
    }, (error) => {
      console.error('Error listening to user results in TopicSelector:', error);
    });
    return () => unsubscribe();
  }, [userProfile?.uid]);

  useEffect(() => {
    const loadCustomTopics = async () => {
      setIsLoadingCustom(true);
      try {
        const classesSnap = await getDocs(collection(db, 'classes'));
        const allowedGradesList = Array.from(new Set([
          userProfile?.grade || '',
          ...(userProfile?.allowedGrades || [])
        ])).filter(Boolean);

        const customTopicsList: string[] = [];
        
        classesSnap.docs.forEach(doc => {
          const data = doc.data();
          const className = data.name || '';
          
          // Check if this class is relevant to the student's allowed grades
          const isAllowed = allowedGradesList.some(grade => {
            const g = grade.toLowerCase();
            const c = className.toLowerCase();
            if (c.includes(g) || g.includes(c)) return true;
            
            const gMatch = g.match(/([1-9])/);
            const cMatch = c.match(/([1-9])/);
            return gMatch && cMatch && gMatch[1] === cMatch[1];
          });
          
          if (isAllowed || doc.id === userProfile?.classId) {
            const custom = data.customTopics?.[subject];
            if (Array.isArray(custom)) {
              custom.forEach(topic => {
                if (!customTopicsList.includes(topic)) {
                  customTopicsList.push(topic);
                }
              });
            }
          }
        });

        setClassCustomTopics(customTopicsList);
      } catch (err) {
        console.error("Error loading class custom topics:", err);
      } finally {
        setIsLoadingCustom(false);
      }
    };

    loadCustomTopics();
  }, [userProfile?.classId, userProfile?.allowedGrades, userProfile?.grade, subject]);

  const handleStart = () => {
    const topic = selectedTopic || customTopic;
    if (topic) {
      onStartQuiz(topic, questionCount, difficulty);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        {onHome && (
          <button 
            onClick={onHome}
            className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            Về Trang chủ
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h2 className="text-3xl font-bold text-stone-900 mb-2 flex items-center gap-3">
          Môn {subject}
        </h2>
        <p className="text-stone-500 mb-8 italic serif">Chọn một chủ đề có sẵn hoặc tự nhập nội dung bạn muốn ôn tập.</p>

        <div className="space-y-10">
          {/* Predefined Topics */}
          {displayedPredefinedTopics && displayedPredefinedTopics.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                <p className="text-xs font-mono uppercase tracking-widest text-stone-400">
                  {isEnglish ? 'Dạng bài tập đề xuất (English Exercise Types)' : 'Chủ đề gợi ý'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedPredefinedTopics.map((topic) => {
                  const isCompleted = userResults.some(r => r.subject === subject && r.topic === topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => {
                        setSelectedTopic(topic);
                        setCustomTopic('');
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
                        selectedTopic === topic 
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-[1.02]' 
                          : isCompleted
                            ? 'bg-emerald-50/30 border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                            : 'bg-rose-50/30 border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50/50'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm">{topic}</span>
                        <span className={`text-[10px] font-semibold ${isCompleted ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {isCompleted ? '● Đã hoàn thành' : '● Chưa làm'}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${selectedTopic === topic ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Class-specific Custom Topics */}
          {classCustomTopics.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                <p className="text-xs font-mono uppercase tracking-widest text-stone-400 font-bold">Chủ đề của lớp bạn</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classCustomTopics.map((topic) => {
                  const isCompleted = userResults.some(r => r.subject === subject && r.topic === topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => {
                        setSelectedTopic(topic);
                        setCustomTopic('');
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
                        selectedTopic === topic 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]' 
                          : isCompleted
                            ? 'bg-emerald-50/30 border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                            : 'bg-rose-50/30 border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50/50'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm">{topic}</span>
                        <span className={`text-[10px] font-semibold ${isCompleted ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {isCompleted ? '● Đã hoàn thành' : '● Chưa làm'}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${selectedTopic === topic ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Custom Topic */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <p className="text-xs font-mono uppercase tracking-widest text-stone-400">Hoặc tự nhập chủ đề muốn học</p>
            </div>
            <div className="relative group">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  setSelectedTopic(null);
                }}
                placeholder="Ví dụ: Ôn tập các số đến 100, Ki-lô-gam, Lít..."
                className="w-full p-5 pr-14 rounded-2xl border-2 border-stone-100 focus:border-blue-500 outline-none transition-all bg-white text-stone-900 font-medium shadow-sm focus:shadow-md"
              />
              <div className={`absolute right-5 top-1/2 -translate-y-1/2 transition-colors ${customTopic ? 'text-blue-500' : 'text-stone-300'}`}>
                <Sparkles className={`w-6 h-6 ${customTopic ? 'animate-pulse' : ''}`} />
              </div>
            </div>
          </section>

          {/* Question Count */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-stone-900 rounded-full"></div>
              <p className="text-xs font-mono uppercase tracking-widest text-stone-400">Số lượng câu hỏi trắc nghiệm</p>
            </div>
            <div className="flex gap-3">
              {[10, 20, 30].map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`flex-1 py-4 rounded-2xl border-2 font-bold transition-all ${
                    questionCount === count
                      ? 'bg-stone-900 border-stone-900 text-white shadow-lg scale-105'
                      : 'bg-white border-stone-100 text-stone-500 hover:border-stone-200'
                  }`}
                >
                  {count} câu
                </button>
              ))}
            </div>
          </section>

          {/* Difficulty Level */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
              <p className="text-xs font-mono uppercase tracking-widest text-stone-400">Mức độ thử thách (Difficulty)</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: 'All', label: 'Tất cả (All)', color: 'bg-stone-800 border-stone-800' },
                { value: 'Easy', label: 'Dễ (Easy)', color: 'bg-emerald-600 border-emerald-600' },
                { value: 'Medium', label: 'Trung bình (Medium)', color: 'bg-amber-500 border-amber-500' },
                { value: 'Hard', label: 'Khó (Hard)', color: 'bg-rose-600 border-rose-600' }
              ].map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => setDifficulty(diff.value)}
                  className={`py-4 rounded-2xl border-2 font-bold transition-all text-sm ${
                    difficulty === diff.value
                      ? `${diff.color} text-white shadow-lg scale-105`
                      : 'bg-white border-stone-100 text-stone-500 hover:border-stone-200'
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </section>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!selectedTopic && !customTopic}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Bắt đầu ôn luyện
          </button>
        </div>
      </motion.div>
    </div>
  );
}
