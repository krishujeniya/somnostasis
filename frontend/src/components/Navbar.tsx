import React from 'react';
import { Activity, Cpu, Layers, GitBranch, Shield, Database } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  championModel: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, championModel }) => {
  const tabs = [
    { id: 'predict', label: 'Inference Studio', icon: Activity },
    { id: 'batch', label: 'Batch Processing', icon: Database },
    { id: 'models', label: 'Model Registry', icon: Cpu },
    { id: 'monitoring', label: 'Drift & Telemetry', icon: Layers },
    { id: 'pipelines', label: 'Retraining Pipelines', icon: GitBranch },
    { id: 'apikeys', label: 'API Keys & SDK', icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/[0.08] bg-[#09090d]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Logotype */}
          <Logo size={38} showText={true} />

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-zinc-900/60 p-1 rounded-xl border border-white/[0.06]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg btn-tactile ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-sm border border-white/[0.08]'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active Champion Badge & Status */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400">Champion:</span>
              <span className="text-[11px] font-mono font-medium text-emerald-300 capitalize">
                {championModel.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Scroll */}
        <div className="flex md:hidden overflow-x-auto space-x-2 py-2 border-t border-white/[0.04]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium rounded-md ${
                  isActive ? 'bg-zinc-800 text-white border border-white/10' : 'text-zinc-400'
                }`}
              >
                <Icon className="w-3 h-3 text-emerald-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
