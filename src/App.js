import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [prevCoords, setPrevCoords] = useState({ x: -1, y: -1 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [ws, setWs] = useState(null);

  const [touchStartTimestamp, setTouchStartTimestamp] = useState(0);
  const [touchCount, setTouchCount] = useState(0);

  const [debugHistory, setDebugHistory] = useState([]); // basically console logs + timestamps + mouse coords
  const DEBUG = true;

  const debug = (message) => {
    if (DEBUG) {
      const timestamp = new Date().toLocaleTimeString();
      const coords = { x: prevCoords.x, y: prevCoords.y };
      setDebugHistory((prev) => [...prev, { timestamp, message, coords }]);

      console.log(`[${timestamp}] ${message}`, coords);
    }
  };

  useEffect(() => {
    debug("Connecting to WebSocket");
    const websocket = new WebSocket("ws://192.168.100.4:3244");
    debug("Connected to WebSocket");

    websocket.onopen = () => {
      debug("WebSocket connected");
    };

    websocket.onclose = () => {
      debug("WebSocket disconnected");
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

    // TODO: Fix this, doesn't work
    if (touchCount === 2 && Date.now() - touchStartTimestamp < 500) {
      debug("Sending Double Click Event!");
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
      debug("Sending Click Event!", e);

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

      {DEBUG && (
        // Shit doesn't auto-scroll yet
        <section className="sm:w-96 w-full absolute flex flex-col bottom-0 right-0 p-4 bg-black padding-8 h-[40svh] overflow-y-auto break-words">
          {debugHistory.map(({ timestamp, message, coords }, index) => (
            <div key={index}>
              <span className="text-gray-500">
                {timestamp} {roundToDecimal(coords.x, 2)},
                {roundToDecimal(coords.y, 2)}
              </span>
              <span className="text-gray-600"> {message}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

export default App;
