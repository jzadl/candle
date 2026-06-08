import { useState, useEffect } from "react";
import { Cpu, ShieldAlert, Key, Download, Upload, AlertCircle } from "lucide-react";

interface Device {
  serial: string;
  mode: string;
  state: string;
}

export default function Brom() {
  const [device, setDevice] = useState<Device | null>(null);
  const [mtkStatus, setMtkStatus] = useState<{ platform: string; is_mtk: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const checkDevice = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/devices");
        if (response.ok) {
          const data = await response.json();
          const active = data[0];
          setDevice(active || null);
          
          if (active && active.mode === "normal") {
            const mtkResp = await fetch(`http://127.0.0.1:8000/api/mtk/detect?serial=${active.serial}`);
            if (mtkResp.ok) {
              const mtkData = await mtkResp.json();
              setMtkStatus(mtkData);
            }
          } else {
            setMtkStatus(null);
          }
        }
      } catch (e) {
        setDevice(null);
        setMtkStatus(null);
      }
    };
    checkDevice();
    const interval = setInterval(checkDevice, 4000);
    return () => clearInterval(interval);
  }, []);

  const triggerAction = async (action: string) => {
    setLoading(true);
    setActionMsg(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/mtk/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, serial: device?.serial })
      });
      if (response.ok) {
        const data = await response.json();
        setActionMsg(data.message);
      } else {
        setActionMsg("Failed to execute BROM action");
      }
    } catch (e) {
      setActionMsg("Connection error: API offline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 max-w-4xl w-full mx-auto select-none">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border-mid pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">MediaTek BROM Unlock</h1>
          <p className="text-sm text-text-secondary mt-1">Guided MediaTek chipset bootloader unlock & flashing wizard</p>
        </div>
      </div>

      {actionMsg && (
        <div className="flex items-center justify-between p-3.5 bg-bg-surface border border-border-mid rounded-lg text-xs font-semibold text-text-primary">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-text-secondary hover:text-text-primary font-bold">Dismiss</button>
        </div>
      )}

      {/* Guided steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className={`border rounded-lg p-4 transition-all ${
          step === 1 ? "border-primary bg-bg-main" : "border-border-mid bg-bg-surface/50"
        }`} onClick={() => setStep(1)}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
              step === 1 ? "bg-primary text-white" : "bg-border-mid text-text-secondary"
            }`}>1</span>
            <h3 className="text-xs font-bold uppercase text-text-primary">Power Off</h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Turn off your MediaTek device completely. Disconnect the USB cable. Wait 5 seconds for complete shutdown.
          </p>
        </div>

        {/* Step 2 */}
        <div className={`border rounded-lg p-4 transition-all ${
          step === 2 ? "border-primary bg-bg-main" : "border-border-mid bg-bg-surface/50"
        }`} onClick={() => setStep(2)}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
              step === 2 ? "bg-primary text-white" : "bg-border-mid text-text-secondary"
            }`}>2</span>
            <h3 className="text-xs font-bold uppercase text-text-primary">Press Keys</h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Press and hold both **Volume Up** and **Volume Down** buttons simultaneously (or Volume Down only on some devices).
          </p>
        </div>

        {/* Step 3 */}
        <div className={`border rounded-lg p-4 transition-all ${
          step === 3 ? "border-primary bg-bg-main" : "border-border-mid bg-bg-surface/50"
        }`} onClick={() => setStep(3)}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
              step === 3 ? "bg-primary text-white" : "bg-border-mid text-text-secondary"
            }`}>3</span>
            <h3 className="text-xs font-bold uppercase text-text-primary">Connect USB</h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            While holding the volume buttons, plug the USB cable into your computer. Release keys once device is detected.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
        {/* Actions panel */}
        <div className="border border-border-mid bg-bg-main rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3">BROM Operations</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Once the device is booted into BROM (handshake stage), you can perform the following actions using MTKClient wrappers.
            </p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => triggerAction("unlock")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-xs font-bold rounded hover:bg-primary-hover disabled:opacity-50 transition-all"
              >
                <Key className="w-3.5 h-3.5" />
                Unlock Bootloader (BROM)
              </button>

              <button
                onClick={() => triggerAction("lock")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-bg-surface border border-border-mid text-text-primary text-xs font-bold rounded hover:bg-border-mid disabled:opacity-50 transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-text-secondary" />
                Relock Bootloader (BROM)
              </button>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => triggerAction("dump_boot")}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 py-2 bg-bg-surface border border-border-mid text-text-primary text-xs font-semibold rounded hover:bg-border-mid disabled:opacity-50 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-text-secondary" />
                  Dump Boot
                </button>
                <button
                  onClick={() => triggerAction("flash_payload")}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 py-2 bg-bg-surface border border-border-mid text-text-primary text-xs font-semibold rounded hover:bg-border-mid disabled:opacity-50 transition-all"
                >
                  <Upload className="w-3.5 h-3.5 text-text-secondary" />
                  Flash Payload
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border-mid pt-4 mt-6 flex justify-between text-xs text-text-secondary">
            <span>Guide Step:</span>
            <div className="flex gap-1.5">
              <button onClick={() => setStep(s => Math.max(1, s-1))} className="hover:text-text-primary font-bold">Prev</button>
              <span>|</span>
              <button onClick={() => setStep(s => Math.min(3, s+1))} className="hover:text-text-primary font-bold">Next</button>
            </div>
          </div>
        </div>

        {/* Status panel */}
        <div className="border border-border-mid bg-bg-surface rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3">Chipset & Status Info</h3>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between border-b border-border-mid pb-2">
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-text-secondary" /> Chipset Platform:
                </span>
                <span className="text-xs font-mono font-bold text-text-primary uppercase">
                  {mtkStatus ? mtkStatus.platform : "Checking..."}
                </span>
              </div>
              <div className="flex justify-between border-b border-border-mid pb-2">
                <span className="text-xs text-text-secondary">MTK Chipset Detected:</span>
                <span className={`text-xs font-bold ${
                  mtkStatus?.is_mtk ? "text-primary" : "text-text-secondary"
                }`}>
                  {mtkStatus ? (mtkStatus.is_mtk ? "Yes (Supported)" : "No") : "Unknown"}
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-xs text-text-secondary">Active Connection Mode:</span>
                <span className="text-xs font-bold text-text-primary uppercase">
                  {device ? device.mode : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-bg-main border border-border-mid rounded-lg text-xs leading-relaxed text-text-secondary flex gap-2 items-start mt-4">
            <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              <strong>MediaTek warning:</strong> Bootloader operations can brick your device if preloader signatures mismatch. Ensure correct payload files before flashing.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
