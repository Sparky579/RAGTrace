<template>
  <div class="validation-panel">
    <div class="panel-header">
      <h2>改进验证</h2>
      <div class="validation-controls">
        <button class="control-btn primary">运行验证</button>
        <select class="validation-select">
          <option value="all">全部问题</option>
          <option value="sample">抽样验证</option>
          <option value="specific">特定问题</option>
        </select>
      </div>
    </div>
    
    <div class="metrics-overview">
      <h3 class="section-title">指标概览</h3>
      <div class="metrics-comparison">
        <ImprovementMetrics title="改进前" type="before" />
        <div class="comparison-arrow">→</div>
        <ImprovementMetrics title="改进后" type="after" />
      </div>
    </div>
    
    <div class="validation-grid">
      <div class="validation-card">
        <h3 class="section-title">PCA分析</h3>
        <div class="validation-visualization">
          <VisualizationPlaceholder type="pca" />
        </div>
      </div>
      
      <div class="validation-card">
        <h3 class="section-title">指标分布</h3>
        <div class="validation-visualization">
          <VisualizationPlaceholder type="distribution" />
        </div>
      </div>
      
      <div class="validation-card wide-card">
        <h3 class="section-title">案例分析</h3>
        <div class="case-comparison">
          <div class="case-section">
            <h4>改进前</h4>
            <div class="placeholder">示例问题改进前的回答...</div>
          </div>
          
          <div class="case-section">
            <h4>改进后</h4>
            <div class="placeholder">示例问题改进后的回答...</div>
          </div>
        </div>
      </div>
      
      <div class="validation-card">
        <h3 class="section-title">自定义指标</h3>
        <div class="custom-metrics-form">
          <div class="form-group">
            <label>指标名称</label>
            <input type="text" placeholder="输入指标名称" />
          </div>
          <div class="form-group">
            <label>计算公式</label>
            <input type="text" placeholder="输入计算公式" />
          </div>
          <button class="control-btn">添加</button>
        </div>
      </div>
      
      <div class="validation-card">
        <h3 class="section-title">雷达图</h3>
        <div class="validation-visualization">
          <VisualizationPlaceholder type="radar" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import VisualizationPlaceholder from '../overview/VisualizationPlaceholder.vue';
import ImprovementMetrics from './ImprovementMetrics.vue';
</script>

<style scoped>
.validation-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.validation-controls {
  display: flex;
  gap: 12px;
}

.control-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.control-btn.primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.validation-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.metrics-overview {
  margin-bottom: 16px;
}

.metrics-comparison {
  display: flex;
  align-items: center;
  justify-content: center;
}

.comparison-arrow {
  font-size: 24px;
  margin: 0 24px;
  color: var(--primary-color);
}

.validation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.validation-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  background-color: white;
}

.wide-card {
  grid-column: span 2;
}

.validation-visualization {
  height: 220px;
}

.case-comparison {
  display: flex;
  gap: 20px;
}

.case-section {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: #f8f9fa;
}

.case-section h4 {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.custom-metrics-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 14px;
  color: #666;
}

.form-group input {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
</style> 