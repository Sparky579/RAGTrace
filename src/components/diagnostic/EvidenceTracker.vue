<template>
  <div class="evidence-panel">
    <h4 class="panel-title">Evidence Tracker</h4>
    <div class="evidence-list">
      <div 
        v-for="item in evidences" 
        :key="item.id" 
        class="evidence-item"
        :class="[
          getRelevanceClass(item.relevance),
          { 'evidence-selected': selectedEvidenceId === item.id }
        ]"
        @click="selectEvidence(item)"
      >
        <div class="evidence-header">
          <div class="evidence-source">{{ item.source }}</div>
          <div class="evidence-actions">
            <div class="accuracy-indicator" :class="getImpactClass(item)">
              <span class="impact-icon">{{ getImpactIcon(item) }}</span>
              <span class="impact-text">{{ getImpactText(item) }}</span>
            </div>
            <button 
              class="action-btn" 
              :class="{ 'active': item.isReferenced }" 
              @click.stop="toggleReference(item)"
            >
              {{ item.isReferenced ? 'Remove' : 'Add' }}
            </button>
          </div>
        </div>
        
        <div class="evidence-content">
          <div class="evidence-summary">{{ item.summary || getSummary(item) }}</div>
          
          <div class="connection-viz">
            <div class="chunk-entity">
              <div class="entity-chip">{{ item.sourceEntity }}</div>
            </div>
            <div class="arrow-container">
              <svg class="connection-arrow" width="60" height="24" viewBox="0 0 60 24">
                <path 
                  d="M0,12 L50,12" 
                  stroke="#666" 
                  stroke-width="2" 
                  fill="none"
                />
                <path 
                  d="M50,12 L44,8 L44,16 Z" 
                  fill="#666" 
                />
              </svg>
            </div>
            <div class="answer-entity">
              <div class="entity-chip answer">{{ item.answerEntity }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="evidences.length === 0" class="no-evidence">
        No evidence data available
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue';

// 使用类型注释方式替代直接导入
/**
 * @typedef {import('../../types/answer').Evidence} Evidence
 */

// 获取chunkStore
const chunkStore = inject('chunkStore');

// 证据数据
const evidences = ref([]);

// 当前选中的evidence ID
const selectedEvidenceId = ref(null);

// 导入真实数据
import sampleData from '../../statics/sample_answer.json';

// 初始化真实数据，确保所有证据默认不被添加
evidences.value = sampleData.evidences.map(evidence => ({
  ...evidence,
  isReferenced: false // 确保所有初始证据都设置为不引用
}));

// 提供更新证据的方法
/**
 * @param {Evidence[]} evidenceData 证据数据数组
 */
const updateEvidence = (evidenceData) => {
  console.log('EvidenceTracker接收到数据:', evidenceData);
  
  if (!evidenceData) {
    console.warn('EvidenceTracker收到空数据');
    return;
  }
  
  try {
    // 确保数据是数组格式
    const dataArray = Array.isArray(evidenceData) ? evidenceData : [evidenceData];
    
    // 避免空数组
    if (dataArray.length === 0) {
      console.warn('EvidenceTracker收到空数组');
      return;
    }
    
    // 使用结构化数据进行处理
    evidences.value = dataArray.map((item, index) => {
      // 确保item是对象
      const safeItem = typeof item === 'object' && item !== null ? item : {};
      
      // 生成唯一ID，如果没有提供
      const id = safeItem.id || `generated-chunk-${index}`;
      
      // 基本数据过滤和默认值设置
      return {
        id: id,
        source: safeItem.source || "Unknown Source",
        text: safeItem.text || "No content available",
        relevance: typeof safeItem.relevance === 'number' ? safeItem.relevance : 0.7,
        summary: safeItem.summary || getSummary(safeItem),
        sourceEntity: safeItem.sourceEntity || getDefaultSourceEntity(safeItem.source || ''),
        answerEntity: safeItem.answerEntity || getDefaultAnswerEntity(safeItem.source || ''),
        relatedChunkType: safeItem.relatedChunkType || 'I',
        relatedChunkIndex: typeof safeItem.relatedChunkIndex === 'number' ? safeItem.relatedChunkIndex : 0,
        isReferenced: false,
        impactMetric: typeof safeItem.impactMetric === 'number' ? safeItem.impactMetric : 0
      };
    });
    
    console.log('EvidenceTracker更新完成，处理后数据:', evidences.value);
  } catch (error) {
    console.error('处理证据数据时出错:', error);
    // 出错时保留现有数据，不做更改
  }
};

// 监听自定义更新事件
const handleCustomUpdateEvent = (event) => {
  if (event.detail && Array.isArray(event.detail.evidences)) {
    updateEvidence(event.detail.evidences);
  }
};

// 在组件挂载时添加事件监听
onMounted(() => {
  const panelElement = document.querySelector('.evidence-panel');
  if (panelElement) {
    panelElement.addEventListener('updateEvidences', handleCustomUpdateEvent);
  }
  
  // 在组件销毁时移除事件监听
  return () => {
    if (panelElement) {
      panelElement.removeEventListener('updateEvidences', handleCustomUpdateEvent);
    }
  };
});

// 选择evidence并高亮相关chunk
const selectEvidence = (item) => {
  // 如果点击的是已选中的evidence，取消选中
  if (selectedEvidenceId.value === item.id) {
    selectedEvidenceId.value = null;
  } else {
    // 设置选中ID
    selectedEvidenceId.value = item.id;
    // 高亮相关chunk
    highlightRelatedChunk(item);
  }
};

// 获取默认来源实体
const getDefaultSourceEntity = (source) => {
  if (!source) return 'Document Entity';
  return source.split(' ')[0];
};

// 获取默认答案实体
const getDefaultAnswerEntity = (source) => {
  if (!source) return 'Solution Entity';
  return 'Character';
};

// 获取源实体
const getSourceEntity = (item) => {
  return item.sourceEntity || 'Document Entity';
};

// 获取答案实体
const getAnswerEntity = (item) => {
  return item.answerEntity || 'Solution Entity';
};

// 获取证据相关性的CSS类
const getRelevanceClass = (relevance) => {
  if (!relevance) return '';
  if (relevance >= 0.8) return 'high-relevance';
  if (relevance >= 0.5) return 'medium-relevance';
  return 'low-relevance';
};

// 切换引用状态
const toggleReference = (item) => {
  item.isReferenced = !item.isReferenced;
};

// 生成摘要
const getSummary = (item) => {
  if (item.summary) return item.summary;
  // 没有summary时直接返回text内容
  return item.text || '';
};

// 获取指标影响类别
const getImpactClass = (item) => {
  const impact = item.impactMetric;
  if (impact > 0) return 'positive';
  if (impact === 0) return 'neutral';
  return 'negative';
};

// 获取指标影响图标
const getImpactIcon = (item) => {
  const impact = item.impactMetric;
  if (impact > 0) return '↑';
  if (impact === 0) return '―';
  return '↓';
};

// 获取指标影响文本
const getImpactText = (item) => {
  const impact = item.impactMetric;
  if (impact > 0) return 'Positive';
  if (impact === 0) return 'Neutral';
  return 'Negative';
};

// 点击evidence，高亮相关的chunk
const highlightRelatedChunk = (item) => {
  if (!chunkStore) return;
  
  // 获取关联的chunk信息，从evidenceData中读取
  const chunkType = item.relatedChunkType || 'I';
  const chunkIndex = item.relatedChunkIndex || 1;
  
  // 构建chunk标识符，例如 "I2"
  const chunkIdentifier = `${chunkType}${chunkIndex + 1}`;
  
  // 查找所有chunk节点
  const chunkNodes = document.querySelectorAll(`.chunk-dot[data-chunk="${chunkIdentifier}"]`);
  
  if (chunkNodes.length > 0) {
    // 获取第一个匹配的chunk节点
    const chunkNode = chunkNodes[0];
    
    // 获取父节点并触发点击事件，模拟用户点击
    const parentNode = chunkNode.closest('.chunk-node');
    if (parentNode) {
      parentNode.click();
    }
  }
};

// 获取选中或标记为引用的证据
const getSelectedEvidence = () => {
  // 返回所有标记为引用的证据
  return evidences.value.filter(item => item.isReferenced === true);
};

// 暴露给父组件的方法
defineExpose({
  updateEvidence,
  getSelectedEvidence
});
</script>

<style scoped>
.evidence-panel {
  border: 0px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-title {
  padding: 10px 12px;
  margin: 0;
  background-color: #f5f7fb;
  border-bottom: 1px solid var(--border-color);
  font-size: 16px;
  font-weight: 600;
}

.evidence-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evidence-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  background-color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: border-color 0.2s;
}

.evidence-item:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.evidence-item.evidence-selected {
  border-left: 3px solid #2196f3;
}

.evidence-item.high-relevance {
  border-left: 3px solid #4d7fa0;
}

.evidence-item.medium-relevance {
  border-left: 3px solid #4d7fa0;
}

.evidence-item.low-relevance {
  border-left: 3px solid #4d7fa0;
}

/* 选中状态的边框颜色优先级高于相关性颜色 */
.evidence-item.evidence-selected.high-relevance,
.evidence-item.evidence-selected.medium-relevance,
.evidence-item.evidence-selected.low-relevance {
  border-left: 3px solid #2196f3;
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.evidence-source {
  font-size: 16px;
  font-weight: 700;
}

.evidence-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  padding: 2px 8px;
  font-size: 16px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
}

.action-btn.active {
  background-color: #e8f5e9;
  border-color: #81c784;
  color: #2e7d32;
}

.action-btn.track-evidence {
  background-color: #1e3a8a;
  border-color: #1e3a8a;
  color: #ffffff;
}

.action-btn.track-evidence:hover {
  background-color: #1e40af;
  border-color: #1e40af;
}

.evidence-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.evidence-summary {
  font-size: 16px;
  line-height: 1.6;
}

.connection-viz {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
}

.arrow-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.connection-arrow {
  width: 100%;
  height: 24px;
}

.entity-chip {
  padding: 2px 6px;
  background-color: #d4e4f0;
  border: 1px solid #bbdefb;
  color: #4d7fa0;
  border-radius: 3px;
  font-size: 16px;
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-chip.answer {
  background-color: #e0f0e4;
  border-color: #c8e6c9;
  color: #4d9078;
}

.impact-icon {
  font-weight: bold;
}

.impact-text {
  font-size: 16px;
  font-weight: 500;
}

.accuracy-indicator {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 16px;
}

.accuracy-indicator.positive {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.accuracy-indicator.neutral {
  background-color: #f5f5f5;
  color: #616161;
}

.accuracy-indicator.negative {
  background-color: #ffebee;
  color: #c62828;
}

.no-evidence {
  color: #888;
  font-style: italic;
  text-align: center;
  padding: 12px 0;
  font-size: 16px;
}
</style> 