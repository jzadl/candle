import { useState, useEffect } from "react";
import {
  Play, Square, Wifi, Sliders,
  ArrowLeft, Home as HomeIcon, Layers,
  Volume2, VolumeX, Power, RotateCcw, Smartphone,
  ChevronDown
} from "lucide-react";

interface Device {
  serial: string;
  mode: string;
  state: string;
  model: string;
}

const KEYCODES: Record<string, number> = {
  back: 4,
  home: 3,
  recent: 187,
  volup: 24,
  voldown: 25,
  power: 26,
  menu: 82,
  enter: 66,
};

export default function Mirror() {
  const [device, setDevice] = useState<Device | null>(null);
  const [maxSize, setMaxSize] = useState(1024);
  const [bitrate, setBitrate] = useState(4);
  const [fps, setFps] = useState(60);
  const [recordPath, setRecordPath] = useState("");
  const [ipAddress, setIpAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkDevice = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/devices");
        if (response.ok) {
          const data = await response.json();
          setDevice(data[0] || null);
        }
      } catch (e) {
        setDevice(null);
      }
    };
    checkDevice();
    const interval = setInterval(checkDevice, 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll scrcpy status to detect when external window is closed
  useEffect(() => {
    if (!running) return;
    const check = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/scrcpy/status");
        if (res.ok) {
          const data = await res.json();
          if (!data.running) {
            setRunning(false);
            setActionMsg("Scrcpy window closed.");
          }
        }
      } catch (_) {}
    };
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [running]);

  const handleStartMirror = async () => {
    if (!device) return;
    setLoading(true);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/scrcpy/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial: device.serial,
          max_size: maxSize,
          bitrate: bitrate,
          fps: fps,
          record_path: recordPath ? recordPath : null
        })
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setRunning(true);
        setActionMsg(data.message);
      } else {
        setErrorMsg(data.message || "Failed to start Mirroring.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend api.");
    } finally {
      setLoading(false);
    }
  };

  const handleStopMirror = async () => {
    setLoading(true);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/scrcpy/stop", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setRunning(false);
        setActionMsg(data.message);
      } else {
        setErrorMsg(data.message || "Failed to stop Mirroring.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend api.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyevent = async (key: string) => {
    if (!device) return;
    const keycode = KEYCODES[key];
    if (keycode === undefined) return;
    try {
      await fetch("http://127.0.0.1:8000/api/mirror/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: device.serial, keycode })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWirelessConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device || !ipAddress.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/scrcpy/wireless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: device.serial, ip_address: ipAddress })
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setActionMsg(data.message);
        setIpAddress("");
      } else {
        setErrorMsg(data.message || "Failed to connect wirelessly.");
      }
    } catch (err) {
      setErrorMsg("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const btnClass =
    "p-2.5 rounded-lg border border-border-mid bg-bg-surface hover:bg-primary hover:text-white hover:border-primary text-text-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl w-full mx-auto select-none">
      <div className="flex items-center justify-between border-b border-border-mid pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Device Screen Mirroring</h1>
          <p className="text-sm text-text-secondary mt-1">Launch an external scrcpy window with remote device controls</p>
        </div>
        {device && (
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary bg-bg-surface border border-border-mid px-3 py-1.5 rounded-lg">
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            {device.model || device.serial}
          </div>
        )}
      </div>

      {actionMsg && (
        <div className="p-3 bg-bg-surface border border-border-mid rounded-lg text-xs font-semibold text-text-primary flex justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-text-secondary hover:text-text-primary font-bold">Dismiss</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="hover:text-red-900 font-bold">Dismiss</button>
        </div>
      )}

      <div className="border border-border-mid bg-bg-main rounded-lg p-5 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-primary" /> Mirror Session
        </h3>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-text-secondary">Resolution Size</label>
            <select
              value={maxSize}
              onChange={(e) => setMaxSize(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary font-bold cursor-pointer"
            >
              <option value={800}>800px</option>
              <option value={1024}>1024px</option>
              <option value={1280}>1280px</option>
              <option value={1920}>1920px</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-text-secondary">Bitrate (Mbps)</label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary font-bold cursor-pointer"
            >
              <option value={2}>2 Mbps</option>
              <option value={4}>4 Mbps</option>
              <option value={8}>8 Mbps</option>
              <option value={16}>16 Mbps</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-text-secondary">Framerate (FPS)</label>
            <select
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary font-bold cursor-pointer"
            >
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase text-text-secondary">Save Record File Path (Optional)</label>
          <input
            type="text"
            placeholder="/path/to/record.mp4"
            value={recordPath}
            onChange={(e) => setRecordPath(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div className="flex gap-2.5 mt-2">
          {!running ? (
            <button
              onClick={handleStartMirror}
              disabled={loading || !device || device.mode !== "normal"}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Start Scrcpy Window
            </button>
          ) : (
            <button
              onClick={handleStopMirror}
              disabled={loading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5"
            >
              <Square className="w-4 h-4" />
              Stop Scrcpy Window
            </button>
          )}
        </div>
      </div>

      {/* Device Controls */}
      <div className="border border-border-mid bg-bg-main rounded-lg p-5 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-primary" /> Device Controls
        </h3>
        <p className="text-[10px] text-text-secondary -mt-2">Send key events to the connected device</p>

        <div className="grid grid-cols-5 gap-2">
          <button onClick={() => handleKeyevent("recent")} disabled={!device || device.mode !== "normal"} className={btnClass} title="Recent Apps">
            <Layers className="w-4 h-4 mx-auto" />
            <span className="block text-[9px] mt-1 font-bold">Recent</span>
          </button>
          <button onClick={() => handleKeyevent("back")} disabled={!device || device.mode !== "normal"} className={btnClass} title="Back">
            <ArrowLeft className="w-4 h-4 mx-auto" />
            <span className="block text-[9px] mt-1 font-bold">Back</span>
          </button>
          <button onClick={() => handleKeyevent("home")} disabled={!device || device.mode !== "normal"} className={btnClass} title="Home">
            <HomeIcon className="w-4 h-4 mx-auto" />
            <span className="block text-[9px] mt-1 font-bold">Home</span>
          </button>
          <button onClick={() => handleKeyevent("menu")} disabled={!device || device.mode !== "normal"} className={btnClass} title="Menu">
            <ChevronDown className="w-4 h-4 mx-auto" />
            <span className="block text-[9px] mt-1 font-bold">Menu</span>
          </button>
          <button onClick={() => handleKeyevent("power")} disabled={!device || device.mode !== "normal"} className={btnClass} title="Power">
            <Power className="w-4 h-4 mx-auto" />
            <span className="block text-[9px] mt-1 font-bold">Power</span>
          </button>
          <button onClick={() => handleKeyevent("volup")} disabled={!device || device.mode !== "normal"} className={btnClass} title="Volume Up">
            <Volume2 className="w-4 h-4 mx-auto" />
            <span className="block text-[9px] mt-1 font-bold">Vol +</span>
          </button>
          <button onClick={() => handleKeyevent("voldown")} disabled={!device || device.mode !== "normal"} className={btnClass} title="Volume Down">
            <VolumeX className="w-4 h-4 mx-auto" />
            <span className="block text-[9px] mt-1 font-bold">Vol -</span>
          </button>
          <button onClick={() => handleKeyevent("enter")} disabled={!device || device.mode !== "normal"} className={`${btnClass} col-span-2`} title="Enter">
            <RotateCcw className="w-4 h-4 mx-auto rotate-90" />
            <span className="block text-[9px] mt-1 font-bold">Enter</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleWirelessConnect} className="border border-border-mid bg-bg-main rounded-lg p-5 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <Wifi className="w-4 h-4 text-primary" /> ADB Wireless Connect
        </h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase text-text-secondary">Device IP Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="192.168.1.100"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              required
              pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
              className="flex-1 px-3 py-2 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="submit"
              disabled={loading || !device || device.mode !== "normal"}
              className="px-4 py-2 bg-bg-surface border border-border-mid hover:bg-border-mid text-text-primary text-xs font-bold rounded transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <Wifi className="w-3.5 h-3.5" />
              Connect
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
