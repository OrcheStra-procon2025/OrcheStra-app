import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/css/index.css";
import { ParameterProvider } from "./context/ParameterContext";
import SelectionPage from "./pages/SelectionPage";
import PlayingPage from "./pages/PlayingPage";
import ResultPage from "./pages/ResultPage";
import Layout from "./components/Layout";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider>
      <ParameterProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<SelectionPage />} />
              <Route path="play" element={<PlayingPage />} />
              <Route path="/result" element={<ResultPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ParameterProvider>
    </ChakraProvider>
  </StrictMode>,
);
