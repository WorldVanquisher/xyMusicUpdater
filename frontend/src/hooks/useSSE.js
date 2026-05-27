import { useState, useEffect, useRef } from 'react';

export function useSSE(user, onPermanentFailure) {
  const [entries, setEntries] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 10;
  const retryInterval = 5000;

  useEffect(() => {
    if (!user) {
        setIsLive(false);
        retryCount.current = 0;
        return;
    }

    let eventSource;
    let timer;

    const connect = () => {
        if (eventSource) eventSource.close();
        
        eventSource = new EventSource('/api/events/');

        eventSource.onopen = () => {
          setIsLive(true);
          retryCount.current = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.message) {
              setEntries(prev => [data, ...prev].slice(0, 100));
            }
          } catch (e) {}
        };

        eventSource.addEventListener('ping', () => {
          setIsLive(true);
          retryCount.current = 0;
        });

        eventSource.onerror = () => {
          setIsLive(false);
          eventSource.close();
          
          if (retryCount.current < maxRetries) {
            retryCount.current += 1;
            console.warn(`SSE Connection failed. Retry ${retryCount.current}/${maxRetries} in 5s...`);
            timer = setTimeout(connect, retryInterval);
          } else {
            console.error("SSE Connection permanent failure.");
            if (onPermanentFailure) onPermanentFailure();
          }
        };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (timer) clearTimeout(timer);
    };
  }, [user, onPermanentFailure]);

  return { entries, setEntries, isLive };
}
