---
title: "STA: Spatio-Temporal Attack on E2E Autonomous Driving via Spatio-Temporal Modeling"
collection: publications
category: conferences
permalink: /publication/ijcai-sta-e2e-autonomous-driving
excerpt: >
  We propose STA, a physically deployable spatio-temporal adversarial attack that directly degrades trajectory planning in end-to-end autonomous driving by combining dynamic rendering and temporal gradient-path optimization.
date: 2026-02-01
venue: "IJCAI"
#paperurl: "/files/STA_spatio_temporal_attack.pdf"
# citation: >
#   To be Declared.
---

### Overview  
This paper presents **STA (Spatio-Temporal Attack)**, a physically realizable adversarial framework for **end-to-end autonomous driving (E2E AD)**.  
Unlike prior attacks that mainly target perception outputs or rely on global digital perturbations, STA directly attacks **trajectory planning** under temporal BEV pipelines by modeling both spatial deployment constraints and cross-frame temporal dependencies.

### Key Contributions  
- Proposes the first physically deployable patch attack framework tailored for **trajectory prediction** in E2E AD systems.  
- Introduces a differentiable **Dynamic Rendering (DR)** module to enforce spatio-temporal consistency of patch placement across consecutive frames.  
- Introduces **Gradient Path Aggregation and Optimization (GPAO)** to backpropagate temporal gradients from final planning outputs through BEV temporal chains.  
- Validates the method on both perception-based and perception-free E2E AD models, with additional physical-world simulation in **CARLA**.

### Methods  
- Learns universal adversarial patches under fixed semantic placement configurations and camera calibration constraints.  
- Uses DR to project patches into multi-view image sequences while preserving geometric consistency during ego-motion.  
- Optimizes a joint objective: planning loss + BEV feature loss (`L_GPAO = L_plan + L_BEV`), where supervision is applied at the final planning horizon with temporal gradient accumulation.

### Results  
STA significantly increases trajectory deviation on nuScenes across three representative E2E AD models:

- **SSR**: average L2 deviation increases from **0.73** (clean) to **2.28** (STA temporal).  
- **VAD**: average L2 deviation increases from **0.83** (clean) to **3.09** (STA temporal).  
- **UniAD**: average L2 deviation increases from **0.93** (clean) to **7.44** (STA temporal), about **8.0x** over clean.  

Compared with non-temporal patch optimization, STA's temporal optimization further strengthens attacks and shows stable effectiveness in CARLA-based physical simulation, highlighting robustness risks at the planning level beyond perception.
