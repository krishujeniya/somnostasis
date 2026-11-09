import React, { useState, useEffect } from 'react';
import { ModelRecord, TelemetrySummary } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { TelemetryBar } from './components/TelemetryBar';
import { PredictStudio } from './components/PredictStudio';
import { BatchStudio } from './components/BatchStudio';
import { ModelRegistryView } from './components/ModelRegistryView';
import { DriftMonitorView } from './components/DriftMonitorView';
import { RetrainingStudio } from './components/RetrainingStudio';
import { ApiKeyManager } from './components/ApiKeyManager';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('predict');
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadInitialData = async () => {
    try {
      const [modelsData, telemetryData] = await Promise.all([
        api.listModels(),
        api.getTelemetry(),
      ]);
      setModels(modelsData);
      setTelemetry(telemetryData);
    } catch (err) {
      console.error('Failed to load initial MLOps data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const champion = models.find((m) => m.is_champion)?.key || telemetry?.active_champion || 'Loading';

  return (
    <div className="app-shell min-h-screen text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        championModel={champion}
      />

      {/* Main Container */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="workspace-intro">
          <div>
            <p className="workspace-kicker">SLEEP BIOSIGNAL WORKSPACE</p>
            <h1>Inference studio</h1>
            <p className="workspace-description">Explore model predictions from sleep measurements, inspect feature contributions, and review service telemetry.</p>
          </div>
          <div className="workspace-model"><span className="model-dot" />Active champion <strong>{champion.replace(/_/g, ' ')}</strong></div>
        </div>
        {/* Real-time Telemetry KPI Bar */}
        <TelemetryBar telemetry={telemetry} loading={loading} />

        {/* Tab Content Routing */}
        <div className="transition-opacity duration-200">
          {activeTab === 'predict' && (
            <PredictStudio
              models={models}
              championKey={champion}
              onPredictionLogged={() => {
                api.getTelemetry().then(setTelemetry).catch(() => {});
              }}
            />
          )}

          {activeTab === 'batch' && (
            <BatchStudio models={models} championKey={champion} />
          )}

          {activeTab === 'models' && (
            <ModelRegistryView
              models={models}
              onRefresh={() => {
                api.listModels().then(setModels);
                api.getTelemetry().then(setTelemetry);
              }}
            />
          )}

          {activeTab === 'monitoring' && <DriftMonitorView />}

          {activeTab === 'pipelines' && <RetrainingStudio />}

          {activeTab === 'apikeys' && <ApiKeyManager />}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer border-t border-white/[0.04] py-4 text-center text-xs text-zinc-500">
        Somnostasis · Sleep biosignal model workspace · Research and demonstration use
      </footer>
    </div>
  );
};

export default App;
