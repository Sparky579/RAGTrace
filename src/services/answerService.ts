import sampleAnswer from '../statics/sample_answer.json';
import { MarkType } from '../types/answer';

// 类型定义
/**
 * @typedef {import('../types/answer').AnswerData} AnswerData
 * @typedef {import('../types/answer').TextMark} TextMark
 */

// 创建一个安全的TextMark对象工厂函数
/**
 * @param {string} type 标记类型
 * @param {string} text 被标记的文本内容
 * @returns {TextMark} 生成的TextMark对象
 */
function createTextMark(type, text) {
  return {
    type,
    text,
    startIndex: 0,
    endIndex: 0
  };
}

/**
 * 答案生成服务
 */
export const answerService = {
  /**
   * 根据提供的Prompt生成答案
   * @param prompt 用户输入的提示词
   * @returns {Promise<AnswerData>} 返回包含标记的答案数据
   */
  async generateAnswer(prompt) {
    // 在真实环境中，这里会发送请求到后端API
    // 现在我们使用样本数据模拟
    console.log('从后端获取答案数据，当前使用样本数据模拟');
    console.log('提示词:', prompt);
    
    // 延迟500ms模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 返回样本数据
    let answer = {...sampleAnswer};
    // 使用样本数据中的evidences
    return answer;
  },
  
  /**
   * 向localhost:5377/user_rag发送POST请求获取答案
   * @param query 用户查询
   * @param chunks 集成的文档块
   * @param customPrompt 用户自定义提示词
   * @returns {Promise<AnswerData>} 返回从API获取的答案数据
   */
  async generateAnswerFromAPI(query, chunks, customPrompt) {
    console.log('向localhost:5377/user_rag发送请求');
    try {
      // 构造请求数据，只包含必要字段
      const requestBody = {
        query: query,
        chunks: chunks,
        custom_prompt: customPrompt
      };
      
      console.log('发送数据:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('http://localhost:5377/user_rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('API返回数据:', responseData);
      
      // 将API返回的数据转换为AnswerData格式
      return this.convertAPIResponseToAnswerData(responseData);
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  },
  
  /**
   * 将API返回的数据转换为AnswerData格式
   * @param apiResponse API返回的数据
   * @returns {AnswerData} 转换后的AnswerData格式数据
   */
  convertAPIResponseToAnswerData(apiResponse) {
    // 从API响应中提取信息，构建标记
    const marks = [];
    
    // 处理支持的实体（标绿）
    if (apiResponse.supported_entities && apiResponse.supported_entities.length > 0) {
      apiResponse.supported_entities.forEach(entity => {
        // 使用安全的方式添加
        if (typeof entity === 'string') {
          marks.push({
            type: MarkType.EVIDENCE,
            text: entity,
            startIndex: 0,
            endIndex: 0
          });
        }
      });
    }
    
    // 处理其他名词（标蓝）
    if (apiResponse.other_nouns && apiResponse.other_nouns.length > 0) {
      apiResponse.other_nouns.forEach(noun => {
        // 使用安全的方式添加
        if (typeof noun === 'string') {
          marks.push({
            type: MarkType.ENTITY,
            text: noun,
            startIndex: 0,
            endIndex: 0
          });
        }
      });
    }
    
    // 处理不支持的实体（标黄）
    if (apiResponse.unsupported_entities && apiResponse.unsupported_entities.length > 0) {
      apiResponse.unsupported_entities.forEach(entity => {
        // 使用安全的方式添加
        if (typeof entity === 'string') {
          marks.push({
            type: MarkType.UNCERTAIN,
            text: entity,
            startIndex: 0,
            endIndex: 0
          });
        }
      });
    }
    
    // 构造AnswerData格式的响应
    return {
      text: apiResponse.answer || '',
      marks: marks,
      model: apiResponse.model || 'API Model',
      confidence: apiResponse.confidence || 0.9,
      evidences: apiResponse.evidences || [],
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * 获取特定问题的答案
   * @param questionId 问题ID
   * @returns {Promise<AnswerData>} 返回包含标记的答案数据
   */
  async getAnswerForQuestion(questionId) {
    console.log('获取问题ID的答案:', questionId);
    
    // 延迟200ms模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 返回样本数据
    let answer = {...sampleAnswer};
    // 使用样本数据中的evidences
    return answer;
  }
}; 