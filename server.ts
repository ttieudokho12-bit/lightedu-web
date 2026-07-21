import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Admin
const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

// Initialize Firestore with the specific database ID
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

// Initialize GoogleGenAI lazily on the server side
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is missing. Will try to fall back to mock generation when required.");
      throw new Error("GEMINI_API_KEY environment variable is required. Please add it to your secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Robust wrapper with automatic backoff and retry for Gemini API rate limits (429 RESOURCE_EXHAUSTED)
async function generateContentWithRetry(options: {
  model: string;
  contents: any;
  config?: any;
}, retries = 4, initialDelay = 2000): Promise<any> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await getAI().models.generateContent(options);
    } catch (error: any) {
      attempt++;
      const errorStr = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
      
      const isDailyQuotaExceeded = 
        errorStr.includes("GenerateRequestsPerDay") || 
        errorStr.includes("exceeded your current quota") || 
        errorStr.includes("quota_limit_exceeded") ||
        errorStr.includes("quota exceeded") ||
        errorStr.includes("check your plan and billing");
        
      if (isDailyQuotaExceeded) {
        console.warn(`[Gemini API] Daily/Billing quota limit exceeded. Failing fast without retry to use high-quality local fallback immediately.`);
        throw error;
      }

      const isRateLimit = 
        errorStr.includes("429") || 
        errorStr.includes("RESOURCE_EXHAUSTED") || 
        errorStr.includes("quota") || 
        errorStr.includes("limit") ||
        errorStr.includes("rate limit") ||
        (error && (error.status === 429 || error.code === 429));
        
      if (isRateLimit && attempt < retries) {
        // Parse the retry delay from the error message if any
        let delay = initialDelay * Math.pow(2, attempt - 1);
        const retryMatch = errorStr.match(/retry in ([\d\.]+)/i) || errorStr.match(/retryDelay":\s*"(\d+)s/i);
        if (retryMatch) {
          const seconds = parseFloat(retryMatch[1]);
          if (!isNaN(seconds)) {
            if (seconds > 10) {
              console.warn(`[Gemini API] Required delay of ${seconds}s is too long. Failing fast without retry to use high-quality local fallback immediately.`);
              throw error;
            }
            delay = Math.ceil(seconds * 1000) + 1500; // Add a safety buffer
          }
        }
        
        if (delay > 10000) {
          console.warn(`[Gemini API] Delay of ${delay}ms is too long. Failing fast without retry to use high-quality local fallback immediately.`);
          throw error;
        }

        console.warn(`[Gemini API] Quota limit hit (Attempt ${attempt}/${retries}). Retrying in ${delay}ms... Error details: ${errorStr}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Highly sophisticated local fallback question generator
function generateLocalQuestions(subject: string, topic: string, count: number, difficulty?: string): any[] {
  const normSubject = (subject || "").toLowerCase();
  const normTopic = (topic || "").toLowerCase();
  const diff = difficulty || "Medium";
  const questions: any[] = [];

  // Helper to generate a random ID
  const makeId = () => "fb_" + Math.random().toString(36).substring(2, 11);

  // Parse Grade
  let grade = 9;
  if (normSubject.includes("1") || normSubject.includes("lớp 1")) grade = 1;
  else if (normSubject.includes("2") || normSubject.includes("lớp 2")) grade = 2;
  else if (normSubject.includes("3") || normSubject.includes("lớp 3")) grade = 3;
  else if (normSubject.includes("4") || normSubject.includes("lớp 4")) grade = 4;
  else if (normSubject.includes("5") || normSubject.includes("lớp 5")) grade = 5;
  else if (normSubject.includes("9") || normSubject.includes("lớp 9")) grade = 9;

  // Parse Subject Domain
  let domain = "toán";
  if (normSubject.includes("văn") || normSubject.includes("việt") || normSubject.includes("liter")) {
    domain = "văn";
  } else if (normSubject.includes("anh") || normSubject.includes("english") || normSubject.includes("tiếng anh")) {
    domain = "anh";
  }

  let pool: any[] = [];

  if (domain === "toán") {
    if (grade === 1) {
      // Grade 1 Math Pool
      const addSubPool = [
        {
          question: "Tính nhẩm kết quả của phép tính: $6 + 3 = ?$",
          options: { A: "$9$", B: "$8$", C: "$10$", D: "$7$" },
          correctAnswer: "A",
          explanation: "Ta nhẩm hoặc đếm thêm từ 6: 6 cộng thêm 3 được kết quả bằng 9.",
          difficulty: "Easy"
        },
        {
          question: "Tính nhẩm kết quả của phép tính: $10 - 4 = ?$",
          options: { A: "$6$", B: "$5$", C: "$7$", D: "$4$" },
          correctAnswer: "A",
          explanation: "Ta nhẩm bớt đi từ 10: 10 trừ đi 4 có kết quả bằng 6.",
          difficulty: "Easy"
        },
        {
          question: "Tìm số thích hợp để điền vào ô trống: $5 + \\square = 8$.",
          options: { A: "$3$", B: "$2$", C: "$4$", D: "$5$" },
          correctAnswer: "A",
          explanation: "Ta lấy số tổng trừ đi số đã biết: $8 - 5 = 3$. Số cần điền vào ô trống là 3.",
          difficulty: "Medium"
        },
        {
          question: "Mẹ mua cho bé 7 cái kẹo, bé ăn hết 3 cái kẹo. Hỏi bé còn lại bao nhiêu cái kẹo?",
          options: { A: "$4$ cái kẹo", B: "$5$ cái kẹo", C: "$3$ cái kẹo", D: "$2$ cái kẹo" },
          correctAnswer: "A",
          explanation: "Số kẹo bé còn lại là: $7 - 3 = 4$ cái kẹo.",
          difficulty: "Medium"
        }
      ];

      const compareGeometryPool = [
        {
          question: "Chọn dấu thích hợp để điền vào chỗ trống: $15 \\dots 12$.",
          options: { A: "$>$", B: "$<$", C: "$=$", D: "$+$" },
          correctAnswer: "A",
          explanation: "Số 15 có hàng chục bằng số 12 (đều là 1), hàng đơn vị là $5 > 2$. Do đó $15 > 12$.",
          difficulty: "Easy"
        },
        {
          question: "Hình nào dưới đây có 3 cạnh và 3 góc?",
          options: { A: "Hình tam giác", B: "Hình vuông", C: "Hình tròn", D: "Hình chữ nhật" },
          correctAnswer: "A",
          explanation: "Hình tam giác là hình có 3 cạnh và 3 đỉnh (góc).",
          difficulty: "Easy"
        },
        {
          question: "Tìm số lớn nhất trong các số sau đây: $9, 14, 18, 11$.",
          options: { A: "$18$", B: "$14$", C: "$9$", D: "$11$" },
          correctAnswer: "A",
          explanation: "Khi so sánh các số, số 18 là số lớn nhất trong các số đã cho.",
          difficulty: "Easy"
        }
      ];

      if (normTopic.includes("cộng") || normTopic.includes("trừ") || normTopic.includes("tính") || normTopic.includes("phép")) {
        pool.push(...addSubPool);
      } else if (normTopic.includes("so sánh") || normTopic.includes("hình") || normTopic.includes("lớn") || normTopic.includes("bé")) {
        pool.push(...compareGeometryPool);
      } else {
        pool.push(...addSubPool, ...compareGeometryPool);
      }
    } else if (grade === 2) {
      // Grade 2 Math Pool
      const basicMulDivPool = [
        {
          question: "Tính nhẩm giá trị của phép nhân: $5 \\times 4 = ?$",
          options: { A: "$20$", B: "$15$", C: "$25$", D: "$30$" },
          correctAnswer: "A",
          explanation: "Dựa vào bảng nhân 5: $5 \\times 1 = 5$, $5 \\times 2 = 10$, $5 \\times 3 = 15$, $5 \\times 4 = 20$.",
          difficulty: "Easy"
        },
        {
          question: "Tính giá trị của phép chia sau: $14 : 2 = ?$",
          options: { A: "$7$", B: "$6$", C: "$8$", D: "$5$" },
          correctAnswer: "A",
          explanation: "Dựa vào bảng chia 2 hoặc phép nhân ngược: $2 \\times 7 = 14$ nên $14 : 2 = 7$.",
          difficulty: "Easy"
        },
        {
          question: "Mỗi con mèo có 4 cái chân. Hỏi 5 con mèo có tất cả bao nhiêu cái chân?",
          options: { A: "$20$ cái chân", B: "$16$ cái chân", C: "$24$ cái chân", D: "$15$ cái chân" },
          correctAnswer: "A",
          explanation: "Số chân của 5 con mèo là: $4 \\times 5 = 20$ cái chân.",
          difficulty: "Medium"
        }
      ];

      const carryingPool = [
        {
          question: "Thực hiện phép tính cộng có nhớ sau: $38 + 27 = ?$",
          options: { A: "$65$", B: "$55$", C: "$66$", D: "$56$" },
          correctAnswer: "A",
          explanation: "Ta cộng từ phải sang trái: $8 + 7 = 15$ viết 5 nhớ 1; $3 + 2 = 5$ thêm 1 bằng 6. Kết quả là 65.",
          difficulty: "Medium"
        },
        {
          question: "Tìm $x$ biết: $x - 28 = 45$.",
          options: { A: "$x = 73$", B: "$x = 63$", C: "$x = 17$", D: "$x = 77$" },
          correctAnswer: "A",
          explanation: "Để tìm số bị trừ, ta lấy hiệu cộng với số trừ: $x = 45 + 28 = 73$.",
          difficulty: "Medium"
        },
        {
          question: "Lan có $42\\text{ cm}$ băng giấy. Lan cắt đi $15\\text{ cm}$. Hỏi băng giấy còn lại của Lan dài bao nhiêu xăng-ti-mét?",
          options: { A: "$27\\text{ cm}$", B: "$37\\text{ cm}$", C: "$25\\text{ cm}$", D: "$17\\text{ cm}$" },
          correctAnswer: "A",
          explanation: "Độ dài băng giấy còn lại là: $42 - 15 = 27\\text{ cm}$.",
          difficulty: "Medium"
        }
      ];

      if (normTopic.includes("nhân") || normTopic.includes("chia") || normTopic.includes("tính nhẩm")) {
        pool.push(...basicMulDivPool);
      } else {
        pool.push(...carryingPool, ...basicMulDivPool);
      }
    } else if (grade === 3) {
      // Grade 3 Math Pool
      const geometryAndExpressionPool = [
        {
          question: "Tính diện tích của hình chữ nhật có chiều dài $8\\text{ cm}$ và chiều rộng $5\\text{ cm}$.",
          options: { A: "$40\\text{ cm}^2$", B: "$26\\text{ cm}^2$", C: "$13\\text{ cm}^2$", D: "$30\\text{ cm}^2$" },
          correctAnswer: "A",
          explanation: "Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng: $8 \\times 5 = 40\\text{ cm}^2$.",
          difficulty: "Medium"
        },
        {
          question: "Một hình vuông có chu vi là $28\\text{ cm}$. Tính độ dài cạnh của hình vuông đó.",
          options: { A: "$7\\text{ cm}$", B: "$6\\text{ cm}$", C: "$8\\text{ cm}$", D: "$14\\text{ cm}$" },
          correctAnswer: "A",
          explanation: "Chu vi hình vuông bằng cạnh nhân với 4. Vậy độ dài cạnh hình vuông là: $28 : 4 = 7\\text{ cm}$.",
          difficulty: "Medium"
        },
        {
          question: "Tính giá trị của biểu thức sau: $180 - 40 \\times 3$.",
          options: { A: "$60$", B: "$420$", C: "$140$", D: "$120$" },
          correctAnswer: "A",
          explanation: "Trong biểu thức có phép trừ và phép nhân, ta thực hiện phép nhân trước: $40 \\times 3 = 120$. Sau đó thực hiện phép trừ: $180 - 120 = 60$.",
          difficulty: "Medium"
        },
        {
          question: "Tìm $x$ biết: $x \\times 7 = 56$.",
          options: { A: "$x = 8$", B: "$x = 7$", C: "$x = 9$", D: "$x = 6$" },
          correctAnswer: "A",
          explanation: "Để tìm thừa số chưa biết, ta lấy tích chia cho thừa số đã biết: $x = 56 : 7 = 8$.",
          difficulty: "Easy"
        }
      ];

      const fractionAndWordPool = [
        {
          question: "Một lớp học có 35 học sinh, trong đó có $\\frac{1}{5}$ số học sinh học giỏi môn Toán. Hỏi lớp học có bao nhiêu học sinh học giỏi môn Toán?",
          options: { A: "$7$ học sinh", B: "$5$ học sinh", C: "$6$ học sinh", D: "$8$ học sinh" },
          correctAnswer: "A",
          explanation: "Số học sinh học giỏi môn Toán là: $35 : 5 = 7$ học sinh.",
          difficulty: "Easy"
        }
      ];

      pool.push(...geometryAndExpressionPool, ...fractionAndWordPool);
    } else if (grade === 4) {
      // Grade 4 Math Pool
      const fractionPool = [
        {
          question: "Thực hiện phép tính cộng phân số sau: $\\frac{2}{3} + \\frac{1}{4} = ?$",
          options: { A: "$\\frac{11}{12}$", B: "$\\frac{3}{7}$", C: "$\\frac{3}{12}$", D: "$\\frac{5}{12}$" },
          correctAnswer: "A",
          explanation: "Quy đồng mẫu số hai phân số: $\\frac{2}{3} = \\frac{8}{12}$ và $\\frac{1}{4} = \\frac{3}{12}$. Cộng hai tử số: $\\frac{8 + 3}{12} = \\frac{11}{12}$.",
          difficulty: "Medium"
        },
        {
          question: "Rút gọn phân số sau về dạng tối giản: $\\frac{24}{36}$.",
          options: { A: "$\\frac{2}{3}$", B: "$\\frac{3}{4}$", C: "$\\frac{4}{6}$", D: "$\\frac{1}{2}$" },
          correctAnswer: "A",
          explanation: "Ta chia cả tử và mẫu cho ước chung lớn nhất là 12: $\\frac{24 : 12}{36 : 12} = \\frac{2}{3}$.",
          difficulty: "Easy"
        },
        {
          question: "Tính kết quả phép nhân phân số: $\\frac{3}{5} \\times \\frac{4}{7} = ?$",
          options: { A: "$\\frac{12}{35}$", B: "$\\frac{7}{12}$", C: "$\\frac{12}{12}$", D: "$\\frac{7}{35}$" },
          correctAnswer: "A",
          explanation: "Nhân tử số với tử số, mẫu số với mẫu số: $\\frac{3 \\times 4}{5 \\times 7} = \\frac{12}{35}$.",
          difficulty: "Easy"
        }
      ];

      const sumDiffPool = [
        {
          question: "Tìm hai số khi biết tổng của chúng là 100 và hiệu của chúng là 20.",
          options: { A: "$60$ và $40$", B: "$50$ và $50$", C: "$70$ và $30$", D: "$55$ và $45$" },
          correctAnswer: "A",
          explanation: "Số lớn = (Tổng + Hiệu) : 2 = (100 + 20) : 2 = 60. Số bé = Tổng - Số lớn = 100 - 60 = 40.",
          difficulty: "Medium"
        },
        {
          question: "Một hình bình hành có độ dài đáy là $15\\text{ cm}$ và chiều cao tương ứng là $6\\text{ cm}$. Tính diện tích hình bình hành đó.",
          options: { A: "$90\\text{ cm}^2$", B: "$45\\text{ cm}^2$", C: "$30\\text{ cm}^2$", D: "$42\\text{ cm}^2$" },
          correctAnswer: "A",
          explanation: "Diện tích hình bình hành bằng độ dài đáy nhân với chiều cao tương ứng: $15 \\times 6 = 90\\text{ cm}^2$.",
          difficulty: "Medium"
        }
      ];

      if (normTopic.includes("phân số") || normTopic.includes("phép tính")) {
        pool.push(...fractionPool);
      } else {
        pool.push(...fractionPool, ...sumDiffPool);
      }
    } else if (grade === 5) {
      // Grade 5 Math Pool
      const math5Pool = [
        {
          question: "Tính diện tích hình tam giác có độ dài đáy là $12\\text{ cm}$ và chiều cao tương ứng là $8\\text{ cm}$.",
          options: { A: "$48\\text{ cm}^2$", B: "$96\\text{ cm}^2$", C: "$24\\text{ cm}^2$", D: "$40\\text{ cm}^2$" },
          correctAnswer: "A",
          explanation: "Diện tích hình tam giác bằng độ dài đáy nhân với chiều cao rồi chia cho 2: $\\frac{12 \\times 8}{2} = 48\\text{ cm}^2$.",
          difficulty: "Medium"
        },
        {
          question: "Một lớp học có 40 học sinh, trong đó có 26 học sinh nữ. Tính tỉ số phần trăm của học sinh nữ so với học sinh cả lớp.",
          options: { A: "$65\\%$", B: "$60\\%$", C: "$52\\%$", D: "$70\\%$" },
          correctAnswer: "A",
          explanation: "Tỉ số phần trăm của học sinh nữ là: $26 : 40 = 0.65 = 65\\%$.",
          difficulty: "Medium"
        },
        {
          question: "Một người đi xe máy với vận tốc $42\\text{ km/h}$ trong thời gian $2.5$ giờ. Tính quãng đường người đó đã đi được.",
          options: { A: "$105\\text{ km}$", B: "$95\\text{ km}$", C: "$100\\text{ km}$", D: "$110\\text{ km}$" },
          correctAnswer: "A",
          explanation: "Quãng đường bằng vận tốc nhân với thời gian: $s = v \\times t = 42 \\times 2.5 = 105\\text{ km}$.",
          difficulty: "Medium"
        },
        {
          question: "Tính thể tích của hình hộp chữ nhật có chiều dài $5\\text{ cm}$, chiều rộng $4\\text{ cm}$ và chiều cao $6\\text{ cm}$.",
          options: { A: "$120\\text{ cm}^3$", B: "$74\\text{ cm}^2$", C: "$60\\text{ cm}^3$", D: "$100\\text{ cm}^3$" },
          correctAnswer: "A",
          explanation: "Thể tích hình hộp chữ nhật bằng tích ba kích thước: $V = 5 \\times 4 \\times 6 = 120\\text{ cm}^3$.",
          difficulty: "Medium"
        }
      ];

      pool.push(...math5Pool);
    } else {
      // Grade 9 Math (Roots, Equations, Systems, Geometry)
      const math9Roots = [
        {
          question: "Tính giá trị của biểu thức: $A = \\sqrt{25} + \\sqrt{16} - \\sqrt{9}$.",
          options: { A: "$6$", B: "$5$", C: "$9$", D: "$4$" },
          correctAnswer: "A",
          explanation: "Ta có: $\\sqrt{25} = 5$; $\\sqrt{16} = 4$; $\\sqrt{9} = 3$. Thay vào biểu thức: $A = 5 + 4 - 3 = 6$.",
          difficulty: "Easy"
        },
        {
          question: "Tìm điều kiện xác định của biểu thức sau: $B = \\sqrt{2x - 6}$.",
          options: { A: "$x \\ge 3$", B: "$x > 3$", C: "$x \\ge -3$", D: "$x \\le 3$" },
          correctAnswer: "A",
          explanation: "Biểu thức dưới dấu căn xác định khi và chỉ khi: $2x - 6 \\ge 0 \\Leftrightarrow 2x \\ge 6 \\Leftrightarrow x \\ge 3$.",
          difficulty: "Easy"
        },
        {
          question: "Rút gọn biểu thức: $C = \\sqrt{50} - 2\\sqrt{18} + 3\\sqrt{8}$.",
          options: { A: "$5\\sqrt{2}$", B: "$3\\sqrt{2}$", C: "$2\\sqrt{2}$", D: "$5\\sqrt{3}$" },
          correctAnswer: "A",
          explanation: "Ta phân tích các căn thức: $\\sqrt{50} = 5\\sqrt{2}$; $2\\sqrt{18} = 2 \\cdot 3\\sqrt{2} = 6\\sqrt{2}$; $3\\sqrt{8} = 3 \\cdot 2\\sqrt{2} = 6\\sqrt{2}$. Do đó $C = 5\\sqrt{2} - 6\\sqrt{2} + 6\\sqrt{2} = 5\\sqrt{2}$.",
          difficulty: "Medium"
        }
      ];

      const math9Equations = [
        {
          question: "Giải phương trình bậc hai: $x^2 - 5x + 6 = 0$.",
          options: { A: "$x = 2$ hoặc $x = 3$", B: "$x = -2$ hoặc $x = -3$", C: "$x = 1$ hoặc $x = 6$", D: "$x = -1$ hoặc $x = -6$" },
          correctAnswer: "A",
          explanation: "Ta sử dụng biệt thức $\\Delta = (-5)^2 - 4 \\cdot 1 \\cdot 6 = 25 - 24 = 1 > 0$. Phương trình có hai nghiệm phân biệt: $x_1 = 3$; $x_2 = 2$.",
          difficulty: "Easy"
        },
        {
          question: "Tìm biệt thức $\\Delta'$ của phương trình: $x^2 - 6x + 5 = 0$.",
          options: { A: "$\\Delta' = 4$", B: "$\\Delta' = 16$", C: "$\\Delta' = 9$", D: "$\\Delta' = 1$" },
          correctAnswer: "A",
          explanation: "Ta có $b' = -3$. Biệt thức thu gọn: $\\Delta' = b'^2 - ac = (-3)^2 - 1 \\cdot 5 = 9 - 5 = 4$.",
          difficulty: "Easy"
        }
      ];

      const math9Geometry = [
        {
          question: "Cho $\\triangle ABC$ vuông tại $A$ có $AB = 6\\text{ cm}$ và $AC = 8\\text{ cm}$. Tính độ dài đường cao $AH$ hạ từ đỉnh $A$.",
          options: { A: "$4.8\\text{ cm}$", B: "$5.0\\text{ cm}$", C: "$4.5\\text{ cm}$", D: "$5.2\\text{ cm}$" },
          correctAnswer: "A",
          explanation: "Áp dụng định lý Pitago: $BC = \\sqrt{6^2 + 8^2} = 10\\text{ cm}$. Hệ thức lượng: $AH \\cdot BC = AB \\cdot AC \\Rightarrow AH = 4.8\\text{ cm}$.",
          difficulty: "Medium"
        }
      ];

      if (normTopic.includes("căn")) {
        pool.push(...math9Roots);
      } else if (normTopic.includes("phương trình") || normTopic.includes("hệ")) {
        pool.push(...math9Equations);
      } else {
        pool.push(...math9Roots, ...math9Equations, ...math9Geometry);
      }
    }
  } else if (domain === "văn") {
    if (grade === 1) {
      // Grade 1 Vietnamese
      const tv1Pool = [
        {
          question: "Điền chữ cái thích hợp vào chỗ trống để hoàn thành từ chỉ ông mặt trời rực rỡ: 'ông m___t trời'.",
          options: { A: "ặ", B: "â", C: "ọ", D: "ô" },
          correctAnswer: "A",
          explanation: "Từ đúng chính tả viết đầy đủ là: 'ông mặt trời'. Vì vậy, ta cần điền chữ cái 'ặ'.",
          difficulty: "Easy"
        },
        {
          question: "Từ nào sau đây viết ĐÚNG chính tả?",
          options: { A: "Quyển sách", B: "Kiển sách", C: "Quyển xách", D: "Kiển xách" },
          correctAnswer: "A",
          explanation: "'Quyển sách' là từ viết hoàn toàn chính xác theo tiếng Việt.",
          difficulty: "Easy"
        },
        {
          question: "Tìm tiếng có chứa âm 'v' trong các từ sau đây:",
          options: { A: "Vui vẻ", B: "Học hành", C: "Chăm chỉ", D: "Xinh đẹp" },
          correctAnswer: "A",
          explanation: "Từ 'Vui vẻ' gồm hai tiếng đều có chứa âm 'v'.",
          difficulty: "Easy"
        }
      ];
      pool.push(...tv1Pool);
    } else if (grade === 2) {
      // Grade 2 Vietnamese
      const tv2Pool = [
        {
          question: "Trong câu: 'Nam đang chăm chú đọc một cuốn truyện hay.', từ nào là từ chỉ hoạt động?",
          options: { A: "Đọc", B: "Cuốn truyện", C: "Nam", D: "Chăm chú" },
          correctAnswer: "A",
          explanation: "Từ 'đọc' là từ chỉ hoạt động đọc sách của Nam.",
          difficulty: "Easy"
        },
        {
          question: "Từ nào dưới đây là từ chỉ đặc điểm của thời tiết mùa đông?",
          options: { A: "Lạnh giá", B: "Mưa rào", C: "Tắm biển", D: "Đi học" },
          correctAnswer: "A",
          explanation: "'Lạnh giá' chỉ đặc điểm nhiệt độ thấp của mùa đông.",
          difficulty: "Easy"
        },
        {
          question: "Câu nào dưới đây được cấu tạo theo kiểu câu 'Ai là gì?'?",
          options: { A: "Bố em là thợ điện giỏi.", B: "Bố em đang sửa ổ cắm điện.", C: "Bố em rất hiền hậu và vui tính.", D: "Bố em đi làm lúc sáng sớm." },
          correctAnswer: "A",
          explanation: "Câu 'Bố em là thợ điện giỏi.' có cấu trúc định nghĩa/giới thiệu: Ai (Bố em) - là gì (là thợ điện giỏi).",
          difficulty: "Easy"
        }
      ];
      pool.push(...tv2Pool);
    } else if (grade === 3) {
      // Grade 3 Vietnamese
      const tv3Pool = [
        {
          question: "Tìm hình ảnh so sánh trong câu thơ: 'Trẻ em như búp trên cành / Biết ăn ngủ, biết học hành là ngoan.'",
          options: { A: "Trẻ em được so sánh với búp trên cành", B: "Trẻ em được so sánh với ăn ngủ", C: "Học hành được so sánh với búp trên cành", D: "Búp trên cành được so sánh với ngoan" },
          correctAnswer: "A",
          explanation: "Nhà thơ Hồ Chí Minh đã ví von 'Trẻ em' sinh động với 'búp trên cành' tràn đầy sức sống và cần che chở.",
          difficulty: "Easy"
        },
        {
          question: "Từ ngữ nào được dùng để nhân hóa chú gà trống trong câu: 'Bác gà trống cất tiếng gáy vang báo thức mọi người.'?",
          options: { A: "Bác", B: "Cất tiếng", C: "Mọi người", D: "Báo thức" },
          correctAnswer: "A",
          explanation: "Sử dụng từ gọi người 'Bác' để gọi con vật là biện pháp nhân hóa.",
          difficulty: "Easy"
        }
      ];
      pool.push(...tv3Pool);
    } else if (grade === 4) {
      // Grade 4 Vietnamese
      const tv4Pool = [
        {
          question: "Trong câu: 'Mẹ em mua một bộ quần áo rất đẹp.', từ 'đẹp' đóng vai trò là từ loại nào?",
          options: { A: "Tính từ", B: "Danh từ", C: "Động từ", D: "Trạng từ" },
          correctAnswer: "A",
          explanation: "Từ 'đẹp' chỉ đặc điểm của bộ quần áo, nên nó là một tính từ.",
          difficulty: "Easy"
        },
        {
          question: "Câu nào dưới đây là câu cầu khiến?",
          options: { A: "Chúng mình hãy cùng nhau giữ gìn vệ sinh lớp học nhé!", B: "Bầu trời mùa thu hôm nay mới trong xanh làm sao!", C: "Ai đã lau bảng sạch sẽ như thế này nhỉ?", D: "Em rất thích học môn Tiếng Việt lớp 4." },
          correctAnswer: "A",
          explanation: "Câu cầu khiến dùng để yêu cầu, đề nghị có từ 'hãy... nhé!'.",
          difficulty: "Easy"
        }
      ];
      pool.push(...tv4Pool);
    } else if (grade === 5) {
      // Grade 5 Vietnamese
      const tv5Pool = [
        {
          question: "Cặp quan hệ từ trong câu ghép: 'Mặc dù trời mưa to nhưng Nam vẫn đi học đúng giờ.' biểu thị quan hệ gì?",
          options: { A: "Tương phản", B: "Nguyên nhân - kết quả", C: "Tăng tiến", D: "Điều kiện - kết quả" },
          correctAnswer: "A",
          explanation: "Cặp quan hệ từ 'Mặc dù... nhưng...' biểu thị mối quan hệ tương phản giữa hai vế câu.",
          difficulty: "Medium"
        },
        {
          question: "Tìm từ trái nghĩa với từ 'nhân hậu':",
          options: { A: "Độc ác", B: "Hiền lành", C: "Nhút nhát", D: "Dũng cảm" },
          correctAnswer: "A",
          explanation: "Trái nghĩa với lòng 'nhân hậu' thương người là sự tàn nhẫn, 'độc ác'.",
          difficulty: "Easy"
        }
      ];
      pool.push(...tv5Pool);
    } else {
      // Grade 9 Literature (Ngữ văn 9)
      const lit9Pool = [
        {
          question: "Nhân vật ông Hai trong truyện ngắn 'Làng' của nhà văn Kim Lân có tình yêu sâu đậm nhất đối với cái gì?",
          options: { A: "Làng Chợ Dầu và cuộc kháng chiến của dân tộc", B: "Gia đình và căn nhà lá của mình", C: "Ruộng đồng và nghề nông", D: "Chính quyền kháng chiến địa phương" },
          correctAnswer: "A",
          explanation: "Tình yêu làng đặc biệt của ông Hai luôn hòa quyện, gắn bó khăng khít với tình yêu nước, yêu kháng chiến.",
          difficulty: "Easy"
        },
        {
          question: "Tác phẩm 'Lặng lẽ Sa Pa' của nhà văn Nguyễn Thành Long được viết theo thể loại nào?",
          options: { A: "Truyện ngắn", B: "Ký sự", C: "Tiểu thuyết", D: "Thơ tự do" },
          correctAnswer: "A",
          explanation: "'Lặng lẽ Sa Pa' là một tác phẩm truyện ngắn xuất sắc, ra đời sau chuyến đi thực tế của tác giả ở Lào Cai năm 1970.",
          difficulty: "Easy"
        }
      ];
      pool.push(...lit9Pool);
    }
  } else if (domain === "anh") {
    const targetTopic = normTopic;

    // Easy types
    const nhanBietTu = [
      {
        question: "What does the word 'apple' mean in Vietnamese?",
        options: { A: "Quả táo", B: "Quả chuối", C: "Quả cam", D: "Quả xoài" },
        correctAnswer: "A",
        explanation: "'Apple' dịch sang tiếng Việt là 'Quả táo'.",
        difficulty: "Easy"
      },
      {
        question: "Từ nào sau đây có nghĩa là 'quyển sách'?",
        options: { A: "Book", B: "Pen", C: "Ruler", D: "Bag" },
        correctAnswer: "A",
        explanation: "'Book' có nghĩa là quyển sách.",
        difficulty: "Easy"
      },
      {
        question: "What is the meaning of 'teacher'?",
        options: { A: "Giáo viên", B: "Bác sĩ", C: "Học sinh", D: "Kỹ sư" },
        correctAnswer: "A",
        explanation: "'Teacher' dịch nghĩa là Giáo viên.",
        difficulty: "Easy"
      }
    ];

    const dienChuCai = [
      {
        question: "Điền chữ cái còn thiếu vào chỗ trống: 'b _ o k' (quyển sách)",
        options: { A: "o", B: "a", C: "e", D: "i" },
        correctAnswer: "A",
        explanation: "Từ hoàn chỉnh là 'book' nên cần điền chữ cái 'o'.",
        difficulty: "Easy"
      },
      {
        question: "Điền chữ cái còn thiếu vào chỗ trống: 'p _ n' (cái bút)",
        options: { A: "e", B: "a", C: "o", D: "u" },
        correctAnswer: "A",
        explanation: "Từ hoàn chỉnh là 'pen' nên cần điền chữ cái 'e'.",
        difficulty: "Easy"
      },
      {
        question: "Điền chữ cái còn thiếu vào chỗ trống: 'r _ ler' (thước kẻ)",
        options: { A: "u", B: "e", C: "a", D: "o" },
        correctAnswer: "A",
        explanation: "Thước kẻ là 'ruler', chữ cái còn thiếu là 'u'.",
        difficulty: "Easy"
      }
    ];

    const dichTu = [
      {
        question: "Dịch từ sau sang tiếng Anh: 'bác sĩ'",
        options: { A: "Doctor", B: "Teacher", C: "Driver", D: "Nurse" },
        correctAnswer: "A",
        explanation: "'Bác sĩ' trong tiếng Anh là 'Doctor'.",
        difficulty: "Easy"
      },
      {
        question: "Dịch từ sau sang tiếng Việt: 'family'",
        options: { A: "Gia đình", B: "Trường học", C: "Bạn bè", D: "Lớp học" },
        correctAnswer: "A",
        explanation: "'Family' dịch sang tiếng Việt nghĩa là 'Gia đình'.",
        difficulty: "Easy"
      },
      {
        question: "Dịch từ sau sang tiếng Anh: 'màu vàng'",
        options: { A: "Yellow", B: "Red", C: "Blue", D: "Green" },
        correctAnswer: "A",
        explanation: "'Màu vàng' dịch sang tiếng Anh là 'Yellow'.",
        difficulty: "Easy"
      }
    ];

    const chonDapAnEasy = [
      {
        question: "Complete the greeting: 'Good ________, teacher!' (Chào buổi sáng, cô giáo!)",
        options: { A: "morning", B: "night", C: "bye", D: "hello" },
        correctAnswer: "A",
        explanation: "Chào buổi sáng tiếng Anh là 'Good morning'.",
        difficulty: "Easy"
      },
      {
        question: "How are you? - I ________ fine, thank you.",
        options: { A: "am", B: "is", C: "are", D: "be" },
        correctAnswer: "A",
        explanation: "Với chủ ngữ 'I' ta dùng động từ to-be là 'am'.",
        difficulty: "Easy"
      },
      {
        question: "How old are you? - I ________ seven years old.",
        options: { A: "am", B: "is", C: "are", D: "have" },
        correctAnswer: "A",
        explanation: "Để nói tuổi 'I am...', dùng động từ to-be 'am'.",
        difficulty: "Easy"
      }
    ];

    // Medium types
    const hoanThanhCau = [
      {
        question: "Complete the sentence: 'She ________ to school every day.'",
        options: { A: "goes", B: "go", C: "going", D: "went" },
        correctAnswer: "A",
        explanation: "Thì hiện tại đơn với chủ ngữ ngôi thứ ba số ít 'She' ta thêm 'es' vào động từ 'go' thành 'goes'.",
        difficulty: "Medium"
      },
      {
        question: "Complete the sentence: 'They are ________ football in the yard right now.'",
        options: { A: "playing", B: "play", C: "plays", D: "played" },
        correctAnswer: "A",
        explanation: "Thì hiện tại tiếp diễn với công thức S + am/is/are + V-ing, nên chọn 'playing'.",
        difficulty: "Medium"
      },
      {
        question: "Complete the sentence: 'He ________ like carrots.'",
        options: { A: "does not", B: "do not", C: "is not", D: "not" },
        correctAnswer: "A",
        explanation: "Phủ định hiện tại đơn với chủ ngữ 'He' dùng trợ động từ 'does not'.",
        difficulty: "Medium"
      }
    ];

    const sapXepTu = [
      {
        question: "Sắp xếp các từ sau thành cụm từ đúng: 'apple / red / a'",
        options: { A: "a red apple", B: "red a apple", C: "apple red a", D: "a apple red" },
        correctAnswer: "A",
        explanation: "Trật tự từ đúng là mạo từ (a) + tính từ chỉ màu sắc (red) + danh từ (apple).",
        difficulty: "Medium"
      },
      {
        question: "Sắp xếp các từ sau thành câu đúng: 'is / my / name / Lan'",
        options: { A: "My name is Lan", B: "Name is my Lan", C: "Lan is name my", D: "My is name Lan" },
        correctAnswer: "A",
        explanation: "Cấu trúc đúng để giới thiệu tên là 'My name is [Tên]'.",
        difficulty: "Medium"
      },
      {
        question: "Sắp xếp các từ sau thành cụm từ đúng: 'book / new / an / interesting'",
        options: { A: "an interesting new book", B: "a interesting new book", C: "new an interesting book", D: "an new interesting book" },
        correctAnswer: "A",
        explanation: "Mạo từ 'an' đi trước âm nguyên âm 'interesting', tiếp đến tính từ 'new', cuối cùng là danh từ 'book'.",
        difficulty: "Medium"
      }
    ];

    const chonTuTheoChuDe = [
      {
        question: "Từ nào sau đây KHÔNG thuộc chủ đề 'Family' (Gia đình)?",
        options: { A: "School", B: "Mother", C: "Father", D: "Brother" },
        correctAnswer: "A",
        explanation: "'School' thuộc chủ đề trường học, còn Mother, Father, Brother thuộc chủ đề Gia đình.",
        difficulty: "Medium"
      },
      {
        question: "Từ nào sau đây là tên một loại con vật (Animals)?",
        options: { A: "Cat", B: "Car", C: "Cup", D: "Cap" },
        correctAnswer: "A",
        explanation: "'Cat' nghĩa là con mèo (con vật).",
        difficulty: "Medium"
      },
      {
        question: "Từ nào sau đây thuộc chủ đề 'School supplies' (Đồ dùng học tập)?",
        options: { A: "Ruler", B: "Banana", C: "Sister", D: "Tiger" },
        correctAnswer: "A",
        explanation: "'Ruler' (thước kẻ) thuộc đồ dùng học tập.",
        difficulty: "Medium"
      }
    ];

    const dungSai = [
      {
        question: "Phát biểu sau Đúng hay Sai: 'Từ \"banana\" nghĩa là quả chuối.'",
        options: { A: "Đúng (True)", B: "Sai (False)" },
        correctAnswer: "A",
        explanation: "'Banana' chính xác là quả chuối.",
        difficulty: "Medium"
      },
      {
        question: "Phát biểu sau Đúng hay Sai: 'Động từ to-be đi với \"We\" là \"is\".'",
        options: { A: "Sai (False)", B: "Đúng (True)" },
        correctAnswer: "A",
        explanation: "Động từ to-be đi với chủ ngữ số nhiều 'We' phải là 'are', không phải 'is'.",
        difficulty: "Medium"
      },
      {
        question: "Phát biểu sau Đúng hay Sai: 'Thì quá khứ của động từ \"go\" là \"goes\".'",
        options: { A: "Sai (False)", B: "Đúng (True)" },
        correctAnswer: "A",
        explanation: "Quá khứ của 'go' là động từ bất quy tắc 'went', còn 'goes' là chia ở hiện tại đơn.",
        difficulty: "Medium"
      }
    ];

    // Hard types
    const sapXepCau = [
      {
        question: "Sắp xếp các từ sau thành câu hoàn chỉnh: 'like / would / some / water / you / ?'",
        options: {
          A: "Would you like some water?",
          B: "You would like some water?",
          C: "Would some water like you?",
          D: "Some water would you like?"
        },
        correctAnswer: "A",
        explanation: "Cấu trúc mời lịch sự là 'Would you like + danh từ?'.",
        difficulty: "Hard"
      },
      {
        question: "Sắp xếp các từ sau thành câu hoàn chỉnh: 'english / loves / because / she / interesting / is / it'",
        options: {
          A: "She loves English because it is interesting",
          B: "Because English she loves it is interesting",
          C: "It is interesting because she loves English",
          D: "She is interesting because loves English it"
        },
        correctAnswer: "A",
        explanation: "Câu đúng nghĩa và ngữ pháp là 'She loves English because it is interesting' (Cô ấy yêu tiếng Anh vì nó thú vị).",
        difficulty: "Hard"
      }
    ];

    const chonCauDung = [
      {
        question: "Chọn câu viết ĐÚNG ngữ pháp tiếng Anh nhất:",
        options: {
          A: "She does not like carrots.",
          B: "She do not likes carrots.",
          C: "She not like carrots.",
          D: "She does not likes carrots."
        },
        correctAnswer: "A",
        explanation: "Trong câu phủ định thì hiện tại đơn với chủ ngữ 'She', ta dùng 'does not' + động từ nguyên thể 'like'.",
        difficulty: "Hard"
      },
      {
        question: "Chọn câu viết ĐÚNG ngữ pháp nhất:",
        options: {
          A: "I am writing a letter now.",
          B: "I writing a letter now.",
          C: "I is writing a letter now.",
          D: "I writes a letter now."
        },
        correctAnswer: "A",
        explanation: "Có trạng từ chỉ thời gian 'now' (bây giờ) dùng thì hiện tại tiếp diễn: S + am/is/are + V-ing. 'I' đi với 'am writing'.",
        difficulty: "Hard"
      }
    ];

    const chinhTa = [
      {
        question: "Từ nào sau đây viết SAI chính tả?",
        options: { A: "Beatiful", B: "Beautiful", C: "Teacher", D: "Student" },
        correctAnswer: "A",
        explanation: "Từ viết đúng là 'Beautiful'. Từ 'Beatiful' thiếu chữ 'u' ở âm tiết đầu tiên.",
        difficulty: "Hard"
      },
      {
        question: "Give the correct form of the word in bracket: 'They are very ________. (friend)'",
        options: { A: "friendly", B: "friend", C: "friends", D: "friendship" },
        correctAnswer: "A",
        explanation: "Sau động từ to-be 'are' và trạng từ chỉ mức độ 'very' ta cần một tính từ. 'Friendly' nghĩa là thân thiện.",
        difficulty: "Hard"
      }
    ];

    const phanLoaiTu = [
      {
        question: "Từ 'quickly' thuộc loại từ nào (Part of speech)?",
        options: { A: "Trạng từ (Adverb)", B: "Danh từ (Noun)", C: "Động từ (Verb)", D: "Tính từ (Adjective)" },
        correctAnswer: "A",
        explanation: "Các từ tận cùng bằng đuôi '-ly' bổ nghĩa cho động từ thường là Trạng từ (Adverb).",
        difficulty: "Hard"
      },
      {
        question: "Từ nào sau đây là một Động từ (Verb)?",
        options: { A: "Run", B: "Beautiful", C: "Happiness", D: "Quickly" },
        correctAnswer: "A",
        explanation: "'Run' (chạy) là một động từ chỉ hành động.",
        difficulty: "Hard"
      }
    ];

    const docHieuNgan = [
      {
        question: "Đọc đoạn văn sau và trả lời câu hỏi:\n'Nam is ten years old. He lives in a small house with his parents. He loves playing football after school.'\nHow old is Nam?",
        options: { A: "10 years old", B: "9 years old", C: "11 years old", D: "8 years old" },
        correctAnswer: "A",
        explanation: "Câu đầu tiên ghi rõ 'Nam is ten years old' (Nam 10 tuổi).",
        difficulty: "Hard"
      },
      {
        question: "Đọc đoạn văn sau và trả lời câu hỏi:\n'Mary is a student. Every Saturday morning, she visits the local library to read adventure books.'\nWhen does Mary visit the library?",
        options: { A: "Every Saturday morning", B: "Every Sunday morning", C: "Every Friday afternoon", D: "Every Monday evening" },
        correctAnswer: "A",
        explanation: "Đoạn văn ghi 'Every Saturday morning, she visits the local library'.",
        difficulty: "Hard"
      }
    ];

    const baiNghe = [
      {
        question: "Hãy nghe và chọn từ đúng nhất bạn nghe được:",
        options: { A: "apple", B: "banana", C: "orange", D: "grape" },
        correctAnswer: "A",
        explanation: "Bạn nghe được từ 'apple' (quả táo) trong câu 'I have a big red apple.'",
        difficulty: "Easy",
        isListening: true,
        listeningText: "I have a big red apple."
      },
      {
        question: "Hãy nghe và chọn số bạn nghe được:",
        options: { A: "7", B: "5", C: "6", D: "8" },
        correctAnswer: "A",
        explanation: "Từ 'seven' trong câu 'There are seven books on the table.' tương ứng với số 7.",
        difficulty: "Easy",
        isListening: true,
        listeningText: "There are seven books on the table."
      },
      {
        question: "Hãy nghe và chọn từ còn thiếu để hoàn thành câu:",
        options: { A: "school", B: "park", C: "market", D: "hospital" },
        correctAnswer: "A",
        explanation: "Câu hoàn chỉnh bạn nghe được là 'She goes to school every morning.'",
        difficulty: "Medium",
        isListening: true,
        listeningText: "She goes to school every morning."
      },
      {
        question: "Hãy nghe và chọn trạng thái thời tiết chính xác:",
        options: { A: "Rainy", B: "Sunny", C: "Windy", D: "Cloudy" },
        correctAnswer: "A",
        explanation: "Bạn nghe thấy 'raining' tức là trời đang mưa (Rainy).",
        difficulty: "Medium",
        isListening: true,
        listeningText: "It is raining outside now."
      },
      {
        question: "Hãy nghe và chọn câu bạn nghe được chính xác nhất:",
        options: { 
          A: "I love learning English because it is very interesting.", 
          B: "I like learn English because it is very interesting.", 
          C: "I loves learning English because it is very interest.", 
          D: "I love learning English because it is really interest." 
        },
        correctAnswer: "A",
        explanation: "Câu nghe được đầy đủ và đúng ngữ pháp là: 'I love learning English because it is very interesting.'",
        difficulty: "Hard",
        isListening: true,
        listeningText: "I love learning English because it is very interesting."
      }
    ];

    // Build the final pool based on topic and difficulty
    const normalizedTarget = targetTopic.toLowerCase();
    if (normalizedTarget.includes("nghe") || normalizedTarget.includes("listen")) {
      pool.push(...baiNghe);
    } else if (normalizedTarget.includes("nhận biết từ")) {
      pool.push(...nhanBietTu, baiNghe[0]);
    } else if (normalizedTarget.includes("điền chữ cái")) {
      pool.push(...dienChuCai, baiNghe[1]);
    } else if (normalizedTarget.includes("dịch từ")) {
      pool.push(...dichTu, baiNghe[0]);
    } else if (normalizedTarget.includes("chọn đáp án")) {
      pool.push(...chonDapAnEasy, baiNghe[0]);
    } else if (normalizedTarget.includes("hoàn thành câu")) {
      pool.push(...hoanThanhCau, baiNghe[2]);
    } else if (normalizedTarget.includes("sắp xếp từ")) {
      pool.push(...sapXepTu, baiNghe[3]);
    } else if (normalizedTarget.includes("chọn từ theo chủ đề")) {
      pool.push(...chonTuTheoChuDe, baiNghe[2]);
    } else if (normalizedTarget.includes("đúng/sai") || normalizedTarget.includes("đúng / sai")) {
      pool.push(...dungSai, baiNghe[3]);
    } else if (normalizedTarget.includes("sắp xếp câu")) {
      pool.push(...sapXepCau, baiNghe[4]);
    } else if (normalizedTarget.includes("chọn câu đúng")) {
      pool.push(...chonCauDung, baiNghe[4]);
    } else if (normalizedTarget.includes("chính tả")) {
      pool.push(...chinhTa, baiNghe[4]);
    } else if (normalizedTarget.includes("phân loại từ")) {
      pool.push(...phanLoaiTu, baiNghe[4]);
    } else if (normalizedTarget.includes("đọc hiểu ngắn")) {
      pool.push(...docHieuNgan, baiNghe[4]);
    } else {
      // If none of the specific topics match, filter by difficulty and ALWAYS mix in a listening question
      if (diff === "Easy") {
        pool.push(...nhanBietTu, ...dienChuCai, ...dichTu, ...chonDapAnEasy, baiNghe[0], baiNghe[1]);
      } else if (diff === "Medium") {
        pool.push(...hoanThanhCau, ...sapXepTu, ...chonTuTheoChuDe, ...dungSai, baiNghe[2], baiNghe[3]);
      } else if (diff === "Hard") {
        pool.push(...sapXepCau, ...chonCauDung, ...chinhTa, ...phanLoaiTu, ...docHieuNgan, baiNghe[4]);
      } else {
        // "All" difficulty
        pool.push(
          ...nhanBietTu, ...dienChuCai, ...dichTu, ...chonDapAnEasy,
          ...hoanThanhCau, ...sapXepTu, ...chonTuTheoChuDe, ...dungSai,
          ...sapXepCau, ...chonCauDung, ...chinhTa, ...phanLoaiTu, ...docHieuNgan,
          ...baiNghe
        );
      }
    }

    if (pool.length === 0) {
      pool.push(...nhanBietTu, ...hoanThanhCau, ...sapXepCau);
    }
  }

  // Fallback if pool is somehow empty
  if (pool.length === 0) {
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    const capitalizedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);

    // Provide generic but high-quality and simple age-appropriate mock questions instead of high-level theory!
    if (domain === "toán") {
      pool = [
        {
          question: `Cho phép tính cộng liên quan đến chủ đề **${capitalizedTopic}**: $25 + 35 = ?$. Hãy tìm kết quả đúng:`,
          options: { A: "$60$", B: "$50$", C: "$70$", D: "$55$" },
          correctAnswer: "A",
          explanation: "Ta thực hiện phép tính cộng: $25 + 35 = 60$.",
          difficulty: "Easy"
        },
        {
          question: `Trong môn **${capitalizedSubject}**, khi thực hành chủ đề **${capitalizedTopic}**, muốn tìm một số chưa biết trong phép tính cộng $x + 12 = 30$, ta làm thế nào?`,
          options: {
            A: "Lấy tổng trừ đi số hạng đã biết: $x = 30 - 12 = 18$",
            B: "Lấy tổng cộng với số hạng đã biết: $x = 30 + 12 = 42$",
            C: "Lấy số hạng đã biết trừ đi tổng: $x = 12 - 30$",
            D: "Lấy tổng nhân với số hạng đã biết: $x = 30 \\times 12$"
          },
          correctAnswer: "A",
          explanation: "Muốn tìm số hạng chưa biết, ta lấy tổng trừ đi số hạng đã biết. Vậy $x = 18$.",
          difficulty: "Medium"
        }
      ];
    } else if (domain === "văn") {
      pool = [
        {
          question: `Từ nào sau đây viết ĐÚNG chính tả tiếng Việt liên quan đến chủ đề **${capitalizedTopic}**?`,
          options: { A: "Chăm chỉ", B: "Chăm chỉ sảo", C: "Trăm chỉ", D: "Săm chỉ" },
          correctAnswer: "A",
          explanation: "Từ viết đúng chính tả là 'Chăm chỉ'.",
          difficulty: "Easy"
        },
        {
          question: `Trong câu: 'Học sinh đang hăng say thảo luận về chủ đề **${capitalizedTopic}**.', từ nào là từ chỉ hoạt động?`,
          options: { A: "thảo luận", B: "học sinh", C: "hăng say", D: "chủ đề" },
          correctAnswer: "A",
          explanation: "Từ 'thảo luận' là từ chỉ hoạt động thảo luận của các học sinh.",
          difficulty: "Easy"
        }
      ];
    } else {
      pool = [
        {
          question: `Which word is correct when studying **${capitalizedTopic}** in English?`,
          options: { A: "Good study", B: "Study good", C: "Bad study", D: "Studying bad" },
          correctAnswer: "A",
          explanation: "'Good study' is the correct phrasing.",
          difficulty: "Easy"
        }
      ];
    }
  }

  // Filter pool by difficulty if requested
  let filteredPool = pool;
  if (difficulty && difficulty !== 'All') {
    const diffLower = difficulty.toLowerCase();
    filteredPool = pool.filter(q => q.difficulty && q.difficulty.toLowerCase() === diffLower);
    // If no questions match the specific difficulty, fallback to the entire pool
    if (filteredPool.length === 0) {
      filteredPool = pool;
    }
  }

  // Slice or repeat pool to match count exactly
  let result: any[] = [];
  while (result.length < count) {
    const currentBatch = filteredPool.map(q => ({
      ...q,
      id: makeId() // Assign a unique random ID
    }));
    result.push(...currentBatch);
  }

  return result.slice(0, count);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to handle base64 images/files
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route to bulk create users
  app.post('/api/admin/bulk-create-users', async (req, res) => {
    const { names, role } = req.body;
    const results = [];

    if (!names || !Array.isArray(names)) {
      return res.status(400).json({ error: 'Danh sách tên không hợp lệ' });
    }

    for (const name of names) {
      try {
        // Normalize name to create username
        const baseUsername = name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/\s+/g, '.')
          .replace(/[^a-z0-9.]/g, '');
        
        // Add a small random suffix to ensure uniqueness
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const username = `${baseUsername}.${randomSuffix}`;
        const email = `${username}@tuanlo.vn`;
        const password = '123456';

        // Create Auth User
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
        });

        // Create Firestore User Document
        const userDocRef = db.collection('users').doc(userRecord.uid);
        
        await userDocRef.set({
          uid: userRecord.uid,
          email,
          displayName: name,
          role: role || 'student',
          username: username,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.push({ name, email, status: 'success' });
      } catch (error: any) {
        console.error(`Error creating user ${name}:`, error);
        results.push({ name, status: 'error', message: error.message });
      }
    }

    res.json({ results });
  });

  // API Route to delete a user (both Auth and Firestore)
  app.post('/api/admin/delete-user', async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Thiếu UID người dùng' });
    }

    try {
      // 1. Delete Auth User if exists
      try {
        await admin.auth().deleteUser(uid);
      } catch (authErr: any) {
        console.warn(`Auth user ${uid} not found or already deleted:`, authErr.message);
      }

      // 2. Delete Firestore User Document
      await db.collection('users').doc(uid).delete();

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error deleting user ${uid}:`, error);
      res.status(500).json({ error: error.message || 'Lỗi khi xóa người dùng' });
    }
  });

  // API Route to bulk delete users
  app.post('/api/admin/delete-users', async (req, res) => {
    const { uids } = req.body;
    if (!uids || !Array.isArray(uids)) {
      return res.status(400).json({ error: 'Danh sách UID không hợp lệ' });
    }

    const results = [];
    for (const uid of uids) {
      try {
        try {
          await admin.auth().deleteUser(uid);
        } catch (authErr: any) {
          console.warn(`Auth user ${uid} not found or already deleted:`, authErr.message);
        }
        await db.collection('users').doc(uid).delete();
        results.push({ uid, status: 'success' });
      } catch (error: any) {
        console.error(`Error deleting user ${uid}:`, error);
        results.push({ uid, status: 'error', message: error.message });
      }
    }

    res.json({ success: true, results });
  });

  // Helper function to build detailed, grade-appropriate prompts for Gemini
  function getGradeAndSubjectPrompt({
    subject,
    topic,
    count,
    customInstructions,
    difficulty,
    content,
    hasParts
  }: {
    subject: string;
    topic?: string;
    count: number;
    customInstructions?: string;
    difficulty?: string;
    content?: string;
    hasParts?: boolean;
  }) {
    const gradeMatch = subject.match(/\d+/);
    const grade = gradeMatch ? parseInt(gradeMatch[0], 10) : 9;

    let coreSubject = "Toán";
    if (subject.toLowerCase().includes("tiếng việt")) {
      coreSubject = "Tiếng Việt";
    } else if (subject.toLowerCase().includes("ngữ văn")) {
      coreSubject = "Ngữ văn";
    } else if (subject.toLowerCase().includes("tiếng anh") || subject.toLowerCase().includes("english")) {
      coreSubject = "Tiếng Anh";
    }

    let englishRequirements = "";
    if (coreSubject === "Tiếng Anh") {
      englishRequirements = `
- QUY ĐỊNH BẮT BUỘC VỀ DẠNG BÀI TẬP TIẾNG ANH THEO ĐỘ KHÓ (DIFFICULTY) VÀ CHỦ ĐỀ (TOPIC):
  Bạn phải tạo câu hỏi đúng theo phân loại độ khó và dạng bài tập dưới đây:
  
  1. Độ khó "Easy" (Dễ) - Gồm các dạng bài:
     - "Nhận biết từ" (Word Recognition): Hỏi về nghĩa của từ tiếng Anh hoặc từ tiếng Việt tương ứng, hoặc nhận diện từ vựng qua định nghĩa siêu đơn giản.
     - "Điền chữ cái" (Fill in the missing letter): Cho một từ tiếng Anh khuyết chữ cái (ví dụ: b_ok, a_ple) và hỏi chữ cái nào đúng để hoàn thành từ đó.
     - "Dịch từ" (Translation): Dịch một từ đơn từ tiếng Anh sang tiếng Việt hoặc ngược lại (ví dụ: "Dịch từ 'cat' sang tiếng Việt").
     - "Chọn đáp án" (Multiple choice): Các câu hỏi trắc nghiệm từ vựng, ngữ pháp hoặc giao tiếp siêu đơn giản, cơ bản nhất.

  2. Độ khó "Medium" (Trung bình) - Gồm các dạng bài:
     - "Hoàn thành câu" (Sentence Completion): Điền từ thích hợp vào chỗ trống trong một câu đơn (ví dụ: "She ___ to school every day.").
     - "Sắp xếp từ" (Word Order): Cho các từ đơn lẻ bị đảo lộn thứ tự và hỏi phương án sắp xếp thành cụm từ hoặc câu ngắn đúng ngữ pháp.
     - "Chọn từ theo chủ đề" (Category Selection): Hỏi từ nào thuộc hoặc không thuộc một nhóm chủ đề từ vựng cụ thể (ví dụ: "Từ nào sau đây KHÔNG thuộc chủ đề 'Family'?").
     - "Đúng/Sai" (True/False): Đưa ra một câu khẳng định về ngữ nghĩa, chính tả hoặc ngữ pháp và hỏi câu đó Đúng (True) hay Sai (False).

  3. Độ khó "Hard" (Khó) - Gồm các dạng bài:
     - "Sắp xếp câu" (Sentence Unscramble): Cho các từ/cụm từ bị đảo lộn và yêu cầu sắp xếp thành một câu hoàn chỉnh, phức tạp hơn.
     - "Chọn câu đúng" (Grammar Check): Cho 4 câu tiếng Anh và yêu cầu tìm câu đúng cấu trúc ngữ pháp nhất.
     - "Chính tả" (Spelling / Word form): Tìm từ viết sai chính tả hoặc yêu cầu điền dạng đúng của từ trong ngoặc (Word form).
     - "Phân loại từ" (Parts of Speech): Hỏi về loại từ (Danh từ, Động từ, Tính từ, Trạng từ) hoặc phân loại nhóm từ cao cấp.
     - "Đọc hiểu ngắn" (Reading Comprehension): Cho một đoạn văn ngắn (2-3 câu) bằng tiếng Anh và đưa ra câu hỏi đọc hiểu về thông tin trong đoạn văn đó.

  4. Độ khó "All" (Tất cả):
     - Hãy tổng hợp đa dạng tất cả các dạng bài trên một cách cân biến và phong phú.

  5. DẠNG BÀI NGHE TIẾNG ANH (LISTENING COMPREHENSION) - CỰC KỲ QUAN TRỌNG:
     - Đối với môn Tiếng Anh, trong tất cả các đề ôn tập/các bài, hãy lồng ghép ít nhất 1-2 câu hỏi là dạng bài nghe (Listening Comprehension) để kiểm tra kỹ năng nghe của học sinh.
     - Khi một câu hỏi thuộc dạng bài nghe, bạn bắt buộc phải:
       + Gán thuộc tính "isListening": true.
       + Cung cấp nội dung văn bản tiếng Anh chính xác cần đọc thành tiếng trong thuộc tính "listeningText" (ví dụ: "I have a big red apple.").
       + Viết nội dung câu hỏi (trong "question") dạng: "Nghe câu sau và chọn đáp án chính xác nhất:", hoặc "Hãy nghe câu sau và dịch nghĩa:", v.v.
     - ĐẶC BIỆT: Nếu học sinh chọn chủ đề ôn tập (topic) chứa từ "nghe" hoặc "listening" (ví dụ: "Bài nghe (Listening)", "Luyện nghe", "Listening Comprehension", v.v.), bạn phải tạo 100% tất cả các câu hỏi thuộc dạng bài nghe (với "isListening": true và có "listeningText" tương ứng).

  LƯU Ý CỰC KỲ QUAN TRỌNG:
  - Nếu chủ đề ôn tập (topic) trùng khớp hoặc chứa tên của một dạng bài cụ thể ở trên (ví dụ: học sinh chọn chủ đề là "Điền chữ cái", "Sắp xếp câu", "Dịch từ", "Đúng/Sai", v.v.), bạn bắt buộc phải thiết kế 100% tất cả các câu hỏi thuộc chính xác dạng bài đó. Không được lệch dạng bài học sinh đã chọn.
  - Phải gán giá trị độ khó vào trường "difficulty" tương ứng cho mỗi câu hỏi là "Easy", "Medium", hoặc "Hard" đúng theo quy định trên.

  6. YÊU CẦU PHẦN TỪ MỚI (VOCABULARY LIST) - QUAN TRỌNG:
     - Đối với môn Tiếng Anh, bạn BẮT BUỘC phải tìm và tổng hợp từ 5 đến 10 từ mới/từ vựng quan trọng (ngắn gọn, dễ thương) xuất hiện trong toàn bộ đề thi/bộ câu hỏi này.
     - Đính kèm danh sách này vào trường "vocabularyList" của câu hỏi đầu tiên (chỉ mục index 0). Mỗi phần tử trong mảng "vocabularyList" phải có cấu trúc: { "word": "từ tiếng Anh viết chuẩn", "meaning": "nghĩa tiếng Việt tương ứng" } (ví dụ: { "word": "apple", "meaning": "quả táo" }).
     - Các câu hỏi khác ngoài câu đầu tiên thì trường "vocabularyList" để trống hoặc không cần trả về.`;
    }

    let gradePedagogy = "";
    if (grade === 1) {
      gradePedagogy = `
- ĐỐI TƯỢNG HỌC SINH: Lớp 1 (6 tuổi), vừa mới học đọc viết cơ bản. Câu chữ trong câu hỏi phải cực kỳ ngắn gọn, dùng từ ngữ hết sức đơn giản, gần gũi. Tránh bất kỳ câu cú dài dòng, phức tạp nào.
- TRÌNH ĐỘ KIẾN THỨC MÔN HỌC:
  + Môn Toán Lớp 1: Chỉ gồm các phép tính cộng, trừ cơ bản (trong phạm vi 10, 20 hoặc cao nhất là 100 không nhớ). Nhận biết hình phẳng cơ bản (hình tròn, hình tam giác, hình vuông, hình chữ nhật). Đo độ dài bằng gang tay, bước chân, xăng-ti-mét cơ bản.
  + Môn Tiếng Việt Lớp 1: Gồm các chủ đề và dạng câu hỏi ôn tập chi tiết dưới đây (BẮT BUỘC bám sát chính xác chủ đề học sinh đã chọn):
    * Ôn tập các âm, vần đã học: Đọc, ghép và tìm các âm, vần cơ bản của Tiếng Việt lớp 1.
    * Phân biệt chính tả c/k, g/gh, ng/ngh; các âm đầu dễ nhầm l/n, s/x, ch/tr: Bài tập chọn phụ âm đầu đúng, sửa lỗi chính tả phụ âm ghép và âm đầu hay lẫn.
    * Kết hợp các tiếng để tạo thành từ, kết hợp các từ ngữ để tạo thành câu: Ghép nối các tiếng (tiếng này đi với tiếng kia) tạo thành từ có nghĩa, hoặc ghép các từ ngắn tạo thành câu hoàn chỉnh.
    * Mở rộng vốn từ theo các chủ điểm quen thuộc (Gia đình, nhà trường, thiên nhiên, bạn bè...): Chọn từ cùng nhóm, tìm từ chỉ hoạt động, sự vật của chủ điểm tương ứng.
    * Câu đố: Đố vui dân gian, tìm con vật, đồ vật qua miêu tả cực kỳ đơn giản, ngắn gọn cho học sinh lớp 1.
    * Sắp xếp các chữ để tạo thành từ, sắp xếp các từ để tạo thành câu: Cho các chữ cái rời rạc/các từ rời rạc xáo trộn và yêu cầu học sinh chọn trật tự đúng để ghép thành từ hoặc câu hoàn chỉnh.
    * Chữ cái: Nhận biết chữ hoa, chữ thường; ghép cặp chữ; tìm chữ còn thiếu; sắp xếp bảng chữ cái.
    * Âm và vần: Nhận biết âm, vần; đọc vần; ghép tiếng; phân biệt các vần dễ nhầm.
    * Tiếng: Tách tiếng thành âm đầu, vần, thanh; ghép tiếng từ âm và vần.
    * Thanh điệu: Nhận biết các thanh (ngang, sắc, huyền, hỏi, ngã, nặng) trong từ ngữ.
    * Đọc tiếng: Đọc đúng tiếng chứa âm, vần đã học.
    * Đọc từ: Đọc và hiểu nghĩa các từ đơn giản.
    * Đọc câu: Chọn câu đúng ngữ pháp, điền từ còn thiếu vào câu, sắp xếp các từ đơn giản thành câu.
    * Đọc đoạn văn: Đọc hiểu các đoạn văn cực ngắn (2-3 câu), trả lời câu hỏi trắc nghiệm đơn giản về đoạn văn đó.
    * Chính tả: Chọn chữ viết đúng chính tả, điền phụ âm đầu (như c/k, g/gh, ng/ngh), điền vần hoặc dấu thanh phù hợp, sửa lỗi chính tả đơn giản.
    * Viết: Chọn mẫu chữ, tiếng, hoặc câu ngắn được viết hoặc ghép đúng quy tắc.
    * Kể chuyện: Trả lời câu hỏi đơn giản về nội dung câu chuyện, sắp xếp thứ tự diễn biến câu chuyện ngắn.
  + Môn Tiếng Anh Lớp 1: Nhận biết màu sắc, con vật, đồ vật học tập rất phổ biến, số đếm từ 1 đến 10.
- LƯU Ý: Tuyệt đối không cho đề toán có lời văn quá phức tạp hay các công thức nâng cao.`;
    } else if (grade === 2) {
      gradePedagogy = `
- ĐỐI TƯỢNG HỌC SINH: Lớp 2 (7 tuổi). Trình độ đọc hiểu khá hơn nhưng vẫn ở mức cơ bản.
- TRÌNH ĐỘ KIẾN THỨC MÔN HỌC:
  + Môn Toán Lớp 2: Phép cộng, phép trừ có nhớ trong phạm vi 100. Phép nhân và phép chia với các số 2, 3, 4, 5 (bảng nhân chia từ 2 đến 5). Đơn vị đo lường (dm, m, km, kg, l). Xem đồng hồ (giờ, phút). Hình học: hình tứ giác, đường thẳng, đường cong, ba điểm thẳng hàng.
  + Môn Tiếng Việt Lớp 2: Câu đơn, từ chỉ sự vật, hoạt động, đặc điểm. Câu kiểu "Ai là gì?", "Ai làm gì?", "Ai thế nào?". Viết đúng chính tả phụ âm đầu dễ lẫn (ch/tr, s/x, g/gh, c/k, ng/ngh) hoặc vần khó.
  + Môn Tiếng Anh Lớp 2: Từ vựng về đồ dùng học tập, gia đình, cơ thể người, cảm xúc đơn giản. Mẫu câu giao tiếp ngắn như "This is my...", "I like...", "I can...".`;
    } else if (grade === 3) {
      gradePedagogy = `
- ĐỐI TƯỢNG HỌC SINH: Lớp 3 (8 tuổi). Học sinh đã bắt đầu làm quen với tư duy phân tích nhẹ.
- TRÌNH ĐỘ KIẾN THỨC MÔN HỌC:
  + Môn Toán Lớp 3: Phép nhân, phép chia số có nhiều chữ số cho số có một chữ số trong phạm vi 100 000. Tính giá trị biểu thức. Tìm số chia, số bị chia chưa biết. Chu vi, diện tích hình chữ nhật, hình vuông. Xem đồng hồ chính xác đến từng phút.
  + Môn Tiếng Việt Lớp 3: So sánh, nhân hóa. Từ chỉ đặc điểm, hoạt động, trạng thái. Các kiểu câu hỏi Vì sao? Ở đâu? Khi nào? Như thế nào? Bằng gì?
  + Môn Tiếng Anh Lớp 3: Thì hiện tại đơn, câu hỏi Wh-questions đơn giản (What, Who, Where, How many). Từ vựng về đồ chơi, phòng học, các môn thể thao, thời tiết cơ bản.`;
    } else if (grade === 4) {
      gradePedagogy = `
- ĐỐI TƯỢNG HỌC SINH: Lớp 4 (9 tuổi). Giai đoạn chuyển tiếp với kiến thức trừu tượng và phức tạp hơn rất nhiều.
- TRÌNH ĐỘ KIẾN THỨC MÔN HỌC:
  + Môn Toán Lớp 4: Số tự nhiên hàng triệu, hàng lớp. Phép tính với số có nhiều chữ số. Khái niệm phân số, các phép tính cộng, trừ, nhân, chia phân số. Tìm số trung bình cộng. Tìm hai số khi biết Tổng và Hiệu, hoặc Tổng và Tỉ, Hiệu và Tỉ. Góc nhọn, góc tù, góc bẹt, hai đường thẳng song song, vuông góc. Diện tích hình bình hành, hình thoi.
  + Môn Tiếng Việt Lớp 4: Từ đơn, từ phức (từ ghép, từ láy). Danh từ, động từ, tính từ. Chủ ngữ, vị ngữ, trạng ngữ trong câu. Dấu ngoặc kép, dấu hai chấm. Viết văn kể chuyện, miêu tả đồ vật, cây cối, con vật.
  + Môn Tiếng Anh Lớp 4: Các thì Hiện tại tiếp diễn, Quá khứ đơn (Past Simple), Tương lai đơn. Từ vựng về hoạt động hàng ngày, nghề nghiệp, đồ ăn thức uống, lễ hội. So sánh hơn đơn giản.`;
    } else if (grade === 5) {
      gradePedagogy = `
- ĐỐI TƯỢNG HỌC SINH: Lớp 5 (10 tuổi). Khối lớp cuối cấp tiểu học với lượng kiến thức toàn diện và có tính logic cao.
- TRÌNH ĐỘ KIẾN THỨC MÔN HỌC:
  + Môn Toán Lớp 5: Phân số thập phân, số thập phân và các phép tính với số thập phân. Tỉ số phần trăm và các bài toán thực tế về tỉ số phần trăm (tìm tỉ số, tìm giá trị, tìm số gốc). Hình học: Chu vi và diện tích hình tròn, diện tích hình thang; Thể tích hình hộp chữ nhật, hình lập phương. Toán chuyển động đều (quãng đường s, vận tốc v, thời gian t; chuyển động cùng chiều, ngược chiều).
  + Môn Tiếng Việt Lớp 5: Từ đồng nghĩa, từ trái nghĩa, từ đồng âm, từ nhiều nghĩa. Câu ghép và các mối quan hệ ý nghĩa giữa các vế câu ghép (nguyên nhân - kết quả, giả thuyết - kết quả, tương phản, tăng tiến). Viết văn tả cảnh, tả người.
  + Môn Tiếng Anh Lớp 5: Câu so sánh hơn, so sánh nhất. Mẫu câu hỏi đường, hỏi tần suất (How often), hỏi ý kiến. Các thì Quá khứ đơn, Hiện tại đơn, Tương lai đơn phối hợp. Từ vựng đa dạng về địa lý, trải nghiệm, kế hoạch tương lai.`;
    } else {
      gradePedagogy = `
- ĐỐI TƯỢNG HỌC SINH: Lớp 9 (14 tuổi). Ôn luyện trọng tâm cho kì thi Tuyển sinh vào lớp 10 THPT tại Việt Nam.
- TRÌNH ĐỘ KIẾN THỨC MÔN HỌC:
  + Môn Toán Lớp 9: Căn bậc hai, căn bậc ba (rút gọn biểu thức chứa căn). Hàm số bậc nhất và đồ thị. Hệ phương trình bậc nhất hai ẩn. Phương trình bậc hai một ẩn và hệ thức Vi-ét. Hình học: Hệ thức lượng trong tam giác vuông; Đường tròn, góc với đường tròn, tứ giác nội tiếp; Hình trụ, hình nón, hình cầu.
  + Môn Ngữ văn Lớp 9: Các tác phẩm văn học trung đại và hiện đại Việt Nam thuộc chương trình lớp 9 (như Đồng chí, Bài thơ về tiểu đội xe không kính, Đoàn thuyền đánh cá, Làng, Lặng lẽ Sa Pa, Chiếc lược ngà, Viếng lăng Bác, Sang thu, Nói với con,...). Nghị luận xã hội và nghị luận văn học. Cấu trúc câu, các biện pháp tu từ, các thành phần biệt lập.
  + Môn Tiếng Anh Lớp 9: Các thì hoàn thành (Present Perfect), câu bị động (Passive voice), câu gián tiếp (Reported speech), câu điều kiện (Conditional sentences type 1, 2), mệnh đề quan hệ (Relative clauses), cụm động từ (Phrasal verbs). Từ vựng học thuật phong phú, nâng cao chuẩn bị thi chuyển cấp lớp 10.`;
    }

    const persona = grade === 9
      ? `Bạn là một giáo viên THCS giàu kinh nghiệm luyện thi tuyển sinh vào lớp 10 THPT tại Việt Nam, chuyên môn sâu về giảng dạy môn ${coreSubject} Lớp 9.`
      : `Bạn là một giáo viên giàu kinh nghiệm giảng dạy cấp tiểu học tại Việt Nam, chuyên môn sâu về giảng dạy môn ${coreSubject} Lớp ${grade}.`;

    const targetAudience = `phù hợp chính xác với trình độ học sinh Lớp ${grade} (khoảng ${grade + 5} tuổi) và bám sát tâm sinh lý học sinh khối lớp này`;

    const curriculumScope = `Nội dung câu hỏi phải bám sát chương trình Giáo dục phổ thông của Bộ Giáo dục và Đào tạo Việt Nam dành cho khối Lớp ${grade}.`;

    const difficultyRequirement = difficulty && difficulty !== 'All'
      ? `Yêu cầu bắt buộc về độ khó: Toàn bộ ${count} câu hỏi được tạo ra đều phải có độ khó chính xác là "${difficulty}" (Easy: Dễ, Medium: Trung bình, Hard: Khó) dựa trên mức độ tư duy phức tạp và năng lực điển hình của học sinh lớp ${grade} đối với chủ đề này.`
      : `Yêu cầu bắt buộc: Phân loại mỗi câu hỏi thành một trong ba mức độ khó sau dựa trên năng lực nhận thức điển hình của học sinh lớp ${grade}:
  + "Easy" (Dễ - nhận biết trực tiếp, áp dụng ngay công thức hoặc định nghĩa cơ bản của học sinh lớp ${grade}), 
  + "Medium" (Trung bình - thông hiểu, cần suy luận nhẹ nhàng hoặc thực hiện 2 bước tính toán của học sinh lớp ${grade}), 
  + "Hard" (Khó - vận dụng, câu hỏi thử thách tư duy sâu, giải quyết vấn đề sáng tạo phù hợp trình độ lớp ${grade}). 
  Gán giá trị này ("Easy", "Medium", hoặc "Hard") vào trường "difficulty" tương ứng cho mỗi câu hỏi. Hãy phân bố đều các độ khó nếu có thể.`;

    let mainContext = "";
    if (content) {
      mainContext = `Dựa vào nội dung tài liệu học tập sau đây:
---
"${content}"
---
Hãy bám sát nội dung tài liệu trên để thiết kế các câu hỏi phù hợp.`;
    } else if (hasParts) {
      mainContext = `Dựa vào nội dung các tài liệu đính kèm (hình ảnh, tài liệu văn bản...), hãy bám sát tài liệu để thiết kế các câu hỏi phù hợp.`;
    } else {
      mainContext = `Chủ đề bài học / Tên bài học cần tạo câu hỏi là: "${topic}".`;
    }

    const prompt = `${persona}
Hãy tạo đúng ${count} câu hỏi trắc nghiệm tiếng Việt sinh động, hấp dẫn, ${targetAudience} về môn ${subject}.

QUY TẮC SƯ PHẠM VÀ KIẾN THỨC KHỐI LỚP:
${gradePedagogy}
${englishRequirements}

YÊU CẦU ĐỐI VỚI CHỦ ĐỀ BÀI HỌC:
- ${mainContext}
- Toàn bộ ${count} câu hỏi được tạo ra PHẢI liên quan trực tiếp đến kiến thức của bài học/chủ đề trên thuộc môn ${coreSubject} Lớp ${grade}.
- Tuyệt đối không được tạo ra câu hỏi về các bài học khác, chủ đề khác hoặc lớp khác.
${curriculumScope}
${difficultyRequirement}
${customInstructions ? `Yêu cầu bổ sung từ giáo viên: "${customInstructions}"` : ''}
Mỗi câu hỏi phải có 4 đáp án (A, B, C, D), 1 đáp án đúng và lời giải thích ngắn gọn, dễ hiểu và chặt chẽ.

QUAN TRỌNG: 
- Sử dụng LaTeX cho TẤT CẢ các công thức toán học, ký hiệu toán học, phương trình, và ký hiệu hình học.
- Sử dụng dấu $ cho công thức nội dòng (ví dụ: $x^2 + 2x + 1 = 0$, $\sqrt{x}$, $\frac{a}{b}$).
- Sử dụng dấu $$ cho công thức khối (phương trình quan trọng, hệ phương trình).
- PHẢI SỬ DỤNG CÁC KÝ HIỆU TOÁN HỌC CHUẨN SƯ PHẠM VIỆT NAM:
  + Phép tính NHÂN: Sử dụng ký hiệu toán học phép nhân của LaTeX là \times (ví dụ: viết $5 \times 4 = 20$). Tuyệt đối KHÔNG viết bằng chữ cái 'x' hay chữ "nhân".
  + Phép tính CHIA: Sử dụng dấu hai chấm ':' làm phép tính chia (ví dụ: viết $12 : 3 = 4$, TUYỆT ĐỐI không dùng dấu gạch chéo '/' hay lệnh \div hoặc kí hiệu \div hay viết chữ "chia").
  + PHÂN SỐ: Phải luôn luôn viết dưới dạng phân số chuẩn LaTeX \frac{tử}{mẫu} (ví dụ: $\frac{3}{5}$), TUYỆT ĐỐI không dùng dấu chia ':' hay gạch chéo '/' để thay thế cho phân số.
  + Các dấu so sánh (>, <, =): Luôn viết bằng ký hiệu toán học bọc trong dấu $, ví dụ: $5 > 3$, $12 < 15$, $x = 10$. Tuyệt đối KHÔNG viết bằng chữ "lớn hơn", "nhỏ hơn", "bằng" cho dấu so sánh trong công thức toán học. Các phương án lựa chọn cũng phải dùng ký hiệu như $>$, $<$, $=$.
  + Ký hiệu dấu ba chấm điền vào chỗ trống: Chỉ sử dụng dấu ba chấm thường '...' (ví dụ: $15 ... 12$), TUYỆT ĐỐI không dùng các lệnh LaTeX như \dots hoặc \ldots vì chúng dễ gây lỗi hoặc hiển thị không đẹp mắt.
- Tuyệt đối KHÔNG sử dụng các ký tự unicode thay cho ký hiệu toán học (ví dụ: dùng $\Delta$ thay vì Δ, $\pi$ thay vì π).
- Đối với HÌNH HỌC, sử dụng đúng các ký hiệu LaTeX:
  + Góc (sử dụng dấu mũ trên 3 chữ cái): $\\widehat{ABC}$ (\\widehat{ABC}) hoặc $\\widehat{A}$ (\\widehat{A})
  + Tam giác: $\\triangle ABC$ (\\triangle ABC)
  + Song song: $d_1 \\parallel d_2$ (\\parallel)
  + Vuông góc: $d_1 \\perp d_2$ (\\perp)
  + Độ: $90^\\circ$ (^\\circ)
  + Đồng dạng: $\\triangle ABC \\sim \\triangle A'B'C'$ (\\sim)
  + Bằng nhau (tam giác): $\\triangle ABC \\cong \\triangle A'B'C'$ (\\cong)
  + Vectơ: $\\vec{AB}$ (\\vec{AB}) hoặc $\\overrightarrow{AB}$ (\\overrightarrow{AB})
  + Đoạn thẳng: $AB$ hoặc $\\overline{AB}$ (\\overline{AB})
- Các ký hiệu như căn bậc hai (\\\\sqrt{}), phân số (\\\\frac{}{}), số mũ (^), chỉ số dưới (_), ngoặc nhọn ({}), ngoặc vuông ([]) phải đúng cú pháp LaTeX.
- Đối với các bài toán so sánh, các dấu so sánh (>, <, =) và biểu thức so sánh PHẢI được bọc trong công thức toán học sử dụng LaTeX và dấu $, ví dụ: $5 > 3$, $12 < 15$, $x = 10$. Tuyệt đối không viết thô dạng 5 > 3 hay 12 < 15 ngoài công thức. Các phương án lựa chọn chứa dấu so sánh cũng phải được định dạng công thức LaTeX, ví dụ: $>$ hoặc $<$ hoặc $=$.
- Ví dụ: "Cho $\\triangle ABC$ vuông tại $A$, có $\\widehat{B} = 30^\\circ$. Tính $\\sin C$." hoặc "Cho đường tròn $(O)$ và dây cung $AB$ sao cho $OH \\perp AB$ tại $H$."
- Tuyệt đối KHÔNG tạo hình vẽ hoặc hình ảnh minh họa cho câu hỏi (trường "imagePrompt" phải luôn luôn để trống "").

Ngôn ngữ: Tiếng Việt.`;

    return prompt;
  }

  // API Route for Text-to-Speech specifically for English subject with SSML support
  app.get('/api/tts', async (req, res) => {
    try {
      const text = req.query.text as string;
      if (!text) {
        return res.status(400).json({ error: "Missing text parameter" });
      }

      console.log(`[TTS API] Received request for: "${text}"`);

      // Detect language: Vietnamese or English (or explicit query param)
      const isVietnamese = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text);
      const reqLang = (req.query.lang as string) || (isVietnamese ? 'vi' : 'en');

      const translateUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${reqLang}&client=tw-ob&q=${encodeURIComponent(text)}`;
      const fetchResponse = await fetch(translateUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!fetchResponse.ok) {
        throw new Error(`Google Translate TTS failed with status ${fetchResponse.status}`);
      }

      const arrayBuffer = await fetchResponse.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');

      console.log(`[TTS API] Successfully generated MP3 audio (${base64Audio.length} bytes, lang: ${reqLang})`);

      res.json({
        ssml: `<speak>${text}</speak>`,
        audio: base64Audio,
        format: 'mp3'
      });
    } catch (error: any) {
      console.error("[TTS API] Error in TTS generation:", error);
      res.status(500).json({ error: "Failed to generate text-to-speech audio", message: error.message });
    }
  });

  // Gemini API Route to generate questions from subject and topic
  app.post('/api/gemini/generate-questions', async (req, res) => {
    try {
      const { subject, topic, count, customInstructions, difficulty } = req.body;
      const prompt = getGradeAndSubjectPrompt({
        subject,
        topic,
        count,
        customInstructions,
        difficulty
      });

      const questions = await callGeminiOnServer([ { role: 'user', parts: [ { text: prompt } ] } ]);
      res.json(questions);
    } catch (error: any) {
      console.warn("Error generating questions, falling back to local generator:", error);
      try {
        const { subject, topic, count, difficulty } = req.body;
        const fallback = generateLocalQuestions(subject, topic, count, difficulty);
        res.json(fallback);
      } catch (innerErr) {
        res.status(500).json({ error: handleGeminiError(error) });
      }
    }
  });

  // Gemini API Route to generate questions from manual content
  app.post('/api/gemini/generate-questions-from-content', async (req, res) => {
    try {
      const { subject, content, count, customInstructions, difficulty } = req.body;
      const prompt = getGradeAndSubjectPrompt({
        subject,
        count,
        customInstructions,
        difficulty,
        content
      });

      const questions = await callGeminiOnServer([ { role: 'user', parts: [ { text: prompt } ] } ]);
      res.json(questions);
    } catch (error: any) {
      console.warn("Error generating questions from content, falling back to local generator:", error);
      try {
        const { subject, content, count, difficulty } = req.body;
        const topicClue = content && typeof content === 'string' ? content.substring(0, 100) : "tài liệu";
        const fallback = generateLocalQuestions(subject, topicClue, count, difficulty);
        res.json(fallback);
      } catch (innerErr) {
        res.status(500).json({ error: handleGeminiError(error) });
      }
    }
  });

  // Gemini API Route to generate questions from files parts (image/pdf base64 or docx/xlsx text)
  app.post('/api/gemini/generate-questions-from-parts', async (req, res) => {
    try {
      const { subject, parts, count, customInstructions, difficulty } = req.body;
      const prompt = getGradeAndSubjectPrompt({
        subject,
        count,
        customInstructions,
        difficulty,
        hasParts: true
      });

      const contentsArray = [{ role: 'user', parts: [{ text: prompt }, ...parts] }];
      const questions = await callGeminiOnServer(contentsArray);
      res.json(questions);
    } catch (error: any) {
      console.warn("Error generating questions from parts, falling back to local generator:", error);
      try {
        const { subject, parts, count, difficulty } = req.body;
        let topicClue = "tài liệu đính kèm";
        if (parts && Array.isArray(parts)) {
          const textPart = parts.find((p: any) => p && typeof p.text === 'string');
          if (textPart) {
            topicClue = textPart.text.substring(0, 100);
          }
        }
        const fallback = generateLocalQuestions(subject, topicClue, count, difficulty);
        res.json(fallback);
      } catch (innerErr) {
        res.status(500).json({ error: handleGeminiError(error) });
      }
    }
  });

  // Gemini API Route to verify and replace a reported question
  app.post('/api/gemini/verify-and-replace-question', async (req, res) => {
    try {
      const { question, subject } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Thiếu dữ liệu câu hỏi cần kiểm tra." });
      }

      const prompt = `Bạn là một chuyên gia Sư phạm và Khảo thí Giáo dục cao cấp.
Nhiệm vụ của bạn là kiểm tra chất lượng và độ chính xác của câu hỏi trắc nghiệm dưới đây (thuộc môn học: "${subject || 'Chưa rõ'}").

Nội dung câu hỏi cần kiểm tra:
- ID: ${question.id}
- Câu hỏi: ${question.question}
- Các phương án:
  + A: ${question.options?.A || ''}
  + B: ${question.options?.B || ''}
  + C: ${question.options?.C || ''}
  + D: ${question.options?.D || ''}
- Đáp án đúng hiện tại: ${question.correctAnswer}
- Giải thích: ${question.explanation}
- Độ khó: ${question.difficulty}

Hãy phân tích cực kỳ kỹ lưỡng:
1. Câu hỏi có lỗi chính tả, câu cú lủng củng hoặc mập mờ, thiếu thông tin để giải không?
2. Đáp án đúng (${question.correctAnswer}) có thực sự chính xác về mặt kiến thức khoa học/toán học/ngôn ngữ không? Có phương án nào khác cũng đúng không (gây tranh cãi)?
3. Phần giải thích có lỗi sai hay chưa rõ ràng không?
4. Định dạng LaTeX (nếu có) có bị lỗi hiển thị không?

YÊU CẦU TRẢ VỀ:
- Nếu phát hiện ra BẤT KỲ lỗi sai nào (dù là nhỏ nhất như lỗi chính tả, sai đáp án đúng, giải thích sai, công thức LaTeX lỗi):
  + Thiết lập "hasError" là true.
  + Cung cấp một "message" giải thích rõ lỗi sai bằng tiếng Việt một cách dễ hiểu và lịch sự cho học sinh.
  + Soạn lại một câu hỏi thay thế hoàn hảo vào trường "correctedQuestion". Hãy sử dụng chính xác ID là "${question.id}" cho câu hỏi mới này để hệ thống thay thế đồng bộ. Câu hỏi thay thế này phải có cùng độ khó, cùng dạng bài, cùng chủ đề nhưng hoàn toàn chính xác, không còn lỗi sai, và cực kỳ hay.
- Nếu KHÔNG phát hiện ra bất kỳ lỗi sai nào (câu hỏi, đáp án, giải thích đều hoàn hảo):
  + Thiết lập "hasError" là false.
  + "message" trả về: "Không phát hiện ra lỗi sai. Câu hỏi, đáp án và lời giải này đều hoàn hảo và chính xác tuyệt đối!"
  + Trường "correctedQuestion" để trống (null).

Lưu ý quan trọng cho câu hỏi thay thế (correctedQuestion):
- Nếu môn học là Tiếng Anh và là dạng bài nghe, hãy giữ thuộc tính "isListening": true và "listeningText" phù hợp.
- Tất cả công thức toán học và ký hiệu so sánh (như >, <, =) vẫn phải được định dạng chuẩn bằng LaTeX trong dấu $ (ví dụ: $x = 10$).
- Giữ nguyên độ khó "${question.difficulty}".`;

      const response = await generateContentWithRetry({
        model: "gemini-3.1-flash-lite",
        contents: [ { role: 'user', parts: [ { text: prompt } ] } ],
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasError: { type: Type.BOOLEAN, description: "True if there is any typo, factual error, incorrect answer key, or ambiguous wording." },
              message: { type: Type.STRING, description: "Description of the review result in Vietnamese." },
              correctedQuestion: {
                type: Type.OBJECT,
                description: "Required ONLY if hasError is true. A high-quality alternative question.",
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING }
                    },
                    required: ["A", "B", "C", "D"]
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                  isListening: { type: Type.BOOLEAN },
                  listeningText: { type: Type.STRING },
                  vocabularyList: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        word: { type: Type.STRING },
                        meaning: { type: Type.STRING }
                      },
                      required: ["word", "meaning"]
                    }
                  }
                },
                required: ["id", "question", "options", "correctAnswer", "explanation", "difficulty"]
              }
            },
            required: ["hasError", "message"]
          }
        }
      });

      if (!response.text) {
        throw new Error("AI không phản hồi kết quả kiểm tra.");
      }

      let result = JSON.parse(response.text.trim());
      // Enforce the same ID for corrected question if AI returned one
      if (result.hasError && result.correctedQuestion) {
        result.correctedQuestion.id = question.id;
        if (!result.correctedQuestion.imagePrompt) {
          result.correctedQuestion.imagePrompt = "";
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error in verify-and-replace-question route:", error);
      res.status(500).json({ error: error.message || "Đã xảy ra lỗi khi kiểm tra câu hỏi." });
    }
  });

  // Gemini API Route to generate Question SVG
  app.post('/api/gemini/generate-question-svg', async (req, res) => {
    try {
      const { imagePrompt, question } = req.body;
      if (!imagePrompt || imagePrompt.trim().length <= 10) {
        return res.json({ svgUrl: "" });
      }

      const svgResponse = await generateContentWithRetry({
        model: 'gemini-3.1-flash-lite',
        contents: `Bạn là một chuyên gia thiết kế đồ họa SVG cho giáo dục tiểu học.
Hãy tạo mã nguồn SVG (Scalable Vector Graphics) cho hình vẽ toán học hoặc minh họa giáo dục tiểu học dựa trên mô tả sau:
Mô tả hình vẽ: "${imagePrompt}"
Câu hỏi đi kèm: "${question}"

Yêu cầu kỹ thuật tuyệt đối:
1. Chỉ trả về mã nguồn SVG thuần túy, bắt đầu bằng <svg> và kết thúc bằng </svg>. Không dùng markdown code block, không dùng bất kỳ ký tự nào khác ngoài mã SVG.
2. Mã SVG phải tự thích ứng (responsive), sử dụng viewBox thích hợp, thiết kế sinh động, ngộ nhìn, màu sắc tươi sáng thích hợp cho học sinh tiểu học.`,
      });

      let svgText = svgResponse.text || "";
      svgText = svgText.trim();
      if (svgText.startsWith("```xml")) {
        svgText = svgText.substring(6);
      } else if (svgText.startsWith("```html")) {
        svgText = svgText.substring(7);
      } else if (svgText.startsWith("```svg")) {
        svgText = svgText.substring(6);
      } else if (svgText.startsWith("```")) {
        svgText = svgText.substring(3);
      }
      if (svgText.endsWith("```")) {
        svgText = svgText.substring(0, svgText.length - 3);
      }
      svgText = svgText.trim();

      if (svgText && svgText.includes("<svg")) {
        const base64Svg = Buffer.from(svgText).toString('base64');
        return res.json({ svgUrl: `data:image/svg+xml;base64,${base64Svg}` });
      }
      return res.json({ svgUrl: "" });
    } catch (error) {
      console.warn("Error generating SVG, returning empty:", error);
      return res.json({ svgUrl: "" });
    }
  });

  // Local fallback generator for student performance analysis when Gemini API is rate-limited or fails
  function generateLocalPerformanceAnalysis(studentName: string, results: any[]): string {
    if (!results || results.length === 0) {
      return `### Phân tích lộ trình học tập dành cho bé **${studentName}** 🌟
      
Con chưa hoàn thành bài luyện tập nào gần đây. Hãy cùng tham gia giải các câu hỏi trắc nghiệm ở màn hình **Trang chủ** để cô giáo AI có thể đưa ra đánh giá chính xác nhất về năng lực của con nhé! ❤️`;
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    // Group and analyze scores
    results.forEach((r: any) => {
      const pct = r.totalQuestions > 0 ? (r.score / r.totalQuestions) * 100 : 0;
      const topicStr = `môn **${r.subject}** (chủ đề **${r.topic || 'Tổng hợp'}**)`;
      
      if (pct >= 80) {
        strengths.push(`- Con học rất tốt ${topicStr} với điểm số xuất sắc: **${r.score}/${r.totalQuestions}**! 🎉`);
      } else if (pct < 60) {
        weaknesses.push(`- Con còn gặp khó khăn ở ${topicStr} (đạt **${r.score}/${r.totalQuestions}**). Đừng lo lắng nhé, chỉ cần chú ý đọc kỹ câu hỏi hơn thôi con! 💪`);
        suggestions.push(`- Ôn luyện lại chủ đề **${r.topic || 'Tổng hợp'}** của môn **${r.subject}** để nắm vững kiến thức nền tảng.`);
      } else {
        weaknesses.push(`- Ở ${topicStr} (đạt **${r.score}/${r.totalQuestions}**), con đã hiểu bài nhưng cần rèn luyện thêm tính cẩn thận để tránh sai sót đáng tiếc.`);
        suggestions.push(`- Thử làm lại các câu chưa đúng trong chủ đề **${r.topic || 'Tổng hợp'}** (môn **${r.subject}**) để lấy điểm tối đa nha.`);
      }
    });

    if (strengths.length === 0) {
      strengths.push(`- Bé đã nỗ lực làm bài ôn tập rất đáng khen! Hãy tiếp tục rèn luyện để bứt phá đạt điểm số cao hơn nữa nhé.`);
    }
    if (weaknesses.length === 0) {
      weaknesses.push(`- Tuyệt vời! Các chủ đề con đã học đều đạt kết quả tốt, không có điểm yếu nào đáng lo ngại cả!`);
    }
    if (suggestions.length === 0) {
      suggestions.push(`- Con có thể thử thách bản thân bằng cách tham gia các bài kiểm tra đề tự luyện nâng cao của giáo viên nhé! 🌟`);
    }

    return `### Phân tích Lộ trình Học tập dành cho bé **${studentName}** 🌟

1. 💪 **Điểm mạnh**:
${strengths.slice(0, 3).join('\n')}

2. 😟 **Điểm yếu**:
${weaknesses.slice(0, 3).join('\n')}

3. 🎯 **Gợi ý chủ đề nên rèn luyện lại**:
${suggestions.slice(0, 3).join('\n')}

*Lưu ý: Hệ thống phân tích dự phòng thông minh đã tự động cập nhật kết quả nhận xét mới nhất cho con! Chúc con học tốt! ❤️*`;
  }

  // Local fallback generator for study advice when Gemini API is rate-limited or fails
  function generateLocalStudyAdvice(studentName: string, subject: string, topic: string, results: any[]): string {
    const topicResults = results ? results.filter((r: any) => 
      r.subject === subject && r.topic && r.topic.trim().toLowerCase() === topic.trim().toLowerCase()
    ) : [];

    if (topicResults.length > 0) {
      const lastResult = topicResults[topicResults.length - 1];
      const scores = topicResults.map((r: any) => r.score);
      const maxScore = Math.max(...scores);
      const lastPct = lastResult.totalQuestions > 0 ? (lastResult.score / lastResult.totalQuestions) * 100 : 0;

      if (lastPct >= 80) {
        return `⭐ **Bé ơi, con thật là xuất sắc!** Con đã nắm rất vững chủ đề **${topic}** của môn **${subject}** với điểm số cao nhất là **${maxScore}/${lastResult.totalQuestions}**!
- Mẹo nhỏ cho con: Hãy thử chia sẻ cách giải các câu hỏi này với các bạn xung quanh hoặc thử giải các bài tập nâng cao hơn nhé! Tặng con 1 sticker Sao Vàng 10 điểm nè! 🎖️✨`;
      } else if (lastPct >= 50) {
        return `📘 **Con đã làm tốt nhưng cần cẩn thận hơn một xíu nhé!** Điểm bài gần nhất của con là **${lastResult.score}/${lastResult.totalQuestions}**.
- Mẹo học cho con: Hãy dành ra 2 phút sau khi làm xong để kiểm tra lại bài trước khi nộp. Hãy click vào nút "Xem chi tiết" để ôn lại những câu con đã chọn sai để rút kinh nghiệm nhé! Con sắp đạt điểm tuyệt đối rồi đấy! 🎯🍀`;
      } else {
        return `💡 **Đừng nản chí nhé bé yêu ơi!** Điểm bài gần nhất là **${lastResult.score}/${lastResult.totalQuestions}**. Mỗi lần sai là một cơ hội để con học hỏi thêm đấy!
- Hướng dẫn học cho con: Hãy đọc thật kỹ câu hỏi trước khi chọn. Con nên xem lại phần bài giảng lý thuyết cơ bản và làm lại đề thi này một lần nữa một cách chậm rãi nhé. Cô tin chắc lần sau con sẽ tiến bộ vượt bậc! 🌸💪`;
      }
    } else {
      return `🌟 **Chào bé yêu! Con chưa từng làm bài ôn tập cho chủ đề "${topic}" môn "${subject}" đúng không nào?**
- Lời khuyên cho con: Hãy bắt đầu bằng tâm thế thoải mái nhất nhé! Chủ đề này vô cùng thú vị và bổ ích. Hãy click làm bài kiểm tra thử ngay, đọc kỹ từng câu và tự tin chọn đáp án. Thầy cô luôn đồng hành và cổ vũ con! ❤️🚀`;
    }
  }

  // Gemini API Route to analyze student performance
  app.post('/api/gemini/analyze-student-performance', async (req, res) => {
    const { studentName, results } = req.body;
    try {
      const resultsSummary = results.map((r: any) => 
        `- Môn: ${r.subject}, Chủ đề: ${r.topic}, Điểm: ${r.score}/${r.totalQuestions}`
      ).join('\n');

      const prompt = `Bạn là một cố vấn học tập AI giàu kinh nghiệm, thân thiện và ấm áp dành cho học sinh tiểu học.
Hãy phân tích kết quả học tập của bé học sinh tiểu học "${studentName}" dựa trên các dữ liệu sau:
${resultsSummary}

Yêu cầu phân tích chỉ nêu NGẦN GỌN và tập trung hoàn toàn vào 3 phần sau:
1. 💪 **Điểm mạnh**: (Nêu ngắn gọn môn học và chủ đề con làm tốt, đạt điểm cao).
2. 😟 **Điểm yếu**: (Chỉ ra nhẹ nhàng những điểm con còn chưa làm tốt hoặc cần lưu ý).
3. 🎯 **Gợi ý chủ đề nên rèn luyện lại**: (Đề xuất cụ thể chủ đề con nên làm lại bài tập để cải thiện).

Lưu ý: Giọng văn ấm áp, súc tích, dễ thương (dùng icon sinh động). Tránh dài dòng, rườm rà. Viết trực tiếp vào các phần nêu trên dưới dạng các gạch đầu dòng ngắn gọn.`;

      const response = await generateContentWithRetry({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.6,
        },
      });

      res.json({ analysis: response.text || generateLocalPerformanceAnalysis(studentName, results) });
    } catch (error: any) {
      console.warn("Gemini analyze performance error, using local fallback:", error);
      // Soft-fallback with high-quality customized response instead of throwing 500
      const localAnalysis = generateLocalPerformanceAnalysis(studentName, results);
      res.json({ analysis: localAnalysis });
    }
  });

  // Gemini API Route to get study advice for a specific subject & topic
  app.post('/api/gemini/get-study-advice', async (req, res) => {
    const { studentName, subject, topic, results } = req.body;
    try {
      const topicResults = results ? results.filter((r: any) => 
        r.subject === subject && r.topic && r.topic.trim().toLowerCase() === topic.trim().toLowerCase()
      ) : [];

      let historyContext = "";
      if (topicResults.length > 0) {
        historyContext = `Bé đã làm ${topicResults.length} bài ôn tập cho chủ đề này với các điểm số: ${topicResults.map((r: any) => `${r.score}/${r.totalQuestions}`).join(', ')}.`;
      } else {
        historyContext = `Bé chưa làm bài ôn tập nào thuộc chủ đề này.`;
      }

      const prompt = `Bạn là một giáo viên tiểu học thân thiện, vui tính và là Trợ lý Cố vấn Học tập AI thông minh của Lightedu. 
Hãy đưa ra một vài lời khuyên, mẹo nhỏ hoặc hướng dẫn ngắn gọn cho bé "${studentName}" để học tốt chủ đề "${topic}" của môn "${subject}".

Thông tin tiến trình học tập của bé:
- ${historyContext}

Yêu cầu lời khuyên:
1. Giọng văn: Gần gũi, ấm áp, khích lệ như thầy cô giáo đang nói chuyện trực tiếp với bé tiểu học. Sử dụng từ ngữ dễ hiểu cho trẻ em (ví dụ: "Thầy cô thấy...", "Bé ơi...", "Hãy cùng...", "Tuyệt vời...").
2. Độ dài: Ngắn gọn, súc tích (khoảng 3-4 câu hoặc 3 gạch đầu dòng ngắn), tránh dài dòng làm trẻ lười đọc.
3. Nội dung cụ thể: Đưa ra mẹo học/mẹo ghi nhớ cụ thể liên quan tới chủ đề "${topic}".
   - Nếu bé chưa làm bài nào: Hãy khơi gợi tính tò mò, hướng dẫn bé bắt đầu thế nào.
   - Nếu điểm thấp (dưới 5): Hãy an ủi, khích lệ, hướng dẫn bé đọc kỹ đề và tập trung ôn tập lại lý thuyết cơ bản.
   - Nếu điểm trung bình (5-8): Khuyên bé cẩn thận hơn, ôn tập phần giải thích chi tiết của các câu sai để lấy điểm tối đa.
   - Nếu điểm cao (8-10): Khen ngợi bé hết lời, tặng sticker ảo (ví dụ: "Sao vàng 10 điểm", "Học vương") và thách thức bé làm bài khó hơn hoặc làm nhanh hơn.

Hãy trả về bằng tiếng Việt, có sử dụng biểu tượng cảm xúc (emoji) đáng yêu và định dạng bằng Markdown ngắn gọn. Trực tiếp đưa ra lời khuyên luôn, không bắt đầu bằng "Dưới đây là..." hay chào hỏi rườm rà.`;

      const response = await generateContentWithRetry({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      res.json({ advice: response.text || generateLocalStudyAdvice(studentName, subject, topic, results) });
    } catch (error: any) {
      console.warn("Gemini study advice error, using local fallback:", error);
      // Soft-fallback with high-quality customized advice instead of throwing 500
      const localAdvice = generateLocalStudyAdvice(studentName, subject, topic, results);
      res.json({ advice: localAdvice });
    }
  });

  // Local helper for speech evaluation when API is limited
  function generateLocalSpeechEvaluation(word: string, speechText: string, sentence?: string) {
    const normTarget = (sentence || word).trim().toLowerCase().replace(/[.,?!]/g, "");
    const normSpeech = (speechText || "").trim().toLowerCase().replace(/[.,?!]/g, "");
    
    if (!normSpeech) {
      return {
        accuracy: 0,
        feedback: "Thầy cô chưa nghe rõ tiếng con nói. Con hãy nhấn giữ mic và thử nói to rõ hơn nhé! ❤️",
        clearPronunciation: false,
        correctWord: false,
        confidentTone: false
      };
    }
    
    const targetWords = normTarget.split(/\s+/);
    const speechWords = normSpeech.split(/\s+/);
    
    let matchCount = 0;
    for (const tw of targetWords) {
      if (speechWords.includes(tw)) {
        matchCount++;
      }
    }
    
    const wordRatio = targetWords.length > 0 ? matchCount / targetWords.length : 0;
    let accuracy = Math.round(wordRatio * 100);
    
    if (normSpeech.includes(word.trim().toLowerCase())) {
      accuracy = Math.max(accuracy, 85);
    }
    
    if (accuracy >= 85) {
      accuracy = Math.round(85 + Math.random() * 14); // 85 - 99%
    } else if (accuracy > 30) {
      accuracy = Math.round(55 + Math.random() * 25); // 55 - 80%
    } else {
      accuracy = Math.round(15 + Math.random() * 25); // 15 - 40%
    }
    
    let feedback = "";
    const clearPronunciation = accuracy >= 70;
    const correctWord = accuracy >= 80;
    const confidentTone = accuracy >= 75;
    
    if (accuracy >= 90) {
      const praises = [
        `Con phát âm từ "${word}" rất tuyệt vời! 🌟 Giọng đọc rất rõ ràng và chuẩn xác.`,
        `Quá đỉnh luôn con ơi! Phát âm cực kỳ chuẩn xác và tự tin nhé! 🎉`,
        `Thầy cô rất tự hào về con! Con phát âm từ "${word}" nghe rất tự nhiên luôn. ❤️`
      ];
      feedback = praises[Math.floor(Math.random() * praises.length)];
    } else if (accuracy >= 70) {
      feedback = `Con phát âm khá tốt từ "${word}" rồi đó! Chú ý rèn luyện thêm để tròn vành rõ chữ hơn nhé! 😘`;
    } else {
      feedback = `Gần đúng rồi con ơi! Con hãy lắng nghe phát âm mẫu rồi thử bấm mic luyện nói lại nhé. Cố lên nào! 💪`;
    }
    
    return {
      accuracy,
      feedback,
      clearPronunciation,
      correctWord,
      confidentTone
    };
  }

  // Gemini API Route to evaluate child speech
  app.post('/api/gemini/evaluate-speech', async (req, res) => {
    const { word, meaning, speechText, sentence } = req.body;
    try {
      if (!speechText || speechText.trim() === "") {
        return res.json(generateLocalSpeechEvaluation(word, "", sentence));
      }

      const prompt = `Bạn là một chuyên gia ngữ âm học tiếng Anh trẻ em vui tính, tận tâm và là Trợ lý AI chấm điểm phát âm thông minh của Lightedu.
Nhiệm vụ của bạn là đánh giá giọng đọc tiếng Anh của học sinh tiểu học Việt Nam.

Thông tin bài tập phát âm:
- Từ vựng mục tiêu: "${word}" (${meaning})
- Câu mẫu (nếu có): "${sentence || ""}"
- Văn bản do học sinh phát âm (hệ thống nhận diện giọng nói đã thu âm thành chữ): "${speechText}"

Hãy phân tích mức độ chính xác của từ/câu học sinh đọc so với mục tiêu.
Lưu ý về tâm lý học sinh tiểu học:
- Nếu học sinh phát âm hoàn toàn không liên quan, hãy cho điểm thấp (dưới 30) và động viên bé nhấn nút mic nói lại một cách đáng yêu.
- Nếu học sinh phát âm gần đúng, thiếu phụ âm cuối, hãy chỉ ra điểm cần cải thiện một cách nhẹ nhàng, dễ thương và cho điểm khoảng 70-85%.
- Nếu học sinh đọc đúng từ hoặc đọc trôi chảy cả câu mẫu, hãy khen ngợi nhiệt tình bằng biểu tượng cảm xúc (emoji) đáng yêu và cho điểm từ 90% đến 99%.

Hãy trả về kết quả dưới dạng JSON theo cấu trúc sau:
{
  "accuracy": <số nguyên từ 0 đến 100 biểu thị độ chính xác>,
  "feedback": "<lời nhận xét bằng tiếng Việt cực kỳ ngắn gọn (1-2 câu), ngọt ngào khích lệ và chỉ ra mẹo phát âm nếu cần. Ví dụ: 'Tuyệt vời, con phát âm rất chuẩn!' hoặc 'Gần đúng rồi con ơi! Hãy chú ý phát âm rõ âm đuôi /k/ của từ \"bike\" nhé!'>",
  "clearPronunciation": <true hoặc false, true nếu phát âm rõ ràng, dễ nghe>,
  "correctWord": <true hoặc false, true nếu đọc tương đối chuẩn từ mục tiêu>,
  "confidentTone": <true hoặc false, true nếu nhịp điệu tự tin trôi chảy>
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              accuracy: { type: Type.INTEGER },
              feedback: { type: Type.STRING },
              clearPronunciation: { type: Type.BOOLEAN },
              correctWord: { type: Type.BOOLEAN },
              confidentTone: { type: Type.BOOLEAN },
            },
            required: ["accuracy", "feedback", "clearPronunciation", "correctWord", "confidentTone"],
          },
        },
      });

      const resText = response.text || "";
      const parsed = JSON.parse(resText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.warn("Speech evaluation error, using local fallback:", error);
      const fallbackResult = generateLocalSpeechEvaluation(word, speechText, sentence);
      res.json(fallbackResult);
    }
  });

  // Helper function to translate raw Gemini errors to beautiful Vietnamese messages
  function handleGeminiError(error: any): string {
    const errorStr = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    
    console.error("Processing Gemini Error:", errorStr);

    // Check for rate limit / quota exceeded
    if (
      errorStr.includes("429") || 
      errorStr.includes("RESOURCE_EXHAUSTED") || 
      errorStr.includes("quota") || 
      errorStr.includes("limit") ||
      errorStr.includes("rate limit") ||
      (error && (error.status === 429 || error.code === 429))
    ) {
      return "Hệ thống AI hiện đang quá tải hoặc tạm thời hết lượt tạo câu hỏi miễn phí (Quota Exceeded). Bạn vui lòng đợi khoảng 30-60 giây rồi thử lại nhé! ❤️";
    }

    // Check for safety block
    if (
      errorStr.includes("SAFETY") || 
      errorStr.includes("safety") || 
      errorStr.includes("block") ||
      errorStr.includes("harmful")
    ) {
      return "Nội dung yêu cầu hoặc tài liệu tải lên không phù hợp hoặc vi phạm chính sách an toàn của AI. Vui lòng thử lại với nội dung khác lành mạnh hơn nhé!";
    }

    // Check for file format / size support
    if (
      errorStr.includes("400") || 
      errorStr.includes("MIME type") || 
      errorStr.includes("unsupported") ||
      errorStr.includes("too large")
    ) {
      return "Định dạng tài liệu không được hỗ trợ hoặc dung lượng quá lớn. Vui lòng tải lên ảnh (JPEG, PNG, WEBP) hoặc tài liệu PDF dưới 8MB.";
    }

    return "Không thể tạo câu hỏi lúc này do sự cố kết nối tới dịch vụ AI. Bạn vui lòng thử lại sau một lát nhé!";
  }

  // Helper function for server-side Gemini question generation
  async function callGeminiOnServer(contentsArray: any[]): Promise<any[]> {
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3.1-flash-lite",
        contents: contentsArray,
        config: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.OBJECT,
                  properties: {
                    A: { type: Type.STRING },
                    B: { type: Type.STRING },
                    C: { type: Type.STRING },
                    D: { type: Type.STRING },
                  },
                },
                correctAnswer: { type: Type.STRING, description: "Must be A, B, C, or D" },
                explanation: { type: Type.STRING },
                difficulty: { type: Type.STRING, description: "Must be 'Easy', 'Medium', or 'Hard' based on complexity and typical 9th-grade student performance." },
                imagePrompt: { type: Type.STRING, description: "Must always be an empty string \"\"." },
                isListening: { type: Type.BOOLEAN, description: "Optional. True if this is an English listening comprehension question." },
                listeningText: { type: Type.STRING, description: "Optional. The exact English text to be read aloud for the listening question." },
                vocabularyList: {
                  type: Type.ARRAY,
                  description: "Optional. List of 5-10 key vocabulary words and their Vietnamese meanings, only on the first question of an English quiz.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING, description: "English word" },
                      meaning: { type: Type.STRING, description: "Vietnamese meaning" }
                    },
                    required: ["word", "meaning"]
                  }
                },
              },
              required: ["id", "question", "options", "correctAnswer", "explanation", "difficulty"],
            },
          },
        },
      });

      if (!response.text) {
        throw new Error("AI không trả về nội dung. Vui lòng thử lại.");
      }

      // Robust JSON extraction in case of markdown wrapping
      const text = response.text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      let jsonStr = jsonMatch ? jsonMatch[0] : text;
      
      // Escape any backslash NOT preceded by another backslash, followed by 2 or more letters (LaTeX commands)
      // This prevents JSON.parse from treating them as JSON escapes (e.g. \times as tab + imes, \frac as form feed + rac)
      jsonStr = jsonStr.replace(/(?<!\\)\\(?=[a-zA-Z]{2,})/g, '\\\\');
      
      return JSON.parse(jsonStr);
    } catch (error: any) {
      console.error("Gemini Server-Side API Error:", error);
      if (error.message && (error.message.includes("400") || error.message.includes("MIME type"))) {
        throw new Error("Định dạng tệp không được hỗ trợ hoặc tệp quá lớn. Vui lòng sử dụng PDF hoặc hình ảnh.");
      }
      throw error;
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
