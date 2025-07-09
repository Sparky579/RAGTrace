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
import { ref, onMounted, provide } from 'vue';
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

// 提供evidenceTracker ref给全局
provide('evidenceTrackerRef', evidenceTracker);

// 处理答案生成事件
const handleAnswerGenerated = async (prompt) => {
  // 设置加载状态
  if (answerViewer.value) {
    answerViewer.value.setLoading(true);
  }
  
  try {
    // 获取当前问题
    const query = questionStore.currentQuestion.question || '';
    
    // 获取用户在PromptBuilder填写的自定义提示
    const customPrompt = prompt;
    
    // 获取当前集成的chunks，这些是已经在ChunkRanking中Integrated的部分
    const integratedChunks = chunkStore.integratedChunks.map(chunk => ({
      id: chunk.id,
      name: chunk.name,
      content: chunk.content
    }));
    
    // 获取EvidenceTracker中选中的证据
    const selectedEvidence = evidenceTracker.value ? 
      evidenceTracker.value.getSelectedEvidence() : [];
    
    // 使用integratedChunks而不是创建新的allChunks数组
    const allChunks = [...integratedChunks];
    
    // 如果有选中的证据且被标记为引用，则添加到发送的数据中（如果不在integratedChunks中）
    if (selectedEvidence && selectedEvidence.length > 0) {
      selectedEvidence.forEach(evidence => {
        if (evidence.isReferenced && evidence.text) {
          // 检查是否已存在于integratedChunks中
          const exists = allChunks.some(c => c.content === evidence.text);
          if (!exists) {
            allChunks.push({
              id: evidence.id,
              name: evidence.source,
              content: evidence.text
            });
          }
        }
      });
    }
    
    // 调用API服务获取答案
    console.log('正在通过API获取答案，发送集成的chunks和选中的证据');
    let answerData;
    
    if (query) {
      // 只发送必要的数据：query、chunks和custom_prompt
      const requestData = allChunks.length > 0 ? {
        query,
        chunks: allChunks,
        custom_prompt: customPrompt
      } : {
        query,
        custom_prompt: customPrompt,
        chunks: ["No chunks provided"]
      };
      
      // 使用新的API请求方法，只发送集成的chunks和引用的证据
      answerData = await answerService.generateAnswerFromAPI(
        requestData.query, 
        requestData.chunks, 
        requestData.custom_prompt
      );
    } else {
      // 如果没有问题或chunks，使用原有方法
      console.log('使用原始方式获取答案');
      answerData = await answerService.generateAnswer(prompt);
    }
    
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
      { id: 'chunk-o1', name: 'Chunk O1', content: '选择合适的向量数据库对RAG系统的检索效果有重要影响。不同的向量数据库有不同的特性和性能，需要根据具体应用场景进行选择。', relevance: 0.95 },
      { id: 'chunk-o2', name: 'Chunk O2', content: '合理的文档分块策略对检索质量至关重要。分块过大会导致检索不精确，分块过小则可能导致上下文信息丢失。', relevance: 0.82 },
      { id: 'chunk-o3', name: 'Chunk O3', content: '混合检索和重排序是提高RAG系统检索效果的有效策略。混合检索结合了多种检索方法的优势，而重排序则可以进一步优化检索结果的排序。', relevance: 0.76 },
      { id: 'chunk-o4', name: 'Chunk O4', content: '嵌入模型的选择会影响最终的检索效果。针对不同语言和领域的数据，可能需要选择不同的嵌入模型。', relevance: 0.63 },
      { id: 'chunk-o5', name: 'Chunk O5', content: '评估RAG系统的检索效果可以使用多种指标，如召回率、准确率、MRR等。', relevance: 0.45 },
      { id: 'chunk-o6', name: 'Chunk O6', content: '检索增强生成的效果与预训练模型的性能有关，这并不直接涉及检索效果改进。', relevance: 0.31 },
    ]);
  }
  
  // 如果没有设置当前问题，设置一个默认问题
  if (!questionStore.currentQuestion) {
    questionStore.setQuestion('如何改进RAG系统的检索效果？', 'default-question-id');
  }
  
  // 加载一个初始答案
  try {
    // 使用默认问题ID或直接加载样本答案，不依赖store中是否有当前问题ID
    const answerData = await answerService.getAnswerForQuestion(questionStore.currentQuestionId || 'default-question-id');
    
    // 更新界面
    if (answerViewer.value) {
      answerViewer.value.updateAnswer(answerData);
    }
    
    if (evidenceTracker.value && answerData.evidences) {
      evidenceTracker.value.updateEvidence(answerData.evidences);
    }
  } catch (error) {
    console.error('加载初始答案失败:', error);
    // 处理初始加载失败情况
    if (answerViewer.value) {
      answerViewer.value.setLoading(false);
    }
  }
});
</script>

<style scoped>
.answer-tracing {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: 100%;
  min-height: 250px;
}

.answer-content-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 12px;
  height: 100%;
}

.answer-evidence-row {
  display: flex;
  gap: 14px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 调整AnswerViewer和EvidenceTracker组件的宽度比例 */
.answer-evidence-row > :deep(.answer-viewer) {
  flex: 0 0 50%; /* 设置为固定60%宽度 */
  width: 60%; /* 明确设置宽度 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

.answer-evidence-row > :deep(.evidence-panel) {
  flex: 0 0 50%; /* 设置为固定40%宽度 */
  width: 40%; /* 明确设置宽度 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

.prompt-builder {
  margin-bottom: 10px;
}

.prompt-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  resize: vertical;
  font-size: 16px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.chunk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.chunk-tag {
  display: inline-flex;
  align-items: center;
  background-color: #e1f0ff;
  color: #4d7fa0;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 16px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.chunk-tag .remove-btn {
  background: none;
  border: none;
  color: #0056b3;
  font-size: 16px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  cursor: pointer;
  margin-left: 4px;
  padding: 0 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.generate-btn {
  margin-top: 12px;
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  transition: background-color 0.2s;
}

.generate-btn:hover {
  background-color: #3a8ee6;
}
</style> 
