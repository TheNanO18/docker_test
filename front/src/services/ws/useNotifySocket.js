import { useEffect, useRef, useState } from "react";
import { WS_BASE, WS_ENABLED } from "../../config/api/apiEnv";

export function useNotifySocket({ token, uuid, loginType, onMessage }) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const retryRef = useRef(0);
  const retryTimerRef = useRef(null);
  const messageSeqRef = useRef(0);

  const [connected, setConnected] = useState(false);

  // 최신 onMessage 유지
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    if (!token || !uuid || !loginType || !WS_BASE || !WS_ENABLED) {
      setConnected(false);
      return;
    }

    let closedByCleanup = false;

    const connect = () => {
      try {
        wsRef.current?.close(1000, "reconnect");
      } catch {}

      wsRef.current = null;

      const wsUrl =
        loginType === "admin"
          ? `${WS_BASE}/ws/admin/request-monitor/?admin_uuid=${uuid}`
          : `${WS_BASE}/ws/user/request-monitor/?user_uuid=${uuid}`;

      let ws;
      try {
        ws = new WebSocket(wsUrl, [token]);
        wsRef.current = ws;
      } catch (error) {
        console.warn("WebSocket connection skipped", error);
        setConnected(false);
        return;
      }

      ws.onopen = () => {
        retryRef.current = 0;
        setConnected(true);
      }; 

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          messageSeqRef.current += 1;
          onMessageRef.current?.(data);
        } catch {
          console.warn("WS parse error");
        }
      };

      ws.onclose = (e) => {
        setConnected(false);

        if (closedByCleanup) return;
        if (e.code === 1000 || e.code === 1008) return;

        const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
        retryRef.current += 1;

        retryTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        console.error("WS ERROR");
      };
    };

    connect();

    return () => {
      closedByCleanup = true;
      clearTimeout(retryTimerRef.current);

      try {
        wsRef.current?.close(1000, "cleanup");
      } catch {}

      wsRef.current = null;
      setConnected(false);
    };
  }, [token, uuid, loginType]); // 🔥 여기 추가

  return { connected };
}
