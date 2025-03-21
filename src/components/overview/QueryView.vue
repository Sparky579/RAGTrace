<template>
  <div class="query-view">
    <div v-if="!currentQuestion" class="no-data">
      <div class="empty-state">
        <div class="empty-icon">?</div>
        <div class="empty-text">请在左侧选择一个问题</div>
      </div>
    </div>
    
    <div v-else class="query-content">
      <h4 class="section-title">问题详情</h4>
      
      <div class="query-body">
        <div class="question-section">
          <div class="question-text" v-html="highlightedQuestion"></div>
        </div>
        
        <div class="ground-truth-section" v-if="groundTruth">
          <div class="ground-truth-text" v-html="highlightedGroundTruth"></div>
        </div>
        
        <div class="force-analysis">
          <div class="force-metrics">
            <div class="force-metric">
              <div class="metric-label" style="color: #E74C3C">BLEU分数:</div>
              <div class="metric-bar">
                <div class="metric-value" :style="{ width: `${metrics.retrievalFailure * 100}%`, backgroundColor: '#E74C3C' }"></div>
              </div>
              <div class="metric-percent">{{ formatPercent(metrics.retrievalFailure) }}</div>
            </div>
            
            <div class="force-metric">
              <div class="metric-label" style="color: #F1C40F">嵌入相似度:</div>
              <div class="metric-bar">
                <div class="metric-value" :style="{ width: `${metrics.promptFragility * 100}%`, backgroundColor: '#F1C40F' }"></div>
              </div>
              <div class="metric-percent">{{ formatPercent(metrics.promptFragility) }}</div>
            </div>
            
            <div class="force-metric">
              <div class="metric-label" style="color: #3498DB">幻觉指数:</div>
              <div class="metric-bar">
                <div class="metric-value" :style="{ width: `${metrics.generationAnomaly * 100}%`, backgroundColor: '#3498DB' }"></div>
              </div>
              <div class="metric-percent">{{ formatPercent(metrics.generationAnomaly) }}</div>
            </div>
            
            <!-- <div class="force-metric">
              <div class="metric-label" style="color: #2ECC71">标准异常:</div>
              <div class="metric-bar">
                <div class="metric-value" :style="{ width: `${metrics.standardDeviation * 100}%`, backgroundColor: '#2ECC71' }"></div>
              </div>
              <div class="metric-percent">{{ formatPercent(metrics.standardDeviation) }}</div>
            </div> -->
          </div>
        </div>
        
        <div class="metadata-section">
          <div class="metadata-item">
            <span class="metadata-label">问题ID:</span>
            <span class="metadata-value">{{ currentQuestionId }}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">问题类型:</span>
            <span class="metadata-value">{{ getQuestionType() }}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">相关文档块:</span>
            <span class="metadata-value">{{ relatedChunks.length }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useQuestionStore } from '../../store/questionStore';

const questionStore = useQuestionStore();
const questionData = ref([]);
const namedEntities = ref([]);

// 从store获取当前问题
const currentQuestionId = computed(() => questionStore.currentQuestionId);
const currentQuestion = computed(() => questionStore.currentQuestion);
const relatedChunks = computed(() => ["1", "2", "3"]);

// 随机生成的指标数据（因为问题分析还没连接真实数据）
const metrics = ref({
  retrievalFailure: Math.random() * 0.7 + 0.1,    // 0.1-0.8
  promptFragility: Math.random() * 0.5 + 0.2,     // 0.2-0.7
  generationAnomaly: Math.random() * 0.6 + 0.1,   // 0.1-0.7
  standardDeviation: Math.random() * 0.4 + 0.3    // 0.3-0.7
});

// 获取问题的ground truth
const groundTruth = ref(null);

// 格式化百分比
const formatPercent = (value) => {
  return `${Math.round(value * 100)}%`;
};

// 监听问题ID变化
watch(() => currentQuestionId.value, async (newId) => {
  if (newId) {
    await loadQuestionData(newId);
    // 当问题变化时，重新生成随机指标
    refreshMetrics();
  } else {
    groundTruth.value = null;
  }
}, { immediate: true });

// 每次查询变化时重新生成随机指标
function refreshMetrics() {
  metrics.value = {
    retrievalFailure: Math.random() * 0.7 + 0.1,    // 0.1-0.8
    promptFragility: Math.random() * 0.5 + 0.2,     // 0.2-0.7
    generationAnomaly: Math.random() * 0.6 + 0.1,   // 0.1-0.7
    standardDeviation: Math.random() * 0.4 + 0.3    // 0.3-0.7
  };
}

// 加载问题数据
async function loadQuestionData(id) {
  try {
    if (!questionData.value.length) {
      // 加载result8数据
      const dataModule = await import('../../statics/result8.json');
      questionData.value = dataModule.default || [];
    }
    
    // 查找对应ID的问题
    const question = questionData.value[id-1];
    console.log('加载问题数据:', question);
    if (question) {
      // 不要检查gt字段存在，直接赋值，如果不存在会是undefined
      groundTruth.value = question.gt;
      console.log('加载问题数据成功:', { id, text: question.text, gt: question.gt });
      
      // 提取命名实体（这里模拟一下，实际应该从数据中获取或使用NLP工具）
      extractNamedEntities(question.text);
    } else {
      console.warn('未找到对应ID的问题:', id);
      groundTruth.value = null;
    }
  } catch (error) {
    console.error('加载问题数据失败:', error);
    groundTruth.value = null;
  }
}

// 提取命名实体（简单模拟）
function extractNamedEntities(text) {
  if (!text) return;
  
  // 这里用简单的词表匹配来模拟命名实体识别
  // 实际项目中应使用更复杂的NLP工具
  const commonEntities = [
    "中国", "美国", "俄罗斯", "英国", "法国", "德国", "日本", 
    "北京", "上海", "广州", "深圳", "纽约", "伦敦", "巴黎",
    "2020", "2021", "2022", "2023", "COVID-19", "人工智能", "机器学习",
    "GPT", "Transformer", "BERT", "RAG", "检索增强生成"
  ];
  
  const foundEntities = [];
  
  commonEntities.forEach(entity => {
    if (text.includes(entity)) {
      foundEntities.push(entity);
    }
  });
  
  namedEntities.value = foundEntities;
}

// 高亮问题文本中的命名实体
const highlightedQuestion = computed(() => {
  if (!currentQuestion.value) return '';
  return highlightEntities(currentQuestion.value);
});

// 高亮ground truth中的命名实体
const highlightedGroundTruth = computed(() => {
  if (!groundTruth.value) return '';
  return highlightEntities(groundTruth.value);
});

// 高亮文本中的命名实体
function highlightEntities(text) {
  if (!text || !namedEntities.value.length) return text;
  
  let result = text;
  namedEntities.value.forEach(entity => {
    const regex = new RegExp(entity, 'g');
    result = result.replace(regex, `<span class="entity-highlight">${entity}</span>`);
  });
  
  return result;
}

// 获取问题类型
function getQuestionType() {
  if (!currentQuestionId.value || !questionData.value.length) return '未知';
  
  const question = questionData.value.find(q => q.id == currentQuestionId.value);
  if (!question || !question.type) return 'undefined';
  
  const typeMap = {
    'factual': '事实型',
    'reasoning': '推理型',
    'generation': '生成型',
    'complex': '复杂型'
  };
  
  return typeMap[question.type] || question.type;
}

// 组件挂载时加载数据
onMounted(async () => {
  try {
    // 预加载问题数据
    const dataModule = await import('../../statics/result8.json');
    questionData.value = dataModule.default || [];
    
    // 如果已经有选中的问题ID，加载该问题数据
    if (currentQuestionId.value) {
      await loadQuestionData(currentQuestionId.value);
    }
  } catch (error) {
    console.error('加载问题数据失败:', error);
  }
});
</script>

<style scoped>
.query-view {
  width: 100%;
  height: 100%;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-title {
  margin: 0;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  background-color: #f8f9fa;
  border-bottom: 1px solid var(--border-color, #ddd);
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #aaa;
}

.empty-icon {
  font-size: 48px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #eee;
  border-radius: 50%;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

.query-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.query-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section-label {
  font-weight: 500;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
}

.question-section, .ground-truth-section, .force-analysis, .metadata-section {
  margin-bottom: 24px;
}

.question-text, .ground-truth-text {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
  line-height: 1.5;
  max-height: 150px;
  overflow-y: auto;
  font-size: 14px;
  color: #333;
}

.ground-truth-text {
  background-color: #f7f9ea;
  border-left: 3px solid #bada55;
}

.force-metrics {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
}

.force-metric {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.force-metric:last-child {
  margin-bottom: 0;
}

.metric-label {
  width: 120px;
  font-size: 13px;
  font-weight: 500;
}

.metric-bar {
  flex: 1;
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin: 0 10px;
}

.metric-value {
  height: 100%;
  border-radius: 4px;
}

.metric-percent {
  width: 40px;
  font-size: 12px;
  text-align: right;
}

.metadata-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.metadata-item {
  background-color: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.metadata-label {
  color: #777;
  margin-right: 8px;
}

.metadata-value {
  font-weight: 500;
  color: #333;
}

.entity-highlight {
  background-color: rgba(255, 220, 0, 0.3);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
}
</style> 