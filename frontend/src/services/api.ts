import {
  BiosignalInput,
  PredictionResponse,
  BatchPredictResponse,
  ExplainResponse,
  ModelRecord,
  TelemetrySummary,
  DriftResponse,
  PipelineRun,
  APIKey,
  CreatedAPIKey,
} from '../types';

const VERCEL_API_URL = 'https://somnostasis.vercel.app';
const API_BASE = (import.meta as any).env?.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('github.io') ? `${VERCEL_API_URL}/api/v1` : '/api/v1');

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  async predictSingle(features: BiosignalInput, modelKey?: string): Promise<PredictionResponse> {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features, model_key: modelKey }),
    });
    return handleResponse<PredictionResponse>(res);
  },

  async predictBatch(samples: BiosignalInput[], modelKey?: string): Promise<BatchPredictResponse> {
    const res = await fetch(`${API_BASE}/predict/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples, model_key: modelKey }),
    });
    return handleResponse<BatchPredictResponse>(res);
  },

  async predictCsv(file: File, modelKey?: string): Promise<BatchPredictResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const url = modelKey ? `${API_BASE}/predict/csv?model_key=${encodeURIComponent(modelKey)}` : `${API_BASE}/predict/csv`;
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<BatchPredictResponse>(res);
  },

  async getExplanation(features: BiosignalInput, modelKey?: string): Promise<ExplainResponse> {
    const res = await fetch(`${API_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features, model_key: modelKey }),
    });
    return handleResponse<ExplainResponse>(res);
  },

  async listModels(): Promise<ModelRecord[]> {
    const res = await fetch(`${API_BASE}/models`);
    return handleResponse<ModelRecord[]>(res);
  },

  async promoteModel(key: string, stage: string = 'Production'): Promise<ModelRecord> {
    const res = await fetch(`${API_BASE}/models/${encodeURIComponent(key)}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    return handleResponse<ModelRecord>(res);
  },

  async getTelemetry(): Promise<TelemetrySummary> {
    const res = await fetch(`${API_BASE}/monitoring/telemetry`);
    return handleResponse<TelemetrySummary>(res);
  },

  async getDrift(simulateDrift: boolean = false): Promise<DriftResponse> {
    const res = await fetch(`${API_BASE}/monitoring/drift?simulate_drift=${simulateDrift}`);
    return handleResponse<DriftResponse>(res);
  },

  async listPipelineRuns(): Promise<PipelineRun[]> {
    const res = await fetch(`${API_BASE}/pipelines/runs`);
    return handleResponse<PipelineRun[]>(res);
  },

  async triggerRetraining(params: {
    test_size?: number;
    random_state?: number;
    rf_n_estimators?: number;
    xgb_max_depth?: number;
    mlp_epochs?: number;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/pipelines/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<any>(res);
  },

  async submitFeedback(predictionId: number, actualClass: number, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prediction_id: predictionId, actual_class: actualClass, notes }),
    });
    return handleResponse<any>(res);
  },

  async listApiKeys(): Promise<APIKey[]> {
    const res = await fetch(`${API_BASE}/auth/api-keys`);
    return handleResponse<APIKey[]>(res);
  },

  async createApiKey(name: string): Promise<CreatedAPIKey> {
    const res = await fetch(`${API_BASE}/auth/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse<CreatedAPIKey>(res);
  },

  async revokeApiKey(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/api-keys/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(res);
  },
};
