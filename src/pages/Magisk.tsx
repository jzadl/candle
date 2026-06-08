import { useState } from "react";
import { Sliders, Cpu, CheckCircle, Flame, Hammer, AlertTriangle } from "lucide-react";
import FilePicker from "../components/FilePicker";

export default function Magisk() {
  const [bootPath, setBootPath] = useState("");
  const [outputPath, setOutputPath] = useState("/home/jzadl/Candle/scratch/magisk_patched.img");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const handlePatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootPath.trim() || !outputPath.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/magisk/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boot_path: bootPath, output_path: outputPath })
      });
      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setErrorMsg(data.detail || "Magisk patching failed.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend api.");
    } finally {
      setLoading(false);
    }
  };

  const handleFlashPatched = async () => {
    setLoading(true);
    setErrorMsg(null);
    setActionMsg(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/commands/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `fastboot flash boot ${outputPath}` })
      });
      if (response.ok) {
        setActionMsg("Fastboot boot flash command sent. View active log console.");
      } else {
        setErrorMsg("Failed to flash patched image.");
      }
    } catch (err) {
      setErrorMsg("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 max-w-4xl w-full mx-auto select-none">
      <div className="flex items-center justify-between border-b border-border-mid pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Magisk Boot Patcher</h1>
          <p className="text-sm text-text-secondary mt-1">Patch Android stock boot.img partition files using local Magisk binaries</p>
        </div>
      </div>

      {/* Untested Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs rounded-lg">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-600" />
        <div>
          <span className="font-bold">Experimental - Untested</span>
          <p className="mt-0.5 text-yellow-700">Magisk patching has not been fully tested. Always verify on a non-production device before flashing.</p>
        </div>
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

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg flex items-center justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Boot image successfully patched at {outputPath}!</span>
          <button onClick={() => setSuccess(false)} className="hover:text-emerald-900 font-bold">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <form onSubmit={handlePatch} className="border border-border-mid bg-bg-main rounded-lg p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-primary" /> Patcher Settings
          </h3>

          <FilePicker
            value={bootPath}
            onChange={setBootPath}
            mode="file"
            label="Stock Boot Image (boot.img)"
            placeholder="/absolute/path/to/stock/boot.img"
          />

          <FilePicker
            value={outputPath}
            onChange={setOutputPath}
            mode="file"
            label="Patched Destination"
            placeholder="/path/to/magisk_patched.img"
          />

          <div className="flex gap-2.5 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5"
            >
              <Hammer className="w-4 h-4" />
              Patch Boot Image
            </button>

            {success && (
              <button
                type="button"
                onClick={handleFlashPatched}
                disabled={loading}
                className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5"
              >
                <Flame className="w-4 h-4 animate-pulse" />
                Flash Boot Partition
              </button>
            )}
          </div>
        </form>

        <div className="border border-border-mid bg-bg-surface rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-text-secondary" /> Magisk patch instructions
            </h3>

            <ol className="text-xs text-text-secondary leading-relaxed flex flex-col gap-3 list-decimal pl-4 select-text">
              <li>
                Extract the <code>boot.img</code> file from your device stock firmware/fastboot ROM package.
              </li>
              <li>
                Select the path to the boot file and click <strong>Patch Boot Image</strong> to run the Magisk unpacking, patching, and rebuilding scripts.
              </li>
              <li>
                Reboot your device to <strong>Fastboot Mode</strong> and click <strong>Flash Boot Partition</strong> to overwrite the stock kernel, granting system-wide root permissions.
              </li>
            </ol>
          </div>

          <div className="p-3 bg-bg-main border border-border-mid rounded-lg text-xs leading-relaxed text-text-secondary mt-4">
            If the local <code>magiskboot</code> tool is missing, the patch request will fail.
          </div>
        </div>
      </div>
    </div>
  );
}
