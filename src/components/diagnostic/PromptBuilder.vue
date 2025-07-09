<template>
  <div class="prompt-view-panel">
    <div class="prompt-builder">
      <div class="prompt-textarea-container">
        <textarea 
          v-model="promptText" 
          class="prompt-textarea" 
          placeholder="Enter Prompt..."
          @input="handlePromptInput"
        ></textarea>
        
        <div class="prompt-controls-container">
          <div class="integrated-chunks-container">
            <div class="integrated-chunks">
              <div 
                v-for="chunk in uniqueIntegratedChunks" 
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
              <span>Generate</span>
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
const promptText = ref('Help me answer the following question based on this content:\n{integrated_chunks}\n{question}');

// 从store获取文档块
const integratedChunks = computed(() => chunkStore.integratedChunks);

// 过滤出内容唯一的chunk，避免重复显示具有相同内容的chunk-tag
const uniqueIntegratedChunks = computed(() => {
  // 用于存储已处理的内容
  const processedContents = new Set();
  // 结果数组
  const uniqueChunks = [];
  
  // 遍历所有集成的chunks
  for (const chunk of integratedChunks.value) {
    // 如果这个内容还没有处理过，则添加到结果数组
    if (!processedContents.has(chunk.content)) {
      uniqueChunks.push(chunk);
      processedContents.add(chunk.content);
    }
  }
  
  return uniqueChunks;
});

// 暴露给父组件的方法
const emit = defineEmits(['answer-generated']);

// 处理prompt文本输入
const handlePromptInput = () => {
  // 仅保存用户编辑的模板
  console.log('Prompt template updated');
};

// 从prompt移除文档块
const removeChunk = (chunkId) => {
  // 先找到要删除的chunk，获取其内容
  const chunk = integratedChunks.value.find(c => c.id === chunkId);
  if (chunk) {
    // 找到所有具有相同内容的chunk，全部删除
    const sameContentChunks = integratedChunks.value.filter(c => c.content === chunk.content);
    sameContentChunks.forEach(c => chunkStore.removeChunk(c.id));
  } else {
    // 如果找不到，就只删除指定ID的chunk
    chunkStore.removeChunk(chunkId);
  }
};

// 根据文档块的相关性获取对应的CSS类
const getRelevanceClass = (relevance) => {
  return chunkStore.getRelevanceClass(relevance);
};

// 生成最终答案
const generateAnswer = () => {
  // 获取用户输入的自定义提示文本
  const customPrompt = promptText.value;
  
  console.log('Generated final Prompt:', customPrompt);
  
  // 通知父组件答案已生成，传递用户输入的自定义提示
  emit('answer-generated', customPrompt);
};
</script>

<style scoped>
.prompt-view-panel {
  border: 0px solid var(--border-color);
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
  font-family: 'Lato', 'Menlo', monospace;
  font-size: 16px;
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
  gap: 8px;
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
  gap: 6px;
  min-height: 30px;
  padding: 4px;
}

.chunk-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 16px;
  color: white;
  background-color: #7ea6c4;
}

.chunk-tag.high-relevance {
  background-color: #7ea6c4;
}

.chunk-tag.medium-relevance {
  background-color: #7ea6c4;
}

.chunk-tag.low-relevance {
  background-color: #7ea6c4;
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
  padding: 8px 12px;
  background-color: #4d7fa0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.generate-btn:hover {
  background-color: #6d94b2;
}
</style> 