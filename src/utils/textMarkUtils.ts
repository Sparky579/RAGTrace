/**
 * 文本标记工具函数
 * 提供用于处理标记文本的实用函数
 */

import { MarkType } from '../types/answer';

/**
 * @typedef {import('../types/answer').AnswerData} AnswerData
 * @typedef {import('../types/answer').TextMark} TextMark
 */

/**
 * 将文本和标记转换为HTML格式
 * @param {string} text - 原始文本
 * @param {Array} marks - 标记列表
 * @returns {string} 带有标记的HTML
 */
export function convertToMarkedHtml(text, marks) {
  if (!text || !marks || marks.length === 0) {
    return text;
  }
  
  // 按照文本内容匹配标记，而不是按token索引
  return highlightTextMatches(text, marks);
}

/**
 * 根据文本内容匹配高亮
 * @param {string} text - 原始文本
 * @param {Array} marks - 标记列表
 * @returns {string} 带有标记的HTML
 */
function highlightTextMatches(text, marks) {
  if (!text || !marks || marks.length === 0) {
    return text;
  }
  
  // 获取gt文本 (简化获取逻辑，用字符串操作避免类型错误)
  let gtText = '';
  try {
    // @ts-ignore
    const win = window;
    // 尝试从localStorage获取，避免类型错误
    try {
      gtText = localStorage.getItem('currentGroundTruth') || '';
    } catch (e) {
      // 忽略错误
    }
    
    // 如果未能从localStorage获取，直接使用全局变量
    if (!gtText && typeof win !== 'undefined') {
      if (typeof win.currentGroundTruth === 'string') {
        gtText = win.currentGroundTruth;
      }
    }
  } catch (e) {
    // 忽略错误
  }
  
  // 如果有gt文本，先替换为evidence类型
  let result = text;
  if (gtText && gtText.trim() !== '' && gtText !== 'No ground truth available') {
    try {
      const escapedGtText = gtText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const gtRegex = new RegExp(escapedGtText, 'gi');
      if (gtRegex.test(result)) {
        result = result.replace(gtRegex, (match) => {
          return `<span class="highlight evidence">${match}</span>`;
        });
        // 如果替换成功，直接返回结果
        return result;
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  // 创建一个优先级映射
  const priorityMap = {
    'evidence': 3,
    'entity': 2,
    'uncertain': 1
  };
  
  // 排序标记
  const sortedMarks = [...marks].sort((a, b) => {
    const aPriority = priorityMap[a.type] || 0;
    const bPriority = priorityMap[b.type] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // 高优先级在前
    }
    
    return 0; // 保持原始顺序
  });
  
  // 处理每个标记
  for (const mark of sortedMarks) {
    if (!mark.text) continue;
    
    // 查找文本匹配
    const idx = result.indexOf(mark.text);
    if (idx !== -1) {
      // 检查这个位置是否已经有标签
      const checkRange = result.substring(Math.max(0, idx - 20), Math.min(result.length, idx + mark.text.length + 20));
      if (!checkRange.includes('<span')) {
        // 没有标签，可以添加
        const before = result.substring(0, idx);
        const markedText = `<span class="highlight ${mark.type}">${mark.text}</span>`;
        const after = result.substring(idx + mark.text.length);
        result = before + markedText + after;
      }
    }
  }
  
  return result;
}

/**
 * 将答案数据转换为段落列表
 * @param {Object} answerData - 答案数据
 * @returns {Array} 包含HTML标记的段落数组
 */
export function convertAnswerToParagraphs(answerData) {
  if (!answerData || !answerData.text) {
    return [];
  }
  
  // 拆分文本为段落
  const paragraphs = answerData.text.split(/\n+/);
  const result = [];
  
  // 处理每个段落
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    
    if (paragraph.trim() === '') {
      continue;
    }
    
    // 对整个段落进行标记处理
    const markedParagraph = convertToMarkedHtml(
      paragraph, 
      Array.isArray(answerData.marks) ? answerData.marks : []
    );
    result.push(markedParagraph);
  }
  
  return result;
} 