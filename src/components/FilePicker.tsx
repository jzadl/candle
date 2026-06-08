import { useState, useEffect } from "react";
import { Folder, File, ChevronRight, X, Check } from "lucide-react";

interface FilePickerProps {
  value: string;
  onChange: (val: string) => void;
  mode: "file" | "directory";
  placeholder?: string;
  label?: string;
}

export default function FilePicker({ value, onChange, mode, placeholder, label }: FilePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const fetchDir = async (path?: string) => {
    try {
      let url = "http://127.0.0.1:8000/api/utils/explore";
      if (path) url += `?path=${encodeURIComponent(path)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCurrentPath(data.current_path);
        setFolders(data.folders);
        setFiles(data.files);
        setSelectedItem(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDir(value || undefined);
    }
  }, [isOpen]);

  const handleNavigate = (folder: string) => {
    const nextPath = currentPath === "/" ? `/${folder}` : `${currentPath}/${folder}`;
    fetchDir(nextPath);
  };

  const handleGoUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    const nextPath = parts.join("/") || "/";
    fetchDir(nextPath);
  };

  const handleSelect = (item: string) => {
    setSelectedItem(item);
  };

  const handleConfirm = () => {
    if (mode === "directory") {
      onChange(currentPath);
    } else if (selectedItem) {
      onChange(`${currentPath}/${selectedItem}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-[11px] font-bold uppercase text-text-secondary">{label}</label>}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-xs border border-border-mid rounded bg-bg-surface text-text-primary focus:outline-none focus:border-primary font-mono"
        />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3.5 py-2 bg-bg-surface border border-border-mid hover:bg-border-mid text-text-primary text-xs font-bold rounded transition-all"
        >
          Browse...
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-bg-main border border-border-mid rounded-xl w-full max-w-lg h-[450px] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-mid bg-bg-surface">
              <h3 className="text-xs font-bold uppercase text-text-primary">
                Select {mode === "directory" ? "Directory" : "File"}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-bg-surface border-b border-border-mid text-[11px] font-mono text-text-secondary flex items-center gap-1 overflow-x-auto whitespace-nowrap">
              <span onClick={() => fetchDir("/")} className="hover:text-primary cursor-pointer font-bold">/</span>
              {currentPath.split("/").filter(Boolean).map((part, idx, arr) => (
                <span key={idx} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-border-mid" />
                  <span
                    onClick={() => {
                      const target = "/" + arr.slice(0, idx + 1).join("/");
                      fetchDir(target);
                    }}
                    className="hover:text-primary cursor-pointer font-bold"
                  >
                    {part}
                  </span>
                </span>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
              {currentPath !== "/" && (
                <div
                  onClick={handleGoUp}
                  className="flex items-center gap-2.5 p-2 rounded hover:bg-border-mid text-xs font-bold text-text-primary cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-primary" />
                  <span>.. (Up one level)</span>
                </div>
              )}

              {folders.map((folder) => (
                <div
                  key={folder}
                  onClick={() => handleNavigate(folder)}
                  className="flex items-center justify-between p-2 rounded hover:bg-border-mid text-xs text-text-primary cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Folder className="w-4 h-4 text-primary" />
                    <span>{folder}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                </div>
              ))}

              {mode === "file" && files.map((file) => {
                const isSelected = selectedItem === file;
                return (
                  <div
                    key={file}
                    onClick={() => handleSelect(file)}
                    className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer ${
                      isSelected ? "bg-primary/10 border border-primary/20 text-primary font-bold" : "hover:bg-border-mid text-text-primary"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <File className="w-4 h-4 text-text-secondary" />
                      <span>{file}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border-mid bg-bg-surface flex justify-between items-center gap-4">
              <div className="text-[10px] text-text-secondary font-mono truncate max-w-[280px]">
                {mode === "directory" ? currentPath : selectedItem ? `${currentPath}/${selectedItem}` : "No item selected"}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 bg-bg-main border border-border-mid hover:bg-border-mid text-text-primary text-xs font-bold rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={mode === "file" && !selectedItem}
                  className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded disabled:opacity-50"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
