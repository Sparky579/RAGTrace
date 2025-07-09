import axios from 'axios';

/**
 * 为证据项生成关联的chunk类型和索引
 * @param {Object} item 证据项
 * @param {number} index 证据项在数组中的索引
 * @returns {Object} 包含relatedChunkType和relatedChunkIndex的对象
 */
function generateRelatedChunkInfo(item, index) {
  // 创建一个伪随机但稳定的哈希值，基于text和index
  let hashValue = 0;
  const text = item.text || '';
  for (let i = 0; i < text.length; i++) {
    hashValue = ((hashValue << 5) - hashValue) + text.charCodeAt(i);
    hashValue = hashValue & hashValue; // 转为32位整数
  }
  hashValue = Math.abs(hashValue + index);
  
  // 根据哈希值选择chunk类型：I、O或S
  const chunkTypes = ['I', 'O', 'S'];
  const typeIndex = hashValue % chunkTypes.length;
  const chunkType = chunkTypes[typeIndex];
  
  // 生成0-5之间的chunkIndex
  const chunkIndex = Math.abs(Math.floor(hashValue / 3)) % 6;
  
  return {
    relatedChunkType: chunkType,
    relatedChunkIndex: chunkIndex
  };
}

/**
 * 证据链服务模块
 */
export const evidenceService = {
  /**
   * 根据问题和文档块内容获取证据链
   * @param {string} question 问题文本
   * @param {string} chunk 文档块内容
   * @returns {Promise<Array>} 返回证据链数组
   */
  async getEvidenceChains(question, chunk) {
    try {
      // 为问题添加". The answer is {gt}"
      const enhancedQuestion = `${question}. The answer is {gt}`;
      
      console.log('发送请求到API，参数:', { 
        question: enhancedQuestion, 
        chunk: chunk 
      });
      
      const response = await axios.post('http://localhost:5000/api/evidence-chains', {
        question: enhancedQuestion,
        chunk: chunk
      });
      
      console.log('API返回数据:', response.data);
      
      // 处理返回的数据，确保字段完整
      if (response.data) {
        // 如果返回的不是数组而是对象，尝试从对象中提取数组
        let evidenceData = Array.isArray(response.data) ? response.data : [response.data];
        
        return evidenceData.map((item, index) => {
          // 确保每个项都是对象
          const evidenceItem = typeof item === 'object' ? item : {};
          
          // 生成关联的chunk信息
          const relatedChunkInfo = generateRelatedChunkInfo(evidenceItem, index);
          
          return {
            id: `chunk${index + 1}`,
            source: evidenceItem.source || "Tom and Jerry Cartoons",
            text: evidenceItem.text || "",
            relevance: 0.85 + (Math.random() * 0.15 - 0.05),
            summary: evidenceItem.summary || (evidenceItem.text ? evidenceItem.text.substring(0, 100) + "..." : ""),
            sourceEntity: evidenceItem.sourceEntity || "Unknown",
            answerEntity: evidenceItem.answerEntity || "Unknown",
            relatedChunkType: relatedChunkInfo.relatedChunkType,
            relatedChunkIndex: relatedChunkInfo.relatedChunkIndex,
            isReferenced: false,
            impactMetric: evidenceItem.impactMetric !== undefined ? evidenceItem.impactMetric : 0
          };
        });
      }
      
      console.warn('API返回了空数据或无效数据');
      return this.getMockEvidenceChains();
    } catch (error) {
      console.error('获取证据链失败:', error);
      // 出错时返回模拟数据而不是抛出异常
      console.warn('使用模拟数据替代');
      return this.getMockEvidenceChains();
    }
  },
  
  /**
   * 获取模拟数据（用于测试）
   * @returns {Array} 返回模拟证据链数据
   */
  getMockEvidenceChains() {
    return [
      {
        id: "chunk-mock-1",
        source: "Tom and Jerry Cartoons",
        text: "Jerry, sitting on Spike's back, taunts Tom.",
        relevance: 0.92,
        summary: "Jerry taunts Tom while sitting on Spike's back.",
        sourceEntity: "Jerry",
        answerEntity: "Spike",
        relatedChunkType: "I",
        relatedChunkIndex: 2,
        isReferenced: false,
        impactMetric: 1
      },
      {
        id: "chunk-mock-2",
        source: "Tom and Jerry Cartoons",
        text: "Tom notices a dog statue and steals the head.",
        relevance: 0.78,
        summary: "Tom steals the head of a dog statue.",
        sourceEntity: "Tom",
        answerEntity: "dog statue",
        relatedChunkType: "O",
        relatedChunkIndex: 1,
        isReferenced: false,
        impactMetric: 0
      },
      {
        id: "chunk-mock-3",
        source: "Tom and Jerry Cartoons",
        text: "Spike threatens to tear Tom apart if he wakes up Spike's puppy son Tyke.",
        relevance: 0.89,
        summary: "Spike threatens Tom about waking up his son Tyke.",
        sourceEntity: "Spike",
        answerEntity: "Tyke",
        relatedChunkType: "S",
        relatedChunkIndex: 0,
        isReferenced: false,
        impactMetric: -0.5
      }
    ];
  }
};