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
  
  // 按照开始位置排序标记
  const sortedMarks = [...marks].sort((a, b) => a.startIndex - b.startIndex);
  
  // 检测重叠标记并进行调整
  const validMarks = removeDuplicateAndOverlappingMarks(sortedMarks);
  
  // 用于逐步构建HTML的数组
  const htmlParts = [];
  let lastIndex = 0;
  
  // 遍历所有有效标记
  for (let i = 0; i < validMarks.length; i++) {
    const mark = validMarks[i];
    
    // 添加当前标记前的普通文本
    if (mark.startIndex > lastIndex) {
      htmlParts.push(text.substring(lastIndex, mark.startIndex));
    }
    
    // 添加带标记的文本
    const markText = text.substring(mark.startIndex, mark.endIndex);
    htmlParts.push(`<span class="highlight ${mark.type}">${markText}</span>`);
    
    // 更新最后处理位置
    lastIndex = mark.endIndex;
  }
  
  // 添加最后一个标记后的文本
  if (lastIndex < text.length) {
    htmlParts.push(text.substring(lastIndex));
  }
  
  return htmlParts.join('');
}

/**
 * 移除重复和重叠的标记
 * @param {Array} marks - 已排序的标记列表
 * @returns {Array} 处理后的标记列表
 */
function removeDuplicateAndOverlappingMarks(marks) {
  if (!marks || marks.length <= 1) {
    return marks;
  }
  
  const result = [marks[0]];
  
  for (let i = 1; i < marks.length; i++) {
    const current = marks[i];
    const prev = result[result.length - 1];
    
    // 检查是否重叠
    if (current.startIndex >= prev.endIndex) {
      // 如果不重叠，直接添加
      result.push(current);
    } else {
      // 对于重叠的情况，我们优先保留evidence，其次是entity，最后是uncertain
      if (shouldReplaceOverlappingMark(prev, current)) {
        // 替换前一个标记
        result.pop();
        result.push(current);
      }
      // 否则保留前一个标记，丢弃当前标记
    }
  }
  
  return result;
}

/**
 * 判断是否应该用新标记替换旧标记
 * 优先级: evidence > entity > uncertain
 * @param {Object} oldMark - 旧标记
 * @param {Object} newMark - 新标记
 * @returns {boolean} 是否应该替换
 */
function shouldReplaceOverlappingMark(oldMark, newMark) {
  // 标记类型优先级映射
  const priorityMap = {};
  priorityMap[MarkType.EVIDENCE] = 3;
  priorityMap[MarkType.ENTITY] = 2; 
  priorityMap[MarkType.UNCERTAIN] = 1;
  
  const oldPriority = priorityMap[oldMark.type] || 0;
  const newPriority = priorityMap[newMark.type] || 0;
  
  return newPriority > oldPriority;
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
  
  // 当前处理的字符位置
  let currentPosition = 0;
  
  // 处理每个段落
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    
    if (paragraph.trim() === '') {
      currentPosition += paragraph.length + 1; // +1是为了算上换行符
      continue;
    }
    
    // 找出当前段落的标记
    const paragraphEndPos = currentPosition + paragraph.length;
    const paragraphMarks = [];
    
    if (answerData.marks && Array.isArray(answerData.marks)) {
      for (let j = 0; j < answerData.marks.length; j++) {
        const mark = answerData.marks[j];
        if (mark.startIndex >= currentPosition && mark.startIndex < paragraphEndPos) {
          paragraphMarks.push({
            ...mark,
            startIndex: mark.startIndex - currentPosition,
            endIndex: mark.endIndex - currentPosition
          });
        }
      }
    }
    
    // 转换段落为HTML
    const markedParagraph = convertToMarkedHtml(paragraph, paragraphMarks);
    result.push(markedParagraph);
    
    // 更新位置（加上段落长度和换行符）
    currentPosition = paragraphEndPos + 1;
  }
  
  return result;
} 