<template>
  <div class="unified-panel">
    <!-- <div class="problem-selector">
      <span>当前问题：</span>
      <select class="problem-select" v-model="currentQuestionId">
        <option value="">请选择问题</option>
        <option v-for="question in questions" :key="question.id" :value="question.id">
          {{ question.text.length > 40 ? question.text.substring(0, 40) + '...' : question.text }}
        </option>
      </select>
    </div> -->
    
    <div class="panel-grid">
      <!-- 全局加载指示器 -->
      <div v-if="!isInitialized" class="global-loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading analysis panel...</div>
      </div>
      
      <!-- 组件内容 -->
      <template v-if="isInitialized">
        <!-- 左侧面板 - 问题概览区域 -->
        <div class="panel-area overview-area">
          <!-- <div class="area-header">
            <h3 class="area-title">问题概览</h3>
          </div> -->
          
          <div class="area-content">
            <div class="overview-layout">
              <div class="top-section">
                <!-- 热力图放在左侧75%宽度位置 -->
                <div class="heatmap-container">
                  <h4 class="section-title">Chunk Distribution</h4>
                  <div class="chart-wrapper">
                    <HeatmapChart />
                  </div>
                </div>
                
                <!-- 右侧25%区域 -->
                <div class="right-side-charts">
                  <!-- 缩小后的力引导图 -->
                  <div class="mini-force-diagram">
                    <h4 class="section-title">Question Analysis</h4>
                    <div class="chart-wrapper">
                      <ForceDiagramChart />
                    </div>
                  </div>
                  
                  <!-- 新增的条形图区域 -->
                  <div class="mini-chunk-distribution">
                    <h4 class="section-title">Top Words</h4>
                    <div class="chart-wrapper">
                      <ChunkDistributionBar />
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="bottom-container">
                <FilterView class="filter-container" />
                
                <div class="query-view-container">
                  <QueryView />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧面板 - 诊断分析区域 -->
        <div class="panel-area diagnostic-area">
          <div class="area-content">
            <div class="diagnostic-layout">
              <div class="retrieval-visualization">
                <h4 class="section-title">Chunk Analysis</h4>
                <ChunkRanking />
              </div>
              
              <div class="answer-visualization">
                <h4 class="section-title">Answer Traceability</h4>
                <AnswerTracing />
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右下面板 - 采样设置与预览 -->
        <div class="panel-area sampling-area">
          <div class="area-content">
            <div class="sampling-performance-container">
              <div class="sampling-grid">
                <SamplingSettingsCard @preview="handlePreview" />
                <SamplingPreviewCard :sampledQuestions="sampledQuestions" @run-test="handleRunTest" @select-question="handleSelectQuestion" />
              </div>
              <div class="performance-section">
                <div class="radar-charts-wrapper">
                  <h4 class="section-title">Performance Analysis</h4>
                  <RadarChartGrid :selectedQuestion="selectedQuestionForRadar" @test-completed="handleTestCompleted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, provide, nextTick } from 'vue';
import HeatmapChart from './overview/HeatmapChart.vue';
import FilterView from './overview/FilterView.vue';
import ChunkRanking from './diagnostic/ChunkRanking.vue';
import AnswerTracing from './diagnostic/AnswerTracing.vue';
import ForceDiagramChart from './overview/ForceDiagramChart.vue';
import QueryView from './overview/QueryView.vue';
import ChunkDistributionBar from './overview/ChunkDistributionBar.vue';
import { useQuestionStore } from '../store/questionStore';
import { useChunkStore } from '../store/chunkStore';

// 导入验证结果卡片组件
import SamplingSettingsCard from './validation/cards/SamplingSettingsCard.vue';
import SamplingPreviewCard from './validation/cards/SamplingPreviewCard.vue';
import PerformanceCard from './validation/cards/PerformanceCard.vue';
import RadarChartGrid from './validation/RadarChartGrid.vue';

const questionStore = useQuestionStore();
const chunkStore = useChunkStore();
const questions = ref([]);
const sampledQuestions = ref([]);
const isInitialized = ref(false);
const selectedQuestionForRadar = ref(null);

// 提供chunkStore给子组件
provide('chunkStore', chunkStore);

// 处理预览按钮点击
const handlePreview = (settings) => {
  // 这里实现抽样预览逻辑，根据settings中的参数进行抽样
  console.log('Preview settings:', settings);
  
  // 更新样本问题（包括加载状态）
  sampledQuestions.value = settings;
  
  // 如果是加载状态或已经有generatedQA属性，不需要额外处理
  if (settings.isLoading || settings.generatedQA) {
    return;
  }
  
  // 仅在DEBUG模式下使用模拟数据（此处应该基本不会执行，
  // 因为SamplingSettingsCard.vue中设置了DEBUG_MODE = false）
  if (!settings.generatedQA) {
    // 生成模拟数据
    const mockData = [...questions.value]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(settings.sampleCount, questions.value.length))
      .map(q => ({
        ...q,
        answer: `This is an example answer for the question "${q.text.substring(0, 20)}...". Generated using temperature ${settings.temperature}.`,
        tags: ['Retrieval-related', 'High accuracy']
      }));
    
    // 更新sampledQuestions，保留原有settings但添加模拟数据
    sampledQuestions.value = {
      ...settings,
      isLoading: false,
      generatedQA: mockData
    };
  }
};

// 处理运行测试按钮点击
const handleRunTest = (selectedQuestions) => {
  console.log('Running test:', selectedQuestions);
  
  // 如果选择了多个问题，我们先处理第一个
  if (Array.isArray(selectedQuestions) && selectedQuestions.length > 0) {
    // 设置第一个问题为当前选中的问题，触发雷达图更新
    selectedQuestionForRadar.value = selectedQuestions[0];
  }
};

// 处理选择问题事件
const handleSelectQuestion = (question) => {
  console.log('选中的问题:', question);
  
  // 如果问题已经有ID则直接使用，否则创建临时ID
  const questionId = question.id || `sample-${Date.now()}`;
  
  // 添加调试日志，检查问题对象的字段
  console.log('==== handleSelectQuestion详情 ====');
  console.log('原始问题数据字段:', Object.keys(question));
  console.log('gt字段值:', question.gt);
  console.log('answer字段值:', question.answer);
  
  // 使用现有的问题数据或创建新的问题对象
  const questionData = {
    ...question,
    id: questionId,
    text: question.question || question.text,
    // 确保有标准答案和模型答案用于显示
    gt: question.gt || question.standardAnswer || 'No standard answer available',
    answer: question.answer || question.modelAnswer || 'No model answer available',
    // 默认指标数据
    metrics: question.metrics || {
      retrieval_effectiveness: 0.5,
      retrieval_stability: 0.5,
      generation_reliability: 0.5,
      knowledge_reliability: 0.5
    }
  };
  
  console.log('发送到store的问题对象:', questionData);
  console.log('处理后的gt字段:', questionData.gt);
  console.log('处理后的answer字段:', questionData.answer);
  
  // 更新questionStore以在QueryView中显示
  questionStore.setQuestion(questionData, questionId);
  
  // 清除之前的雷达图选中问题
  selectedQuestionForRadar.value = null;
  
  // 延时设置雷达图选中问题，确保清除操作已完成
  setTimeout(() => {
    selectedQuestionForRadar.value = questionData;
  }, 100);
};

// 处理测试完成事件
const handleTestCompleted = (result) => {
  console.log('测试完成:', result);
  // 这里可以实现测试完成后的逻辑，例如显示结果或更新UI
};

// 设置示例文档块数据
const initializeChunkStore = () => {
  // 这里可以在实际开发中从API加载数据
  const chunks = [
    { id: 1, name: 'Chunk O1', relevance: 0.95, content: 'RAG（Retrieval-Augmented Generation）是一种结合检索与生成的混合架构。它首先从知识库中检索相关信息，然后将这些信息作为上下文提供给生成模型，以生成更准确、更新、更专业的回答。这种方法解决了大型语言模型面临的知识时效性和专业领域信息不足的问题。' },
    { id: 2, name: 'Chunk O2', relevance: 0.88, content: '检索增强生成系统的性能可以通过重排序和多查询技术得到提升。重排序技术利用更强大的模型对初始检索结果进行二次排序，而多查询技术则通过生成多个不同表述的查询来增加召回率。' },
    { id: 3, name: 'Chunk O3', relevance: 0.82, content: 'RAG的应用场景广泛，包括但不限于：企业知识库问答、客户服务自动化、教育辅助系统、研究文献助手、医疗诊断支持等。在这些场景中，系统能够检索到最相关的专业知识，提供准确的回答。' },
    { id: 4, name: 'Chunk O4', relevance: 0.75, content: '评估RAG系统性能需要综合考虑多个指标，包括检索准确率、答案正确性、信息全面性和生成质量。在特定领域应用中，还需要考虑领域专家的评估反馈。' },
    { id: 5, name: 'Chunk O5', relevance: 0.62, content: '最新研究表明，检索系统可以通过关联反馈进一步提高准确率。当用户与系统交互时，系统可以学习用户行为模式，逐步改进检索结果的排序算法。' },
    { id: 6, name: 'Chunk O6', relevance: 0.58, content: '上下文压缩技术可以在不损失关键信息的情况下减少输入长度，解决大型语言模型上下文窗口限制的问题。这对于处理长文档或多文档的RAG系统尤为重要。' },
    { id: 7, name: 'Chunk O7', relevance: 0.45, content: '大型语言模型可以通过增量训练适应特定领域知识，提高在垂直领域的表现。结合RAG架构，可以实现知识的动态更新和精准检索。' }
  ];
  
  // 添加到store
  if (chunkStore.setReferenceChunks) {
    chunkStore.setReferenceChunks(chunks);
  } else {
    // 兼容性处理，如果store没有setReferenceChunks方法
    console.warn('setReference  Chunks method not found in chunkStore');
  }
  
  // 初始添加一些示例chunk到集成区域
  chunkStore.addChunk(chunks[0]);
  chunkStore.addChunk(chunks[1]);
};

// 使用计算属性从store读取和设置currentQuestionId
const currentQuestionId = computed({
  get: () => questionStore.currentQuestionId,
  set: (value) => {
    if (value) {
      const selectedQuestion = questions.value.find(q => q.id == value);
      if (selectedQuestion) {
        questionStore.setQuestion(selectedQuestion.text, selectedQuestion.id);
      }
    } else {
      // 如果没有选择问题，则清空当前问题
      questionStore.setQuestion(null, null);
    }
  }
});

onMounted(async () => {
  try {
    // 加载问题数据
    const dataModule = await import('../statics/result8.json');
    const data = dataModule.default || [];
    
    // 转换数据格式
    questions.value = data.map((item, index) => ({
      id: item.id || index + 1,
      text: item.text || `Question ${index + 1}`,
      type: item.type || 'unknown',
      embedding: item.embedding || []
    }));
    
    // 初始化chunkStore
    initializeChunkStore();
    
    // 延迟初始化UI，确保DOM完全渲染
    await nextTick();
    setTimeout(() => {
      isInitialized.value = true;
    }, 200);
  } catch (error) {
    console.error('Question data loading failed:', error);
    // 即使加载问题失败，也初始化chunkStore
    initializeChunkStore();
    
    // 延迟初始化UI
    await nextTick();
    setTimeout(() => {
      isInitialized.value = true;
    }, 200);
  }
});
</script>

<style scoped>
.unified-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: calc(100vh - 30px);
  overflow: hidden;
  padding: 10px;
}

.problem-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.problem-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  min-width: 400px;
  font-size: 16px;
}

.panel-grid {
  display: grid;
  grid-template-columns: 45% 55%;
  grid-template-rows: 50% 50%;
  gap: 16px;
  grid-template-areas:
    "overview diagnostic"
    "overview sampling";
  overflow: visible;
  height: 100%;
}

.panel-area {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.overview-area {
  grid-area: overview;
  border-radius: 8px;
}

.diagnostic-area {
  grid-area: diagnostic;
  border-radius: 8px;
}

.sampling-area {
  grid-area: sampling;
  border-radius: 8px;
}

.performance-area {
  /* 不再需要单独的grid区域 */
  display: none;
}

.area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid var(--border-color);
}

.area-title {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

.area-content {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  font-size: 16px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0px;
  border-bottom-left-radius: 0px;
  margin-bottom: 0;
}

/* 左侧概览区域新布局 */
.overview-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.charts-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
}

/* 顶部部分布局 */
.top-section {
  display: flex;
  gap: 12px;
  height: 65%;
  min-height: 300px;
}

/* 热力图容器 */
.heatmap-container {
  width: 65%;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  min-height: 200px;
  /* 添加正方形比例约束 */
  aspect-ratio: 1/1;
}

.heatmap-container .section-title {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 12px;
}

.heatmap-container .chart-wrapper {
  flex: 1;
  width: 100%;
  position: relative;
  height: 100%;
  overflow: hidden;
  min-height: 0;
}

/* 右侧小图布局 */
.right-side-charts {
  width: 35%;
  height: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mini-force-diagram,
.mini-chunk-distribution {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-height: 150px; /* 确保最小高度 */
}

.mini-force-diagram {
  height: 65%;
  min-height: 150px;
}

.mini-chunk-distribution {
  height: 35%;
  min-height: 100px;
}

/* 修复可能存在的chart-wrapper样式问题 */
.chart-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: white;
  min-height: 100px;
  height: 100%;
}

/* 确保右侧迷你图表内容能充满容器 */
.mini-force-diagram .chart-wrapper,
.mini-chunk-distribution .chart-wrapper {
  flex-grow: 1;
  min-height: 0; /* 确保在Flex容器中正确缩放 */
  width: 100%;
  position: relative;
  height: 100%;
}

/* 确保小图内的内容正确缩放 */
.mini-force-diagram :deep(svg),
.mini-chunk-distribution :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  max-height: 100%;
}

/* 调整小图内的标题大小 */
.mini-force-diagram .section-title,
.mini-chunk-distribution .section-title {
  font-size: 16px;
  padding: 8px 12px;
  font-weight: 600;
}

.bottom-container {
  display: flex;
  gap: 16px;
  height: 40%; /* 减小底部容器高度 */
  margin-top: 12px;
}

.filter-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  padding: 12px;
  width: 50%;
  height: calc(100% - 4.5px);
  display: flex;
  flex-direction: column;
}

.query-view-container {
  width: 50%;
  height: calc(100% - 19px);
}

.section-title {
  margin: 0;
  padding: 8px 12px;
  font-size: 16px;
  font-weight: 700;
  color: #000;
  background-color: #f8f9fa;
  border-bottom: 1px solid var(--border-color);
}

/* 采样区域与性能区域合并后的布局 */
.sampling-area .area-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.sampling-performance-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  gap: 0;
  background-color: white;
}

.sampling-grid {
  display: flex;
  gap: 10px;
  height: 50%;
  overflow: hidden;
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.sampling-grid > :deep(.sampling-settings-card),
.sampling-grid > :deep(.sampling-preview-card) {
  flex: 1;
  height: 100%;
  min-height: auto;
  max-height: none;
  width: auto;
  overflow: hidden;
}

.performance-section {
  height: 50%;
  overflow: hidden;
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  display: flex;
}

/* 添加雷达图包装器样式 */
.radar-charts-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.radar-charts-wrapper .section-title {
  flex-shrink: 0;
}

/* 性能指标区域 - 样式保留但应用于新的容器 */
.performance-section :deep(.metrics-card) {
  border-radius: 0;
  box-shadow: none;
  height: 100%;
  min-height: auto;
  max-height: none;
  width: 100%;
  overflow: hidden;
}

.performance-section :deep(.metrics-visualization) {
  height: calc(100% - 32px);
  overflow: hidden;
}

.performance-section :deep(.card-header) {
  padding: 6px 12px;
}

/* 诊断区域布局 */
.diagnostic-area .area-content {
  padding: 12px;
}

.diagnostic-layout {
  display: flex;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}

.retrieval-visualization, .answer-visualization {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  border-radius: 8px;
  background-color: #fbfbfb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  padding: 8px;
}

.retrieval-visualization {
  width: 30%;
}

.answer-visualization {
  width: 70%;
}

/* 全局加载指示器 */
.global-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1000;
  border-radius: 8px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid var(--primary-color, #4285F4);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 全局样式覆盖，确保热力图SVG填充满容器 */
.heatmap-container .chart-wrapper :deep(svg) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  display: block !important;
  position: absolute;
  top: 0;
  left: 0;
}
</style> 