export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'student' | 'teacher' | 'admin';
  classId?: string;
  grade?: string; // e.g., 'Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'
  schoolName?: string;
  communeName?: string;
  provinceName?: string;
  allowedGrades?: string[]; // e.g., ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5']
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId: string;
  customTopics?: Record<string, string[]>;
}

export interface Assignment {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  subject: Subject;
  questions: Question[];
  createdAt: any;
}

export interface Question {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  image?: string;
  imagePrompt?: string;
  isListening?: boolean;
  listeningText?: string;
  vocabularyList?: { word: string; meaning: string }[];
}

export interface QuizResult {
  id?: string;
  uid: string;
  assignmentId: string;
  classId: string;
  subject: string;
  topic: string;
  score: number;
  points?: number;
  totalQuestions: number;
  timestamp: any; // Firestore Timestamp
}

export interface QuizTemplate {
  id?: string;
  teacherId: string;
  title: string;
  subject: Subject;
  questions: Question[];
  createdAt: any;
}

export type Subject = 
  | 'Toán Lớp 1' | 'Toán Lớp 2' | 'Toán Lớp 3' | 'Toán Lớp 4' | 'Toán Lớp 5' | 'Toán Lớp 9'
  | 'Tiếng Việt Lớp 1' | 'Tiếng Việt Lớp 2' | 'Tiếng Việt Lớp 3' | 'Tiếng Việt Lớp 4' | 'Tiếng Việt Lớp 5' | 'Ngữ văn Lớp 9'
  | 'Tiếng Anh Lớp 1' | 'Tiếng Anh Lớp 2' | 'Tiếng Anh Lớp 3' | 'Tiếng Anh Lớp 4' | 'Tiếng Anh Lớp 5' | 'Tiếng Anh Lớp 9';

export const SUBJECTS: Subject[] = [
  'Toán Lớp 1', 'Toán Lớp 2', 'Toán Lớp 3', 'Toán Lớp 4', 'Toán Lớp 5', 'Toán Lớp 9',
  'Tiếng Việt Lớp 1', 'Tiếng Việt Lớp 2', 'Tiếng Việt Lớp 3', 'Tiếng Việt Lớp 4', 'Tiếng Việt Lớp 5', 'Ngữ văn Lớp 9',
  'Tiếng Anh Lớp 1', 'Tiếng Anh Lớp 2', 'Tiếng Anh Lớp 3', 'Tiếng Anh Lớp 4', 'Tiếng Anh Lớp 5', 'Tiếng Anh Lớp 9'
];

export const PREDEFINED_TOPICS: Record<Subject, string[]> = {
  'Toán Lớp 1': [],
  'Toán Lớp 2': [],
  'Toán Lớp 3': [],
  'Toán Lớp 4': [],
  'Toán Lớp 5': [],
  'Toán Lớp 9': [],
  'Tiếng Việt Lớp 1': [
    'Ôn tập các âm, vần đã học',
    'Phân biệt chính tả c/k, g/gh, ng/ngh; các âm đầu dễ nhầm l/n, s/x, ch/tr',
    'Kết hợp các tiếng để tạo thành từ, kết hợp các từ ngữ để tạo thành câu',
    'Mở rộng vốn từ theo các chủ điểm quen thuộc (Gia đình, nhà trường, thiên nhiên, bạn bè...)',
    'Câu đố (Câu đố vui dân gian, câu đố tìm con vật, đồ vật đơn giản)',
    'Sắp xếp các chữ để tạo thành từ, sắp xếp các từ để tạo thành câu',
    'Chữ cái (Nhận biết chữ hoa, chữ thường; ghép cặp chữ; tìm chữ còn thiếu; sắp xếp bảng chữ cái)',
    'Âm và vần (Nhận biết âm, vần; đọc vần; ghép tiếng; phân biệt các vần dễ nhầm)',
    'Tiếng (Tách tiếng thành âm đầu, vần, thanh; ghép tiếng từ âm và vần)',
    'Thanh điệu (Thanh ngang, sắc, huyền, hỏi, ngã, nặng)',
    'Đọc tiếng (Đọc đúng tiếng chứa âm, vần đã học)',
    'Đọc từ (Đọc và hiểu nghĩa từ đơn giản)',
    'Đọc câu (Chọn câu đúng, điền từ còn thiếu, sắp xếp câu)',
    'Đọc đoạn văn (Đọc hiểu đoạn ngắn, trả lời câu hỏi)',
    'Chính tả (Chọn chữ đúng, điền âm đầu, vần, dấu thanh, sửa lỗi chính tả)',
    'Viết (Viết chữ, viết tiếng, viết câu ngắn)',
    'Kể chuyện (Sắp xếp tranh, chọn nội dung đúng, trả lời câu hỏi về câu chuyện)'
  ],
  'Tiếng Việt Lớp 2': [],
  'Tiếng Việt Lớp 3': [],
  'Tiếng Việt Lớp 4': [],
  'Tiếng Việt Lớp 5': [],
  'Ngữ văn Lớp 9': [],
  'Tiếng Anh Lớp 1': [],
  'Tiếng Anh Lớp 2': [],
  'Tiếng Anh Lớp 3': [],
  'Tiếng Anh Lớp 4': [],
  'Tiếng Anh Lớp 5': [],
  'Tiếng Anh Lớp 9': []
};
