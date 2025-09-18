import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import "@/css/index.css"
import App from "@/pages/App.tsx";
import ChakraTest from "./pages/ChakraTest";
import SelectionPage from "./pages/SelectionPage";
import Camera from "./pages/camera";
//import Result from "./pages/result";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="test" element={<ChakraTest />} />
          <Route path="select" element={<SelectionPage />} />
          <Route path="camera" element={<Camera />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
);
