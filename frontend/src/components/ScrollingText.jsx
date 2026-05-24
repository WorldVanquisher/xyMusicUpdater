import React, { useRef, useState, useEffect } from 'react';

export const ScrollingText = ({ text, style = {} }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollAmount, setScrollAmount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const checkOverflow = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        if (textWidth > containerWidth) {
          setShouldScroll(true);
          setScrollAmount(textWidth - containerWidth + 20); // 20px extra buffer
        } else {
          setShouldScroll(false);
        }
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  const animationName = `marquee-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div 
      ref={containerRef}
      className="marquee-container"
      style={{ 
        overflow: 'hidden', 
        whiteSpace: 'nowrap', 
        position: 'relative',
        ...style 
      }}
    >
      <style>
        {`
          @keyframes ${animationName} {
            0% { transform: translateX(0); }
            10% { transform: translateX(0); }
            50% { transform: translateX(-${scrollAmount}px); }
            60% { transform: translateX(-${scrollAmount}px); }
            100% { transform: translateX(0); }
          }
          .marquee-active${isMobile ? '' : ':hover'} .marquee-inner {
            animation: ${animationName} 10s linear infinite;
          }
        `}
      </style>
      <div 
        ref={textRef}
        className={shouldScroll ? "marquee-active" : ""}
        style={{ width: '100%' }}
      >
        <div className="marquee-inner" style={{ display: 'inline-block', transition: 'none' }}>
          {text}
        </div>
      </div>
    </div>
  );
};
