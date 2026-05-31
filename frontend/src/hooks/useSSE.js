import { useState, useEffect, useRef } from 'react';

const MAX_RETRIES = 8;

export function useSSE(user, onPermanentFailure, initialRetryMs = 15000) {
  const [entries, setEntries] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const retryCount = useRef(0);
  // Keep retry config in a ref so updates don't restart the SSE connection
  const initialRetryMsRef = useRef(initialRetryMs);

  useEffect(() => {
    initialRetryMsRef.current = initialRetryMs;
  }, [initialRetryMs]);

  // Linear decrease: attempt 1 → full timeout, attempt 8 → timeout/8
  const getRetryDelay = (attempt) => {
    const step = initialRetryMsRef.current / MAX_RETRIES;
    return Math.max(1000, initialRetryMsRef.current - (attempt - 1) * step);
  };

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

        if (retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          const delay = getRetryDelay(retryCount.current);
          console.warn(
            `SSE retry ${retryCount.current}/${MAX_RETRIES} in ${(delay / 1000).toFixed(1)}s...`
          );
          timer = setTimeout(connect, delay);
        } else {
          console.error('SSE permanent failure after 8 retries.');
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
