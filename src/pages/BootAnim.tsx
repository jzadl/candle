import { useState } from "react";
import { Film, Settings, Folder, CheckCircle, Flame, HelpCircle, AlertTriangle } from "lucide-react";
import FilePicker from "../components/FilePicker";

export default function BootAnim() {
  const [framesSource, setFramesSource] = useState("");
  const [outputZip, setOutputZip] = useState("/home/jzadl/Candle/scratch/bootanimation.zip");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(2400);
  const [fps, setFps] = useState(30);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!framesSource.trim() || !outputZip.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/bootanim/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          output_zip: outputZip,
          frames_source: framesSource,
          width: Number(width),
          height: Number(height),
          fps: Number(fps)
        })
      });
      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setErrorMsg(data.detail || "Boot animation compilation failed.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend api.");
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    setLoading(true);
    setErrorMsg(null);
    setActionMessage(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/commands/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `adb push ${outputZip} /data/local/bootanimation.zip` })
      });
      if (response.ok) {
        setActionMessage("Dispatched adb push command. Inspect logs in console tab.");
      } else {
        setErrorMsg("Failed to push boot animation.");
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
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Boot Animation Creator</h1>
          <p className="text-sm text-text-secondary mt-1">Compile image sequences into a valid, zero-compression Android bootanimation.zip</p>
        </div>
      </div>

      {/* Untested Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs rounded-lg">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-600" />
        <div>
          <span className="font-bold">Experimental — Untested</span>
          <p className="mt-0.5 text-yellow-700">Boot animation creation has not been tested on real devices. The compiled ZIP may not work on all Android versions or OEM variants. Use at your own risk.</p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-bg-surface border border-border-mid rounded-lg text-xs font-semibold text-text-primary flex justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-text-secondary hover:text-text-primary font-bold">Dismiss</button>
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
          <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Bootanimation successfully built at {outputZip}!</span>
          <button onClick={() => setSuccess(false)} className="hover:text-emerald-900 font-bold">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <form onSubmit={handleBuild} className="border border-border-mid bg-bg-main rounded-lg p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-primary" /> Animation Setup
          </h3>

          <FilePicker
            value={framesSource}
            onChange={setFramesSource}
            mode="file"
            label="Frames Source (.mp4 Video or Folder)"
            placeholder="/path/to/animation.mp4 or directory"
          />

          <FilePicker
            value={outputZip}
            onChange={setOutputZip}
            mode="file"
            label="Output Zip Path"
            placeholder="/path/to/bootanimation.zip"
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-text-secondary">Width</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-text-secondary">Height</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-text-secondary">FPS</label>
              <input
                type="number"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5"
            >
              <Film className="w-4 h-4" />
              Compile ZIP
            </button>

            {success && (
              <button
                type="button"
                onClick={handlePush}
                disabled={loading}
                className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5"
              >
                <Flame className="w-4 h-4" />
                Push to Device
              </button>
            )}
          </div>
        </form>

        <div className="border border-border-mid bg-bg-surface rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-text-secondary" /> How it works
            </h3>
            
            <ul className="text-xs text-text-secondary leading-relaxed flex flex-col gap-3 list-disc pl-4 select-text">
              <li>
                <strong>Video or Images:</strong> You can select an .mp4 file or a folder of sequential images (e.g. <code>0000.png</code>). Videos are split into frames automatically.
              </li>
              <li>
                <strong>No Compression:</strong> Android's boot system requires the ZIP archive to be completely uncompressed (stored).
              </li>
              <li>
                <strong>Target Directory:</strong> Devices can load custom bootanimations from <code>/data/local/bootanimation.zip</code> or <code>/system/media/bootanimation.zip</code>.
              </li>
            </ul>
          </div>

          <div className="p-3.5 bg-bg-main border border-border-mid rounded-lg text-xs font-semibold text-text-primary flex items-center gap-2 mt-4">
            <Folder className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Default output: /home/jzadl/Candle/scratch/bootanimation.zip</span>
          </div>
        </div>
      </div>
    </div>
  );
}
