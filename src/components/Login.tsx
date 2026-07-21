import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { auth, db, signInWithEmailAndPassword, googleProvider } from '../firebase';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import { UserProfile } from '../types';
// @ts-ignore
import studentBoyPng from '../assets/images/student_boy.png';
// @ts-ignore
import studentGirlPng from '../assets/images/student_girl.png';

// ==========================================
// CUTE CARTOON COMPONENTS (SVG DECORATIONS)
// ==========================================

const CuteSun = () => (
  <svg className="w-16 h-16 sm:w-24 sm:h-24 animate-pulse select-none pointer-events-none" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="28" fill="#FFDE4D" />
    {/* Sun rays */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
      <line
        key={i}
        x1="50"
        y1="50"
        x2={50 + 38 * Math.cos((angle * Math.PI) / 180)}
        y2={50 + 38 * Math.sin((angle * Math.PI) / 180)}
        stroke="#FFB200"
        strokeWidth="5"
        strokeLinecap="round"
      />
    ))}
    <circle cx="50" cy="50" r="26" fill="#FFDE4D" />
    {/* Eyes */}
    <circle cx="43" cy="46" r="3" fill="#333" />
    <circle cx="57" cy="46" r="3" fill="#333" />
    {/* Blush */}
    <circle cx="38" cy="53" r="3" fill="#FF8E9E" opacity="0.8" />
    <circle cx="62" cy="53" r="3" fill="#FF8E9E" opacity="0.8" />
    {/* Smile */}
    <path d="M 44 55 Q 50 61 56 55" stroke="#333" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

const CuteSchoolBuilding = () => (
  <svg className="w-32 h-32 sm:w-44 sm:h-44 select-none pointer-events-none drop-shadow-md" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main body */}
    <rect x="20" y="55" width="80" height="45" rx="6" fill="#FFE2C9" stroke="#E6A16C" strokeWidth="2" />
    <rect x="35" y="32" width="50" height="24" rx="4" fill="#FFF3E3" stroke="#E6A16C" strokeWidth="2" />
    {/* Roof */}
    <path d="M15 55 L60 22 L105 55 Z" fill="#FF5E62" stroke="#D32F2F" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M30 32 L60 10 L90 32 Z" fill="#FF5E62" stroke="#D32F2F" strokeWidth="2" strokeLinejoin="round" />
    {/* Clock on the tower */}
    <circle cx="60" cy="24" r="8" fill="white" stroke="#333" strokeWidth="1.5" />
    <line x1="60" y1="24" x2="60" y2="19" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="60" y1="24" x2="65" y2="24" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
    {/* Door */}
    <rect x="50" y="75" width="20" height="25" rx="3" fill="#A0522D" />
    <circle cx="54" cy="87" r="1.5" fill="#FFD700" />
    {/* Windows */}
    <rect x="32" y="65" width="12" height="12" rx="2" fill="#87CEEB" stroke="#4682B4" strokeWidth="1.5" />
    <rect x="76" y="65" width="12" height="12" rx="2" fill="#87CEEB" stroke="#4682B4" strokeWidth="1.5" />
    {/* Flag pole & Flag */}
    <line x1="60" y1="10" x2="60" y2="0" stroke="#8B4513" strokeWidth="2" />
    <path d="M60 0 L76 4 L60 8 Z" fill="#FF0000" />
  </svg>
);

export interface TransparentImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export const TransparentImage: React.FC<TransparentImageProps> = ({ src, className, onError, ...props }) => {
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setProcessedSrc(src);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // 1. Sample border pixels to detect background colors (the fake checkerboard)
        const borderColors: { r: number; g: number; b: number }[] = [];
        const samplePixel = (x: number, y: number) => {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a > 0) {
            // Check if already in borderColors
            const isDuplicate = borderColors.some(
              c => Math.abs(c.r - r) < 10 && Math.abs(c.g - g) < 10 && Math.abs(c.b - b) < 10
            );
            if (!isDuplicate) {
              borderColors.push({ r, g, b });
            }
          }
        };

        // Sample top and bottom rows
        for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 30))) {
          samplePixel(x, 0);
          samplePixel(x, height - 1);
        }
        // Sample left and right columns
        for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 30))) {
          samplePixel(0, y);
          samplePixel(width - 1, y);
        }

        // If no background colors found (e.g. already transparent), skip
        if (borderColors.length === 0) {
          setProcessedSrc(src);
          return;
        }

        // 2. Queue-based Flood Fill starting from all border pixels
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        // Helper to push to queue
        const pushPixel = (x: number, y: number) => {
          const idx = y * width + x;
          if (visited[idx] === 0) {
            visited[idx] = 1;
            queue.push(idx);
          }
        };

        // Initialize queue with all border pixels
        for (let x = 0; x < width; x++) {
          pushPixel(x, 0);
          pushPixel(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          pushPixel(0, y);
          pushPixel(width - 1, y);
        }

        // Color match threshold (tight for digital backgrounds)
        const threshold = 25; 

        let head = 0;
        while (head < queue.length) {
          const idx = queue[head++];
          const x = idx % width;
          const y = Math.floor(idx / width);

          const pixelIdx = idx * 4;
          const r = data[pixelIdx];
          const g = data[pixelIdx + 1];
          const b = data[pixelIdx + 2];
          const a = data[pixelIdx + 3];

          if (a === 0) continue;

          // Check if this pixel color is close to any sampled border colors
          const isBg = borderColors.some(c => {
            const dr = c.r - r;
            const dg = c.g - g;
            const db = c.b - b;
            return Math.sqrt(dr * dr + dg * dg + db * db) < threshold;
          });

          if (isBg) {
            // Make transparent
            data[pixelIdx + 3] = 0;

            // Push 4-neighbors
            if (x > 0) pushPixel(x - 1, y);
            if (x < width - 1) pushPixel(x + 1, y);
            if (y > 0) pushPixel(x, y - 1);
            if (y < height - 1) pushPixel(x, y + 1);
          }
        }

        ctx.putImageData(imageData, 0, 0);
        setProcessedSrc(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Error removing background:', err);
        setProcessedSrc(src);
      }
    };
    img.onerror = (e) => {
      if (onError) {
        // Create a synthetic event
        onError(e as unknown as React.SyntheticEvent<HTMLImageElement, Event>);
      }
    };
  }, [src, onError]);

  return <img src={processedSrc} className={className} onError={onError} {...props} />;
};

const CuteBoy = () => {
  const [imgStage, setImgStage] = useState<number>(0); // 0 = png, 2 = svg fallback

  if (imgStage === 0) {
    return (
      <TransparentImage 
        src={studentBoyPng} 
        alt="Học sinh nam" 
        className="w-28 h-36 sm:w-42 sm:h-54 object-contain select-none pointer-events-none drop-shadow-md"
        onError={() => setImgStage(2)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <svg className="w-28 h-36 sm:w-42 sm:h-54 select-none pointer-events-none drop-shadow-md" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="boyHair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7E543D" />
          <stop offset="50%" stopColor="#5C3B29" />
          <stop offset="100%" stopColor="#41281B" />
        </linearGradient>
        <linearGradient id="boySkin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF4ED" />
          <stop offset="100%" stopColor="#FED8C6" />
        </linearGradient>
        <linearGradient id="boyEye" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4A2F1B" />
          <stop offset="100%" stopColor="#8C5C3A" />
        </linearGradient>
      </defs>

      {/* Backpack on back (blue) */}
      <path d="M32 78 C24 78, 20 90, 20 102 L20 128 C20 134, 26 138, 32 138 Z" fill="#2563EB" />
      <path d="M30 85 C24 85, 23 93, 23 102 L23 124 L29 128 Z" fill="#1D4ED8" />

      {/* Right arm (on our left) holding strap */}
      <path d="M34 94 Q 24 100 28 114 Q 34 118 36 108" fill="url(#boySkin)" />
      {/* Left arm (on our right) waving */}
      <path d="M84 92 Q 102 74 105 58 Q 98 52 86 78 Z" fill="url(#boySkin)" />
      {/* Waving hand fingers */}
      <circle cx="104" cy="55" r="3" fill="#FED8C6" />
      <circle cx="108" cy="58" r="2.2" fill="#FED8C6" />
      <circle cx="105" cy="63" r="2.2" fill="#FED8C6" />
      <circle cx="100" cy="66" r="2.2" fill="#FED8C6" />

      {/* Body (Shirt) */}
      <path d="M36 90 L84 90 L82 130 L38 130 Z" fill="#FFFFFF" />
      <path d="M36 90 L48 90 L44 112 L38 108 Z" fill="#ECEFF1" /> {/* Shadow on shirt */}
      <path d="M84 90 L72 90 L76 112 L82 108 Z" fill="#ECEFF1" />

      {/* Blue tie */}
      <path d="M54 94 L66 94 L68 118 L60 125 L52 118 Z" fill="#2563EB" />
      <path d="M56 94 L64 94 L62 102 L58 102 Z" fill="#1D4ED8" />

      {/* Collar */}
      <path d="M36 90 L46 96 L58 90" stroke="#E2E8F0" strokeWidth="2" fill="#FFFFFF" />
      <path d="M84 90 L74 96 L62 90" stroke="#E2E8F0" strokeWidth="2" fill="#FFFFFF" />

      {/* Backpack straps */}
      <path d="M38 90 C36 102, 38 118, 44 122" stroke="#1D4ED8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M82 90 C84 102, 82 118, 76 122" stroke="#1D4ED8" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Shorts (dark blue) */}
      <path d="M36 130 L84 130 L84 148 L64 148 L64 142 L56 142 L56 148 L36 148 Z" fill="#1E3A8A" />
      {/* Belt */}
      <rect x="36" y="130" width="48" height="4" fill="#1E293B" />
      {/* Belt buckle (gold) */}
      <rect x="55" y="128" width="10" height="8" rx="1.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />

      {/* Legs */}
      <rect x="42" y="148" width="8" height="6" fill="url(#boySkin)" />
      <rect x="70" y="148" width="8" height="6" fill="url(#boySkin)" />

      {/* White socks */}
      <rect x="41" y="152" width="10" height="4" rx="1" fill="#FFFFFF" />
      <rect x="69" y="152" width="10" height="4" rx="1" fill="#FFFFFF" />

      {/* Blue shoes */}
      <path d="M37 160 C37 154, 51 154, 51 160 Z" fill="#2563EB" />
      <rect x="37" y="158" width="14" height="2.5" fill="#FFFFFF" rx="0.5" />
      <path d="M69 160 C69 154, 83 154, 83 160 Z" fill="#2563EB" />
      <rect x="69" y="158" width="14" height="2.5" fill="#FFFFFF" rx="0.5" />

      {/* Head & Ears */}
      <path d="M33 65 C33 54, 38 48, 42 48 L78 48 C82 48, 87 54, 87 65 C87 84, 33 84, 33 65 Z" fill="url(#boySkin)" />
      <circle cx="31" cy="66" r="5" fill="#FED8C6" />
      <circle cx="89" cy="66" r="5" fill="#FED8C6" />

      {/* Glossy eyes */}
      <path d="M41 62 C41 55, 51 55, 51 62 C51 69, 41 69, 41 62 Z" fill="url(#boyEye)" />
      <circle cx="48" cy="59" r="2.2" fill="#FFFFFF" />
      <circle cx="44" cy="64" r="1.2" fill="#FFFFFF" />
      
      <path d="M69 62 C69 55, 79 55, 79 62 C79 69, 69 69, 69 62 Z" fill="url(#boyEye)" />
      <circle cx="76" cy="59" r="2.2" fill="#FFFFFF" />
      <circle cx="72" cy="64" r="1.2" fill="#FFFFFF" />

      {/* Cute mouth with red tongue */}
      <path d="M52 70 Q 60 78 68 70" stroke="#4A281B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M53 71 Q 60 78 67 71 Z" fill="#FF8A8A" />

      {/* Rosy cheeks */}
      <ellipse cx="37" cy="71" rx="5.5" ry="3.5" fill="#FFA3B1" opacity="0.7" />
      <ellipse cx="83" cy="71" rx="5.5" ry="3.5" fill="#FFA3B1" opacity="0.7" />

      {/* Eyebrows */}
      <path d="M40 54 Q 46 51 52 53" stroke="#4A281B" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M68 53 Q 74 51 80 54" stroke="#4A281B" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Hair */}
      <path d="M26 50 C26 30, 42 22, 60 22 C78 22, 94 30, 94 50 C94 56, 92 60, 88 56 C80 44, 76 46, 70 42 C62 42, 58 45, 50 42 C42 42, 40 44, 32 56 C28 60, 26 56, 26 50 Z" fill="url(#boyHair)" />
      {/* Spikes on top */}
      <path d="M52 23 L60 10 L68 23 Z" fill="url(#boyHair)" />
      <path d="M38 27 L44 16 L52 25 Z" fill="url(#boyHair)" />
      <path d="M68 25 L76 16 L82 27 Z" fill="url(#boyHair)" />
    </svg>
  );
};

const CuteGirl = () => {
  const [imgStage, setImgStage] = useState<number>(0); // 0 = png, 2 = svg fallback

  if (imgStage === 0) {
    return (
      <TransparentImage 
        src={studentGirlPng} 
        alt="Học sinh nữ" 
        className="w-28 h-36 sm:w-42 sm:h-54 object-contain select-none pointer-events-none drop-shadow-md"
        onError={() => setImgStage(2)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <svg className="w-28 h-36 sm:w-42 sm:h-54 select-none pointer-events-none drop-shadow-md" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="girlHair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8C5C3A" />
          <stop offset="50%" stopColor="#633F25" />
          <stop offset="100%" stopColor="#4A2D1B" />
        </linearGradient>
        <linearGradient id="girlSkin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF4ED" />
          <stop offset="100%" stopColor="#FED8C6" />
        </linearGradient>
        <linearGradient id="girlEye" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4A2D1B" />
          <stop offset="100%" stopColor="#8C5C3A" />
        </linearGradient>
        <linearGradient id="pinkBackpack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9EB5" />
          <stop offset="100%" stopColor="#FF6B8B" />
        </linearGradient>
      </defs>

      {/* Pink Backpack (behind body) */}
      <path d="M88 78 C96 78, 100 90, 100 102 L100 128 C100 134, 94 138, 88 138 Z" fill="url(#pinkBackpack)" />
      <path d="M90 85 C96 85, 97 93, 97 102 L97 124 L91 128 Z" fill="#F43F5E" />

      {/* Hair Back */}
      <path d="M26 65 C20 80, 20 108, 28 122 L92 122 C100 108, 100 80, 94 65 Z" fill="url(#girlHair)" />

      {/* Left arm (on our right) holding green book */}
      <path d="M86 94 Q 96 100 92 114 Q 86 118 84 108" fill="url(#girlSkin)" />
      
      {/* Green Book */}
      <rect x="76" y="98" width="16" height="22" rx="2" fill="#10B981" stroke="#059669" strokeWidth="1" />
      <rect x="78" y="100" width="12" height="18" fill="#ECFDF5" />
      <line x1="82" y1="104" x2="86" y2="104" stroke="#10B981" strokeWidth="1.5" />
      <line x1="82" y1="108" x2="86" y2="108" stroke="#10B981" strokeWidth="1.5" />

      {/* Right arm (on our left) waving */}
      <path d="M36 92 Q 18 74 15 58 Q 22 52 34 78 Z" fill="url(#girlSkin)" />
      {/* Waving hand fingers */}
      <circle cx="16" cy="55" r="3" fill="#FED8C6" />
      <circle cx="12" cy="58" r="2.2" fill="#FED8C6" />
      <circle cx="15" cy="63" r="2.2" fill="#FED8C6" />
      <circle cx="20" cy="66" r="2.2" fill="#FED8C6" />

      {/* Body (Blouse) */}
      <path d="M36 90 L84 90 L82 130 L38 130 Z" fill="#FFFFFF" />
      <path d="M36 90 L48 90 L44 112 L38 108 Z" fill="#ECEFF1" />
      <path d="M84 90 L72 90 L76 112 L82 108 Z" fill="#ECEFF1" />

      {/* Blue bow tie (girl has ribbon bow) */}
      <path d="M52 97 C46 93, 46 104, 52 100 Z" fill="#2563EB" />
      <path d="M68 97 C74 93, 74 104, 68 100 Z" fill="#2563EB" />
      <circle cx="60" cy="98" r="3" fill="#1D4ED8" />

      {/* Collar */}
      <path d="M36 90 L46 96 L58 90" stroke="#E2E8F0" strokeWidth="2" fill="#FFFFFF" />
      <path d="M84 90 L74 96 L62 90" stroke="#E2E8F0" strokeWidth="2" fill="#FFFFFF" />

      {/* Backpack straps (pink) */}
      <path d="M38 90 C36 102, 38 118, 44 122" stroke="#FF6B8B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M82 90 C84 102, 82 118, 76 122" stroke="#FF6B8B" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Skirt (blue pleated) */}
      <path d="M35 130 L85 130 L88 148 L32 148 Z" fill="#1E3A8A" />
      <line x1="45" y1="130" x2="42" y2="148" stroke="#1D4ED8" strokeWidth="1.5" />
      <line x1="55" y1="130" x2="55" y2="148" stroke="#1D4ED8" strokeWidth="1.5" />
      <line x1="65" y1="130" x2="68" y2="148" stroke="#1D4ED8" strokeWidth="1.5" />
      <line x1="75" y1="130" x2="78" y2="148" stroke="#1D4ED8" strokeWidth="1.5" />

      {/* Legs */}
      <rect x="42" y="148" width="8" height="6" fill="url(#girlSkin)" />
      <rect x="70" y="148" width="8" height="6" fill="url(#girlSkin)" />

      {/* White socks */}
      <rect x="41" y="152" width="10" height="4" rx="1" fill="#FFFFFF" />
      <rect x="69" y="152" width="10" height="4" rx="1" fill="#FFFFFF" />

      {/* Black shoes (Mary Janes) */}
      <path d="M37 160 C37 154, 51 154, 51 160 Z" fill="#1E293B" />
      <rect x="37" y="158" width="14" height="1" fill="#FFFFFF" rx="0.5" />
      <path d="M69 160 C69 154, 83 154, 83 160 Z" fill="#1E293B" />
      <rect x="69" y="158" width="14" height="1" fill="#FFFFFF" rx="0.5" />

      {/* Head & Ears */}
      <path d="M33 65 C33 54, 38 48, 42 48 L78 48 C82 48, 87 54, 87 65 C87 84, 33 84, 33 65 Z" fill="url(#girlSkin)" />
      <circle cx="31" cy="66" r="5" fill="#FED8C6" />
      <circle cx="89" cy="66" r="5" fill="#FED8C6" />

      {/* Glossy eyes */}
      <path d="M41 62 C41 55, 51 55, 51 62 C51 69, 41 69, 41 62 Z" fill="url(#girlEye)" />
      <circle cx="48" cy="59" r="2.2" fill="#FFFFFF" />
      <circle cx="44" cy="64" r="1.2" fill="#FFFFFF" />
      
      <path d="M69 62 C69 55, 79 55, 79 62 C79 69, 69 69, 69 62 Z" fill="url(#girlEye)" />
      <circle cx="76" cy="59" r="2.2" fill="#FFFFFF" />
      <circle cx="72" cy="64" r="1.2" fill="#FFFFFF" />

      {/* Cute mouth with red tongue */}
      <path d="M52 70 Q 60 78 68 70" stroke="#4A2D1B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M53 71 Q 60 78 67 71 Z" fill="#FF8A8A" />

      {/* Rosy cheeks */}
      <ellipse cx="37" cy="71" rx="5.5" ry="3.5" fill="#FFA3B1" opacity="0.7" />
      <ellipse cx="83" cy="71" rx="5.5" ry="3.5" fill="#FFA3B1" opacity="0.7" />

      {/* Eyebrows */}
      <path d="M40 54 Q 46 51 52 53" stroke="#4A2D1B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M68 53 Q 74 51 80 54" stroke="#4A2D1B" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Hair */}
      <path d="M26 50 C26 30, 42 22, 60 22 C78 22, 94 30, 94 50 C94 56, 92 60, 88 56 C80 44, 76 46, 70 42 C62 42, 58 45, 50 42 C42 42, 40 44, 32 56 C28 60, 26 56, 26 50 Z" fill="url(#girlHair)" />
      {/* Bangs */}
      <path d="M32 50 Q 42 42 45 52 Q 52 44 55 52 Q 62 44 65 52 Q 72 42 88 50 C80 44, 75 46, 70 42 C62 42, 58 45, 50 42 C42 42, 38 45, 32 50 Z" fill="#4A2D1B" />

      {/* Pink headband */}
      <path d="M33 51 C37 34, 83 34, 87 51" stroke="#FF6B8B" strokeWidth="3.5" fill="none" />
      {/* Pink bow on headband (right side) */}
      <path d="M83 40 C80 34, 92 32, 89 38 Z" fill="#FF6B8B" />
      <path d="M89 38 C92 44, 80 46, 83 40 Z" fill="#FF6B8B" />
      <circle cx="86" cy="39" r="2.5" fill="#FF3F6B" />
    </svg>
  );
};

const CuteBooks = () => (
  <svg className="w-16 h-16 sm:w-24 sm:h-24 select-none pointer-events-none drop-shadow-sm" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Blue book */}
    <rect x="15" y="60" width="70" height="15" rx="3" fill="#1E52B5" stroke="#123C8A" strokeWidth="1.5" />
    <rect x="15" y="63" width="70" height="2.5" fill="#93C5FD" />
    {/* Orange book */}
    <rect x="20" y="46" width="60" height="15" rx="3" fill="#EA5C2B" stroke="#B83A14" strokeWidth="1.5" />
    <rect x="20" y="49" width="60" height="2.5" fill="#FDBA74" />
    {/* Green book */}
    <rect x="25" y="32" width="50" height="15" rx="3" fill="#48B036" stroke="#2E7E20" strokeWidth="1.5" />
    <rect x="25" y="35" width="50" height="2.5" fill="#A7F3D0" />
    {/* Yellow star on top */}
    <polygon points="50,6 53,14 61,14 55,19 57,27 50,22 43,27 45,19 39,14 47,14" fill="#FFDE4D" stroke="#D97706" strokeWidth="1" />
  </svg>
);

const CuteBackpack = () => (
  <svg className="w-16 h-16 sm:w-24 sm:h-24 select-none pointer-events-none drop-shadow-sm" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Backpack body */}
    <rect x="20" y="25" width="60" height="60" rx="14" fill="#0EA5E9" stroke="#0284C7" strokeWidth="2" />
    {/* Front pocket */}
    <rect x="30" y="55" width="40" height="24" rx="8" fill="#FFDE4D" stroke="#D97706" strokeWidth="1.5" />
    {/* Top handle */}
    <path d="M40 25 Q 50 13 60 25" stroke="#0284C7" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* Side strap decorations */}
    <rect x="13" y="45" width="7" height="18" rx="2" fill="#0284C7" />
    <rect x="80" y="45" width="7" height="18" rx="2" fill="#0284C7" />
    {/* Smiling face on pocket */}
    <circle cx="43" cy="63" r="1.5" fill="#333" />
    <circle cx="57" cy="63" r="1.5" fill="#333" />
    <path d="M 47 68 Q 50 71 53 68" stroke="#333" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

const PencilHolder = () => (
  <svg className="w-9 h-9 select-none pointer-events-none" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Blue pencil */}
    <rect x="13" y="4" width="4" height="12" rx="0.5" fill="#3B82F6" />
    <polygon points="13,4 15,0 17,4" fill="#1D4ED8" />
    {/* Pink pencil */}
    <rect x="21" y="2" width="4" height="14" rx="0.5" fill="#EC4899" />
    <polygon points="21,2 23,-2 25,2" fill="#BE185D" />
    {/* Holder container */}
    <rect x="10" y="14" width="18" height="22" rx="4" fill="#FFDE4D" stroke="#D97706" strokeWidth="1.5" />
    {/* Face on container */}
    <circle cx="15" cy="22" r="1.5" fill="#451A03" />
    <circle cx="23" cy="22" r="1.5" fill="#451A03" />
    <path d="M 17 26 Q 19 28 21 26" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let finalEmail = email.trim();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail.toLowerCase()}@tuanlo.vn`;
    }

    try {
      // Try Firebase Auth first
      await signInWithEmailAndPassword(auth, finalEmail, password);
    } catch (err: any) {
      console.warn('Firebase Auth failed, trying local fallback:', err);
      try {
        // Fallback for operation-not-allowed, user-not-found, or other credentials issues
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', finalEmail));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          const profile = userDoc.data() as UserProfile & { password?: string };
          
          // Check stored password (default is '123456', or 'Sangle87@' for admin)
          const isAdmin = finalEmail === 'ttieudokho12@gmail.com';
          const defaultPassword = isAdmin ? 'Sangle87@' : '123456';
          const storedPassword = profile.password || defaultPassword;
          if (password === storedPassword) {
            // Sign in locally! Save to localStorage
            const localSession = {
              uid: profile.uid,
              email: profile.email,
              displayName: profile.displayName || profile.email.split('@')[0],
              role: profile.role,
              classId: profile.classId,
              grade: profile.grade
            };
            localStorage.setItem('localUserSession', JSON.stringify(localSession));
            
            // Dispatch a custom event to notify App.tsx
            window.dispatchEvent(new CustomEvent('local-login', { detail: localSession }));
            return;
          } else {
            setError('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
          }
        } else {
          // Check hardcoded local admin fallback
          if (finalEmail === 'ttieudokho12@gmail.com' && password === 'Sangle87@') {
            const localSession = {
              uid: 'admin_local',
              email: finalEmail,
              displayName: 'Quản trị viên',
              role: 'admin'
            };
            localStorage.setItem('localUserSession', JSON.stringify(localSession));
            window.dispatchEvent(new CustomEvent('local-login', { detail: localSession }));
            return;
          }
          setError('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        }
      } catch (fallbackErr: any) {
        console.error('Local fallback auth failed:', fallbackErr);
        if (err.code === 'auth/operation-not-allowed') {
          setError('Lỗi hệ thống: Phương thức đăng nhập Email/Password chưa được bật trong Firebase Console.');
        } else {
          setError('Đã có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        const isAdminEmail = currentUser.email === "ttieudokho12@gmail.com";
        const hasAdminRole = userSnap.exists() && (userSnap.data() as UserProfile).role === 'admin';
        
        if (isAdminEmail || hasAdminRole) {
          // Allowed, let App.tsx handle profile and redirection
        } else {
          // Reject and sign out
          await signOut(auth);
          setError('Đăng nhập bằng Google chỉ dành riêng cho tài khoản Quản trị viên (Admin). Các tài khoản khác không được phép đăng nhập bằng Google.');
        }
      }
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Cửa sổ đăng nhập bằng Google đã bị đóng.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Yêu cầu đăng nhập đã bị hủy.');
      } else {
        setError('Đã có lỗi xảy ra khi đăng nhập bằng Google. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#C8E5FF] via-[#E8F4FF] to-[#7ACF22] flex flex-col items-center justify-center px-4 py-16 sm:py-24">
      
      {/* Decorative Sky Objects */}
      <div className="absolute top-6 left-6 z-10">
        <CuteSun />
      </div>

      <div className="absolute top-12 right-12 z-10 hidden sm:block animate-bounce" style={{ animationDuration: '6s' }}>
        <svg className="w-12 h-12 transform rotate-12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5">
          <path d="M22 2L2 10L10 14L19 5L10 14L14 22L22 2Z" fill="#EFF6FF" />
        </svg>
      </div>

      {/* Floating stars and blocks */}
      <div className="absolute top-36 right-24 z-10 hidden md:block transform rotate-12">
        <div className="bg-[#2563EB] text-white font-black text-xs px-3.5 py-2 rounded-lg shadow-md border-2 border-blue-400 tracking-wider">
          ABC
        </div>
      </div>

      <div className="absolute top-44 left-36 z-10 hidden lg:block animate-pulse text-yellow-400 text-3xl">
        ★
      </div>

      {/* School house far left background */}
      <div className="absolute left-6 bottom-32 opacity-30 lg:opacity-100 z-0 select-none pointer-events-none">
        <CuteSchoolBuilding />
      </div>

      {/* Main card wrapper containing characters on sides */}
      <div className="relative w-full max-w-[440px] z-20 mt-10">

        {/* Main Central White Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full bg-[#FFFFFF] px-6 py-8 sm:px-10 sm:py-10 rounded-[32px] shadow-[0_15px_45px_rgba(30,82,181,0.18)] border-4 border-[#E1EAF5] relative overflow-hidden text-center"
        >
          {/* Cute Boy inside card standing on the left of Lightedu */}
          <div className="absolute left-[-24px] sm:left-[-16px] top-[16px] sm:top-[20px] z-10 pointer-events-none transform hover:scale-105 transition-transform duration-300">
            <CuteBoy />
          </div>

          {/* Cute Girl inside card standing on the right of Lightedu */}
          <div className="absolute right-[-24px] sm:right-[-16px] top-[16px] sm:top-[20px] z-10 pointer-events-none transform hover:scale-105 transition-transform duration-300">
            <CuteGirl />
          </div>

          {/* Logo Icon with double-click Google Login helper */}
          <div 
            id="app-logo"
            onDoubleClick={handleGoogleLogin}
            title="Nhấn đúp để đăng nhập Google (Chỉ cho Admin)"
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-[#E1F0FF] to-[#CBE3FF] rounded-[24px] border-2 border-[#A8D1FF] flex items-center justify-center shadow-inner relative group cursor-pointer"
          >
            <svg className="w-14 h-14 sm:w-16 sm:h-16 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Open book */}
              <path d="M20 75 C 35 70, 50 73, 50 78 C 50 73, 65 70, 80 75 L 80 40 C 65 35, 50 38, 50 43 C 50 38, 35 35, 20 40 Z" fill="#FFFFFF" stroke="#1E52B5" strokeWidth="3.5" strokeLinejoin="round" />
              <line x1="50" y1="43" x2="50" y2="78" stroke="#1E52B5" strokeWidth="3.5" />
              {/* Glowing bulb */}
              <circle cx="50" cy="38" r="11" fill="#FFDE4D" stroke="#E29500" strokeWidth="2.5" />
              <rect x="46" y="49" width="8" height="4" rx="1" fill="#94A3B8" stroke="#475569" strokeWidth="1.5" />
              <path d="M48 53 L52 53 L50 56 Z" fill="#475569" />
              {/* Rays of light */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1={50 + 15 * Math.cos(rad)}
                    y1={38 + 15 * Math.sin(rad)}
                    x2={50 + 22 * Math.cos(rad)}
                    y2={38 + 22 * Math.sin(rad)}
                    stroke="#FFB200"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
            <div className="absolute -bottom-1 bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Admin Google
            </div>
          </div>

          {/* Bubbly App Title */}
          <div className="mt-4">
            <h1 className="text-4xl sm:text-[46px] font-black tracking-tight select-none flex items-center justify-center filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.08)] leading-none">
              <span className="text-[#2E81E7] font-sans">L</span>
              <span className="text-[#2E81E7] font-sans relative inline-block">
                ı
                <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 text-yellow-400 text-lg sm:text-xl scale-125 animate-bounce">★</span>
              </span>
              <span className="text-[#2E81E7] font-sans">ght</span>
              <span className="text-[#48B036] font-sans">Edu</span>
            </h1>
          </div>

          {/* Ribbon "Nơi tri thức tỏa sáng" */}
          <div className="relative inline-flex items-center justify-center mt-3 filter drop-shadow-[0_3px_4px_rgba(234,92,132,0.25)] hover:scale-105 transition-transform duration-200 cursor-pointer">
            <svg className="w-64 sm:w-72 h-10" viewBox="0 0 240 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Ribbon Left fold */}
              <path d="M 15 32 L 23 14 L 32 32 L 20 32 Z" fill="#C53F62" />
              <path d="M 15 32 L 27 32 L 23 14 Z" fill="#912641" />
              {/* Ribbon Right fold */}
              <path d="M 225 32 L 217 14 L 208 32 L 220 32 Z" fill="#C53F62" />
              <path d="M 225 32 L 213 32 L 217 14 Z" fill="#912641" />
              {/* Main ribbon body */}
              <path d="M 24 10 L 216 10 C 216 10, 221 21, 216 33 L 24 33 C 19 21, 24 10, 24 10 Z" fill="#EA5C84" stroke="#D0426B" strokeWidth="1.5" />
            </svg>
            <span className="absolute text-white font-bold text-xs sm:text-sm uppercase tracking-wider select-none pointer-events-none">
              Nơi tri thức tỏa sáng
            </span>
          </div>

          {/* Contact Line */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs font-semibold text-stone-700">
            <div className="flex items-center gap-1.5 px-3.5 py-1 bg-[#F1F7FF] rounded-full border border-sky-100 shadow-sm">
              <div className="w-5 h-5 rounded-full bg-[#0084FF] flex items-center justify-center text-[8px] font-black text-white italic tracking-tighter shadow-sm select-none">
                Zalo
              </div>
              <span className="text-[#28A745] font-black tracking-wide">0359888795</span>
            </div>
          </div>

          {/* Tagline Badge */}
          <div className="mt-4 px-4 py-1.5 bg-[#E6F0FA] border border-[#B3D4FC] rounded-full inline-flex items-center gap-1.5 shadow-sm">
            <span className="text-blue-600 text-xs">📖</span>
            <span className="text-[#1E52B5] text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest">
              Hệ thống học tập thông minh
            </span>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            
            {/* Username/Email input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#2E82F6]" />
              </div>
              <input
                id="login-email-input"
                type="text"
                placeholder="Tên đăng nhập hoặc Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-14 py-3.5 bg-white border-2 border-[#E1EAF5] rounded-[20px] shadow-sm outline-none transition-all focus:border-[#2E82F6] focus:ring-4 focus:ring-blue-500/10 text-stone-700 placeholder-stone-400 font-medium text-sm sm:text-base"
                required
              />
              {/* Cute Pencil Holder on the right */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <PencilHolder />
              </div>
            </div>

            {/* Password input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#28C745]" />
              </div>
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-[#E1EAF5] rounded-[20px] shadow-sm outline-none transition-all focus:border-[#2E82F6] focus:ring-4 focus:ring-blue-500/10 text-stone-700 placeholder-stone-400 font-medium text-sm sm:text-base"
                required
              />
              {/* Toggle visibility icon */}
              <button
                type="button"
                id="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 border border-red-100 rounded-2xl"
              >
                <p className="text-red-600 text-[11px] sm:text-xs text-center font-bold leading-tight">{error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#2E82F6] to-[#155DF0] hover:from-[#1E74EB] hover:to-[#0D50DF] active:scale-[0.98] text-white font-bold rounded-full shadow-[0_5px_15px_rgba(21,93,240,0.3)] transition-all flex items-center justify-center gap-2 text-base sm:text-lg border-b-4 border-[#104CC7] cursor-pointer"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#155DF0] shadow-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </div>
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Notice */}
          <div className="mt-6 pt-5 border-t border-dashed border-stone-200 text-center">
            <div className="text-pink-500 text-lg mb-1 animate-pulse">❤️</div>
            <p className="text-[11px] text-stone-500 font-semibold leading-relaxed">
              Vui lòng liên hệ Quản trị viên để nhận tài khoản.<br/>
              Tài khoản bao gồm <span className="text-[#2E81E7] font-bold">Email</span> và <span className="text-[#48B036] font-bold">Mật khẩu</span> mặc định.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Lawn Landscape and Accessories */}
      <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-t from-[#6AB51B] to-[#7ACF22] z-10 border-t-2 border-[#5FA314] flex justify-between items-end px-4 sm:px-12 select-none pointer-events-none">
        {/* Books stack on left lawn */}
        <div className="transform translate-y-1 sm:translate-y-2">
          <CuteBooks />
        </div>
        {/* Backpack & potted plant on right lawn */}
        <div className="flex items-end gap-1.5 sm:gap-3 transform translate-y-1 sm:translate-y-2">
          <CuteBackpack />
          <div className="w-8 h-8 rounded-full bg-amber-800 border-2 border-amber-950 flex items-center justify-center text-sm shadow-sm">
            🪴
          </div>
        </div>
      </div>
    </div>
  );
}
