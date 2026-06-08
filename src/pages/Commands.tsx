import { useEffect, useState, useRef } from "react";
import { 
  Terminal, RotateCcw, HardDrive, Play, Trash2, 
  ChevronRight, RefreshCw, Command as CmdIcon 
} from "lucide-react";

interface Device {
  serial: string;
  mode: string;
  state: string;
  model: string;
}

const PRESET_COMMANDS = [
  { label: "Check ADB Devices", cmd: "adb devices" },
  { label: "Check Fastboot Devices", cmd: "fastboot devices" },
  { label: "Get All Fastboot Variables", cmd: "fastboot getvar all" },
  { label: "Get System Features List", cmd: "adb shell pm list features" },
  { label: "Show Logcat (10 lines)", cmd: "adb logcat -d -t 10" },
  { label: "List Active Services", cmd: "adb shell service list" },
  { label: "Get Device Battery Status", cmd: "adb shell dumpsys battery" }
];

export default function Commands() {
  const [device, setDevice] = useState<Device | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [partition, setPartition] = useState("boot");
  const [filePath, setFilePath] = useState("");
  const [sideloadPath, setSideloadPath] = useState("");
  const [customCommand, setCustomCommand] = useState("");
  const [executing, setExecuting] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Poll for connected device
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

  // Poll logs
  const fetchLogs = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/commands/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Command handlers
  const handleReboot = async (mode: string) => {
    if (!device) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/api/commands/reboot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: device.serial, mode })
      });
      if (response.ok) {
        const data = await response.json();
        setActionMsg(data.message);
      }
    } catch (e) {
      setActionMsg("Failed to reboot device");
    }
  };

  const handleSideload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device || !sideloadPath) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/api/commands/sideload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: device.serial, filepath: sideloadPath })
      });
      if (response.ok) {
        const data = await response.json();
        setActionMsg(data.message);
        setSideloadPath("");
      } else {
        const err = await response.json();
        setActionMsg(`Error: ${err.detail}`);
      }
    } catch (e) {
      setActionMsg("Failed to start sideload");
    }
  };

  const handleFlash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device || !filePath) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/api/commands/flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: device.serial, partition, filepath: filePath })
      });
      if (response.ok) {
        const data = await response.json();
        setActionMsg(data.message);
        setFilePath("");
      } else {
        const err = await response.json();
        setActionMsg(`Error: ${err.detail}`);
      }
    } catch (e) {
      setActionMsg("Failed to start flashing");
    }
  };

  const handleCustomCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim()) return;
    setExecuting(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/commands/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: customCommand })
      });
      if (response.ok) {
        setCustomCommand("");
        fetchLogs();
      } else {
        const err = await response.json();
        setActionMsg(`Command error: ${err.detail}`);
      }
    } catch (e) {
      setActionMsg("Failed to run custom command");
    } finally {
      setExecuting(false);
    }
  };

  const clearBackendLogs = async () => {
    try {
      await fetch("http://127.0.0.1:8000/api/commands/logs/clear", { method: "POST" });
      setLogs([]);
    } catch (e) {
      console.error(e);
    }
  };

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-4xl mx-auto w-full">
        <Terminal className="w-12 h-12 text-text-secondary mb-4" />
        <h2 className="text-lg font-bold text-text-primary">Custom Commands requires a connected device</h2>
        <p className="text-sm text-text-secondary mt-1 max-w-sm">
          Please connect your Android device with USB Debugging enabled, or boot it into Recovery or Fastboot mode.
        </p>
      </div>
    );
  }

  const isAdb = device.mode === "normal" || device.mode === "recovery";
  const isFastboot = device.mode === "fastboot";

  return (
    <div className="flex flex-col h-full max-w-4xl w-full mx-auto p-6 gap-5 select-none">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border-mid pb-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">ADB & Fastboot Console</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Running in <span className="font-semibold text-text-primary uppercase">{device.mode} mode</span> ({device.model})
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="flex items-center justify-between p-3.5 bg-bg-surface border border-border-mid rounded-lg text-xs font-semibold text-text-primary flex-shrink-0">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-text-secondary hover:text-text-primary font-bold">Dismiss</button>
        </div>
      )}

      {/* Grid of Buttons & Helpers (Top Panel) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
        
        {/* Quick Reboot Actions */}
        <div className="border border-border-mid rounded-lg p-4 bg-bg-main">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2.5 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
            Quick Reboot Commands
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            {isAdb ? (
              <>
                <button
                  onClick={() => handleReboot("normal")}
                  className="py-2 px-2 bg-bg-surface border border-border-mid hover:bg-border-mid text-text-primary text-[10px] font-bold rounded transition-all text-center"
                >
                  System
                </button>
                <button
                  onClick={() => handleReboot("bootloader")}
                  className="py-2 px-2 bg-bg-surface border border-border-mid hover:bg-border-mid text-text-primary text-[10px] font-bold rounded transition-all text-center"
                >
                  Bootloader
                </button>
                <button
                  onClick={() => handleReboot("recovery")}
                  className="py-2 px-2 bg-bg-surface border border-border-mid hover:bg-border-mid text-text-primary text-[10px] font-bold rounded transition-all text-center"
                >
                  Recovery
                </button>
              </>
            ) : isFastboot ? (
              <>
                <button
                  onClick={() => handleReboot("fastboot-reboot")}
                  className="py-2 px-2 bg-bg-surface border border-border-mid hover:bg-border-mid text-text-primary text-[10px] font-bold rounded transition-all text-center"
                >
                  System
                </button>
                <button
                  onClick={() => handleReboot("fastboot-recovery")}
                  className="py-2 px-2 bg-bg-surface border border-border-mid hover:bg-border-mid text-text-primary text-[10px] font-bold rounded transition-all text-center"
                >
                  Recovery
                </button>
                <button
                  onClick={() => handleReboot("fastboot-fastboot")}
                  className="py-2 px-2 bg-bg-surface border border-border-mid hover:bg-border-mid text-text-primary text-[10px] font-bold rounded transition-all text-center"
                >
                  Fastboot
                </button>
              </>
            ) : (
              <span className="text-xs text-text-secondary col-span-3">No quick reboots available.</span>
            )}
          </div>
        </div>

        {/* Flash Partition / Sideload */}
        <div className="border border-border-mid rounded-lg p-4 bg-bg-main">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2.5 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-primary" />
            Direct Flash / Sideload
          </h3>

          {isFastboot ? (
            <form onSubmit={handleFlash} className="flex items-center gap-2">
              <select
                value={partition}
                onChange={(e) => setPartition(e.target.value)}
                className="px-2 py-1.5 bg-bg-surface border border-border-mid text-xs rounded text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="boot">boot</option>
                <option value="recovery">recovery</option>
                <option value="system">system</option>
                <option value="vbmeta">vbmeta</option>
                <option value="splash">splash</option>
              </select>
              <input
                type="text"
                placeholder="IMG path..."
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                required
                className="flex-1 min-w-0 px-2 py-1.5 border border-border-mid rounded text-xs bg-bg-main text-text-primary focus:outline-none focus:border-primary font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded hover:bg-primary-hover transition-all"
              >
                Flash
              </button>
            </form>
          ) : device.mode === "sideload" ? (
            <form onSubmit={handleSideload} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="ZIP path..."
                value={sideloadPath}
                onChange={(e) => setSideloadPath(e.target.value)}
                required
                className="flex-1 min-w-0 px-2 py-1.5 border border-border-mid rounded text-xs bg-bg-main text-text-primary focus:outline-none focus:border-primary font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded hover:bg-primary-hover transition-all"
              >
                Sideload
              </button>
            </form>
          ) : (
            <div className="text-xs text-text-secondary italic pt-1">
              Requires Fastboot mode to Flash, or Recovery Sideload mode to Sideload.
            </div>
          )}
        </div>
      </div>

      {/* Expanded Live Console Log (Middle Panel) */}
      <div className="flex flex-col border border-border-mid rounded-lg overflow-hidden bg-bg-surface flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 py-2 bg-bg-main border-b border-border-mid flex-shrink-0">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            Log Console Output
          </span>
          <button
            onClick={clearBackendLogs}
            className="text-text-secondary hover:text-text-primary transition-all p-1"
            title="Clear Console Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live log entries */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-1 bg-bg-surface text-text-primary select-text">
          {logs.length === 0 ? (
            <span className="text-text-secondary italic text-center py-12">Console log is currently empty.</span>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap">{log}</div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Persistent Custom Command Runner Bar (Bottom Panel) */}
      <div className="border border-border-mid rounded-lg bg-bg-main p-3.5 flex-shrink-0">
        <form onSubmit={handleCustomCommand} className="flex gap-2 items-center">
          {/* Preset Commands Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  setCustomCommand(e.target.value);
                  e.target.value = ""; // Reset select label
                }
              }}
              defaultValue=""
              className="px-2 py-2 bg-bg-surface border border-border-mid text-xs rounded text-text-primary font-bold focus:outline-none focus:border-primary cursor-pointer hover:bg-border-mid transition-all"
            >
              <option value="" disabled>Preset Cmds...</option>
              {PRESET_COMMANDS.map((preset, index) => (
                <option key={index} value={preset.cmd}>{preset.label}</option>
              ))}
            </select>
          </div>

          {/* Text Input */}
          <div className="flex-1 flex border border-border-mid rounded bg-bg-surface overflow-hidden items-center focus-within:border-primary transition-all">
            <div className="pl-3 pr-1 text-text-secondary text-xs flex items-center gap-1">
              <CmdIcon className="w-3.5 h-3.5" />
              <ChevronRight className="w-3 h-3" />
            </div>
            <input
              type="text"
              placeholder="Type custom adb or fastboot command (e.g. adb devices, fastboot reboot)..."
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              disabled={executing}
              className="w-full px-1 py-2 text-xs bg-transparent text-text-primary focus:outline-none font-mono disabled:opacity-50"
            />
          </div>

          {/* Run Button */}
          <button
            type="submit"
            disabled={executing || !customCommand.trim()}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
          >
            {executing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Execute
          </button>
        </form>
      </div>

    </div>
  );
}
