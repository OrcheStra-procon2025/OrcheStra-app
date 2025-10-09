import type { AccelDataModel } from "@/utils/models";
import { useGlobalParams } from "@/context/useGlobalParams";

interface WebSocketHandler {
  connectWebSocket: () => void;
  registerOnMessage: (callback: (data: AccelDataModel) => void) => void;
}

export const useWebSocket = (): WebSocketHandler => {
  const { webSocketObject, updateWebSocketObject } = useGlobalParams();

  const connectWebSocket = (): void => {
    const socket = new WebSocket("ws://10.247.186.56");
    updateWebSocketObject(socket);
  };

  const registerOnMessage = (callback: (data: AccelDataModel) => void) => {
    console.debug(webSocketObject);
    webSocketObject?.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    });
  };

  return {
    connectWebSocket,
    registerOnMessage,
  };
};
