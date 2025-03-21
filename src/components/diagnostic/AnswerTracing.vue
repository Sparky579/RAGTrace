<template>
  <div class="answer-tracing">
    <div class="answer-content-layout">
      <!-- Prompt构建组件 -->
      <PromptBuilder @answer-generated="handleAnswerGenerated" />
      
      <div class="answer-evidence-row">
        <!-- 答案展示组件 -->
        <AnswerViewer ref="answerViewer" />
        
        <!-- 证据追踪组件 -->
        <EvidenceTracker ref="evidenceTracker" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useChunkStore } from '../../store/chunkStore';
import { useQuestionStore } from '../../store/questionStore';
import { answerService } from '../../services/answerService';
import PromptBuilder from './PromptBuilder.vue';
import AnswerViewer from './AnswerViewer.vue';
import EvidenceTracker from './EvidenceTracker.vue';

const chunkStore = useChunkStore();
const questionStore = useQuestionStore();
const answerViewer = ref(null);
const evidenceTracker = ref(null);

// 处理答案生成事件
const handleAnswerGenerated = async (prompt) => {
  // 设置加载状态
  if (answerViewer.value) {
    answerViewer.value.setLoading(true);
  }
  
  try {
    // 调用服务获取答案
    console.log('正在获取答案，使用Prompt:', prompt);
    const answerData = await answerService.generateAnswer(prompt);
    
    // 更新答案展示
    if (answerViewer.value) {
      answerViewer.value.updateAnswer(answerData);
    }
    
    // 更新证据追踪
    if (evidenceTracker.value && answerData.evidences) {
      evidenceTracker.value.updateEvidence(answerData.evidences);
    }
  } catch (error) {
    console.error('获取答案失败:', error);
    // 更新错误状态
    if (answerViewer.value) {
      answerViewer.value.setLoading(false);
    }
    alert('获取答案失败: ' + error.message);
  }
};

// 初始化示例数据
onMounted(async () => {
  // 如果store中没有数据，添加示例数据
  if (chunkStore.referenceChunks.length === 0) {
    chunkStore.initializeReferenceChunks([
      { id: 'chunk-a', name: 'Chunk A', content: '选择合适的向量数据库对RAG系统的检索效果有重要影响。不同的向量数据库有不同的特性和性能，需要根据具体应用场景进行选择。', relevance: 0.95 },
      { id: 'chunk-b', name: 'Chunk B', content: '合理的文档分块策略对检索质量至关重要。分块过大会导致检索不精确，分块过小则可能导致上下文信息丢失。', relevance: 0.82 },
      { id: 'chunk-c', name: 'Chunk C', content: '混合检索和重排序是提高RAG系统检索效果的有效策略。混合检索结合了多种检索方法的优势，而重排序则可以进一步优化检索结果的排序。', relevance: 0.76 },
      { id: 'chunk-d', name: 'Chunk D', content: '嵌入模型的选择会影响最终的检索效果。针对不同语言和领域的数据，可能需要选择不同的嵌入模型。', relevance: 0.63 },
      { id: 'chunk-e', name: 'Chunk E', content: '评估RAG系统的检索效果可以使用多种指标，如召回率、准确率、MRR等。', relevance: 0.45 },
      { id: 'chunk-f', name: 'Chunk F', content: '检索增强生成的效果与预训练模型的性能有关，这并不直接涉及检索效果改进。', relevance: 0.31 },
    ]);
  }
  
  // 如果没有设置当前问题，设置一个默认问题
  if (!questionStore.currentQuestion) {
    questionStore.setQuestion('如何改进RAG系统的检索效果？', 'default-question-id');
  }
  
  // 加载一个初始答案
  try {
    if (questionStore.currentQuestionId) {
      const answerData = await answerService.getAnswerForQuestion(questionStore.currentQuestionId);
      
      // 更新界面
      if (answerViewer.value) {
        answerViewer.value.updateAnswer(answerData);
      }
      
      if (evidenceTracker.value && answerData.evidences) {
        evidenceTracker.value.updateEvidence(answerData.evidences);
      }
    }
  } catch (error) {
    console.error('加载初始答案失败:', error);
  }
});
</script>

<style scoped>
.answer-tracing {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: 100%;
}

.answer-content-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 10px;
  height: 100%;
}

.answer-evidence-row {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style> 