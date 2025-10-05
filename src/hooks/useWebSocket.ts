interface WebSocketHandler {
    registerOnMessage: (callback: () => void) => void;
}

const socket = new WebSocket("ws://10.248.238.56");

export const useWebSocket = (): WebSocketHandler => {
    const registerOnMessage = (callback: (data: any) => any) => {
        socket.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            callback(data);
        });
    };

    return {
        registerOnMessage,
    };
};
