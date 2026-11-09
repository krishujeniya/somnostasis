export interface BiosignalInput {
  sr: number;  // Snoring rate
  rr: number;  // Respiration rate
  t: number;   // Body temperature
  lm: number;  // Limb movement
  bo: number;  // Blood oxygen
  rem: number; // Rapid eye movement
  sh: number;  // Sleeping hours
  hr: number;  // Heart rate
}

export interface PredictionResponse {
  prediction_id?: number;
  predicted_class: number;
  class_name: string;
  confidence: number;
  probabilities: Record<string, number>;
  model_key: string;
  model_version: string;
  latency_ms: number;
}

export interface BatchPredictResponse {
  total_samples: number;
  predictions: PredictionResponse[];
  class_distribution: Record<string, number>;
  mean_confidence: number;
  total_latency_ms: number;
}

export interface SHAPContribution {
  feature: string;
  display_name: string;
  value: number;
  shap_value: number;
  description: string;
}

export interface ExplainResponse {
  predicted_class: number;
  class_name: string;
  model_key: string;
  base_value: number;
  contributions: SHAPContribution[];
}

export interface ModelRecord {
  id: number;
  key: string;
  name: string;
  version: string;
  framework: string;
  stage: 'Production' | 'Staging' | 'Development' | 'Archived';
  is_champion: boolean;
  train_accuracy: number;
  test_accuracy: number;
  test_f1: number;
  test_precision: number;
  test_recall: number;
  fit_status: 'Optimal' | 'Overfit' | 'Underfit';
}

export interface FeatureDrift {
  feature: string;
  display_name: string;
  ks_statistic: number;
  ks_pvalue: number;
  ks_drift: boolean;
  psi: number;
  psi_drift: boolean;
  baseline_mean: number;
  current_mean: number;
  baseline_std: number;
  current_std: number;
}

export interface DriftResponse {
  overall_drift_detected: boolean;
  drift_score: number;
  sample_size: number;
  features: FeatureDrift[];
  alert_triggered: boolean;
}

export interface TelemetrySummary {
  total_predictions: number;
  today_predictions: number;
  mean_latency_ms: number;
  p95_latency_ms: number;
  active_champion: string;
  active_champion_version: string;
  drift_status: string;
  accuracy_estimate: number;
}

export interface PipelineRun {
  id: number;
  trigger_type: string;
  status: 'running' | 'completed' | 'failed';
  parameters: Record<string, any>;
  train_samples: number;
  test_samples: number;
  metrics: Record<string, any>;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface APIKey {
  id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export interface CreatedAPIKey extends APIKey {
  key: string;
}
