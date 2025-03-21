<template>
  <div class="problem-card" @click="goToDiagnostic">
    <div class="card-tag" :class="typeClass">{{ typeText }}</div>
    <h4 class="card-title">示例问题标题</h4>
    <p class="card-description">这是一个示例问题描述，展示问题的基本内容和属性...</p>
    
    <div class="card-metrics">
      <div class="metric">
        <span class="metric-label">准确率</span>
        <span class="metric-value">0.76</span>
      </div>
      <div class="metric">
        <span class="metric-label">检索精度</span>
        <span class="metric-value">0.82</span>
      </div>
    </div>
    
    <div class="card-actions">
      <button class="action-btn">查看详情</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// 随机生成问题类型，实际使用时应由props传入
const types = ['factual', 'reasoning', 'generation', 'complex'];
const randomType = types[Math.floor(Math.random() * types.length)];

const typeClass = computed(() => `type-${randomType}`);
const typeText = computed(() => {
  const typeMapping = {
    'factual': '事实型',
    'reasoning': '推理型',
    'generation': '生成型',
    'complex': '复杂型'
  };
  return typeMapping[randomType];
});

const goToDiagnostic = () => {
  // 实际项目中应该通过事件或router导航到诊断页面
  console.log('Navigate to diagnostic page');
};
</script>

<style scoped>
.problem-card {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.problem-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 12px;
}

.type-factual {
  background-color: #e3f2fd;
  color: #1976d2;
}

.type-reasoning {
  background-color: #e8f5e9;
  color: #388e3c;
}

.type-generation {
  background-color: #fff3e0;
  color: #f57c00;
}

.type-complex {
  background-color: #f3e5f5;
  color: #8e24aa;
}

.card-title {
  font-size: 16px;
  margin-bottom: 8px;
}

.card-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.card-metrics {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 12px;
  color: #666;
}

.metric-value {
  font-size: 16px;
  font-weight: 500;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  background-color: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: rgba(74, 110, 224, 0.1);
}
</style> 