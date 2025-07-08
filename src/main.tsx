import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import "@/css/index.css"
import App from "@/pages/App.tsx";
import ChakraTest from "./pages/ChakraTest";
import Connection from "./pages/connection";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="test" element={<ChakraTest />} />
          <Route path="connection" element={<Connection />} />
          {/* <Route path="*" element={<NoMatch />} /> */}
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
);
