---
title: "Bi-Level Optimization Framework for Robust Multi-Task Adversarial Attacks"
collection: publications
category: conferences
permalink: /publication/2025-multitask-adv-attack
excerpt: >
  We propose a bi-level optimization framework that generates universal adversarial patches capable of simultaneously degrading 3D object detection, semantic segmentation, and monocular depth estimation in multi-task autonomous driving systems.
date: 2025-08-01
venue: 'To be Submitted'
#paperurl: '/files/multitask_adv_attack.pdf'
citation: >
  To be Declared.
---

### Overview  
This work introduces a **universal multi-task adversarial attack framework** targeting state-of-the-art autonomous driving perception systems.  
Unlike prior attacks that focus on a single task (e.g., detection or depth), our method simultaneously disrupts:

- **3D Object Detection**  
- **Semantic Segmentation**  
- **Monocular Depth Estimation**

### Key Contributions  
- **Bi-level optimization formulation** enabling stable generation of universal patches.  
- **Dynamic loss reweighting** based on gradient conflict analysis, balancing multiple tasks automatically.  
- **Scene-oriented & object-oriented patch placement strategies** for diverse driving environments.  
- Extensive evaluation on **nuScenes** showing **30–45% performance degradation across tasks**.  

### Methods  
- Differentiable rendering and physical-world constraints.  
- Multi-task BEVFusion-based perception model pipeline.  
- Adaptive gradient balancing (softmax-weighted and conflict-aware).  

### Results  
Our adaptive bi-level optimization method significantly outperforms equal-weight and min-max baselines, providing new insights into the **robustness of multi-task autonomous driving models**.

---