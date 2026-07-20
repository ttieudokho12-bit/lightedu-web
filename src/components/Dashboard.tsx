import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Calculator, Languages, History } from 'lucide-react';
import { Subject, SUBJECTS } from '../types';

interface DashboardProps {
  onSelectSubject: (subject: Subject) => void;
  onViewHistory: () => void;
}

const getSubjectIcon = (subject: string) => {
  if (subject.startsWith('Toán')) return Calculator;
  if (subject.startsWith('Tiếng Việt')) return BookOpen;
  if (subject.startsWith('Tiếng Anh')) return Languages;
  return BookOpen;
};

const getSubjectColor = (subject: string) => {
  if (subject.startsWith('Toán')) return 'bg-blue-50 text-blue-600 border-blue-100';
  if (subject.startsWith('Tiếng Việt')) return 'bg-orange-50 text-orange-600 border-orange-100';
  if (subject.startsWith('Tiếng Anh')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  return 'bg-amber-50 text-amber-600 border-amber-100';
};

export default function Dashboard({ onSelectSubject, onViewHistory }: DashboardProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-stone-900 mb-4">Chào mừng bạn!</h2>
        <p className="text-stone-600 max-w-lg mx-auto italic serif">
          Chọn môn học bạn muốn ôn luyện hôm nay. AI sẽ giúp bạn tạo bộ câu hỏi phù hợp nhất.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBJECTS.map((subject, index) => {
          const Icon = getSubjectIcon(subject);
          const colorClass = getSubjectColor(subject);
          
          return (
            <motion.button
              key={subject}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelectSubject(subject)}
              className={`flex flex-col items-center p-8 rounded-2xl border transition-all hover:shadow-lg group ${colorClass}`}
            >
              <div className="p-4 rounded-full bg-white shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Icon className="w-10 h-10" />
              </div>
              <span className="text-xl font-bold">{subject}</span>
              <span className="text-sm opacity-70 mt-2 font-mono uppercase tracking-tighter">Bậc Tiểu Học • Ôn Luyện Mỗi Ngày</span>
            </motion.button>
          );
        })}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 flex justify-center"
      >
        <button 
          onClick={onViewHistory}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium border-b border-stone-200 pb-1"
        >
          <History className="w-4 h-4" />
          Xem lịch sử làm bài
        </button>
      </motion.div>
    </div>
  );
}
