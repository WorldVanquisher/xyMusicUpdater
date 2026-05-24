import React, { useRef, useState, useEffect, useMemo } from 'react';

/**
 * Robust Scrolling Text component that detects overflow and animates automatically or on hover.
 */
export const ScrollingText = ({ text, style = {} }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [scrollAmount, setScrollAmount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const check = () => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.offsetWidth;
      
      if (textWidth > containerWidth) {
        // Add a bit more buffer for smooth ending
        setScrollAmount(textWidth - containerWidth + 40);
      } else {
        setScrollAmount(0);
      }
    }
    setIsMobile(window.innerWidth <= 768);
  };

  useEffect(() => {
    // Check multiple times to ensure we catch layout updates/tab switches
    check();
    const t1 = setTimeout(check, 100);
    const t2 = setTimeout(check, 1000);
    const t3 = setTimeout(check, 3000);
    
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [text]);

  // Unique animation name per instance and text state
  const animID = useMemo(() => `mq-${Math.random().toString(36).slice(2, 8)}`, [text, scrollAmount]);

  const canScroll = scrollAmount > 0;

  return (
    <div 
      ref={containerRef}
      onMouseEnter={check} // Re-check on hover to be safe
      style={{ 
        overflow: 'hidden', 
        whiteSpace: 'nowrap', 
        width: '100%',
        position: 'relative',
        ...style 
      }}
    >
      {canScroll && (
        <style>
          {`
            @keyframes ${animID} {
              0% { transform: translateX(0); }
              5% { transform: translateX(0); }
              45% { transform: translateX(-${scrollAmount}px); }
              55% { transform: translateX(-${scrollAmount}px); }
              95% { transform: translateX(0); }
              100% { transform: translateX(0); }
            }
            .mq-wrap-${animID} {
              display: inline-block;
              width: 100%;
            }
            ${isMobile ? `.mq-inner-${animID}` : `.mq-wrap-${animID}:hover .mq-inner-${animID}`} {
              animation: ${animID} 10s linear infinite;
            }
          `}
        </style>
      )}
      <div className={`mq-wrap-${animID}`}>
        <span 
          ref={textRef} 
          className={`mq-inner-${animID}`}
          style={{ display: 'inline-block' }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
