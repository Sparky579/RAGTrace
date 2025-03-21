<template>
  <div class="overview-panel">
    <div class="panel-header">
      <h2>问题概览</h2>
      <div class="search-filter">
        <input type="text" placeholder="搜索问题..." class="search-input" />
        <select class="filter-select">
          <option value="all">所有问题类型</option>
          <option value="factual">事实型</option>
          <option value="reasoning">推理型</option>
          <option value="generation">生成型</option>
          <option value="complex">复杂型</option>
        </select>
      </div>
    </div>
    
    <div class="visualization-area">
      <div class="visualization-tabs">
        <button class="tab-btn active">热力图</button>
        <button class="tab-btn">力导向图</button>
      </div>
      
      <div class="visualization-container">
        <VisualizationPlaceholder type="heatmap" />
      </div>
    </div>
    
    <div class="problems-list">
      <h3 class="section-title">问题列表</h3>
      <div class="problems-grid">
        <ProblemCard v-for="i in 6" :key="i" />
      </div>
    </div>
  </div>
</template>

<script setup>
import VisualizationPlaceholder from './VisualizationPlaceholder.vue';
import ProblemCard from './ProblemCard.vue';
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
  height: 400px;
}

.problems-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
</style> 