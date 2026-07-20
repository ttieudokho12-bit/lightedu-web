import React from 'react';
import { motion } from 'motion/react';
import { Trophy, RotateCcw, Home, Share2 } from 'lucide-react';

interface ResultProps {
  score: number;
  total: number;
  subject: string;
  topic: string;
  onRetry: () => void;
  onHome: () => void;
}

export default function Result({ score, total, subject, topic, onRetry, onHome }: ResultProps) {
  const percentage = Math.round((score / total) * 100);
  
  let message = "Cố gắng hơn nữa nhé!";
  let color = "text-orange-500";
  let bgColor = "bg-orange-50";
  
  if (percentage >= 80) {
    message = "Tuyệt vời! Bạn đã nắm vững kiến thức.";
    color = "text-emerald-500";
    bgColor = "bg-emerald-50";
  } else if (percentage >= 50) {
    message = "Khá tốt! Hãy ôn tập thêm những câu sai.";
    color = "text-blue-500";
    bgColor = "bg-blue-50";
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-3xl border border-stone-200 shadow-xl relative overflow-hidden"
      >
        {/* Decorative background */}
        <div className={`absolute top-0 left-0 w-full h-2 ${bgColor.replace('bg-', 'bg-')}`} />
        
        <div className={`inline-flex p-6 rounded-full ${bgColor} mb-8`}>
          <Trophy className={`w-16 h-16 ${color}`} />
        </div>

        <h2 className="text-3xl font-bold text-stone-900 mb-2">Kết quả ôn tập</h2>
        <p className="text-stone-500 font-mono uppercase tracking-widest text-sm mb-8">
          {subject} • {topic}
        </p>

        <div className="flex justify-center items-baseline gap-2 mb-4">
          <span className={`text-7xl font-black ${color}`}>{score}</span>
          <span className="text-2xl text-stone-300 font-bold">/ {total}</span>
        </div>

        <p className="text-xl font-medium text-stone-700 mb-12 italic serif">
          {message}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-all shadow-md"
          >
            <RotateCcw className="w-5 h-5" />
            Luyện tập lại
          </button>
          <button
            onClick={onHome}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-white border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-all shadow-sm"
          >
            <Home className="w-5 h-5" />
            Về trang chủ
          </button>
        </div>
      </motion.div>
    </div>
  );
}
