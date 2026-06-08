import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Debloater from "./pages/Debloater";
import Commands from "./pages/Commands";
import Brom from "./pages/Brom";
import BootAnim from "./pages/BootAnim";
import Magisk from "./pages/Magisk";
import Mirror from "./pages/Mirror";

import {
  LayoutDashboard, Trash2, Terminal, Flame, Cpu,
  Film, Hammer, Monitor
} from "lucide-react";

type Tab = "dashboard" | "debloater" | "commands" | "brom" | "bootanim" | "magisk" | "mirror";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const navItems = [
    { id: "dashboard", label: "Device Status", icon: LayoutDashboard },
    { id: "debloater", label: "System Debloater", icon: Trash2 },
    { id: "commands", label: "ADB & Fastboot Console", icon: Terminal },
    { id: "brom", label: "MediaTek BROM", icon: Cpu },
    { id: "bootanim", label: "Boot Animation", icon: Film },
    { id: "magisk", label: "Magisk Patcher", icon: Hammer },
    { id: "mirror", label: "Screen Mirroring", icon: Monitor },
  ] as const;

  return (
    <div className="flex h-screen w-screen bg-bg-main text-text-primary overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-bg-surface border-r border-border-mid flex flex-col justify-between select-none flex-shrink-0">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Branding */}
          <div className="p-5 border-b border-border-mid flex items-center gap-3 flex-shrink-0">
            <div className="p-2 bg-primary rounded-lg text-white">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-text-primary">Candle</h1>
              <p className="text-[9px] text-text-secondary uppercase font-mono tracking-wider font-semibold">Android Toolkit</p>
            </div>
          </div>

          {/* Navigation Links - Scrollable if screen height is small */}
          <nav className="p-3 flex-1 overflow-y-auto flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 w-full px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${isActive
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-border-mid hover:text-text-primary"
                    }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer branding details */}
        <div className="p-4 border-t border-border-mid bg-bg-surface/50 text-[10px] text-text-secondary flex flex-col gap-0.5 font-mono flex-shrink-0">
          <span>Version: 0.2.2</span>
          <span>Author: Jzadl</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-bg-main relative">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "debloater" && <Debloater />}
        {activeTab === "commands" && <Commands />}
        {activeTab === "brom" && <Brom />}
        {activeTab === "bootanim" && <BootAnim />}
        {activeTab === "magisk" && <Magisk />}
        {activeTab === "mirror" && <Mirror />}
      </main>
    </div>
  );
}
