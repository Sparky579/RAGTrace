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
      <!-- 左侧面板 - 问题概览区域 -->
      <div class="panel-area overview-area">
        <div class="area-header">
          <h3 class="area-title">问题概览</h3>
        </div>
        
        <div class="area-content">
          <div class="overview-layout">
            <div class="charts-column">
              <div class="charts-container">
                <div class="square-chart-container">
                  <h4 class="section-title">文档块分布</h4>
                  <div class="chart-wrapper">
                    <HeatmapChart />
                  </div>
                </div>
                
                <div class="square-chart-container">
                  <h4 class="section-title">问题分析</h4>
                  <div class="chart-wrapper">
                    <ForceDiagramChart />
                  </div>
                </div>
              </div>
              
              <div class="filter-container">
                <FilterView />
              </div>
            </div>
            
            <div class="query-view-container">
              <QueryView />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧面板 - 诊断分析区域 -->
      <div class="panel-area diagnostic-area">
        <div class="area-header">
          <h3 class="area-title">诊断分析</h3>
        </div>
        
        <div class="area-content">
          <div class="diagnostic-layout">
            <div class="retrieval-visualization">
              <h4 class="section-title">文档块分析</h4>
              <ChunkRanking />
            </div>
            
            <div class="answer-visualization">
              <h4 class="section-title">答案溯源</h4>
              <AnswerTracing />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 下方面板 - 验证结果区域 -->
      <div class="panel-area validation-area">
        <div class="area-header">
          <h3 class="area-title">验证结果</h3>
          <button class="control-btn primary">运行验证</button>
        </div>
        
        <div class="area-content">
          <div class="validation-grid">
            <div class="metrics-card">
              <h4 class="card-title">性能指标</h4>
              <div class="metrics-comparison">
                <ImprovementMetrics title="改进前" type="before" />
                <div class="comparison-arrow">→</div>
                <ImprovementMetrics title="改进后" type="after" />
              </div>
            </div>
            
            <div class="visualization-card">
              <h4 class="card-title">指标分布</h4>
              <div class="validation-visualization">
                <VisualizationPlaceholder type="distribution" />
              </div>
            </div>
            
            <div class="visualization-card">
              <h4 class="card-title">PCA 分析</h4>
              <div class="validation-visualization">
                <VisualizationPlaceholder type="pca" />
              </div>
            </div>
            
            <div class="visualization-card">
              <h4 class="card-title">雷达图</h4>
              <div class="validation-visualization">
                <VisualizationPlaceholder type="radar" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, provide } from 'vue';
import HeatmapChart from './overview/HeatmapChart.vue';
import FilterView from './overview/FilterView.vue';
import ChunkRanking from './diagnostic/ChunkRanking.vue';
import AnswerTracing from './diagnostic/AnswerTracing.vue';
import VisualizationPlaceholder from './overview/VisualizationPlaceholder.vue';
import ImprovementMetrics from './validation/ImprovementMetrics.vue';
import ForceDiagramChart from './overview/ForceDiagramChart.vue';
import QueryView from './overview/QueryView.vue';
import { useQuestionStore } from '../store/questionStore';
import { useChunkStore } from '../store/chunkStore';

const questionStore = useQuestionStore();
const chunkStore = useChunkStore();
const questions = ref([]);

// 提供chunkStore给子组件
provide('chunkStore', chunkStore);

// 设置示例文档块数据
const initializeChunkStore = () => {
  // 这里可以在实际开发中从API加载数据
  const chunks = [
    { id: 1, name: 'Chunk A', relevance: 0.95, content: 'RAG（Retrieval-Augmented Generation）是一种结合检索与生成的混合架构。它首先从知识库中检索相关信息，然后将这些信息作为上下文提供给生成模型，以生成更准确、更新、更专业的回答。这种方法解决了大型语言模型面临的知识时效性和专业领域信息不足的问题。' },
    { id: 2, name: 'Chunk B', relevance: 0.88, content: '检索增强生成系统的性能可以通过重排序和多查询技术得到提升。重排序技术利用更强大的模型对初始检索结果进行二次排序，而多查询技术则通过生成多个不同表述的查询来增加召回率。' },
    { id: 3, name: 'Chunk C', relevance: 0.82, content: 'RAG的应用场景广泛，包括但不限于：企业知识库问答、客户服务自动化、教育辅助系统、研究文献助手、医疗诊断支持等。在这些场景中，系统能够检索到最相关的专业知识，提供准确的回答。' },
    { id: 4, name: 'Chunk D', relevance: 0.75, content: '评估RAG系统性能需要综合考虑多个指标，包括检索准确率、答案正确性、信息全面性和生成质量。在特定领域应用中，还需要考虑领域专家的评估反馈。' },
    { id: 5, name: 'Chunk E', relevance: 0.62, content: '最新研究表明，检索系统可以通过关联反馈进一步提高准确率。当用户与系统交互时，系统可以学习用户行为模式，逐步改进检索结果的排序算法。' },
    { id: 6, name: 'Chunk F', relevance: 0.58, content: '上下文压缩技术可以在不损失关键信息的情况下减少输入长度，解决大型语言模型上下文窗口限制的问题。这对于处理长文档或多文档的RAG系统尤为重要。' },
    { id: 7, name: 'Chunk G', relevance: 0.45, content: '大型语言模型可以通过增量训练适应特定领域知识，提高在垂直领域的表现。结合RAG架构，可以实现知识的动态更新和精准检索。' }
  ];
  
  // 添加到store
  if (chunkStore.setReferenceChunks) {
    chunkStore.setReferenceChunks(chunks);
  } else {
    // 兼容性处理，如果store没有setReferenceChunks方法
    console.warn('chunkStore中未找到setReferenceChunks方法');
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
      text: item.text || `问题 ${index + 1}`,
      type: item.type || 'unknown',
      embedding: item.embedding || []
    }));
    
    // 初始化chunkStore
    initializeChunkStore();
  } catch (error) {
    console.error('问题数据加载失败:', error);
    // 即使加载问题失败，也初始化chunkStore
    initializeChunkStore();
  }
});
</script>

<style scoped>
.unified-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 16px;
  grid-template-areas:
    "overview diagnostic"
    "validation validation";
}

.panel-area {
  background-color: white;
  border-radius: 8px;
  width: 45vw;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.overview-area {
  grid-area: overview;
}

.diagnostic-area {
  width: 52vw;
  grid-area: diagnostic;
}

.validation-area {
  grid-area: validation;
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
  font-weight: 600;
  color: var(--primary-color);
  margin: 0;
}

.area-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 新布局结构 */
.overview-layout {
  display: flex;
  gap: 16px;
  height: 100%;
}

.charts-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.charts-container {
  display: flex;
  gap: 16px;
  flex-wrap: nowrap;
  /* width: 90%; */
}

.square-chart-container {
  flex: 0 0 calc(50% - 8px);
  width: calc(50% - 8px);
  height: 380px;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 12px;
}

.chart-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.query-view-container {
  width: 50%;
}

.section-title {
  margin: 0;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  background-color: #f8f9fa;
  border-bottom: 1px solid var(--border-color);
}

.heatmap-container, .force-diagram-container {
  display: none; /* 隐藏原来的容器 */
}

.filter-container {
  flex: 1;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 12px;
}

.diagnostic-layout {
  display: flex;
  gap: 16px;
  height: 100%;
}

.retrieval-visualization, .answer-visualization {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.retrieval-visualization {
  width: 40%;
}

.answer-visualization {
  width: 60%;
}

.validation-visualization {
  height: 220px;
}

.control-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 14px;
}

.control-btn.primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.validation-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metrics-card {
  grid-column: span 2;
}

.visualization-card {
  grid-column: span 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #555;
}

.metrics-comparison {
  display: flex;
  align-items: center;
  justify-content: center;
}

.comparison-arrow {
  font-size: 24px;
  margin: 0 16px;
  color: var(--primary-color);
}
</style> 