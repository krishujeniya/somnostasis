# Data Dictionary — SaYoPillow Biosignals

The dataset comprises 630 sleep epochs collected during polysomnography and physiological monitoring. Each record contains 8 physiological features and a multi-class stress label (0 through 4).

## Features

| Token | Feature Name | Unit | Normal Clinical Range | Description |
|---|---|---|---|---|
| `sr` | Snoring Rate | Acoustic index | 45.0 – 65.0 | Acoustic decibel and frequency analysis of snoring events. |
| `rr` | Respiration Rate | breaths/min | 12.0 – 20.0 | Frequency of breath cycles during sleep stages. |
| `t` | Body Temperature | °F | 97.0 – 99.0 | Nocturnal core body temperature. Normally decreases during slow-wave sleep. |
| `lm` | Limb Movement Rate | twitches/min | 4.0 – 9.0 | Frequency of spontaneous limb movements and micro-arousals. |
| `bo` | Blood Oxygen Saturation | % | 95.0 – 100.0 | Peripheral capillary oxygen saturation (SpO2). Drops indicate desaturation events. |
| `rem` | Rapid Eye Movement | index / min | 65.0 – 90.0 | Rapid eye movement activity denoting cognitive recovery sleep phases. |
| `sh` | Hours of Sleep | hours | 7.0 – 9.0 | Continuous sleep duration recorded prior to morning awakening. |
| `hr` | Heart Rate | BPM | 50.0 – 72.0 | Nocturnal resting heart rate recorded via photoplethysmography / ECG. |

## Target Classes (`sl`)

- **0**: Low / Normal Physiological Stress
- **1**: Medium Low Physiological Stress
- **2**: Medium Physiological Stress
- **3**: Medium High Physiological Stress
- **4**: High Physiological Stress
