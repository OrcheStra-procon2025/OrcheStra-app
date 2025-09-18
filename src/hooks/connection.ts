export function testWS(){
    const ws = new WebSocket("ws://192.168.110.107:8080");

    ws.onopen = () =>{
        console.log("WebSocket接続が確立");
        ws.send("Hello,server!!!!!!");
    };

    ws.onmessage = (event) =>{
        console.log("サーバーからのメッセージ:",event.data);
        ws.close();
    };

    ws.onerror = (error) => {
        console.error("Websocketエラー");
    };

    ws.onclose = () =>{
        console.log("接続が閉じられました");
    };
}