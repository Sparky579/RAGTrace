<template>
  <div class="evidence-panel">
    <h4>证据追踪</h4>
    <div class="evidence-list">
      <div 
        v-for="item in evidences" 
        :key="item.id" 
        class="evidence-item"
        :class="getRelevanceClass(item.relevance)"
      >
        <div class="evidence-source">{{ item.source }}</div>
        <div class="evidence-text">{{ item.text }}</div>
      </div>
      <div v-if="evidences.length === 0" class="no-evidence">
        暂无证据数据
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 使用类型注释方式替代直接导入
/**
 * @typedef {import('../../types/answer').Evidence} Evidence
 */

// 证据数据
const evidences = ref([]);

// 提供更新证据的方法
/**
 * @param {Evidence[]} evidenceData 证据数据数组
 */
const updateEvidence = (evidenceData) => {
  if (Array.isArray(evidenceData)) {
    evidences.value = evidenceData;
  } else {
    console.warn('接收到的证据数据不是数组格式');
  }
};

// 获取证据相关性的CSS类
const getRelevanceClass = (relevance) => {
  if (!relevance) return '';
  if (relevance >= 0.8) return 'high-relevance';
  if (relevance >= 0.5) return 'medium-relevance';
  return 'low-relevance';
};

// 暴露给父组件的方法
defineExpose({
  updateEvidence
});
</script>

<style scoped>
.evidence-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px;
  height: 100%;
}

.evidence-panel h4 {
  margin-top: 0;
  margin-bottom: 8px;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1;
}

.evidence-item {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: #f9f9f9;
}

.evidence-item.high-relevance {
  border-left: 3px solid #4caf50;
}

.evidence-item.medium-relevance {
  border-left: 3px solid #ff9800;
}

.evidence-item.low-relevance {
  border-left: 3px solid #f44336;
}

.evidence-source {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.evidence-text {
  font-size: 14px;
}

.no-evidence {
  color: #888;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}
</style> 