import { defineStore } from 'pinia';
import { useQuestionStore } from './questionStore';
import { analyzeWordFrequency } from '../utils/textUtils';

export const useChunkStore = defineStore('chunk', {
  state: () => ({
    // 标准参考中的文档块
    referenceChunks: [],
    // 当前集成到prompt中的文档块
    integratedChunks: [],
    // 当前选中的网格单元
    currentGridCell: null,
    // 网格单元中的文档块
    gridChunks: {}
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
      // 提取命名系统中的编号部分（例如，从"O1"中提取"O1"）
      const namePart = chunkName;
      
      // 检查是否有任何集成的块与该名称匹配
      return this.integratedChunks.some(c => {
        // 从Chunk O1, Chunk I1等格式中提取O1, I1部分
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
    
    // 设置当前选中的网格单元
    setCurrentGridCell(cellId) {
      this.currentGridCell = cellId;
    },
    
    // 清除当前选中的网格单元
    clearCurrentGridCell() {
      this.currentGridCell = null;
    },
    
    // 为网格单元设置文档块
    setGridChunks(cellId, chunks) {
      this.gridChunks[cellId] = chunks;
    },
    
    // 获取网格单元中的文档块
    getGridChunks(cellId) {
      return this.gridChunks[cellId] || [];
    },
    
    // 获取网格单元中的文档块的高频词汇
    getGridTopFrequencyWords(cellId, limit = 5) {
      const chunks = this.getGridChunks(cellId);
      if (!chunks || chunks.length === 0) {
        return [];
      }
      
      // 合并所有文档块文本
      const allText = chunks.map(chunk => chunk.content || chunk.text || '').join(' ');
      
      // 使用textUtils中的词频分析函数
      return analyzeWordFrequency(allText, limit, true);
    },
    
    // 生成最终的prompt
    generatePrompt(promptTemplate) {
      let finalPrompt = promptTemplate;
      const questionStore = useQuestionStore();
      console.log(questionStore.currentQuestion);
      
      // 替换文档块占位符
      if (this.integratedChunks.length === 0) {
        finalPrompt = finalPrompt.replace('{integrated_chunks}', '无可用文档块');
        // 兼容英文占位符
        finalPrompt = finalPrompt.replace('{集成的文档块}', '无可用文档块');
      } else {
        // 构建文档块文本
        const chunksText = this.integratedChunks.map(chunk => 
          `【${chunk.name}】:\n${chunk.content}`
        ).join('\n\n');
        
        // 替换集成的文档块占位符（中英文都支持）
        finalPrompt = finalPrompt.replace('{integrated_chunks}', chunksText);
        finalPrompt = finalPrompt.replace('{集成的文档块}', chunksText);
      }
      
      // 替换问题占位符，使用questionStore中的当前问题
      if (questionStore.currentQuestion) {
        finalPrompt = finalPrompt.replace('{question}', questionStore.currentQuestion);
        finalPrompt = finalPrompt.replace('{问题}', questionStore.currentQuestion);
      } else {
        finalPrompt = finalPrompt.replace('{question}', '暂无问题');
        finalPrompt = finalPrompt.replace('{问题}', '暂无问题');
      }
      
      return finalPrompt;
    }
  }
}); 