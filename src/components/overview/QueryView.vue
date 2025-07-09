<template>
  <div class="query-view">
    <div v-if="!currentQuestion" class="no-data">
      <div class="empty-state">
        <div class="empty-icon">?</div>
        <div class="empty-text">Please select a question on the left</div>
      </div>
    </div>
    
    <div v-else class="query-content">
      <h4 class="section-title"><strong>Question Details</strong></h4>
      
      <div class="query-body" style="overflow: hidden;">
        <div class="question-section">
          <div class="question-text" v-html="highlightedQuestion"></div>
        </div>
        
        <!-- 标准答案部分 -->
        <div class="answer-section standard-answer">
          <!-- <div class="section-label">标准答案</div> -->
          <div class="answer-text" v-html="highlightedGroundTruth"></div>
        </div>
        
        <!-- 模型答案部分 -->
        <div class="answer-section model-answer">
          <!-- <div class="section-label">模型答案</div> -->
          <div class="answer-text" v-html="highlightedModelAnswer"></div>
        </div>
        
        <!-- 词云部分 -->
        <!-- <div class="word-cloud-section">
          <div class="section-label">词频分析</div>
          <div class="word-cloud-container">
            <div class="word-cloud">
              <span v-for="(word, index) in wordCloudData" 
                    :key="index" 
                    :class="word.type" 
                    :style="{ fontSize: word.size + 'px' }">
                {{ word.text }}
              </span>
            </div>
          </div>
        </div> -->
        
        <div class="force-analysis">
          <div class="force-metrics">
            <div class="metrics-row">
              <div class="force-metric">
                <div class="metric-label" style="color: #e09192">Retrieval Failure:</div>
                <div class="metric-bar">
                  <div class="metric-value" :style="{ width: `${metrics.retrievalFailure * 100}%`, backgroundColor: '#e09192' }"></div>
                </div>
                <div class="metric-percent">{{ formatPercent(metrics.retrievalFailure) }}</div>
              </div>
              
              <div class="force-metric">
                <div class="metric-label" style="color: #dbc076">Retrieval Instability:</div>
                <div class="metric-bar">
                  <div class="metric-value" :style="{ width: `${metrics.promptFragility * 100}%`, backgroundColor: '#dbc076' }"></div>
                </div>
                <div class="metric-percent">{{ formatPercent(metrics.promptFragility) }}</div>
              </div>
            </div>
            
            <div class="metrics-row">
              <div class="force-metric">
                <div class="metric-label" style="color: #c5a3d0">Knowledge Unreliability:</div>
                <div class="metric-bar">
                  <div class="metric-value" :style="{ width: `${metrics.standardDeviation * 100}%`, backgroundColor: '#c5a3d0' }"></div>
                </div>
                <div class="metric-percent">{{ formatPercent(metrics.standardDeviation) }}</div>
              </div>
              
              <div class="force-metric">
                <div class="metric-label" style="color: #7eb0d5">Generation Unreliability:</div>
                <div class="metric-bar">
                  <div class="metric-value" :style="{ width: `${metrics.generationAnomaly * 100}%`, backgroundColor: '#7eb0d5' }"></div>
                </div>
                <div class="metric-percent">{{ formatPercent(metrics.generationAnomaly) }}</div>
              </div>
            </div>
            
            <div class="metrics-row">
              <div class="force-metric">
                <div class="metric-label" style="color: #34495E">Question Correctness:</div>
                <div class="metric-bar">
                  <div class="metric-value" :style="{ width: `${metrics.correctness * 100}%`, backgroundColor: '#34495E' }"></div>
                </div>
                <div class="metric-percent">{{ formatPercent(metrics.correctness) }}</div>
              </div>
              
              <div class="force-metric">
                <div class="metric-label" style="color: #34495E">Topic Relevance:</div>
                <div class="metric-bar">
                  <div class="metric-value" :style="{ width: `${metrics.relevance * 100}%`, backgroundColor: '#34495E' }"></div>
                </div>
                <div class="metric-percent">{{ formatPercent(metrics.relevance) }}</div>
              </div>
            </div>
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

// 直接从result8.json获取groundTruth和modelAnswer
const groundTruth = computed(() => {
  if (!currentQuestion.value || !currentQuestionId.value) return null;
  
  let gtValue = null;
  
  // 优先使用currentQuestion.gt
  if (currentQuestion.value.gt) {
    gtValue = currentQuestion.value.gt;
    console.log('[调试-QueryView] 从currentQuestion获取gt:', gtValue);
  }
  // 尝试从预加载数据中获取
  else if (questionData.value.length > 0) {
    const id = parseInt(currentQuestionId.value);
    const question = questionData.value[id-1];
    if (question?.gt) {
      gtValue = question.gt;
      console.log('[调试-QueryView] 从预加载数据获取gt:', gtValue);
    }
  }
  else {
    gtValue = "No ground truth available";
    console.log('[调试-QueryView] 设置默认gt');
  }
  
  // 更新store中的groundTruth值
  if (gtValue && gtValue !== questionStore.currentGroundTruth) {
    console.log('[调试-QueryView] 尝试更新store中的gt:', gtValue);
    
    // 首先检查方法是否存在
    if (typeof questionStore.setCurrentGroundTruth === 'function') {
      console.log('[调试-QueryView] 使用setCurrentGroundTruth方法');
      questionStore.setCurrentGroundTruth(gtValue);
    } else {
      // 直接设置属性
      console.log('[调试-QueryView] 直接设置store属性');
      questionStore.currentGroundTruth = gtValue;
    }
    
    // 确认是否设置成功
    console.log('[调试-QueryView] 设置后store中的gt:', questionStore.currentGroundTruth);
    
    // 同时保存到localStorage，作为备份
    try {
      localStorage.setItem('currentGroundTruth', gtValue);
      console.log('[调试-QueryView] 已保存到localStorage');
    } catch (e) {
      console.error('[调试-QueryView] 无法保存到localStorage', e);
    }
    
    // 设置为全局变量
    window.currentGroundTruth = gtValue;
    console.log('[调试-QueryView] 已设置为全局变量');
  }
  
  return gtValue;
});

const modelAnswer = computed(() => {
  if (!currentQuestion.value || !currentQuestionId.value) return null;
  
  // 优先使用currentQuestion.answer
  if (currentQuestion.value.answer) {
    return currentQuestion.value.answer;
  }
  
  // 尝试从预加载数据中获取
  if (questionData.value.length > 0) {
    const id = parseInt(currentQuestionId.value);
    const question = questionData.value[id-1];
    if (question?.answer) {
      return question.answer;
    }
  }
  
  return "No answer available";
});

// 随机生成的指标数据（因为问题分析还没连接真实数据）
const metrics = ref({
  retrievalFailure: 0.0,
  promptFragility: 0.0,
  generationAnomaly: 0.0,
  standardDeviation: 0.0,
  correctness: 0.0,
  relevance: 0.0
});

// 词云数据
const wordCloudData = ref([]);

// 生成样例词云数据
function generateWordCloudData() {
  // 减少每个类别的词数量
  const suspiciousWords = ['allegedly', 'possibly', 'rumor', 'reportedly', 'perhaps'];
  const correctWords = ['evidence', 'proven', 'research', 'confirmed', 'verified'];
  const neutralWords = ['is', 'the', 'of', 'and', 'to'];
  
  const data = [];
  
  // 添加可疑词（红色）- 减小字体大小范围
  suspiciousWords.forEach(word => {
    data.push({
      text: word,
      size: Math.floor(Math.random() * 10) + 14, // 14-24px
      type: 'suspicious'
    });
  });
  
  // 添加正确词（绿色）- 减小字体大小范围
  correctWords.forEach(word => {
    data.push({
      text: word,
      size: Math.floor(Math.random() * 10) + 16, // 16-26px
      type: 'correct'
    });
  });
  
  // 添加中性词（黑色）- 减小字体大小范围
  neutralWords.forEach(word => {
    data.push({
      text: word,
      size: Math.floor(Math.random() * 8) + 12, // 12-20px
      type: 'neutral'
    });
  });
  
  return data;
}

// 格式化百分比
const formatPercent = (value) => {
  return `${Math.round(value * 100)}%`;
};

// 监听问题ID变化
watch(() => currentQuestionId.value, async (newId) => {
  console.log('==== QueryView监听到currentQuestionId变化 ====');
  console.log('新的问题ID:', newId);
  console.log('当前问题状态:', currentQuestion.value);
  
  if (newId) {
    await loadQuestionData(newId);
    // 当问题变化时，重新生成指标和词云
    console.log('当前选中问题:', currentQuestion.value);
    refreshMetrics();
    wordCloudData.value = generateWordCloudData();
  } else {
    wordCloudData.value = [];
  }
}, { immediate: true });

// 每次查询变化时重新生成随机指标
async function refreshMetrics() {
  // 从当前问题获取指标，如果存在则使用，否则使用默认值0.5（50%
  // ）
  console.log(currentQuestion.value)
  if (currentQuestion.value && currentQuestion.value.metrics) {
    console.log('当前问题指标数据:', currentQuestion.value.metrics);
    
    // 尝试从外部文件加载rouge-l-rag值作为correctness
    const externalMetrics = await loadExternalMetrics(currentQuestion.value.id);
    // 使用方括号语法访问含有横杠的属性名
    const correctnessValue = externalMetrics ? (Math.min(externalMetrics['rouge-l-rag'] * 4, 1) + externalMetrics['embed']) / 2 || 0.5 : currentQuestion.value.metrics.correctness || 0.5;
    
    metrics.value = {
      retrievalFailure: 1 - (currentQuestion.value.metrics.retrieval_effectiveness || 0.5),
      promptFragility: 1 - (currentQuestion.value.metrics.retrieval_stability || 0.5),
      standardDeviation: 1 - (currentQuestion.value.metrics.knowledge_reliability || 0.5),
      generationAnomaly: 1 - (currentQuestion.value.metrics.generation_reliability || 0.5),
      correctness: correctnessValue,
      relevance: currentQuestion.value.metrics.relevance || 0.5
    };
    console.log('更新后的指标数据:', metrics.value);
  } else {
    console.log('当前问题无指标数据，使用默认50%指标', currentQuestion.value);
    
    // 尝试从外部文件加载rouge-l-rag值作为correctness
    const externalMetrics = await loadExternalMetrics(currentQuestion.value?.id);
    // 使用方括号语法访问含有横杠的属性名
    const correctnessValue = externalMetrics ? externalMetrics['rouge-l-rag'] || 0.5 : 0.5;
    
    // 如果没有指标数据，全部设为50%
    metrics.value = {
      retrievalFailure: 0.5,
      promptFragility: 0.5,
      standardDeviation: 0.5,
      generationAnomaly: 0.5,
      correctness: correctnessValue,
      relevance: 0.5
    };
  }
}

// 从外部文件加载指标
async function loadExternalMetrics(questionId) {
  try {
    if (!questionId) return null;
    
    // 从result8score2.json加载数据
    const externalMetricsModule = await import('../../statics/result8score2.json');
    const externalMetrics = externalMetricsModule.default || [];
    
    // 问题ID从1开始，数组索引从0开始
    const numericId = typeof questionId === 'string' ? parseInt(questionId) : questionId;
    const arrayIndex = numericId - 1;
    
    if (arrayIndex >= 0 && arrayIndex < externalMetrics.length) {
      console.log(`找到问题ID ${questionId} 的外部指标数据:`, externalMetrics[arrayIndex]);
      return externalMetrics[arrayIndex];
    }
    
    return null;
  } catch (error) {
    console.error('加载外部指标数据失败:', error);
    return null;
  }
}

// 加载问题数据
async function loadQuestionData(id) {
  try {
    // 确保问题数据已加载
    if (!questionData.value.length) {
      // 加载result8数据
      const dataModule = await import('../../statics/result8.json');
      questionData.value = dataModule.default || [];
    }
    
    const numericId = parseInt(id);
    
    // 直接使用id-1作为索引
    const question = questionData.value[numericId-1];
    
    console.log('==== QueryView加载问题数据 ====');
    console.log('当前问题ID:', id);
    console.log('从result8获取的问题(index:', numericId-1, '):', question);
    console.log('gt字段:', question?.gt);
    console.log('answer字段:', question?.answer);
    
    if (question) {
      // 提取命名实体
      extractNamedEntities(question.text || question.question || "");
    } else {
      console.warn('未找到ID为', id, '的问题');
    }
  } catch (error) {
    console.error('加载问题数据失败:', error);
  }
}

// 提取命名实体（简单模拟）
function extractNamedEntities(text) {
  if (!text) return;
  
  // 这里用简单的词表匹配来模拟命名实体识别
  // 实际项目中应使用更复杂的NLP工具
  const commonEntities = [
    "China", "USA", "Russia", "UK", "France", "Germany", "Japan", 
    "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "New York", "London", "Paris",
    "2020", "2021", "2022", "2023", "COVID-19", "AI", "Machine Learning",
    "GPT", "Transformer", "BERT", "RAG", "Retrieval Augmented Generation"
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
  
  // 确保使用正确的问题文本字段
  const questionText = typeof currentQuestion.value === 'string' 
    ? currentQuestion.value 
    : (currentQuestion.value.text || currentQuestion.value.question || '');
  
  return highlightEntities(questionText);
});

// 高亮ground truth中的命名实体
const highlightedGroundTruth = computed(() => {
  if (!groundTruth.value) {
    console.log('highlightedGroundTruth: groundTruth.value为空');
    return '';
  }
  
  console.log('highlightedGroundTruth数据类型:', typeof groundTruth.value);
  console.log('highlightedGroundTruth原始数据:', groundTruth.value);
  
  // 确保处理的是字符串
  const text = typeof groundTruth.value === 'string' 
    ? groundTruth.value
    : JSON.stringify(groundTruth.value);
    
  const result = highlightEntities(text);
  console.log('highlightedGroundTruth处理后结果:', result);
  return result;
});

// 高亮模型答案中的命名实体
const highlightedModelAnswer = computed(() => {
  if (!modelAnswer.value) {
    console.log('highlightedModelAnswer: modelAnswer.value为空');
    return '';
  }
  
  console.log('highlightedModelAnswer数据类型:', typeof modelAnswer.value);
  console.log('highlightedModelAnswer原始数据:', modelAnswer.value);
  
  // 确保处理的是字符串
  const text = typeof modelAnswer.value === 'string' 
    ? modelAnswer.value
    : JSON.stringify(modelAnswer.value);
    
  const result = highlightEntities(text);
  console.log('highlightedModelAnswer处理后结果:', result);
  return result;
});

// 高亮文本中的命名实体
function highlightEntities(text) {
  if (!text || !namedEntities.value.length) return text;
  
  // 安全检查确保text是字符串
  if (typeof text !== 'string') {
    console.warn('highlightEntities 接收到非字符串类型:', text);
    return String(text);
  }
  
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
      // 生成词云数据
      wordCloudData.value = generateWordCloudData();
    }
  } catch (error) {
    console.error('加载问题数据失败:', error);
  }
});
</script>

<style scoped>
.query-view {
  display: flex;
  flex-direction: column;
  height: 103.5%;
  width: 100%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  padding: 16px;
  overflow: hidden;
}

.section-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #333;
  /* background-color: #f8f9fa; */
  border-bottom: 1px solid var(--border-color, #ddd);
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  /* 缩短下方灰线 */
  width: 98.7%;
  padding-bottom: 4px;
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
  color: #666;
}

.query-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.query-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding-right: 5px;
  max-height: 100%;
}

.question-section {
  padding: 4px;
  min-height: 50px;
  max-height: 100px;
  overflow-y: auto;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 4px;
}

.answer-section {
  margin-bottom: 4px;
  min-height: 40px;
}

.question-text, .answer-text {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 8px 10px;
  line-height: 1.4;
  max-height: 120px;
  overflow-y: auto;
  font-size: 16px;
  color: #333;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.standard-answer .answer-text {
  background-color: #f8f9fa;
  border-left: 3px solid #4d9078;
  min-height: 30px;
}

.model-answer .answer-text {
  background-color: #f8f9fa;
  border-left: 3px solid #4d7fa0;
  max-height: 100px;
  min-height: 30px;
}

.word-cloud-container {
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
  height: 180px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: auto;
}

.word-cloud {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  padding: 10px;
}

.word-cloud span {
  display: inline-block;
  padding: 3px 5px;
  margin: 3px;
  line-height: 1;
  transition: transform 0.2s ease;
  white-space: nowrap;
}

.word-cloud span:hover {
  transform: scale(1.1);
}

.word-cloud span.suspicious {
  color: #e74c3c;
  font-weight: 500;
}

.word-cloud span.correct {
  color: #2ecc71;
  font-weight: 500;
}

.word-cloud span.neutral {
  color: #333;
}

.force-metrics {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 10px;
  margin-top: 4px;
}

.metrics-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.metrics-row:last-child {
  margin-bottom: 0;
}

.force-metric {
  display: flex;
  align-items: center;
  width: calc(50% - 6px);
}

.metric-label {
  width: 130px;
  font-size: 15px;
  font-weight: 600;
  color: #000;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.metric-bar {
  flex: 1;
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin: 0 8px;
}

.metric-value {
  height: 100%;
  border-radius: 4px;
}

.metric-percent {
  width: 40px;
  font-size: 15px;
  text-align: right;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.entity-highlight {
  background-color: rgba(255, 220, 0, 0.3);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
  font-size: 16px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
</style> 