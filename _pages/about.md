---
permalink: /
title: "Pandy Bright"
description: "Pandy Bright is a research assistant at CUHK interested in embodied intelligence and AIoT."
author_profile: true
show_map: true
redirect_from: 
  - /about/
  - /about.html
---
<div class="home-intro" data-spotlight>
  <div class="home-intro__copy">
    <p>I am a Research Assistant at <a href="https://cuhk.edu.hk/" target="_blank" rel="noopener noreferrer">The Chinese University of Hong Kong (CUHK)</a>. My current interests are <strong>embodied intelligence and AIoT</strong>. I am interested in how AI systems perceive and act in the physical world, and how AI models can connect to IoT devices for real-time interaction.</p>
    <p>I am seeking a PhD position in embodied intelligence and AIoT and welcome opportunities to collaborate.</p>

    <div class="home-actions">
      <a class="btn" href="{{ '/cv/' | relative_url }}">View CV</a>
      <a href="https://drive.google.com/file/d/1JdVlDGJCUTQCpAKiZNZ2YU-L5L2U-f_A/view?usp=sharing" target="_blank" rel="noopener noreferrer" aria-label="CV on Google Drive">CV <span aria-hidden="true">↗</span></a>
    </div>
  </div>
  <div class="home-intro__art" aria-hidden="true">
    <span class="home-intro__orbit"></span>
    <span class="home-intro__core"></span>
  </div>
</div>

## Background

I received my master's degree in Artificial Intelligence from CUHK and earned a B.Eng. in Computer Science from [Harbin Institute of Technology, Shenzhen (HITSZ)](https://www.hitsz.edu.cn/){:target="_blank" rel="noopener noreferrer"} under the supervision of Academician Fang Binxing. I was also an exchange student at the [National University of Singapore (NUS)](https://nus.edu.sg/){:target="_blank" rel="noopener noreferrer"}, supervised by [Colin Tan Keng Yan](https://www.comp.nus.edu.sg/cs/people/ctank/){:target="_blank" rel="noopener noreferrer"} and [Boyd Anderson](https://www.comp.nus.edu.sg/cs/people/boyd/){:target="_blank" rel="noopener noreferrer"}.

My earlier research focused on the robustness of autonomous driving perception, particularly systems that combine 3D detection, segmentation, and depth estimation.

## Recent Updates {#news}

<ul class="home-updates">
{% for update in site.talks reversed limit:3 %}
  <li>
    <time datetime="{{ update.date | date: '%Y-%m-%d' }}">{{ update.date | date: '%b %d, %Y' }}</time>
    <a href="{{ update.url | relative_url }}">{{ update.title | escape }}</a>
  </li>
{% endfor %}
</ul>
