<template>
  <div class="overview-panel">
    <div class="panel-header">
      <h2>Problem Overview</h2>
      <div class="search-filter">
        <input type="text" placeholder="Search questions..." class="search-input" />
        <select class="filter-select">
          <option value="all">All question types</option>
          <option value="factual">Factual</option>
          <option value="reasoning">Reasoning</option>
          <option value="generation">Generation</option>
          <option value="complex">Complex</option>
        </select>
      </div>
    </div>
    
    <div class="visualization-area">
      <div class="visualization-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'heatmap' }" @click="activeTab = 'heatmap'">Heatmap</button>
        <button class="tab-btn" :class="{ active: activeTab === 'distribution' }" @click="activeTab = 'distribution'">Type Distribution</button>
        <button class="tab-btn" :class="{ active: activeTab === 'force' }" @click="activeTab = 'force'">Force Diagram</button>
      </div>
      
      <div class="visualization-container">
        <VisualizationPlaceholder v-if="activeTab === 'heatmap'" type="heatmap" />
        <TypeDistributionChart v-else-if="activeTab === 'distribution'" />
        <VisualizationPlaceholder v-else-if="activeTab === 'force'" type="force" />
      </div>
    </div>
    
    <div class="problems-list">
      <h3 class="section-title">Question List</h3>
      <div class="problems-grid"> 
        <ProblemCard v-for="i in 6" :key="i" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import VisualizationPlaceholder from './VisualizationPlaceholder.vue';
import ProblemCard from './ProblemCard.vue';
import TypeDistributionChart from './TypeDistributionChart.vue';

const activeTab = ref('distribution'); // 默认显示类型分布图
</script>

<style scoped>
.overview-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-filter {
  display: flex;
  gap: 12px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 240px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.visualization-area {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.visualization-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background-color: #f8f9fa;
}

.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  border-bottom-color: var(--primary-color);
  font-weight: 500;
}

.visualization-container {
  padding: 24px;
  height: 350px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.problems-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
</style> 