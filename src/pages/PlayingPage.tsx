import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { Text, Box } from "@chakra-ui/react";

const THRESHOLD = 1.2;

export default function PlayingPage() {
  const document_root = document.getElementById("root");
  const [msg, setMsg] = useState<string>("")
  var before_accel = { acc_x: 0, acc_y: 0, acc_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 };
  var now_beat = 0;
  var beat_strong = 0;
  var after_beat = 0;
  useEffect(() => {
    const socket = new WebSocket("ws://10.71.170.56"); // 仮
    socket.addEventListener("open", () => {console.log("WS connected!")});
    socket.addEventListener("message", event => {
      const accel_info = JSON.parse(event.data);
      // const sum_gyro_delta = Math.abs(accel_info.gyro_x - before_accel.gyro_x) + Math.abs(accel_info.gyro_y - before_accel.gyro_y) + Math.abs(accel_info.gyro_z - before_accel.gyro_z);
      const sum_acc_delta = Math.abs(accel_info.acc_x - before_accel.acc_x) + Math.abs(accel_info.acc_y - before_accel.acc_y) + Math.abs(accel_info.acc_z - before_accel.acc_z);
      if (sum_acc_delta > THRESHOLD) {
        beat_strong += sum_acc_delta;
      } else {
        if (beat_strong > 0) {
          after_beat += 1;
          if (after_beat > 6) {
            now_beat += 1;
            setMsg("動きが検出されました: " + now_beat + ", " + beat_strong);
            beat_strong = 0;
            after_beat = 0;
          }
        }
      };
      console.log(sum_acc_delta)
      before_accel = accel_info;
    });
  }, []);

  if (document_root) {
    // 確実に真なはず。リンタを黙らせます
    document_root.style.height = "100vh";
  }
  return (
    <>
      <div style={{ height: "100%" }}>
        <p>{msg}</p>
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
