import React from 'react';

interface VocabularyIllustrationProps {
  word: string;
  className?: string;
}

export const VocabularyIllustration: React.FC<VocabularyIllustrationProps> = ({ word, className = "w-16 h-16" }) => {
  // Extract clean initial letter
  const getInitial = (str: string): string => {
    if (!str) return 'A';
    // Remove content inside brackets if present e.g. "Box (cái hộp)" -> "Box"
    const cleaned = str.replace(/\([^)]*\)/g, '').trim();
    // Match the first word-like character (English or Vietnamese)
    const match = cleaned.match(/[a-zA-ZÀ-ỹ0-9]/);
    if (match) {
      return match[0].toUpperCase();
    }
    return str.trim().charAt(0).toUpperCase() || 'A';
  };

  const initial = getInitial(word);

  // Palette of 8 vibrant, student-friendly gradient color themes
  const colorThemes = [
    { bgStart: '#3b82f6', bgEnd: '#1d4ed8', border: '#1e40af', text: '#ffffff', accent: '#93c5fd', tagBg: '#dbeafe', tagText: '#1e40af' }, // Royal Blue
    { bgStart: '#10b981', bgEnd: '#047857', border: '#065f46', text: '#ffffff', accent: '#6ee7b7', tagBg: '#d1fae5', tagText: '#065f46' }, // Emerald
    { bgStart: '#8b5cf6', bgEnd: '#6d28d9', border: '#5b21b6', text: '#ffffff', accent: '#c4b5fd', tagBg: '#ede9fe', tagText: '#5b21b6' }, // Purple
    { bgStart: '#f97316', bgEnd: '#c2410c', border: '#9a3412', text: '#ffffff', accent: '#fdba74', tagBg: '#ffedd5', tagText: '#9a3412' }, // Orange
    { bgStart: '#ec4899', bgEnd: '#be185d', border: '#9d174d', text: '#ffffff', accent: '#fbcfe8', tagBg: '#fce7f3', tagText: '#9d174d' }, // Pink
    { bgStart: '#06b6d4', bgEnd: '#0e7490', border: '#155e75', text: '#ffffff', accent: '#67e8f9', tagBg: '#cffaff', tagText: '#155e75' }, // Cyan
    { bgStart: '#eab308', bgEnd: '#ca8a04', border: '#854d0e', text: '#ffffff', accent: '#fef08a', tagBg: '#fef9c3', tagText: '#854d0e' }, // Amber Yellow
    { bgStart: '#ef4444', bgEnd: '#b91c1c', border: '#991b1b', text: '#ffffff', accent: '#fca5a5', tagBg: '#fee2e2', tagText: '#991b1b' }, // Crimson
  ];

  // Derive theme index consistently from the initial character code
  const charCode = initial.charCodeAt(0) || 65;
  const theme = colorThemes[charCode % colorThemes.length];

  return (
    <svg viewBox="0 0 120 120" className={`${className} select-none drop-shadow-sm`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`grad-${charCode}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.bgStart} />
          <stop offset="100%" stopColor={theme.bgEnd} />
        </linearGradient>
        <filter id={`shadow-${charCode}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor={theme.border} floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main Outer Squircle / Badge Frame */}
      <rect 
        x="10" 
        y="10" 
        width="100" 
        height="100" 
        rx="28" 
        fill={`url(#grad-${charCode})`} 
        stroke={theme.border} 
        strokeWidth="3" 
        filter={`url(#shadow-${charCode})`}
      />

      {/* Soft Inner Circular Accent Glow */}
      <circle cx="60" cy="60" r="38" fill={theme.accent} opacity="0.2" />
      <circle cx="60" cy="60" r="32" fill="#ffffff" opacity="0.12" />

      {/* Decorative Sparkle Accents */}
      <path d="M24 24 L26 28 L30 29 L26 30 L24 34 L22 30 L18 29 L22 28 Z" fill="#fde047" opacity="0.9" />
      <path d="M96 90 L97 93 L100 94 L97 95 L96 98 L95 95 L92 94 L95 93 Z" fill="#fde047" opacity="0.9" />

      {/* Big Bold Initial Letter */}
      <text
        x="60"
        y="75"
        textAnchor="middle"
        fill={theme.text}
        fontSize="54"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        className="font-black tracking-tight"
        style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.18)' }}
      >
        {initial}
      </text>

      {/* Small Decorative Badge Tag in Top-Right Corner */}
      <rect x="74" y="16" width="28" height="16" rx="6" fill={theme.tagBg} stroke={theme.border} strokeWidth="1.5" />
      <text x="88" y="27.5" textAnchor="middle" fill={theme.tagText} fontSize="9" fontWeight="800" fontFamily="sans-serif">
        ABC
      </text>
    </svg>
  );
};
