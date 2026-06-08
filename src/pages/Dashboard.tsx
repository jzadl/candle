import { useEffect, useState } from "react";
import { RefreshCw, Monitor, CheckCircle, XCircle, Shield, AlertTriangle } from "lucide-react";

interface Device {
  serial: string;
  mode: string;
  state: string;
  model: string;
  android_version: string;
  manufacturer: string;
  bootloader_locked: string;
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/devices");
      if (!response.ok) throw new Error("Failed to communicate with local service");
      const data = await response.json();
      setDevices(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000);
    return () => clearInterval(interval);
  }, []);

  const device = devices[0]; // Active device

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between border-b border-border-mid pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Device Status</h1>
          <p className="text-sm text-text-secondary mt-1">Automatic USB device connection monitoring</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchDevices();
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border border-border-mid rounded-lg text-xs font-semibold text-text-primary hover:bg-border-mid transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Force Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-bg-surface border-l-4 border-primary text-text-primary rounded-r-lg">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Connection Error</p>
            <p className="text-xs text-text-secondary">{error}. Ensure the local FastAPI service is running.</p>
          </div>
        </div>
      )}

      {!device ? (
        <div className="flex flex-col items-center justify-center border border-border-mid border-dashed rounded-lg p-12 bg-bg-main text-center">
          <Monitor className="w-12 h-12 text-text-secondary mb-4" />
          <h2 className="text-lg font-bold text-text-primary">No Android device detected</h2>
          <p className="text-sm text-text-secondary mt-1 max-w-sm">
            Connect your device via USB with USB Debugging enabled, or boot it into Recovery or Fastboot mode.
          </p>
          <div className="flex flex-col items-start text-left bg-bg-surface border border-border-mid rounded p-4 mt-6 text-xs text-text-secondary w-full max-w-md font-mono">
            <span className="font-bold text-text-primary mb-1">Troubleshooting:</span>
            <span>1. Check your USB cable and connection.</span>
            <span>2. Enable Developer Options & USB Debugging on your phone.</span>
            <span>3. Allow USB debugging authorization prompt on your phone's screen.</span>
            <span>4. Run 'adb devices' in terminal to check manually.</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Status */}
          <div className="border border-border-mid bg-bg-surface rounded-lg p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">Active Connection</span>
              <div className="flex items-center gap-3 mt-2">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
                </span>
                <span className="text-xl font-bold uppercase tracking-tight text-text-primary">{device.mode} MODE</span>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Device State: <code className="bg-bg-main px-1 py-0.5 rounded border border-border-mid font-mono text-text-primary">{device.state}</code>
              </p>
            </div>
            
            <div className="border-t border-border-mid pt-4 mt-6 flex items-center justify-between">
              <span className="text-xs text-text-secondary font-mono">Serial Number:</span>
              <span className="text-xs font-mono font-bold text-text-primary">{device.serial}</span>
            </div>
          </div>

          {/* Details */}
          <div className="border border-border-mid bg-bg-main rounded-lg p-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-text-primary mb-3">Device Properties</h3>
            
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between border-b border-bg-surface pb-1.5">
                <span className="text-xs text-text-secondary">Manufacturer:</span>
                <span className="text-xs font-bold text-text-primary">{device.manufacturer}</span>
              </div>
              <div className="flex justify-between border-b border-bg-surface pb-1.5">
                <span className="text-xs text-text-secondary">Model:</span>
                <span className="text-xs font-bold text-text-primary">{device.model}</span>
              </div>
              <div className="flex justify-between border-b border-bg-surface pb-1.5">
                <span className="text-xs text-text-secondary">Android Version:</span>
                <span className="text-xs font-mono font-bold text-text-primary">{device.android_version}</span>
              </div>
              <div className="flex justify-between pb-0.5">
                <span className="text-xs text-text-secondary">Bootloader Status:</span>
                <span className={`text-xs font-bold flex items-center gap-1 ${
                  device.bootloader_locked === "Unlocked" ? "text-primary" : "text-text-primary"
                }`}>
                  {device.bootloader_locked === "Unlocked" ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Unlocked
                    </>
                  ) : device.bootloader_locked === "Locked" ? (
                    <>
                      <Shield className="w-3.5 h-3.5" /> Locked
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-text-secondary" /> Unknown
                    </>
                  )}
                </span>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-[10px] text-text-secondary italic text-center">
                System properties are read in real-time from device system props.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
