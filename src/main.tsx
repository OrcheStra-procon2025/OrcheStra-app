import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/css/index.css";
import SelectionPage from "./pages/SelectionPage";
import PlayingPage from "./pages/PlayingPage";
import Result from "./pages/Result";
//import Result from "./pages/result";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SelectionPage />} />
          <Route path="play" element={<PlayingPage />} />
          <Route path="result" element={<Result/>} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
);
