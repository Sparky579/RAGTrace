# RAGTrace: Visualization & Diagnostic Platform for RAG

> **This repository is the official implementation of the paper:**
> **RAGTrace: Understanding and Refining Retrieval-Generation Dynamics in Retrieval-Augmented Generation**

## Project Overview
RAGTrace is a visualization and diagnostic platform for Retrieval-Augmented Generation (RAG) systems. It integrates multi-dimensional data analysis, visual exploration, interactive diagnostics, and sampling-based evaluation, helping developers and researchers deeply understand and optimize the retrieval and generation process of RAG systems.

## Key Features
- **Multi-dimensional Question Analysis**: Visualizes metrics such as retrieval, generation, and knowledge reliability.
- **Heatmap & Force-Directed Graphs**: Intuitive visualization of question distribution, similarity, and clustering.
- **Document Chunk Ranking & Tracking**: Ranks document chunks by relevance and visualizes evidence chains.
- **Answer Tracing & Evidence Analysis**: Visualizes answer generation and supporting evidence.
- **Interactive Prompt Builder**: Supports custom prompt creation and real-time answer generation.
- **Sampling & Performance Evaluation**: Built-in sampling settings, preview, and multi-metric radar chart analysis.
- **Advanced Filtering & Search**: Multi-condition filtering, search, and tag management for questions.

## Tech Stack
- **Frontend Framework**: Vue 3 + Pinia
- **Visualization Libraries**: D3.js, ECharts, Chart.js
- **Data Interaction**: Axios, native Fetch
- **Build Tool**: Vite
- **Automated Screenshot**: Puppeteer

## Main Components
- **UnifiedPanel.vue**: Main panel integrating all core visual and interactive areas.
- **HeatmapChart.vue**: Question distribution heatmap with clustering and highlighting.
- **ForceDiagramChart.vue**: Force-directed graph for multi-metric question analysis.
- **ChunkRanking.vue**: Document chunk relevance ranking and interaction.
- **AnswerTracing.vue**: Answer generation and evidence chain tracing.
- **PromptBuilder.vue**: Interactive prompt builder and answer generation.
- **RadarChartGrid.vue**: Multi-metric performance radar chart.
- **SamplingSettingsCard.vue**: Sampling parameter settings and preview.
- **FilterView.vue**: Multi-condition filtering and question selection.

## Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start local development**
   ```bash
   npm run dev
   ```
   Default address: http://localhost:5173
3. **Build for production**
   ```bash
   npm run build
   ```
4. **Automated screenshot**
   ```bash
   node screenshot.js
   ```
   Generates `screenshot.png` as a UI example.

## Screenshot Example
`screenshot.png` in the project root shows the main interface.

## Contribution & License
- Contributions via Issues and PRs are welcome.
- This project is licensed under the MIT License. 