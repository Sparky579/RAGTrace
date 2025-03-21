<template>
  <div class="text-mark-demo">
    <div class="demo-controls">
      <h3>文本标记演示</h3>
      <textarea 
        v-model="sampleText" 
        class="text-input" 
        placeholder="输入要标记的文本..." 
        rows="5"
      ></textarea>
      
      <div class="mark-controls">
        <div class="marks-list">
          <div 
            v-for="(mark, index) in marks" 
            :key="index"
            class="mark-item"
            :class="mark.type"
          >
            <span class="mark-type">{{ getTypeName(mark.type) }}</span>
            <span class="mark-text">"{{ mark.text }}"</span>
            <button class="remove-mark" @click="removeMark(index)">×</button>
          </div>
        </div>
        
        <div class="add-mark-form">
          <div class="form-row">
            <input 
              v-model="newMark.startIndex" 
              type="number" 
              min="0" 
              :max="sampleText.length"
              placeholder="开始位置" 
              class="index-input"
            >
            <input 
              v-model="newMark.endIndex" 
              type="number" 
              min="0" 
              :max="sampleText.length"
              placeholder="结束位置" 
              class="index-input"
            >
            <select v-model="newMark.type" class="type-select">
              <option value="entity">命名实体</option>
              <option value="evidence">证据支持</option>
              <option value="uncertain">不确定内容</option>
            </select>
          </div>
          
          <div class="form-row">
            <button @click="addMark" class="add-btn">添加标记</button>
            <button @click="previewResult" class="preview-btn">预览结果</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="result-preview">
      <h3>预览结果</h3>
      <div v-if="previewHtml" class="preview-content" v-html="previewHtml"></div>
      <div v-else class="preview-empty">点击"预览结果"按钮查看标记后的文本</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
// 使用类型注释方式替代直接导入
// import { TextMark, MarkType } from '../../types/answer';
import { convertToMarkedHtml } from '../../utils/textMarkUtils';

/**
 * @typedef {import('../../types/answer').TextMark} TextMark
 * @typedef {import('../../types/answer').MarkType} MarkType
 */

// 示例文本
const sampleText = ref('RAG系统的检索效果可以通过多种方法进行改进。首先，向量数据库的选择对检索质量有重要影响。其次，检索策略的优化也很关键，可以结合混合检索和重排序技术。');

// 标记列表
const marks = ref([
  {
    type: 'entity',
    startIndex: 0,
    endIndex: 7,
    text: 'RAG系统'
  },
  {
    type: 'evidence',
    startIndex: 24,
    endIndex: 30,
    text: '向量数据库'
  }
]);

// 新标记
const newMark = reactive({
  type: 'entity',
  startIndex: 0,
  endIndex: 0,
  text: ''
});

// 预览HTML
const previewHtml = ref('');

// 计算新标记的文本
const computeMarkText = () => {
  if (newMark.startIndex >= 0 && newMark.endIndex <= sampleText.value.length && newMark.startIndex < newMark.endIndex) {
    newMark.text = sampleText.value.substring(newMark.startIndex, newMark.endIndex);
    return true;
  }
  return false;
};

// 添加标记
const addMark = () => {
  if (!computeMarkText()) {
    alert('索引位置无效，请检查开始和结束位置');
    return;
  }
  
  marks.value.push({
    type: newMark.type,
    startIndex: parseInt(newMark.startIndex),
    endIndex: parseInt(newMark.endIndex),
    text: newMark.text
  });
  
  // 重置表单
  newMark.startIndex = 0;
  newMark.endIndex = 0;
};

// 移除标记
const removeMark = (index) => {
  marks.value.splice(index, 1);
};

// 获取类型名称
const getTypeName = (type) => {
  const typeMap = {
    'entity': '命名实体',
    'evidence': '证据支持',
    'uncertain': '不确定内容'
  };
  return typeMap[type] || type;
};

// 预览结果
const previewResult = () => {
  previewHtml.value = convertToMarkedHtml(sampleText.value, marks.value);
};
</script>

<style scoped>
.text-mark-demo {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: #f9f9fa;
}

.demo-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
}

.text-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
}

.mark-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.marks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #fff;
}

.mark-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 4px;
  gap: 8px;
}

.mark-item.entity {
  background-color: rgba(33, 150, 243, 0.1);
  border-left: 3px solid rgba(33, 150, 243, 0.7);
}

.mark-item.evidence {
  background-color: rgba(76, 175, 80, 0.1);
  border-left: 3px solid rgba(76, 175, 80, 0.7);
}

.mark-item.uncertain {
  background-color: rgba(255, 152, 0, 0.1);
  border-left: 3px solid rgba(255, 152, 0, 0.7);
}

.mark-type {
  font-weight: 500;
  font-size: 12px;
  min-width: 60px;
}

.mark-text {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-mark {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #666;
  padding: 0 4px;
}

.add-mark-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
}

.form-row {
  display: flex;
  gap: 8px;
}

.index-input {
  width: 80px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.type-select {
  flex: 1;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.add-btn, .preview-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.add-btn {
  background-color: var(--primary-color);
  color: white;
  flex: 1;
}

.preview-btn {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  flex: 1;
}

.result-preview {
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
}

.preview-content {
  line-height: 1.6;
}

.preview-empty {
  color: #888;
  font-style: italic;
  padding: 20px 0;
  text-align: center;
}

:deep(.highlight) {
  padding: 2px 4px;
  border-radius: 3px;
}

:deep(.highlight.entity) {
  background-color: rgba(33, 150, 243, 0.15);
  border-bottom: 1px solid rgba(33, 150, 243, 0.4);
}

:deep(.highlight.evidence) {
  background-color: rgba(76, 175, 80, 0.15);
  border-bottom: 1px solid rgba(76, 175, 80, 0.4);
}

:deep(.highlight.uncertain) {
  background-color: rgba(255, 152, 0, 0.15);
  border-bottom: 1px solid rgba(255, 152, 0, 0.4);
}
</style>