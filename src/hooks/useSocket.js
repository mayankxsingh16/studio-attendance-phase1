import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocket(eventName, handler, enabled = true) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const token = localStorage.getItem("attendance_token");
    if (!token) {
      return undefined;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      transports: ["websocket"]
    });

    socket.emit("join-admin", { token });
    socket.on(eventName, (payload) => handlerRef.current?.(payload));

    return () => {
      socket.off(eventName);
      socket.disconnect();
    };
  }, [enabled, eventName]);
}
