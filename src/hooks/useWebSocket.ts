import type { AccelDataModel } from "@/utils/models";
import { useRef } from "react";
import { useGlobalParams } from "@/context/useGlobalParams";

interface WebSocketHandler {
  connectWebSocket: () => void;
  registerOnMessage: (callback: (data: AccelDataModel) => void) => void;
  removeOnMessage: () => void;
}

export const useWebSocket = (): WebSocketHandler => {
  const { webSocketObject, updateWebSocketObject } = useGlobalParams();
  const callbacksRef = useRef<Array<(event: MessageEvent) => void>>([]);

  const connectWebSocket = (): void => {
    const socket = new WebSocket("ws://192.168.2.59");
    updateWebSocketObject(socket);
  };

  const registerOnMessage = (callback: (data: AccelDataModel) => void) => {
    const toBeRegistered = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      callback(data);
    };
    webSocketObject?.addEventListener("message", toBeRegistered);
    callbacksRef.current.push(toBeRegistered);
  };

  const removeOnMessage = () => {
    for (const callback of callbacksRef.current) {
      webSocketObject?.removeEventListener("message", callback);
    }
    callbacksRef.current = [];
  };

  return {
    connectWebSocket,
    registerOnMessage,
    removeOnMessage,
  };
};
