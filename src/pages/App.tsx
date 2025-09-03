import { useState } from "react";
import reactLogo from "@/assets/react.svg";
import viteLogo from "@/assets/vite.svg";
import "@/css/App.css";
import { Button, Box, Flex } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import ThreejsEffect from "@/components/threejs/ThreejsEffect";

function App() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  return (
    <>
      <ThreejsEffect />
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
      <Box>
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
      </Box>
    </>
  );
}

export default App;
