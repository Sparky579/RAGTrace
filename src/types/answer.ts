/**
 * 答案数据类型定义
 * 
 * 这个文件提供了后端返回的答案数据结构的类型定义
 */

/**
 * 标记类型枚举
 * @enum {string}
 */
export const MarkType = {
  /** 命名实体 */
  ENTITY: 'entity',
  /** 证据支持 */
  EVIDENCE: 'evidence',
  /** 不确定内容 */
  UNCERTAIN: 'uncertain'
};

/**
 * 文本标记接口
 * @typedef {Object} TextMark
 * @property {string} type - 标记类型 
 * @property {number} startIndex - 开始位置
 * @property {number} endIndex - 结束位置
 * @property {string} text - 被标记的文本内容
 * @property {string} [sourceId] - 对于证据类型，关联的来源ID
 */

/**
 * 证据项接口
 * @typedef {Object} Evidence
 * @property {string} id - 证据ID
 * @property {string} source - 证据来源，如 "Chunk #1"
 * @property {string} text - 证据文本内容
 * @property {number} [relevance] - 相关性分数(0-1)
 */

/**
 * 答案数据接口
 * @typedef {Object} AnswerData
 * @property {string} text - 原始答案文本
 * @property {TextMark[]} marks - 文本标记
 * @property {string} model - 使用的模型，如 "GPT-4"
 * @property {number} confidence - 置信度分数(0-1)
 * @property {Evidence[]} evidences - 支持证据列表
 * @property {string} timestamp - 生成时间戳
 */

// 导出类型以便在 TypeScript 环境中使用
export const types = {
  MarkType,
  TextMark: null,
  Evidence: null,
  AnswerData: null
}; 