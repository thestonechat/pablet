import { useEffect, useState } from "react";
import "./App.css";
import classNames from "classnames";

function App() {
  const DEBUG = false;

  const [enteredServerIP, setEnteredServerIP] = useState("192.168.1.");
  const [serverIP, setServerIP] = useState(DEBUG ? "172.21.160.1" : undefined);
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // connected, disconnected, connecting
  const [prevCoords, setPrevCoords] = useState({ x: -1, y: -1 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [ws, setWs] = useState(null);

  const [touchStartTimestamp, setTouchStartTimestamp] = useState(0);
  const [touchCount, setTouchCount] = useState(0);

  const [debugHistory, setDebugHistory] = useState([]); // basically console logs + timestamps + mouse coords

  const debug = (message) => {
    if (DEBUG) {
      const timestamp = new Date().toLocaleTimeString();
      const coords = { x: prevCoords.x, y: prevCoords.y };
      setDebugHistory((prev) => [...prev, { timestamp, message, coords }]);

      console.log(`[${timestamp}] ${message}`, coords);
    }
  };

  useEffect(() => {
    if (!serverIP) return;

    setConnectionStatus("connecting");
    debug("Connecting to WebSocket");
    const websocket = new WebSocket(`ws://${serverIP}:3244`);

    websocket.onopen = () => {
      setConnectionStatus("connected");
      debug("WebSocket connected");
    };

    websocket.onclose = () => {
      setConnectionStatus("disconnected");
      setServerIP(DEBUG ? "172.21.160.1" : undefined);
      debug("WebSocket disconnected");
    };

    // Store the WebSocket instance in state
    setWs(websocket);

    // Clean up function to close the WebSocket connection when component unmounts
    return () => {
      websocket.close();
    };
  }, [serverIP]);

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
    const main = document.querySelector("main");
    main.addEventListener("mousemove", handleMouseMove);
    main.addEventListener("mouseup", handleMouseUp);
    main.addEventListener("mousedown", handleMouseDown);

    main.addEventListener("touchstart", handleMouseDown);
    main.addEventListener("touchmove", handleMouseMove);
    main.addEventListener("touchend", handleMouseUp);

    main.addEventListener("click", handleClick);

    return () => {
      main.removeEventListener("mousemove", handleMouseMove);
      main.removeEventListener("mouseup", handleMouseUp);
      main.removeEventListener("mousedown", handleMouseDown);

      main.removeEventListener("touchstart", handleMouseDown);
      main.removeEventListener("touchmove", handleMouseMove);
      main.removeEventListener("touchend", handleMouseUp);

      main.removeEventListener("click", handleClick);
    };
  }, [isMouseDown, prevCoords]);

  return (
    <>
      {!serverIP && (
        <div className="absolute flex items-center justify-center z-10 p-8 bg-black bg-opacity-20 backdrop-blur w-screen h-screen">
          <div className="bg-black flex flex-col text-center max-w-96 w-full gap-2 border-[1px] border-white border-opacity-30 bg-opacity-50 backdrop-blur-xl p-4 rounded-md">
            <h1 className="text-2xl font-bold">Connect to your server</h1>
            <input
              type="text"
              className="p-2 rounded-md bg-black outline-none border-[1px] border-opacity-30 border-white"
              placeholder="Server IP"
              value={enteredServerIP}
              onChange={(e) => setEnteredServerIP(e.target.value)}
            />
            <button
              className="p-2 text-black bg-white w-full rounded-md"
              onClick={() => {
                setServerIP(enteredServerIP);
                debug(`Connecting to ${serverIP}`);
              }}
            >
              Connect
            </button>
          </div>
        </div>
      )}

      <main>
        <div className="absolute left-2 top-2">
          <span
            className={classNames("font-bold", {
              "text-green-500": connectionStatus === "connected",
              "text-red-500": connectionStatus === "disconnected",
              "text-yellow-500": connectionStatus === "connecting",
            })}
          >
            {connectionStatus.toUpperCase()}
          </span>{" "}
          {connectionStatus === "disconnected" ? "FROM" : "TO"} {serverIP}
        </div>

        <div className="border-box">
          <div>
            <span style={{ opacity: 0.5 }}>X</span> <span id="x-value">0</span>
          </div>
          <div>
            <span style={{ opacity: 0.5 }}>Y</span> <span id="y-value">0</span>
          </div>
        </div>
      </main>

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
    </>
  );
}

export default App;
