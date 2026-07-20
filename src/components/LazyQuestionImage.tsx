import React, { useState, useEffect } from 'react';
import { generateQuestionSvg } from '../services/gemini';
import { Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';

interface LazyQuestionImageProps {
  imagePrompt?: string;
  questionText: string;
  initialImage?: string;
  onImageLoaded?: (imageUrl: string) => void;
}

export const LazyQuestionImage: React.FC<LazyQuestionImageProps> = ({
  imagePrompt,
  questionText,
  initialImage,
  onImageLoaded
}) => {
  const [image, setImage] = useState<string | undefined>(initialImage);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    setImage(initialImage);
  }, [initialImage]);

  useEffect(() => {
    if (image) return; // Already has image
    if (!imagePrompt || imagePrompt.trim().length <= 10) return; // Doesn't need an image

    let isMounted = true;
    const fetchSvg = async () => {
      setLoading(true);
      setError(false);
      try {
        const svgUrl = await generateQuestionSvg(imagePrompt, questionText);
        if (isMounted) {
          if (svgUrl) {
            setImage(svgUrl);
            if (onImageLoaded) {
              onImageLoaded(svgUrl);
            }
          } else {
            setError(true);
          }
        }
      } catch (err) {
        console.error("Failed to generate lazy SVG:", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSvg();

    return () => {
      isMounted = false;
    };
  }, [imagePrompt, questionText, image]);

  const handleRetry = async () => {
    if (!imagePrompt) return;
    setLoading(true);
    setError(false);
    try {
      const svgUrl = await generateQuestionSvg(imagePrompt, questionText);
      if (svgUrl) {
        setImage(svgUrl);
        if (onImageLoaded) {
          onImageLoaded(svgUrl);
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to retry lazy SVG:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-2 p-4 border border-stone-100 rounded-xl bg-stone-50 flex items-center gap-3 w-fit max-w-full">
        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
        <span className="text-xs text-stone-500 font-medium font-sans">AI đang vẽ hình minh họa sinh động...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 p-3 border border-red-100 rounded-xl bg-red-50/50 flex items-center gap-3 w-fit max-w-full">
        <ImageIcon className="w-5 h-5 text-red-400" />
        <span className="text-xs text-red-700 font-sans">Không vẽ được hình.</span>
        <button 
          onClick={handleRetry} 
          className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 ml-2 font-sans"
        >
          <RefreshCw className="w-3 h-3" /> Thử lại
        </button>
      </div>
    );
  }

  if (!image) return null;

  return (
    <div className="mt-2 border border-stone-100 rounded-xl overflow-hidden bg-white w-fit max-w-full shadow-sm">
      <img 
        src={image} 
        alt="Question figure" 
        className="max-h-64 object-contain" 
        referrerPolicy="no-referrer" 
      />
    </div>
  );
};
