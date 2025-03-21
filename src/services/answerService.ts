import { AnswerData } from '../types/answer';
import sampleAnswer from '../statics/sample_answer.json';

/**
 * 答案生成服务
 */
export const answerService = {
  /**
   * 根据提供的Prompt生成答案
   * @param prompt 用户输入的提示词
   * @returns 返回包含标记的答案数据
   */
  async generateAnswer(prompt: string): Promise<AnswerData> {
    // 在真实环境中，这里会发送请求到后端API
    // 现在我们使用样本数据模拟
    console.log('从后端获取答案数据，当前使用样本数据模拟');
    console.log('提示词:', prompt);
    
    // 延迟500ms模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 返回样本数据
    return sampleAnswer as unknown as AnswerData;
  },
  
  /**
   * 获取特定问题的答案
   * @param questionId 问题ID
   * @returns 返回包含标记的答案数据
   */
  async getAnswerForQuestion(questionId: string): Promise<AnswerData> {
    console.log('获取问题ID的答案:', questionId);
    
    // 延迟200ms模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 返回样本数据
    return sampleAnswer as unknown as AnswerData;
  }
}; 