import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [prevCoords, setPrevCoords] = useState({ x: -1, y: -1 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [ws, setWs] = useState(null);

  const [touchStartTimestamp, setTouchStartTimestamp] = useState(0);
  const [touchCount, setTouchCount] = useState(0);

  useEffect(() => {
    const websocket = new WebSocket("ws://192.168.100.4:3244");
    alert("Creating WebSocket");

    websocket.onopen = () => {
      console.log("WebSocket connected");
      alert("WebSocket connected");
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      alert("WebSocket disconnected");
    };

    // Store the WebSocket instance in state
    setWs(websocket);

    // Clean up function to close the WebSocket connection when component unmounts
    return () => {
      websocket.close();
    };
  }, []);

  const handleMouseDown = (e) => {
    setPrevCoords({ x: e.clientX, y: e.clientY });
    setIsMouseDown(true);

    if ((e.touches || []).length === 2) {
      setTouchStartTimestamp(Date.now());
      setTouchCount(2);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);

    if (touchCount === 2 && Date.now() - touchStartTimestamp < 500) {
      console.log("Sending Double Click Event!");
      ws.send(2);
    }
  };

  const roundToDecimal = (num, decimalPlaces) => {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
  };

  const handleMotion = (e) => {
    const { x, y } = prevCoords;

    if (x === -1 && y === -1) {
      setPrevCoords({ x: e.clientX, y: e.clientY });
      return;
    }

    const dx = roundToDecimal(e.clientX - x, 2);
    const dy = roundToDecimal(e.clientY - y, 2);

    document.getElementById("x-value").innerText = dx;
    document.getElementById("y-value").innerText = dy;

    setPrevCoords({ x: e.clientX, y: e.clientY });

    if (ws && dx && dy) {
      // Send the mouse movement data to the server as an ArrayBuffer for efficiency
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);

      view.setInt16(0, Math.floor(dx * 100), true);
      view.setInt16(2, Math.floor(dy * 100), true);

      ws.send(buffer);
    }
  };

  const handleMouseMove = (e) => {
    if (isMouseDown) {
      if (e.type.includes(`touch`)) {
        const { touches, changedTouches } = e.originalEvent ?? e;
        const touch = touches[0] ?? changedTouches[0];

        handleMotion(touch);
      } else {
        handleMotion(e);
      }
    }
  };

  const handleClick = (e) => {
    if (ws && e.clientX === prevCoords.x && e.clientY === prevCoords.y) {
      console.log("Sending Click Event!", e);

      ws.send(1);
    }
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    document.addEventListener("touchstart", handleMouseDown);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("touchend", handleMouseUp);

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);

      document.removeEventListener("touchstart", handleMouseDown);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);

      document.removeEventListener("click", handleClick);
    };
  }, [isMouseDown, prevCoords]);

  return (
    <main>
      <div className="border-box">
        <div>
          <span style={{ opacity: 0.5 }}>X</span> <span id="x-value">0</span>
        </div>
        <div>
          <span style={{ opacity: 0.5 }}>Y</span> <span id="y-value">0</span>
        </div>
      </div>
    </main>
  );
}

export default App;
