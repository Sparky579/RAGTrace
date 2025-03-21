<template>
  <div class="prompt-view-panel">
    <div class="prompt-builder">
      <div class="prompt-textarea-container">
        <textarea 
          v-model="promptText" 
          class="prompt-textarea" 
          placeholder="请输入 Prompt..."
          @input="handlePromptInput"
        ></textarea>
        
        <div class="prompt-controls-container">
          <div class="integrated-chunks-container">
            <div class="integrated-chunks">
              <div 
                v-for="chunk in integratedChunks" 
                :key="chunk.id" 
                class="chunk-tag" 
                :class="getRelevanceClass(chunk.relevance)"
              >
                <span>{{ chunk.name }}</span>
                <button class="remove-chunk" @click="removeChunk(chunk.id)">&times;</button>
              </div>
              
            </div>
          </div>
          
          <div class="generate-container">
            <button class="generate-btn" @click="generateAnswer">
              <span>生成答案</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useChunkStore } from '../../store/chunkStore';
import { useQuestionStore } from '../../store/questionStore';

const chunkStore = useChunkStore();
const questionStore = useQuestionStore();
const promptText = ref('帮我根据以下内容\n\n{集成的文档块}\n\n回答以下问题:\n\n{问题}');

// 从store获取文档块
const integratedChunks = computed(() => chunkStore.integratedChunks);

// 暴露给父组件的方法
const emit = defineEmits(['answer-generated']);

// 处理prompt文本输入
const handlePromptInput = () => {
  // 仅保存用户编辑的模板
  console.log('Prompt模板已更新');
};

// 从prompt移除文档块
const removeChunk = (chunkId) => {
  chunkStore.removeChunk(chunkId);
};

// 根据文档块的相关性获取对应的CSS类
const getRelevanceClass = (relevance) => {
  return chunkStore.getRelevanceClass(relevance);
};

// 生成最终答案
const generateAnswer = () => {
  const finalPrompt = chunkStore.generatePrompt(promptText.value);
  console.log('生成的最终Prompt:', finalPrompt);
  // 通知父组件答案已生成
  emit('answer-generated', finalPrompt);
};
</script>

<style scoped>
.prompt-view-panel {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.prompt-builder {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-textarea-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-textarea {
  width: 100%;
  height: 100px;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(76, 110, 245, 0.1);
}

/* 新布局 - 添加容器div */
.prompt-controls-container {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.integrated-chunks-container {
  flex: 0 0 80%;
  max-width: 80%;
}

.generate-container {
  flex: 0 0 20%;
  max-width: 20%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.integrated-chunks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 36px;
  padding: 4px;
}

.chunk-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  color: white;
  background-color: #888;
}

.chunk-tag.high-relevance {
  background-color: #4caf50;
}

.chunk-tag.medium-relevance {
  background-color: #ff9800;
}

.chunk-tag.low-relevance {
  background-color: #f44336;
}

.remove-chunk {
  background: none;
  border: none;
  color: white;
  font-size: 14px;
  padding: 0;
  margin-left: 2px;
  cursor: pointer;
  line-height: 1;
  opacity: 0.7;
}

.remove-chunk:hover {
  opacity: 1;
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  margin-right: 20px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  height: 36px;
}

.generate-btn:hover {
  background-color: var(--secondary-color);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
</style> 