import { useEffect, useState } from "react";
import { 
  Trash2, ShieldAlert, CheckSquare, Square, Search, Filter, 
  Download, Upload, RefreshCw, AlertCircle, CheckCircle2 
} from "lucide-react";

interface Device {
  serial: string;
  mode: string;
  state: string;
  model: string;
}

interface BloatwareItem {
  package: string;
  name: string;
  description: string;
}

export default function Debloater() {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<string[]>([]);
  const [bloatware, setBloatware] = useState<BloatwareItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "bloat">("bloat");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Poll for connected device
  useEffect(() => {
    const checkDevice = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/devices");
        if (response.ok) {
          const data = await response.json();
          const adbDevice = data.find((d: any) => d.mode === "normal");
          setDevice(adbDevice || null);
        }
      } catch (e) {
        setDevice(null);
      }
    };
    
    checkDevice();
    const interval = setInterval(checkDevice, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch packages once device is detected
  const fetchPackages = async () => {
    if (!device) return;
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/debloater/packages?serial=${device.serial}`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data.all || []);
        setBloatware(data.bloat || []);
        // Pre-select recommended bloatware
        setSelected(data.bloat.map((b: any) => b.package));
      }
    } catch (e) {
      setPackages([]);
      setBloatware([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (device) {
      fetchPackages();
    } else {
      setPackages([]);
      setBloatware([]);
      setSelected([]);
      setLoading(false);
    }
  }, [device?.serial]);

  // Toggle selection
  const toggleSelect = (pkg: string) => {
    setSelected(prev => 
      prev.includes(pkg) ? prev.filter(p => p !== pkg) : [...prev, pkg]
    );
  };

  const selectAll = (visiblePackages: string[]) => {
    setSelected(prev => {
      const otherSelected = prev.filter(p => !visiblePackages.includes(p));
      const allSelected = [...otherSelected, ...visiblePackages];
      return allSelected;
    });
  };

  const deselectAll = (visiblePackages: string[]) => {
    setSelected(prev => prev.filter(p => !visiblePackages.includes(p)));
  };

  // Run uninstall
  const handleUninstall = async () => {
    if (!device || selected.length === 0) return;
    setActionInProgress(true);
    setStatusMsg(null);
    let successCount = 0;
    
    for (const pkg of selected) {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/debloater/uninstall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serial: device.serial, package: pkg })
        });
        if (response.ok) {
          successCount++;
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    setStatusMsg({
      type: "success",
      text: `Successfully uninstalled ${successCount} of ${selected.length} selected packages`
    });
    setSelected([]);
    setActionInProgress(false);
    fetchPackages();
  };

  // Run disable
  const handleDisable = async () => {
    if (!device || selected.length === 0) return;
    setActionInProgress(true);
    setStatusMsg(null);
    let successCount = 0;
    
    for (const pkg of selected) {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/debloater/disable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serial: device.serial, package: pkg })
        });
        if (response.ok) {
          successCount++;
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    setStatusMsg({
      type: "success",
      text: `Successfully disabled ${successCount} of ${selected.length} selected packages`
    });
    setSelected([]);
    setActionInProgress(false);
    fetchPackages();
  };

  // Export selected list
  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selected));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `candle_debloat_backup_${device?.serial || "device"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import selected list
  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            setSelected(parsed);
            setStatusMsg({ type: "success", text: `Imported list with ${parsed.length} items.` });
          } else {
            setStatusMsg({ type: "error", text: "Invalid file structure." });
          }
        } catch (err) {
          setStatusMsg({ type: "error", text: "Failed to parse JSON backup file." });
        }
      };
    }
  };

  // Process and filter lists
  const getVisibleList = () => {
    if (filter === "bloat") {
      return bloatware.filter(item => 
        item.package.toLowerCase().includes(search.toLowerCase()) || 
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    } else {
      return packages
        .filter(pkg => pkg.toLowerCase().includes(search.toLowerCase()))
        .map(pkg => ({
          package: pkg,
          name: pkg.split(".").pop() || pkg,
          description: "System App Package"
        }));
    }
  };

  const visibleList = getVisibleList();
  const visiblePackagesOnly = visibleList.map(item => item.package);
  const isAllVisibleSelected = visiblePackagesOnly.length > 0 && visiblePackagesOnly.every(p => selected.includes(p));

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-4xl mx-auto w-full">
        <ShieldAlert className="w-12 h-12 text-text-secondary mb-4" />
        <h2 className="text-lg font-bold text-text-primary">Debloater requires an active device</h2>
        <p className="text-sm text-text-secondary mt-1 max-w-sm">
          Please connect your Android device with USB Debugging enabled. The device must be in normal mode, not Fastboot or Recovery.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-4xl w-full mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border-mid pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">System App Debloater</h1>
          <p className="text-sm text-text-secondary mt-1">
            Connected to: <span className="font-semibold text-text-primary">{device.model}</span> ({device.serial})
          </p>
        </div>
        <button
          onClick={fetchPackages}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border border-border-mid rounded-lg text-xs font-semibold text-text-primary hover:bg-border-mid transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload Apps
        </button>
      </div>

      {/* Status Notifications */}
      {statusMsg && (
        <div className={`flex items-center gap-3 p-4 border-l-4 rounded-r-lg ${
          statusMsg.type === "success" 
            ? "bg-bg-surface border-primary text-text-primary" 
            : "bg-bg-surface border-red-500 text-text-primary"
        }`}>
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="text-xs font-semibold">{statusMsg.text}</span>
        </div>
      )}

      {/* Control Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-bg-surface border border-border-mid rounded-lg p-4">
        {/* Left Side: Operations */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUninstall}
            disabled={selected.length === 0 || actionInProgress}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Uninstall Selected ({selected.length})
          </button>
          <button
            onClick={handleDisable}
            disabled={selected.length === 0 || actionInProgress}
            className="flex items-center gap-2 px-4 py-2 bg-bg-main border border-border-mid text-text-primary text-xs font-bold rounded-lg hover:bg-border-mid disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-text-secondary" />
            Disable Selected ({selected.length})
          </button>
        </div>

        {/* Right Side: Backup/Restore templates */}
        <div className="flex items-center md:justify-end gap-3 border-t md:border-t-0 border-border-mid pt-3 md:pt-0">
          <button
            onClick={exportBackup}
            disabled={selected.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-main border border-border-mid text-text-secondary text-xs rounded hover:text-text-primary hover:border-text-secondary transition-all"
            title="Export selected packages list to backup file"
          >
            <Download className="w-3.5 h-3.5" />
            Export List
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-main border border-border-mid text-text-secondary text-xs rounded hover:text-text-primary hover:border-text-secondary cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5" />
            Import List
            <input
              type="file"
              accept=".json"
              onChange={importBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Tab filters */}
        <div className="flex bg-bg-surface border border-border-mid p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setFilter("bloat")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              filter === "bloat" 
                ? "bg-primary text-white" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Recommended Bloatware ({bloatware.length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              filter === "all" 
                ? "bg-primary text-white" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            All System Apps ({packages.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by name or package..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border-mid rounded-lg text-xs bg-bg-main text-text-primary focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Packages Table / List */}
      <div className="border border-border-mid rounded-lg overflow-hidden bg-bg-main flex-1">
        {/* Header */}
        <div className="flex items-center justify-between bg-bg-surface border-b border-border-mid px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => isAllVisibleSelected ? deselectAll(visiblePackagesOnly) : selectAll(visiblePackagesOnly)}
              className="text-text-secondary hover:text-primary transition-all"
            >
              {isAllVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <span className="text-xs font-bold text-text-primary">Select All Visible ({visibleList.length})</span>
          </div>
          <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">
            {selected.length} items checked
          </span>
        </div>

        {/* List Content */}
        <div className="flex flex-col divide-y divide-border-mid max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <RefreshCw className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs font-medium">Scanning device packages...</span>
            </div>
          ) : visibleList.length === 0 ? (
            <div className="py-12 text-center text-text-secondary text-xs">
              No packages found matching search criteria.
            </div>
          ) : (
            visibleList.map((item) => {
              const isChecked = selected.includes(item.package);
              return (
                <div 
                  key={item.package}
                  onClick={() => toggleSelect(item.package)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-bg-surface cursor-pointer transition-all ${
                    isChecked ? "bg-bg-surface/50" : ""
                  }`}
                >
                  <button className="mt-0.5 text-text-secondary hover:text-primary transition-all">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                      <span className="text-xs font-bold text-text-primary truncate">{item.name}</span>
                      <code className="text-[10px] font-mono text-text-secondary truncate bg-bg-main border border-border-mid px-1 py-0.5 rounded w-max">{item.package}</code>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-text-secondary mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
