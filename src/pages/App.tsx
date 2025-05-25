import { useState } from "react";
import reactLogo from "@/assets/react.svg";
import viteLogo from "@/assets/vite.svg";
import "@/css/App.css";
import { Button, Flex, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

function App() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  return (
    <>
      <Flex justify="center">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </Flex>
      <h1>Vite + React</h1>
      <div className="card">
        <Button
          colorScheme="green"
          m="10px"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </Button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <VStack>
        <Button
          m="50px"
          p="5"
          colorScheme="blue"
          onClick={() => {
            navigate("/test");
          }}
        >
          テストページへ遷移
        </Button>
        <Button
          m="50px"
          p="50"
          colorScheme="cyan"
          fontSize="30"
          onClick={() => {
            navigate("/conduct");
          }}
        >
          指揮演奏ページへ遷移
        </Button>
      </VStack>
    </>
  );
}

export default App;
