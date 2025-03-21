import { defineStore } from 'pinia';
import { useQuestionStore } from './questionStore';

export const useChunkStore = defineStore('chunk', {
  state: () => ({
    // 标准参考中的文档块
    referenceChunks: [],
    // 当前集成到prompt中的文档块
    integratedChunks: []
  }),
  
  actions: {
    // 初始化标准参考中的文档块
    initializeReferenceChunks(chunks) {
      this.referenceChunks = chunks;
      // 清空已集成的文档块，避免引用不存在的文档块
      this.integratedChunks = [];
    },
    
    // 添加chunk到集成列表
    addChunk(chunk) {
      // 确保ID是唯一的
      if (!this.isChunkIntegrated(chunk.id)) {
        this.integratedChunks.push(chunk);
      }
    },
    
    // 从集成列表中移除chunk
    removeChunk(chunkId) {
      const index = this.integratedChunks.findIndex(c => c.id === chunkId);
      if (index !== -1) {
        this.integratedChunks.splice(index, 1);
      }
    },
    
    // 检查chunk是否已经被集成
    isChunkIntegrated(chunkId) {
      return this.integratedChunks.some(c => c.id === chunkId);
    },
    
    // 根据chunk名称检查是否已经被集成
    isChunkNameIntegrated(chunkName) {
      // 从名称中提取字符部分（例如，从"Chunk A"中提取"A"）
      const namePart = chunkName.replace(/^Chunk\s+/, '');
      
      // 检查是否有任何集成的块与该名称匹配
      return this.integratedChunks.some(c => {
        const integratedNamePart = c.name.replace(/^Chunk\s+/, '');
        return integratedNamePart === namePart;
      });
    },
    
    // 根据相关性分数获取对应的CSS类
    getRelevanceClass(score) {
      if (score >= 0.8) return 'high-relevance';
      if (score >= 0.5) return 'medium-relevance';
      return 'low-relevance';
    },
    
    // 生成最终的prompt
    generatePrompt(promptTemplate) {
      let finalPrompt = promptTemplate;
      const questionStore = useQuestionStore();
      console.log(questionStore.currentQuestion);
      
      // 替换文档块占位符
      if (this.integratedChunks.length === 0) {
        finalPrompt = finalPrompt.replace('{集成的文档块}', '无可用文档块');
      } else {
        // 构建文档块文本
        const chunksText = this.integratedChunks.map(chunk => 
          `【${chunk.name}】:\n${chunk.content}`
        ).join('\n\n');
        
        // 替换集成的文档块占位符
        finalPrompt = finalPrompt.replace('{集成的文档块}', chunksText);
      }
      
      // 替换问题占位符，使用questionStore中的当前问题
      if (questionStore.currentQuestion) {
        finalPrompt = finalPrompt.replace('{问题}', questionStore.currentQuestion);
      } else {
        finalPrompt = finalPrompt.replace('{问题}', '暂无问题');
      }
      
      return finalPrompt;
    }
  }
}); 