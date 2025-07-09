/**
 * 文本处理工具函数
 */

// 停用词列表（常见的不具有分析价值的词）
const stopwords = [
  'a', 'an', 'the', 'and', 'or', 'but', 'has', 'one', 'had', 'have', 'also', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'whose', 'if', 'as', 'until', 'while', 'because',
  'since', 'although', 'though'
];

/**
 * 分析文本中的词频
 * @param {string} text - 要分析的文本
 * @param {number} limit - 返回的高频词数量限制
 * @param {boolean} removeStopwords - 是否移除停用词
 * @return {Array} 返回词频数组，按频率降序排列
 */
export function analyzeWordFrequency(text, limit = 20, removeStopwords = true) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // 清理文本，只保留字母、数字和空格
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  
  // 分词
  const words = cleanText.split(/\s+/).filter(word => word.length > 1);
  
  // 词频统计
  const wordCounts = {};
  
  words.forEach(word => {
    // 如果设置了移除停用词且当前词是停用词，则跳过
    if (removeStopwords && stopwords.includes(word)) {
      return;
    }
    
    if (wordCounts[word]) {
      wordCounts[word]++;
    } else {
      wordCounts[word] = 1;
    }
  });
  
  // 转换为数组并排序
  const wordFrequency = Object.keys(wordCounts).map(word => ({
    text: word,
    count: wordCounts[word]
  })).sort((a, b) => b.count - a.count);
  
  // 返回前limit个高频词
  return wordFrequency.slice(0, limit);
}

/**
 * 提取文本中的实体（如专有名词、术语等）
 * 这是一个简化版实现，实际项目中可能需要使用NLP工具
 * @param {string} text - 要分析的文本
 * @return {Array} 返回可能的实体列表
 */
export function extractEntities(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // 此处使用一个简单的正则表达式匹配可能的实体
  // 实际应用中应该使用更复杂的NLP分析
  const entityRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const matches = text.match(entityRegex) || [];
  
  // 去重
  return [...new Set(matches)];
}

export default {
  analyzeWordFrequency,
  extractEntities
}; 