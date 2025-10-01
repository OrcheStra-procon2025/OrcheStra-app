import { useEffect } from "react";
import logo from "@/assets/logo.png";
import { Text, Box } from "@chakra-ui/react";

export default function PlayingPage() {
  const document_root = document.getElementById("root");
  useEffect(() => {
    const socket = new WebSocket("ws://10.76.190.56"); // 仮
    socket.addEventListener("open", () => {console.log("WS connected!")});
    socket.addEventListener("message", event => {
      const accel_info = JSON.parse(event.data);
      console.log(accel_info);
    });
  }, []);

  if (document_root) {
    // 確実に真なはず。リンタを黙らせます
    document_root.style.height = "100vh";
  }
  return (
    <>
      <div style={{ height: "100%" }}>
        <Box as="video" height="100%"></Box>
        <Text style={{ position: "fixed", bottom: "5px", left: "5px" }}>
          v0.0.1
        </Text>
        <Box
          maxW="200px;"
          style={{ position: "fixed", bottom: "5px", right: "5px" }}
        >
          <img src={logo} alt="Logo" />
        </Box>
      </div>
    </>
  );
}
