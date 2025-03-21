<template>
  <div class="answer-panel">
    <div class="answer-heading">
      <div v-if="answerData" class="model-info">
        <span class="model-name">{{ answerData.model }}</span>
        <span class="confidence-score">置信度: {{ formatConfidence(answerData.confidence) }}</span>
      </div>
      <div v-else class="model-info">
        <span class="model-name">模型加载中...</span>
      </div>
      <div class="answer-actions">
        <button class="action-icon" title="查找内容">🔍</button>
        <button class="action-icon" title="复制到剪贴板" @click="copyAnswer">📋</button>
      </div>
    </div>
    
    <div class="answer-content" ref="answerContentRef">
      <div v-if="loading" class="loading-indicator">
        <span>正在生成答案...</span>
      </div>
      <div v-else-if="!answerData" class="empty-state">
        <p>答案将在这里显示</p>
      </div>
      <template v-else>
        <p v-for="(paragraph, index) in answerParagraphs" 
           :key="index" 
           v-html="paragraph"></p>
      </template>
    </div>
    
    <div class="answer-footer">
      <div class="entity-legend">
        <span class="legend-item"><span class="legend-color entity"></span>命名实体</span>
        <span class="legend-item"><span class="legend-color evidence"></span>证据支持</span>
        <span class="legend-item"><span class="legend-color uncertain"></span>不确定内容</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { convertAnswerToParagraphs } from '../../utils/textMarkUtils';

// 使用类型注释方式替代直接导入
/**
 * @typedef {import('../../types/answer').AnswerData} AnswerData
 */

// 答案数据
const answerData = ref(null);
const loading = ref(false);
const answerContentRef = ref(null);

// 格式化置信度分数
const formatConfidence = (confidence) => {
  if (typeof confidence !== 'number') return '未知';
  return confidence.toFixed(2);
};

// 计算带有标记的段落
const answerParagraphs = computed(() => {
  if (!answerData.value) return [];
  return convertAnswerToParagraphs(answerData.value);
});

// 复制答案到剪贴板
const copyAnswer = () => {
  if (!answerData.value) return;
  
  // 提取纯文本内容
  navigator.clipboard.writeText(answerData.value.text)
    .then(() => {
      alert('答案已复制到剪贴板');
    })
    .catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请手动选择内容复制');
    });
};

// 提供更新答案的方法
/**
 * @param {AnswerData} newAnswerData 新的答案数据
 */
const updateAnswer = (newAnswerData) => {
  loading.value = false;
  
  if (!newAnswerData) {
    console.warn('接收到的答案数据为空');
    return;
  }
  
  answerData.value = newAnswerData;
  
  // 滚动到答案内容顶部
  if (answerContentRef.value) {
    answerContentRef.value.scrollTop = 0;
  }
};

// 设置加载状态
const setLoading = (isLoading) => {
  loading.value = isLoading;
  if (isLoading) {
    answerData.value = null;
  }
};

// 暴露给父组件的方法
defineExpose({
  updateAnswer,
  setLoading
});
</script>

<style scoped>
.answer-panel {
  flex: 2;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.answer-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f7fb;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-color);
}

.model-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-name {
  font-weight: 500;
}

.confidence-score {
  font-size: 13px;
  color: #4caf50;
}

.answer-actions {
  display: flex;
  gap: 8px;
}

.action-icon {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}

.answer-content {
  padding: 12px;
  line-height: 1.5;
  flex: 1;
  overflow-y: auto;
}

/* 注意：这些CSS不能使用scoped，因为它们需要应用到v-html内的内容 */
:deep(.highlight) {
  padding: 2px 4px;
  border-radius: 3px;
}

:deep(.highlight.entity) {
  background-color: rgba(33, 150, 243, 0.15);
  border-bottom: 1px solid rgba(33, 150, 243, 0.4);
}

:deep(.highlight.evidence) {
  background-color: rgba(76, 175, 80, 0.15);
  border-bottom: 1px solid rgba(76, 175, 80, 0.4);
}

:deep(.highlight.uncertain) {
  background-color: rgba(255, 152, 0, 0.15);
  border-bottom: 1px solid rgba(255, 152, 0, 0.4);
}

.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  color: #666;
  font-style: italic;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  color: #888;
  font-style: italic;
}

.answer-footer {
  border-top: 1px solid var(--border-color);
  padding: 6px 12px;
  background-color: #f9f9f9;
}

.entity-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.entity {
  background-color: rgba(33, 150, 243, 0.15);
  border: 1px solid rgba(33, 150, 243, 0.4);
}

.legend-color.evidence {
  background-color: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.legend-color.uncertain {
  background-color: rgba(255, 152, 0, 0.15);
  border: 1px solid rgba(255, 152, 0, 0.4);
}
</style> 