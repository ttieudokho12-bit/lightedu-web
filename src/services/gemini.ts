import { Question, Subject } from "../types";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

export async function generateQuestions(subject: Subject, topic: string, count: number, customInstructions?: string, difficulty?: string): Promise<Question[]> {
  try {
    const response = await fetch('/api/gemini/generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subject, topic, count, customInstructions, difficulty }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Không thể tạo câu hỏi. Vui lòng thử lại.");
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Error in generateQuestions:", error);
    throw new Error(error.message || "Không thể kết nối tới máy chủ.");
  }
}

export async function generateQuestionsFromContent(subject: Subject, content: string, count: number, customInstructions?: string, difficulty?: string): Promise<Question[]> {
  try {
    const response = await fetch('/api/gemini/generate-questions-from-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subject, content, count, customInstructions, difficulty }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Không thể tạo câu hỏi từ nội dung. Vui lòng thử lại.");
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Error in generateQuestionsFromContent:", error);
    throw new Error(error.message || "Không thể kết nối tới máy chủ.");
  }
}

export async function generateQuestionsFromFiles(subject: Subject, files: File[], count: number, customInstructions?: string, difficulty?: string): Promise<Question[]> {
  const parts: any[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let mimeType = file.type;
    
    // Fallback for missing MIME types
    if (!mimeType) {
      if (ext === 'pdf') mimeType = 'application/pdf';
      else if (['jpg', 'jpeg'].includes(ext || '')) mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (['heic', 'heif'].includes(ext || '')) mimeType = 'image/heic';
    }

    // Handle DOCX by extracting HTML (to include images)
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        parts.push({ text: `Nội dung (HTML) từ tệp ${file.name}:\n${result.value}` });
      } catch (err) {
        console.error(`Error extracting text from docx ${file.name}:`, err);
        throw new Error(`Không thể đọc tệp Word: ${file.name}. Vui lòng chuyển sang định dạng PDF.`);
      }
      continue;
    }

    // Handle XLSX by extracting text
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === 'xlsx') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let excelText = `Nội dung từ tệp Excel ${file.name}:\n`;
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          excelText += `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(worksheet)}\n`;
        });
        parts.push({ text: excelText });
      } catch (err) {
        console.error(`Error extracting text from excel ${file.name}:`, err);
        throw new Error(`Không thể đọc tệp Excel: ${file.name}. Vui lòng chuyển sang định dạng PDF.`);
      }
      continue;
    }

    // Identify if it's an image (including iOS HEIC/HEIF)
    const isImage = mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext || '');

    if (isImage) {
      try {
        // Compress and normalize the image to web-compatible JPEG before sending to Gemini API
        const compressed = await compressAndConvertImage(file);
        parts.push({
          inlineData: {
            data: compressed.data,
            mimeType: compressed.mimeType
          }
        });
        continue;
      } catch (err) {
        console.warn(`Error compressing/converting image ${file.name}, trying standard fallback:`, err);
        
        // If it's a standard web image and size is reasonable, we can try sending it directly without compression
        const isStandardWebImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '') || 
                                   ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType);
        
        if (isStandardWebImage && file.size <= 5 * 1024 * 1024) {
          try {
            const base64 = await fileToBase64(file);
            parts.push({
              inlineData: {
                data: base64.split(',')[1],
                mimeType: mimeType || 'image/jpeg'
              }
            });
            continue; // Successfully handled, skip text-based fallback
          } catch (fallbackErr) {
            console.error("Fallback image reading failed:", fallbackErr);
          }
        }
        
        // If it's too large or not a standard web-safe image, throw a clear error
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Hình ảnh "${file.name}" quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB). Vui lòng giảm kích thước hình ảnh dưới 5MB hoặc dùng định dạng PDF.`);
        } else {
          throw new Error(`Không thể giải mã hoặc nén hình ảnh "${file.name}". Vui lòng thử lại với hình ảnh khác (JPEG, PNG) hoặc định dạng PDF.`);
        }
      }
    }

    // Handle PDF with explicit size limit check
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error(`Tệp tài liệu PDF "${file.name}" quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB). Vui lòng sử dụng tệp PDF nhỏ hơn 8MB.`);
      }
      const base64 = await fileToBase64(file);
      parts.push({
        inlineData: {
          data: base64.split(',')[1],
          mimeType: 'application/pdf'
        }
      });
      continue;
    }

    // For other text-based files, try to read as text
    try {
      const text = await file.text();
      parts.push({ text: `Nội dung từ tệp ${file.name}:\n${text}` });
    } catch (err) {
      console.warn(`File type ${mimeType} not supported for direct AI processing, and failed to read as text.`);
    }
  }

  try {
    const response = await fetch('/api/gemini/generate-questions-from-parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subject, parts, count, customInstructions, difficulty }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Không thể tạo câu hỏi từ tài liệu. Vui lòng thử lại.");
    }
    
    return await response.json();
  } catch (error: any) {
    console.error("Error in generateQuestionsFromFiles:", error);
    throw new Error(error.message || "Không thể kết nối tới máy chủ.");
  }
}

async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

async function loadHeic2Any(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).heic2any) {
    return (window as any).heic2any;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).heic2any) {
        resolve((window as any).heic2any);
      } else {
        reject(new Error("heic2any was not loaded correctly from CDN"));
      }
    };
    script.onerror = () => {
      reject(new Error("Lỗi tải thư viện hỗ trợ giải mã ảnh HEIC (heic2any)."));
    };
    document.head.appendChild(script);
  });
}

async function compressAndConvertImage(file: File): Promise<{ data: string; mimeType: string }> {
  // If the file is HEIC/HEIF, we convert it to JPEG first using dynamic CDN heic2any library
  let targetFile: Blob | File = file;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const isHeic = ['heic', 'heif'].includes(ext || '') || file.type === 'image/heic' || file.type === 'image/heif';

  if (isHeic) {
    try {
      const heic2any = await loadHeic2Any();
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      });
      // heic2any might return an array if it's an animated HEIC, so we take the first element if it's an array
      const blobResult = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      targetFile = new File([blobResult], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
    } catch (err) {
      console.error("Error converting HEIC to JPEG:", err);
      throw new Error(`Tệp tin HEIC không thể chuyển đổi được: ${err instanceof Error ? err.message : 'Lỗi giải mã hình ảnh iOS'}`);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          if ('decode' in img) {
            await img.decode().catch((err) => {
              console.warn("Image decode failed inside onload:", err);
            });
          }
        } catch (decodeErr) {
          console.warn("Error decoding image:", decodeErr);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Cannot get canvas context"));
          return;
        }

        // Limit maximum dimension to 1024px for fast upload, prompt response, and API compatibility
        const MAX_DIM = 1024;
        let width = img.naturalWidth || img.width || 0;
        let height = img.naturalHeight || img.height || 0;

        if (width <= 0 || height <= 0) {
          reject(new Error("Hình ảnh không có kích thước hợp lệ (0x0)."));
          return;
        }

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        try {
          ctx.drawImage(img, 0, 0, width, height);
        } catch (drawErr) {
          console.error("Error drawing image onto canvas:", drawErr);
          reject(new Error("Không thể dựng hình ảnh này lên canvas."));
          return;
        }
        
        // Convert with quality for an optimal balance. Fallback to image/png if Safari's toDataURL throws
        try {
          let dataUrl: string;
          let mimeTypeResult = 'image/jpeg';
          try {
            dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          } catch (e) {
            console.warn("canvas.toDataURL('image/jpeg') failed, falling back to 'image/png':", e);
            dataUrl = canvas.toDataURL('image/png');
            mimeTypeResult = 'image/png';
          }

          const base64Parts = dataUrl.split(',');
          const base64Data = base64Parts.length > 1 ? base64Parts[1] : dataUrl;
          if (!base64Data) {
            reject(new Error("Không thể giải mã dữ liệu hình ảnh."));
            return;
          }
          resolve({
            data: base64Data,
            mimeType: mimeTypeResult
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        reject(new Error("Không thể giải mã hình ảnh này."));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Không thể đọc tệp hình ảnh."));
    reader.readAsDataURL(targetFile);
  });
}

export async function generateQuestionSvg(imagePrompt: string, question: string): Promise<string> {
  if (!imagePrompt || imagePrompt.trim().length <= 10) return "";
  try {
    const response = await fetch('/api/gemini/generate-question-svg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imagePrompt, question }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.svgUrl || "";
    }
  } catch (err) {
    console.warn("Gracefully falling back from SVG generation failure:", err);
  }
  return "";
}

// Memory caches to prevent spamming Gemini API with identical requests
const performanceCache: Record<string, string> = {};
const studyAdviceCache: Record<string, string> = {};

export async function analyzeStudentPerformance(studentName: string, results: any[]): Promise<string> {
  const resultSummary = results.map(r => `${r.score || r.correctCount || 0}_${r.timestamp?.seconds || r.createdAt || ''}`).join(',');
  const cacheKey = `${studentName}_${results.length}_${resultSummary}`;
  if (performanceCache[cacheKey]) {
    console.log("[Gemini Cache] performanceCache hit!");
    return performanceCache[cacheKey];
  }

  try {
    const response = await fetch('/api/gemini/analyze-student-performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentName, results }),
    });
    
    if (!response.ok) {
      throw new Error("Không thể thực hiện phân tích lúc này.");
    }
    
    const data = await response.json();
    const analysis = data.analysis || "Không thể thực hiện phân tích lúc này.";
    performanceCache[cacheKey] = analysis;
    return analysis;
  } catch (error) {
    console.error("Error analyzing student performance:", error);
    return "Không thể thực hiện phân tích lúc này.";
  }
}

export async function getStudyAdvice(studentName: string, subject: Subject, topic: string, results: any[]): Promise<string> {
  const resultSummary = results.map(r => `${r.score || r.correctCount || 0}_${r.timestamp?.seconds || r.createdAt || ''}`).join(',');
  const cacheKey = `${studentName}_${subject}_${topic}_${results.length}_${resultSummary}`;
  if (studyAdviceCache[cacheKey]) {
    console.log("[Gemini Cache] studyAdviceCache hit!");
    return studyAdviceCache[cacheKey];
  }

  try {
    const response = await fetch('/api/gemini/get-study-advice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentName, subject, topic, results }),
    });
    
    if (!response.ok) {
      throw new Error("Không thể lấy lời khuyên lúc này.");
    }
    
    const data = await response.json();
    const advice = data.advice || "Hãy cùng bắt đầu buổi ôn tập thật bổ ích nhé! 🌟";
    studyAdviceCache[cacheKey] = advice;
    return advice;
  } catch (error) {
    console.error("Error getting study advice:", error);
    return "Chúc con ôn tập thật tốt và đạt kết quả cao nhất! 🌟";
  }
}

export async function verifyAndReplaceQuestion(
  question: Question,
  subject?: string
): Promise<{ hasError: boolean; correctedQuestion?: Question; message: string }> {
  try {
    const response = await fetch('/api/gemini/verify-and-replace-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, subject }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Không thể kiểm tra câu hỏi. Vui lòng thử lại.");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error in verifyAndReplaceQuestion:", error);
    throw new Error(error.message || "Không thể kết nối tới máy chủ.");
  }
}


