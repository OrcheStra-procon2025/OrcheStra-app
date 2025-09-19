import logo from "@/assets/logo.png";
import { Text, Box } from "@chakra-ui/react";

export default function PlayingPage() {
  const document_root = document.getElementById("root");
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
