import React from 'react';

interface VocabularyIllustrationProps {
  word: string;
  className?: string;
}

export const VocabularyIllustration: React.FC<VocabularyIllustrationProps> = ({ word, className = "w-16 h-16" }) => {
  const normalizedWord = word.trim().toLowerCase();

  // 1. Check mapping/classification
  let category = 'default';

  if (['bike', 'bicycle', 'cycle', 'ride', 'motor', 'scooter'].some(kw => normalizedWord.includes(kw))) {
    category = 'bike';
  } else if (['shop', 'store', 'market', 'supermarket', 'mall', 'grocery', 'cửa hàng', 'sale', 'buy', 'sell'].some(kw => normalizedWord.includes(kw))) {
    category = 'shop';
  } else if (['bag', 'backpack', 'schoolbag', 'pack', 'case', 'purse'].some(kw => normalizedWord.includes(kw))) {
    category = 'bag';
  } else if (['clock', 'time', 'watch', 'hour', 'minute', 'second', 'clockface', 'alarm'].some(kw => normalizedWord.includes(kw))) {
    category = 'clock';
  } else if (['shirt', 'skirt', 'dress', 'clothes', 'coat', 'jacket', 't-shirt', 'wear', 'pant', 'jean', 'hat', 'cap', 'sock'].some(kw => normalizedWord.includes(kw))) {
    category = 'clothes';
  } else if (['fish', 'swim', 'sea', 'ocean', 'water', 'lake', 'river', 'pond', 'boat', 'ship', 'crab', 'octopus', 'shark', 'whale', 'shell'].some(kw => normalizedWord.includes(kw))) {
    category = 'fish';
  } else if (['bird', 'fly', 'wing', 'chicken', 'duck', 'feather', 'nest', 'owl', 'parrot'].some(kw => normalizedWord.includes(kw))) {
    category = 'bird';
  } else if (['computer', 'laptop', 'screen', 'phone', 'tablet', 'keyboard', 'mouse_pad', 'internet', 'tech'].some(kw => normalizedWord.includes(kw))) {
    category = 'computer';
  } else if (['happy', 'smile', 'fun', 'glad', 'joy', 'laugh', 'good', 'great', 'excellent', 'excited', 'wonderful', 'awesome'].some(kw => normalizedWord.includes(kw))) {
    category = 'happy';
  } else if (
    normalizedWord === 'bill' ||
    normalizedWord === 'boy' ||
    normalizedWord === 'he' ||
    normalizedWord === 'him' ||
    normalizedWord === 'man' ||
    normalizedWord === 'brother' ||
    normalizedWord === 'father' ||
    normalizedWord === 'son' ||
    ['peter', 'john', 'tom', 'jack', 'paul', 'david', 'alex', 'sam', 'ben', 'billy', 'bobby', 'mr', 'male', 'uncle'].some(name => normalizedWord.includes(name))
  ) {
    category = 'boy';
  } else if (
    normalizedWord === 'girl' ||
    normalizedWord === 'she' ||
    normalizedWord === 'her' ||
    normalizedWord === 'woman' ||
    normalizedWord === 'sister' ||
    normalizedWord === 'mother' ||
    ['mary', 'jane', 'lisa', 'anna', 'alice', 'lucy', 'kate', 'rose', 'lily', 'amy', 'emily', 'mrs', 'miss', 'female', 'aunt'].some(name => normalizedWord.includes(name))
  ) {
    category = 'girl';
  } else if (['book', 'read', 'library', 'notebook', 'page', 'word', 'study', 'novel', 'paper', 'dictionary', 'document', 'story', 'text', 'workbook', 'magazine'].some(kw => normalizedWord.includes(kw))) {
    category = 'book';
  } else if (['ball', 'toy', 'soccer', 'football', 'play', 'game', 'sport', 'tennis', 'basketball', 'balloon', 'baseball', 'volleyball', 'golf'].some(kw => normalizedWord.includes(kw))) {
    // If it's playground, prioritize playground category
    if (['playground', 'park', 'slide'].some(kw => normalizedWord.includes(kw))) {
      category = 'playground';
    } else {
      category = 'ball';
    }
  } else if (['playground', 'park', 'slide', 'garden', 'yard', 'swing', 'beach', 'grass', 'outdoor', 'sandbox', 'jungle'].some(kw => normalizedWord.includes(kw))) {
    category = 'playground';
  } else if (['apple', 'fruit', 'eat', 'food', 'hungry', 'banana', 'orange', 'grape', 'pear', 'peach', 'sweet', 'candy', 'cake', 'bread', 'mango', 'strawberry', 'cookie', 'biscuit', 'sandwich', 'snack'].some(kw => normalizedWord.includes(kw))) {
    category = 'apple';
  } else if (['cat', 'kitten', 'meow', 'mouse', 'mice', 'pet', 'paw'].some(kw => normalizedWord.includes(kw))) {
    category = 'cat';
  } else if (['dog', 'puppy', 'bark', 'animal', 'vet', 'tail'].some(kw => normalizedWord.includes(kw))) {
    category = 'dog';
  } else if (['pen', 'pencil', 'write', 'draw', 'color', 'sketch', 'paint', 'ruler', 'eraser', 'ink', 'mark', 'marker', 'line'].some(kw => normalizedWord.includes(kw))) {
    category = 'pencil';
  } else if (['school', 'class', 'teacher', 'student', 'learn', 'desk', 'classroom', 'board', 'bell', 'grade', 'math', 'history', 'science', 'english'].some(kw => normalizedWord.includes(kw))) {
    category = 'school';
  } else if (['house', 'home', 'room', 'building', 'wall', 'door', 'window', 'roof', 'kitchen', 'table', 'chair', 'bed', 'family', 'flat', 'apartment', 'cabinet', 'shelf'].some(kw => normalizedWord.includes(kw))) {
    category = 'house';
  } else if (['sun', 'sunny', 'day', 'hot', 'sky', 'morning', 'noon', 'light', 'bright', 'yellow', 'summer'].some(kw => normalizedWord.includes(kw))) {
    category = 'sun';
  } else if (['moon', 'night', 'sleep', 'dark', 'dream', 'blue', 'bed', 'evening'].some(kw => normalizedWord.includes(kw))) {
    category = 'moon';
  } else if (['star', 'shine', 'glow', 'light', 'magic', 'spark', 'gold', 'silver', 'award', 'win', 'first'].some(kw => normalizedWord.includes(kw))) {
    category = 'star';
  } else if (['flower', 'rose', 'plant', 'petal', 'leaf', 'blossom', 'bloom', 'spring', 'smell', 'pink'].some(kw => normalizedWord.includes(kw))) {
    category = 'flower';
  } else if (['tree', 'forest', 'wood', 'nature', 'leaf', 'branch', 'green', 'grass'].some(kw => normalizedWord.includes(kw))) {
    category = 'tree';
  } else if (['car', 'drive', 'road', 'vehicle', 'bus', 'truck', 'wheel', 'fast', 'go', 'travel', 'trip', 'street', 'taxi'].some(kw => normalizedWord.includes(kw))) {
    category = 'car';
  }

  // 2. If still default (no keyword matched), assign a deterministic beautiful cartoon illustration category!
  if (category === 'default') {
    let hash = 0;
    for (let i = 0; i < normalizedWord.length; i++) {
      hash += normalizedWord.charCodeAt(i);
    }
    const fallbacks = [
      'star',
      'book',
      'pencil',
      'sun',
      'apple',
      'flower',
      'ball',
      'tree',
      'school',
      'house',
      'car',
      'cat',
      'dog',
      'playground',
      'bike',
      'shop',
      'bag',
      'clock',
      'clothes',
      'fish',
      'bird',
      'computer',
      'happy'
    ];
    category = fallbacks[hash % fallbacks.length];
  }

  // Render SVG based on category
  switch (category) {
    case 'bike':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background circles/sparkles */}
          <circle cx="95" cy="25" r="3" fill="#34d399" opacity="0.6" />
          <circle cx="20" cy="90" r="4" fill="#34d399" opacity="0.3" />
          
          {/* Wheels */}
          <circle cx="35" cy="75" r="20" stroke="#4b5563" strokeWidth="4" fill="#f3f4f6" />
          <circle cx="35" cy="75" r="16" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="35" cy="75" r="4" fill="#4b5563" />
          
          <circle cx="85" cy="75" r="20" stroke="#4b5563" strokeWidth="4" fill="#f3f4f6" />
          <circle cx="85" cy="75" r="16" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="85" cy="75" r="4" fill="#4b5563" />

          {/* Bike Frame */}
          <path d="M35 75 L55 45 L80 45 L85 75" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M35 75 L62 75 L55 45" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M62 75 L80 45" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Seat */}
          <path d="M50 40 H60" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
          <path d="M46 37 H64" stroke="#4b5563" strokeWidth="4" strokeLinecap="round" />

          {/* Handlebar */}
          <path d="M80 45 L76 25 L68 25" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M66 25 H72" stroke="#4b5563" strokeWidth="4" strokeLinecap="round" />

          {/* Brown Basket */}
          <rect x="80" y="24" width="16" height="14" rx="2" fill="#d97706" />
          <path d="M80 29 H96 M80 34 H96 M84 24 V38 M88 24 V38 M92 24 V38" stroke="#b45309" strokeWidth="1" />
        </svg>
      );

    case 'boy':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Hair back */}
          <circle cx="60" cy="58" r="32" fill="#78350f" />
          
          {/* Face */}
          <circle cx="60" cy="62" r="26" fill="#fbcfe8" /> {/* base skin color tone */}
          <circle cx="60" cy="62" r="26" fill="#ffedd5" /> {/* warm peach skin */}

          {/* Hair front/bangs */}
          <path d="M34 52 C34 40, 42 30, 60 30 C78 30, 86 40, 86 52 C82 48, 76 46, 72 50 C68 54, 64 48, 60 48 C56 48, 52 54, 48 50 C44 46, 38 48, 34 52 Z" fill="#78350f" />
          
          {/* Cheeks */}
          <circle cx="43" cy="72" r="5" fill="#fca5a5" opacity="0.6" />
          <circle cx="77" cy="72" r="5" fill="#fca5a5" opacity="0.6" />

          {/* Eyes */}
          <circle cx="48" cy="63" r="3.5" fill="#1f2937" />
          <circle cx="47" cy="62" r="1" fill="#ffffff" />
          <circle cx="72" cy="63" r="3.5" fill="#1f2937" />
          <circle cx="71" cy="62" r="1" fill="#ffffff" />

          {/* Smile */}
          <path d="M53 74 Q60 81 67 74" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" />
          
          {/* Little Ears */}
          <circle cx="32" cy="64" r="6" fill="#ffedd5" />
          <circle cx="88" cy="64" r="6" fill="#ffedd5" />

          {/* Blue Shirt collar */}
          <path d="M48 87 L60 100 L72 87 Z" fill="#3b82f6" />
          <path d="M60 100 L60 88" stroke="#1d4ed8" strokeWidth="2" />
        </svg>
      );

    case 'girl':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Hair back */}
          <circle cx="60" cy="58" r="34" fill="#92400e" />
          <rect x="26" y="58" width="68" height="32" rx="10" fill="#92400e" />
          
          {/* Face */}
          <circle cx="60" cy="62" r="26" fill="#ffedd5" />

          {/* Hair bangs */}
          <path d="M34 52 C38 42, 50 32, 60 32 C70 32, 82 42, 86 52 C80 48, 74 48, 70 52 C64 56, 60 50, 56 50 C50 50, 46 56, 40 52 C38 50, 36 50, 34 52 Z" fill="#92400e" />
          
          {/* Flower Hairpin */}
          <circle cx="80" cy="42" r="5" fill="#ec4899" />
          <circle cx="76" cy="38" r="4" fill="#f472b6" />
          <circle cx="84" cy="38" r="4" fill="#f472b6" />
          <circle cx="76" cy="46" r="4" fill="#f472b6" />
          <circle cx="84" cy="46" r="4" fill="#f472b6" />
          <circle cx="80" cy="42" r="2" fill="#fef08a" />

          {/* Cheeks */}
          <circle cx="43" cy="72" r="5" fill="#fca5a5" opacity="0.6" />
          <circle cx="77" cy="72" r="5" fill="#fca5a5" opacity="0.6" />

          {/* Eyes */}
          <circle cx="48" cy="63" r="3.5" fill="#1f2937" />
          <circle cx="47" cy="62" r="1" fill="#ffffff" />
          <circle cx="72" cy="63" r="3.5" fill="#1f2937" />
          <circle cx="71" cy="62" r="1" fill="#ffffff" />

          {/* Smile */}
          <path d="M53 74 Q60 81 67 74" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" />
          
          {/* Little Ears */}
          <circle cx="32" cy="64" r="5" fill="#ffedd5" />
          <circle cx="88" cy="64" r="5" fill="#ffedd5" />

          {/* Pink Shirt collar */}
          <path d="M48 87 L60 100 L72 87 Z" fill="#ec4899" />
        </svg>
      );

    case 'book':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer cover glow shadow */}
          <path d="M15 84 L55 94 C55 94, 58 74, 58 34 L18 24 Z" fill="#bfdbfe" opacity="0.5" />

          {/* Book Covers (Back & spine) */}
          <path d="M15 88 L58 98 L101 88 V28 L58 38 L15 28 Z" fill="#1d4ed8" />
          <path d="M18 90 L58 100 L98 90 V30 L58 40 L18 30 Z" fill="#3b82f6" />

          {/* Book Pages */}
          <path d="M22 84 L58 92 L94 84 V26 L58 34 L22 26 Z" fill="#e5e7eb" />
          <path d="M24 82 L58 90 L92 82 V24 L58 32 L24 24 Z" fill="#ffffff" />

          {/* Page Lines (Left Page) */}
          <path d="M30 35 H50 M30 45 H50 M30 55 H50 M30 65 H50 M30 75 H50" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Page Lines (Right Page) */}
          <path d="M66 35 H86 M66 45 H86 M66 55 H86 M66 65 H86 M66 75 H86" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />

          {/* Red Ribbon Bookmark */}
          <path d="M58 32 V85 L64 92 L70 85 V32" fill="#ef4444" />
        </svg>
      );

    case 'ball':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="ball-clip">
              <circle cx="60" cy="60" r="42" />
            </clipPath>
          </defs>
          
          {/* Base shadow */}
          <ellipse cx="60" cy="102" rx="30" ry="6" fill="#e2e8f0" />
          
          {/* Ball Circle outline and clips */}
          <circle cx="60" cy="60" r="42" fill="#ffffff" stroke="#1e293b" strokeWidth="4" />
          
          <g clipPath="url(#ball-clip)">
            {/* Top middle circle */}
            <circle cx="60" cy="30" r="8" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />

            {/* Panel 1: Red */}
            <path d="M60 38 C50 50, 40 70, 42 102 C30 90, 20 75, 18 60 C24 45, 40 34, 60 38 Z" fill="#ef4444" stroke="#1e293b" strokeWidth="3" />
            
            {/* Panel 2: Yellow */}
            <path d="M60 38 C70 50, 80 70, 78 102 C90 90, 100 75, 102 60 C96 45, 80 34, 60 38 Z" fill="#fbbf24" stroke="#1e293b" strokeWidth="3" />
            
            {/* Panel 3: Blue */}
            <path d="M60 38 C56 55, 60 75, 60 102 C60 102, 60 102, 60 102 C48 95, 43 98, 42 102 C40 70, 50 50, 60 38 Z" fill="#3b82f6" stroke="#1e293b" strokeWidth="3" />
            <path d="M60 38 C64 55, 60 75, 60 102 C72 95, 77 98, 78 102 C80 70, 70 50, 60 38 Z" fill="#3b82f6" stroke="#1e293b" strokeWidth="3" />
            
            {/* Top white cap */}
            <circle cx="60" cy="30" r="8" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
          </g>
        </svg>
      );

    case 'playground':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground/Grass */}
          <path d="M15 95 C40 92, 80 98, 105 95 L105 105 L15 105 Z" fill="#10b981" />
          <ellipse cx="60" cy="98" rx="42" ry="6" fill="#f59e0b" opacity="0.8" /> {/* Sand box area */}

          {/* Playground Pillars */}
          <rect x="35" y="45" width="4" height="50" rx="1" fill="#9ca3af" />
          <rect x="58" y="45" width="4" height="50" rx="1" fill="#9ca3af" />
          <rect x="78" y="55" width="4" height="40" rx="1" fill="#9ca3af" />

          {/* Roof (House structure) */}
          <polygon points="30,45 48,25 66,45" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" strokeLinejoin="round" />
          <rect x="33" y="43" width="31" height="4" fill="#fbbf24" />

          {/* Platform */}
          <rect x="35" y="65" width="27" height="6" rx="1" fill="#f59e0b" />

          {/* Blue Slide */}
          <path d="M56 65 C64 65, 70 78, 85 95 H96 C84 80, 74 71, 62 65 Z" fill="#3b82f6" />
          <path d="M56 62 C64 62, 70 75, 85 92 H89 C78 77, 72 68, 62 62 Z" fill="#1d4ed8" />

          {/* Little Ladder */}
          <line x1="37" y1="70" x2="37" y2="92" stroke="#4b5563" strokeWidth="2" />
          <line x1="37" y1="75" x2="33" y2="75" stroke="#4b5563" strokeWidth="2" />
          <line x1="37" y1="81" x2="33" y2="81" stroke="#4b5563" strokeWidth="2" />
          <line x1="37" y1="87" x2="33" y2="87" stroke="#4b5563" strokeWidth="2" />
        </svg>
      );

    case 'apple':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="60" cy="100" rx="25" ry="5" fill="#e2e8f0" />
          
          {/* Apple Body */}
          <path d="M60 42 C45 32, 22 45, 25 70 C28 92, 50 100, 60 96 C70 100, 92 92, 95 70 C98 45, 75 32, 60 42 Z" fill="#ef4444" />
          <path d="M60 45 C48 37, 28 48, 30 70 C32 88, 52 94, 60 91 C68 94, 88 88, 90 70 C92 48, 72 37, 60 45 Z" fill="#dc2626" />
          
          {/* Shiny Highlight */}
          <ellipse cx="42" cy="56" rx="5" ry="10" transform="rotate(-30 42 56)" fill="#ffffff" opacity="0.4" />
          
          {/* Stem */}
          <path d="M60 44 C58 36, 62 25, 68 20" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" />
          
          {/* Leaf */}
          <path d="M65 26 C75 24, 85 30, 85 30 C85 30, 78 38, 68 36 C64 35, 64 27, 65 26 Z" fill="#10b981" />
          <path d="M65 26 C72 28, 78 33, 85 30" stroke="#047857" strokeWidth="1" />
        </svg>
      );

    case 'cat':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ears */}
          <polygon points="30,55 22,25 48,42" fill="#f97316" stroke="#c2410c" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="32,51 26,29 45,41" fill="#fecdd3" />
          
          <polygon points="90,55 98,25 72,42" fill="#f97316" stroke="#c2410c" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="88,51 94,29 75,41" fill="#fecdd3" />

          {/* Face */}
          <circle cx="60" cy="65" r="32" fill="#f97316" stroke="#c2410c" strokeWidth="3" />
          <path d="M34 72 C34 90, 45 95, 60 95 C75 95, 86 90, 86 72 C86 65, 34 65, 34 72 Z" fill="#ffedd5" />

          {/* Eyes */}
          <circle cx="48" cy="60" r="4" fill="#1f2937" />
          <circle cx="47" cy="59" r="1.5" fill="#ffffff" />
          <circle cx="72" cy="60" r="4" fill="#1f2937" />
          <circle cx="71" cy="59" r="1.5" fill="#ffffff" />

          {/* Nose & Mouth */}
          <polygon points="57,69 63,69 60,72" fill="#f43f5e" />
          <path d="M60 72 Q56 76 52 74 M60 72 Q64 76 68 74" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" />

          {/* Whiskers */}
          <line x1="24" y1="66" x2="10" y2="64" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <line x1="24" y1="72" x2="8" y2="72" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <line x1="24" y1="78" x2="10" y2="80" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />

          <line x1="96" y1="66" x2="110" y2="64" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <line x1="96" y1="72" x2="112" y2="72" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <line x1="96" y1="78" x2="110" y2="80" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />

          {/* Blush */}
          <circle cx="38" cy="68" r="3" fill="#f43f5e" opacity="0.4" />
          <circle cx="82" cy="68" r="3" fill="#f43f5e" opacity="0.4" />
        </svg>
      );

    case 'dog':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Floppy Ears */}
          <path d="M25 45 C15 45, 12 75, 20 85 C24 75, 28 60, 28 45 Z" fill="#78350f" stroke="#451a03" strokeWidth="2" />
          <path d="M95 45 C105 45, 108 75, 100 85 C96 75, 92 60, 92 45 Z" fill="#78350f" stroke="#451a03" strokeWidth="2" />

          {/* Face */}
          <circle cx="60" cy="65" r="32" fill="#d97706" stroke="#451a03" strokeWidth="3" />
          <path d="M42 74 C42 88, 48 95, 60 95 C72 95, 78 88, 78 74 C78 68, 42 68, 42 74 Z" fill="#fef3c7" />

          {/* Eye patches */}
          <circle cx="48" cy="58" r="8" fill="#78350f" opacity="0.2" />

          {/* Eyes */}
          <circle cx="48" cy="58" r="4" fill="#1f2937" />
          <circle cx="47" cy="57" r="1.5" fill="#ffffff" />
          <circle cx="72" cy="58" r="4" fill="#1f2937" />
          <circle cx="71" cy="57" r="1.5" fill="#ffffff" />

          {/* Nose */}
          <ellipse cx="60" cy="70" rx="4.5" ry="3" fill="#1f2937" />

          {/* Tongue peeking out */}
          <path d="M57 76 C57 76, 57 88, 60 88 C63 88, 63 76, 63 76 Z" fill="#f43f5e" stroke="#be123c" strokeWidth="1.5" />

          {/* Mouth line */}
          <path d="M60 72 V76" stroke="#451a03" strokeWidth="2" />
        </svg>
      );

    case 'pencil':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Rotated Cute Pencil */}
          <g transform="rotate(-45 60 60)">
            {/* Eraser */}
            <rect x="42" y="20" width="36" height="15" rx="3" fill="#fb7185" />
            
            {/* Metal Band */}
            <rect x="42" y="32" width="36" height="8" fill="#9ca3af" />
            <line x1="42" y1="36" x2="78" y2="36" stroke="#4b5563" strokeWidth="1.5" />

            {/* Pencil Body */}
            <rect x="42" y="40" width="36" height="45" fill="#facc15" />
            <rect x="42" y="40" width="12" height="45" fill="#eab308" /> {/* Side shadow */}
            <rect x="66" y="40" width="12" height="45" fill="#fef08a" opacity="0.5" /> {/* Highlight */}

            {/* Wooden Tip */}
            <polygon points="42,85 78,85 60,105" fill="#fed7aa" />
            
            {/* Lead tip */}
            <polygon points="54,98 66,98 60,105" fill="#374151" />
          </g>
        </svg>
      );

    case 'school':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* School house */}
          <rect x="25" y="55" width="70" height="45" rx="4" fill="#fca5a5" stroke="#b91c1c" strokeWidth="2" />
          
          {/* Roof */}
          <polygon points="18,55 60,25 102,55" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" strokeLinejoin="round" />
          
          {/* Entrance door */}
          <rect x="48" y="72" width="24" height="28" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="2" />
          <circle cx="54" cy="86" r="2" fill="#fef08a" />

          {/* Windows */}
          <rect x="34" y="65" width="10" height="12" rx="1" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="39" y1="65" x2="39" y2="77" stroke="#1d4ed8" strokeWidth="1" />
          <line x1="34" y1="71" x2="44" y2="71" stroke="#1d4ed8" strokeWidth="1" />

          <rect x="76" y="65" width="10" height="12" rx="1" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="81" y1="65" x2="81" y2="77" stroke="#1d4ed8" strokeWidth="1" />
          <line x1="76" y1="71" x2="86" y2="71" stroke="#1d4ed8" strokeWidth="1" />

          {/* Clock on roof */}
          <circle cx="60" cy="46" r="8" fill="#ffffff" stroke="#b91c1c" strokeWidth="2" />
          <line x1="60" y1="46" x2="60" y2="41" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="60" y1="46" x2="64" y2="46" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />

          {/* Little flag */}
          <line x1="60" y1="25" x2="60" y2="12" stroke="#b91c1c" strokeWidth="2" />
          <polygon points="60,12 74,16 60,20" fill="#ef4444" />
        </svg>
      );

    case 'house':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground shadow */}
          <ellipse cx="60" cy="100" rx="35" ry="5" fill="#e2e8f0" />

          {/* House body */}
          <rect x="30" y="55" width="60" height="42" rx="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
          
          {/* Roof */}
          <polygon points="22,55 60,22 98,55" fill="#f97316" stroke="#ea580c" strokeWidth="2" strokeLinejoin="round" />
          
          {/* Chimney */}
          <rect x="76" y="28" width="10" height="15" fill="#9a3412" />
          <ellipse cx="81" cy="28" rx="5" ry="1.5" fill="#7c2d12" />

          {/* Door */}
          <rect x="48" y="70" width="24" height="27" rx="1" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
          <circle cx="54" cy="84" r="1.5" fill="#fef08a" />

          {/* Circular Window */}
          <circle cx="60" cy="42" r="6" fill="#bfdbfe" stroke="#ea580c" strokeWidth="1.5" />
          <line x1="60" y1="36" x2="60" y2="48" stroke="#1d4ed8" strokeWidth="1" />
          <line x1="54" y1="42" x2="66" y2="42" stroke="#1d4ed8" strokeWidth="1" />
        </svg>
      );

    case 'sun':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Sun body */}
          <circle cx="60" cy="60" r="28" fill="#fbbf24" stroke="#d97706" strokeWidth="2.5" />
          <circle cx="60" cy="60" r="24" fill="#f59e0b" />

          {/* Smiley face */}
          <circle cx="51" cy="55" r="2.5" fill="#451a03" />
          <circle cx="69" cy="55" r="2.5" fill="#451a03" />
          <path d="M53 66 Q60 72 67 66" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="45" cy="62" r="2.5" fill="#fca5a5" opacity="0.6" />
          <circle cx="75" cy="62" r="2.5" fill="#fca5a5" opacity="0.6" />

          {/* Rays */}
          <g stroke="#d97706" strokeWidth="3.5" strokeLinecap="round">
            <line x1="60" y1="20" x2="60" y2="10" />
            <line x1="60" y1="100" x2="60" y2="110" />
            <line x1="20" y1="60" x2="10" y2="60" />
            <line x1="100" y1="60" x2="110" y2="60" />
            
            <line x1="32" y1="32" x2="24" y2="24" />
            <line x1="88" y1="88" x2="96" y2="96" />
            <line x1="32" y1="88" x2="24" y2="96" />
            <line x1="88" y1="32" x2="96" y2="24" />
          </g>
        </svg>
      );

    case 'moon':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Crescent Moon */}
          <path d="M40 30 C40 30, 80 40, 80 80 C80 110, 40 115, 30 110 C60 100, 70 70, 50 45 C45 40, 41 35, 40 30 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="2.5" />
          
          {/* Sleepy eye */}
          <path d="M58 64 Q62 68 66 64" stroke="#854d0e" strokeWidth="2" fill="none" strokeLinecap="round" />
          <line x1="57" y1="62" x2="55" y2="60" stroke="#854d0e" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="67" y1="62" x2="69" y2="60" stroke="#854d0e" strokeWidth="1.5" strokeLinecap="round" />

          {/* Little Star sparkles */}
          <path d="M88 35 L90 41 L96 43 L90 45 L88 51 L86 45 L80 43 L86 41 Z" fill="#fef08a" />
          <path d="M25 65 L26 69 L30 70 L26 71 L25 75 L24 71 L20 70 L24 69 Z" fill="#fef08a" />
        </svg>
      );

    case 'star':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Glowing background circle */}
          <circle cx="60" cy="60" r="42" fill="#fef08a" opacity="0.3" className="animate-pulse" />
          
          {/* 5-pointed Star */}
          <polygon points="60,15 73,43 103,47 81,68 86,98 60,83 34,98 39,68 17,47 47,43" fill="#facc15" stroke="#ca8a04" strokeWidth="2.5" strokeLinejoin="round" />
          
          {/* Smile and Eyes */}
          <circle cx="49" cy="56" r="3" fill="#854d0e" />
          <circle cx="71" cy="56" r="3" fill="#854d0e" />
          <path d="M53 66 Q60 72 67 66" stroke="#854d0e" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="43" cy="63" r="2.5" fill="#fca5a5" opacity="0.8" />
          <circle cx="77" cy="63" r="2.5" fill="#fca5a5" opacity="0.8" />
        </svg>
      );

    case 'flower':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Stem & Leaves */}
          <path d="M60 60 V105" stroke="#10b981" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M60 85 C42 85, 38 72, 38 72 C38 72, 48 72, 60 82" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
          <path d="M60 90 C78 90, 82 77, 82 77 C82 77, 72 77, 60 87" fill="#10b981" stroke="#047857" strokeWidth="1.5" />

          {/* Petals */}
          <circle cx="60" cy="38" r="14" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          <circle cx="60" cy="74" r="14" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          <circle cx="42" cy="56" r="14" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          <circle cx="78" cy="56" r="14" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          
          <circle cx="48" cy="44" r="14" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          <circle cx="72" cy="68" r="14" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          <circle cx="48" cy="68" r="14" fill="#f472b6" stroke="#db2777" strokeWidth="2" />
          <circle cx="72" cy="44" r="14" fill="#f472b6" stroke="#db2777" strokeWidth="2" />

          {/* Center core */}
          <circle cx="60" cy="56" r="14" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
          
          {/* Smiley in center core */}
          <circle cx="54" cy="52" r="1.5" fill="#854d0e" />
          <circle cx="66" cy="52" r="1.5" fill="#854d0e" />
          <path d="M56 59 Q60 63 64 59" stroke="#854d0e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'tree':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Trunk */}
          <rect x="54" y="60" width="12" height="42" rx="2" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />
          <path d="M54 90 C45 92, 40 98, 40 98 L80 98 C80 98, 75 92, 66 90" fill="#78350f" />

          {/* Foliage (Fluffy Green cartoon layers) */}
          <circle cx="60" cy="42" r="26" fill="#10b981" stroke="#047857" strokeWidth="2" />
          <circle cx="42" cy="52" r="20" fill="#10b981" stroke="#047857" strokeWidth="2" />
          <circle cx="78" cy="52" r="20" fill="#10b981" stroke="#047857" strokeWidth="2" />
          <circle cx="60" cy="58" r="22" fill="#059669" /> {/* Inner shading */}
          <circle cx="60" cy="42" r="20" fill="#34d399" opacity="0.3" /> {/* Highlight */}

          {/* Cute apples in tree */}
          <circle cx="46" cy="45" r="4" fill="#ef4444" />
          <circle cx="74" cy="48" r="4" fill="#ef4444" />
          <circle cx="60" cy="34" r="4" fill="#ef4444" />
        </svg>
      );

    case 'car':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="60" cy="94" rx="42" ry="6" fill="#e2e8f0" />

          {/* Car body */}
          <path d="M15 80 L20 62 C22 55, 32 42, 48 42 H76 C86 42, 94 50, 96 62 L102 72 C106 75, 106 82, 100 82 H18 C14 82, 12 80, 15 80 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="2" strokeLinejoin="round" />
          <rect x="22" y="72" width="76" height="10" rx="2" fill="#dc2626" />

          {/* Windows */}
          <path d="M48 48 H62 V64 H34 C38 54, 42 48, 48 48 Z" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5" />
          <path d="M66 48 H76 C82 48, 86 54, 88 64 H66 V48 Z" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5" />

          {/* Wheels */}
          <circle cx="36" cy="84" r="14" fill="#374151" stroke="#111827" strokeWidth="2.5" />
          <circle cx="36" cy="84" r="5" fill="#ffffff" />
          
          <circle cx="80" cy="84" r="14" fill="#374151" stroke="#111827" strokeWidth="2.5" />
          <circle cx="80" cy="84" r="5" fill="#ffffff" />

          {/* Headlights */}
          <circle cx="100" cy="74" r="4" fill="#fef08a" />
          <path d="M102 74 L112 70 L112 78 Z" fill="#fef08a" opacity="0.6" />
        </svg>
      );

    case 'shop':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="60" cy="100" rx="42" ry="6" fill="#e2e8f0" />
          
          {/* Shop Wall / Structure */}
          <rect x="25" y="45" width="70" height="50" rx="8" fill="#fffbeb" stroke="#b45309" strokeWidth="3" />
          
          {/* Window */}
          <rect x="34" y="62" width="22" height="22" rx="4" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
          {/* Window Pane Lines */}
          <line x1="45" y1="62" x2="45" y2="84" stroke="#0284c7" strokeWidth="1.5" />
          <line x1="34" y1="73" x2="56" y2="73" stroke="#0284c7" strokeWidth="1.5" />
          
          {/* Door */}
          <rect x="66" y="58" width="20" height="37" rx="3" fill="#ea580c" stroke="#9a3412" strokeWidth="2.5" />
          {/* Doorknob */}
          <circle cx="71" cy="76" r="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
          
          {/* Awning (Mái hiên di động) - Red & White stripes */}
          <path d="M20 42 C20 42, 22 32, 30 32 H90 C98 32, 100 42, 100 42 V48 H20 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
          
          {/* Red stripes */}
          <path d="M20 42 C20 42, 22 32, 30 32 H40 L35 48 H20 Z" fill="#ef4444" />
          <path d="M50 32 H62 L60 48 H48 Z" fill="#ef4444" />
          <path d="M72 32 H84 L85 48 H72 Z" fill="#ef4444" />
          <path d="M92 32 C95 32, 98 38, 100 42 H100 V48 H95 L92 32 Z" fill="#ef4444" />
          
          {/* Scallops/waves at bottom of awning */}
          <path d="M20 48 Q25 54 30 48 Q35 54 40 48 Q45 54 50 48 Q55 54 60 48 Q65 54 70 48 Q75 54 80 48 Q85 54 90 48 Q95 54 100 48" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
          
          {/* Cute Signboard above */}
          <rect x="42" y="16" width="36" height="14" rx="3" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
          <text x="60" y="26" textAnchor="middle" fill="#854d0e" fontSize="9" fontWeight="900" fontFamily="sans-serif">SHOP</text>
          {/* Signboard legs */}
          <line x1="50" y1="30" x2="50" y2="16" stroke="#ca8a04" strokeWidth="2" />
          <line x1="70" y1="30" x2="70" y2="16" stroke="#ca8a04" strokeWidth="2" />
          
          {/* Sparkles */}
          <path d="M12 25 L14 29 L18 30 L14 31 L12 35 L10 31 L6 30 L10 29 Z" fill="#fde047" />
          <path d="M106 60 L107 63 L110 64 L107 65 L106 68 L105 65 L102 64 L105 63 Z" fill="#fde047" />
        </svg>
      );

    case 'bag':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="60" cy="98" rx="36" ry="5" fill="#e2e8f0" />
          
          {/* Handle loop */}
          <path d="M46 36 C46 22, 74 22, 74 36" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
          
          {/* Main body of backpack */}
          <rect x="28" y="36" width="64" height="58" rx="16" fill="#10b981" stroke="#047857" strokeWidth="3" />
          
          {/* Front pocket */}
          <rect x="38" y="58" width="44" height="30" rx="8" fill="#34d399" stroke="#047857" strokeWidth="2.5" />
          
          {/* Cute cartoon keychains / stars */}
          <circle cx="82" cy="50" r="5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
          <line x1="82" y1="42" x2="82" y2="45" stroke="#047857" strokeWidth="1.5" />
          
          {/* Zipper lines */}
          <path d="M38 64 H82" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
          <rect x="56" y="62" width="8" height="4" rx="1" fill="#facc15" />
          
          {/* Straps showing on sides */}
          <path d="M28 48 C20 48, 20 74, 28 80" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
          <path d="M92 48 C100 48, 100 74, 92 80" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
          
          {/* Eyes on the backpack to make it super cute */}
          <circle cx="50" cy="48" r="2.5" fill="#1f2937" />
          <circle cx="70" cy="48" r="2.5" fill="#1f2937" />
          <path d="M57 52 Q60 54 63 52" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'clock':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Alarm Bells */}
          <circle cx="34" cy="30" r="14" fill="#ef4444" stroke="#991b1b" strokeWidth="3" />
          <circle cx="34" cy="30" r="8" fill="#ffffff" opacity="0.3" />
          <path d="M26 40 L38 30" stroke="#991b1b" strokeWidth="4" strokeLinecap="round" />

          <circle cx="86" cy="30" r="14" fill="#ef4444" stroke="#991b1b" strokeWidth="3" />
          <circle cx="86" cy="30" r="8" fill="#ffffff" opacity="0.3" />
          <path d="M94 40 L82 30" stroke="#991b1b" strokeWidth="4" strokeLinecap="round" />

          {/* Clapper */}
          <rect x="54" y="20" width="12" height="6" rx="2" fill="#4b5563" />
          
          {/* Clock Feet */}
          <rect x="36" y="92" width="10" height="16" rx="4" fill="#374151" transform="rotate(15 36 92)" />
          <rect x="74" y="92" width="10" height="16" rx="4" fill="#374151" transform="rotate(-15 74 92)" />

          {/* Main clock circle */}
          <circle cx="60" cy="65" r="36" fill="#f3f4f6" stroke="#4b5563" strokeWidth="4" />
          <circle cx="60" cy="65" r="30" fill="#ffffff" />
          
          {/* Clock Face Eyes and Smile */}
          <circle cx="48" cy="58" r="3" fill="#1f2937" />
          <circle cx="72" cy="58" r="3" fill="#1f2937" />
          <path d="M54 74 Q60 80 66 74" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />

          {/* Clock Hands */}
          <circle cx="60" cy="65" r="3" fill="#111827" />
          <line x1="60" y1="65" x2="60" y2="48" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
          <line x1="60" y1="65" x2="74" y2="65" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'clothes':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Hanger */}
          <path d="M60 22 C60 14, 68 14, 68 22 C68 26, 60 28, 60 32" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M38 38 L60 32 L82 38" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round" />

          {/* Shirt */}
          <path d="M40 38 H80 L96 52 L84 60 L80 56 V96 H40 V56 L36 60 L24 52 Z" fill="#38bdf8" stroke="#0369a1" strokeWidth="3" strokeLinejoin="round" />
          
          {/* Shirt Stripes / Design */}
          <rect x="48" y="48" width="24" height="38" rx="3" fill="#bae6fd" />
          <line x1="40" y1="68" x2="80" y2="68" stroke="#0284c7" strokeWidth="2" />
          <line x1="40" y1="80" x2="80" y2="80" stroke="#0284c7" strokeWidth="2" />
          
          {/* Collar */}
          <path d="M50 38 L60 48 L70 38" fill="#ffffff" stroke="#0369a1" strokeWidth="2" />
          
          {/* Cute pocket */}
          <rect x="64" y="54" width="10" height="12" rx="1" fill="#ec4899" />
        </svg>
      );

    case 'fish':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Water Bubbles */}
          <circle cx="24" cy="28" r="3" fill="#38bdf8" opacity="0.6" />
          <circle cx="34" cy="20" r="5" fill="#38bdf8" opacity="0.4" />
          <circle cx="42" cy="14" r="2.5" fill="#38bdf8" opacity="0.5" />

          {/* Tail Fin */}
          <path d="M85 60 L104 42 V78 Z" fill="#f97316" stroke="#c2410c" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M92 50 V70" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M92 50 V70" stroke="#c2410c" strokeWidth="1" strokeLinecap="round" />

          {/* Pelvic / dorsal fins */}
          <path d="M60 40 C65 24, 76 28, 76 28 Z" fill="#f97316" stroke="#c2410c" strokeWidth="2" />
          <path d="M56 78 C60 90, 70 86, 70 86 Z" fill="#f97316" stroke="#c2410c" strokeWidth="2" />

          {/* Fish body */}
          <ellipse cx="54" cy="60" rx="32" ry="22" fill="#f97316" stroke="#c2410c" strokeWidth="3" />

          {/* White Stripes with Black borders */}
          <path d="M50 39 C54 48, 54 72, 50 81" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M50 39 C54 48, 54 72, 50 81" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" />
          
          <path d="M72 44 C75 52, 75 68, 72 76" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M72 44 C75 52, 75 68, 72 76" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" />

          {/* Eye */}
          <circle cx="36" cy="54" r="6" fill="#ffffff" stroke="#c2410c" strokeWidth="1.5" />
          <circle cx="34" cy="54" r="3.5" fill="#1e2937" />
          <circle cx="32" cy="52" r="1" fill="#ffffff" />

          {/* Happy mouth */}
          <path d="M22 64 Q28 66 32 60" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Side Fin */}
          <path d="M50 62 C52 66, 56 66, 54 58 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
        </svg>
      );

    case 'bird':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Tail feathers */}
          <path d="M84 66 L102 76 L94 56 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />

          {/* Bird body */}
          <circle cx="56" cy="62" r="28" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="3" />

          {/* Soft belly */}
          <circle cx="48" cy="70" r="16" fill="#eff6ff" />

          {/* Wing */}
          <path d="M60 62 C74 58, 80 72, 64 74 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          <path d="M68 64 C72 62, 74 68, 68 70 Z" fill="#93c5fd" />

          {/* Eye */}
          <circle cx="40" cy="52" r="5" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
          <circle cx="38" cy="52" r="3" fill="#1e2937" />
          <circle cx="37" cy="50" r="1" fill="#ffffff" />

          {/* Cute beak */}
          <polygon points="26,54 36,48 34,60" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />

          {/* Rosy cheek */}
          <circle cx="46" cy="60" r="3" fill="#fca5a5" opacity="0.8" />

          {/* Little feet */}
          <line x1="50" y1="90" x2="44" y2="102" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
          <line x1="62" y1="90" x2="68" y2="102" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'computer':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Sparkles */}
          <path d="M12 25 L14 29 L18 30 L14 31 L12 35 L10 31 L6 30 L10 29 Z" fill="#60a5fa" />
          
          {/* Monitor / Screen outer shell */}
          <rect x="24" y="26" width="72" height="52" rx="6" fill="#475569" stroke="#1e293b" strokeWidth="3" />
          
          {/* Inside screen display area */}
          <rect x="30" y="32" width="60" height="40" rx="3" fill="#0284c7" />
          
          {/* Friendly computer face */}
          <circle cx="48" cy="48" r="4" fill="#ffffff" />
          <circle cx="48" cy="48" r="2" fill="#1e293b" />
          <circle cx="72" cy="48" r="4" fill="#ffffff" />
          <circle cx="72" cy="48" r="2" fill="#1e293b" />
          <path d="M54 58 Q60 64 66 58" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Coding/heart symbol on screen */}
          <path d="M84 38 L86 42 L90 43 L86 44 L84 48 L82 44 L78 43 L82 42 Z" fill="#fbbf24" />

          {/* Keyboard / Computer base stand */}
          <path d="M46 78 L40 96 H80 L74 78 Z" fill="#64748b" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="36" y="94" width="48" height="6" rx="2" fill="#334155" stroke="#1e293b" strokeWidth="2" />
        </svg>
      );

    case 'happy':
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Floating yellow background */}
          <circle cx="60" cy="60" r="44" fill="#fef08a" opacity="0.3" />

          {/* Sparkles */}
          <path d="M22 24 L24 28 L28 29 L24 30 L22 34 L20 30 L16 29 L20 28 Z" fill="#fbbf24" />
          <path d="M98 86 L100 90 L104 91 L100 92 L98 96 L96 92 L92 91 L96 90 Z" fill="#fbbf24" />

          {/* Big yellow smile face */}
          <circle cx="60" cy="60" r="34" fill="#fbbf24" stroke="#ca8a04" strokeWidth="3" />

          {/* Star eyes! Very joyful */}
          <polygon points="46,42 48,47 53,48 49,51 50,56 46,53 42,56 43,51 39,48 44,47" fill="#854d0e" />
          <polygon points="74,42 76,47 81,48 77,51 78,56 74,53 70,56 71,51 67,48 72,47" fill="#854d0e" />

          {/* Big open laughing mouth */}
          <path d="M46 64 C46 64, 48 80, 60 80 C72 80, 74 64, 74 64 H46 Z" fill="#b91c1c" stroke="#854d0e" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Tongue inside mouth */}
          <path d="M52 74 C52 74, 56 68, 60 68 C64 68, 68 74, 68 74 C62 78, 58 78, 52 74 Z" fill="#fca5a5" />

          {/* Cheeks */}
          <circle cx="38" cy="64" r="4.5" fill="#fca5a5" opacity="0.9" />
          <circle cx="82" cy="64" r="4.5" fill="#fca5a5" opacity="0.9" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Sparkles */}
          <circle cx="20" cy="25" r="4" fill="#38bdf8" opacity="0.6" />
          <path d="M96 20 L98 24 L102 25 L98 26 L96 30 L94 26 L90 25 L94 24 Z" fill="#fbbf24" />
          
          {/* Book cover / back */}
          <rect x="25" y="30" width="70" height="70" rx="10" fill="#a755e3" stroke="#6d28d9" strokeWidth="3" />
          
          {/* Book Pages block */}
          <rect x="32" y="34" width="60" height="62" rx="6" fill="#ffffff" stroke="#6d28d9" strokeWidth="1.5" />
          
          {/* Left & Right Pages dividing line */}
          <line x1="60" y1="34" x2="60" y2="96" stroke="#e9d5ff" strokeWidth="3.5" />
          <line x1="60" y1="34" x2="60" y2="96" stroke="#6d28d9" strokeWidth="1.5" />
          
          {/* Bookmark Ribbon */}
          <path d="M54 30 V68 L60 62 L66 68 V30 Z" fill="#f43f5e" stroke="#be123c" strokeWidth="1.5" />
          
          {/* Friendly Face / Eyes */}
          <circle cx="44" cy="56" r="3" fill="#1f2937" />
          <circle cx="76" cy="56" r="3" fill="#1f2937" />
          <path d="M52 68 Q60 74 68 68" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Blushing cheeks */}
          <circle cx="39" cy="62" r="3" fill="#fca5a5" opacity="0.7" />
          <circle cx="81" cy="62" r="3" fill="#fca5a5" opacity="0.7" />
          
          {/* Little yellow star in the sky */}
          <polygon points="60,10 63,16 70,17 65,22 66,28 60,25 54,28 55,22 50,17 57,16" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
        </svg>
      );
  }
};
