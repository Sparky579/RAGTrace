<template>
  <div class="filter-view">
    <div class="search-section">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索问题..."
          @keyup.enter="handleSearch"
        >
        <button class="search-btn" @click="handleSearch">搜索</button>
      </div>
      
      <!-- 当前筛选条件展示 - 移至搜索框同行 -->
      <div class="filter-container">
        <div class="active-filters-inline" v-if="activeFilters.length > 0">
          <div class="filter-tag" v-for="(filter, index) in activeFilters" :key="index">
            {{ filter.name }}:{{ filter.value }}
            <span class="remove-filter" @click="removeFilter(index)">×</span>
          </div>
        </div>
        <button class="filter-btn" @click="showFilterModal = true">
          筛选条件
        </button>
      </div>
    </div>

    <!-- 移除独立的筛选条件行 -->
    <!-- <div class="active-filters" v-if="activeFilters.length > 0">
      <div class="filter-tag" v-for="(filter, index) in activeFilters" :key="index">
        {{ filter.name }}: {{ filter.value }}
        <span class="remove-filter" @click="removeFilter(index)">×</span>
      </div>
    </div> -->

    <!-- 搜索结果列表 -->
    <div class="search-results" v-if="searchResults.length > 0">
      <div 
        v-for="result in searchResults" 
        :key="result.id" 
        class="result-item"
        @click="handleResultClick(result)"
      >
        <div class="result-title">{{ result.text }}</div>
        <div class="result-metrics">
          <span>相似度: {{ result.similarity.toFixed(2) }}</span>
          <span>幻觉值: {{ result.hallucination.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- 筛选条件弹窗 -->
    <div class="filter-modal" v-if="showFilterModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>设置筛选条件</h3>
          <span class="close-btn" @click="showFilterModal = false">×</span>
        </div>
        <div class="filter-options">
          <div class="filter-option">
            <label>幻觉值</label>
            <div class="range-inputs">
              <input 
                type="number" 
                v-model="filters.hallucination.min" 
                placeholder="最小值"
                step="0.1"
                min="0"
                max="1"
              >
              <span>-</span>
              <input 
                type="number" 
                v-model="filters.hallucination.max" 
                placeholder="最大值"
                step="0.1"
                min="0"
                max="1"
              >
            </div>
          </div>
          <div class="filter-option">
            <label>相似度</label>
            <div class="range-inputs">
              <input 
                type="number" 
                v-model="filters.similarity.min" 
                placeholder="最小值"
                step="0.1"
                min="0"
                max="1"
              >
              <span>-</span>
              <input 
                type="number" 
                v-model="filters.similarity.max" 
                placeholder="最大值"
                step="0.1"
                min="0"
                max="1"
              >
            </div>
          </div>
          <div class="filter-option">
            <label>问题类型</label>
            <select v-model="filters.type">
              <option value="">全部</option>
              <option value="factual">事实型</option>
              <option value="reasoning">推理型</option>
              <option value="generation">生成型</option>
              <option value="complex">复杂型</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showFilterModal = false">取消</button>
          <button class="apply-btn" @click="applyFilters">应用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useQuestionStore } from '../../store/questionStore';

const questionStore = useQuestionStore();
const searchQuery = ref('');
const showFilterModal = ref(false);
const searchResults = ref([]);
const activeFilters = ref([]);

// 筛选条件
const filters = reactive({
  hallucination: {
    min: null,
    max: null
  },
  similarity: {
    min: null,
    max: null
  },
  type: ''
});

// 处理搜索
const handleSearch = () => {
  // 这里实现搜索逻辑
  searchResults.value = [
    {
      id: 1,
      text: '示例问题1',
      similarity: 0.85,
      hallucination: 0.3
    },
    {
      id: 2,
      text: '示例问题2',
      similarity: 0.75,
      hallucination: 0.5
    }
  ];
};

// 处理结果点击
const handleResultClick = (result) => {
  questionStore.setQuestion(result.text, result.id);
};

// 应用筛选条件
const applyFilters = () => {
  activeFilters.value = [];
  
  if (filters.hallucination.min !== null || filters.hallucination.max !== null) {
    activeFilters.value.push({
      name: '幻觉值',
      value: `${filters.hallucination.min || 0} - ${filters.hallucination.max || 1}`
    });
  }
  
  if (filters.similarity.min !== null || filters.similarity.max !== null) {
    activeFilters.value.push({
      name: '相似度',
      value: `${filters.similarity.min || 0} - ${filters.similarity.max || 1}`
    });
  }
  
  if (filters.type) {
    activeFilters.value.push({
      name: '问题类型',
      value: filters.type
    });
  }
  
  showFilterModal.value = false;
  handleSearch(); // 重新搜索应用筛选条件
};

// 移除筛选条件
const removeFilter = (index) => {
  const filter = activeFilters.value[index];
  if (filter.name === '幻觉值') {
    filters.hallucination.min = null;
    filters.hallucination.max = null;
  } else if (filter.name === '相似度') {
    filters.similarity.min = null;
    filters.similarity.max = null;
  } else if (filter.name === '问题类型') {
    filters.type = '';
  }
  
  activeFilters.value.splice(index, 1);
  handleSearch(); // 重新搜索
};
</script>

<style scoped>
.filter-view {
  height: 100%;
  width: 100%;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.search-box {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-box input {
  width: 200px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
}

.filter-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: space-between;
}

.active-filters-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: 8px;
  overflow: hidden;
}

.search-btn, .filter-btn {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.filter-btn {
  background: #f8f9fa;
}

.filter-tag {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

.remove-filter {
  cursor: pointer;
  font-weight: bold;
  padding: 0 2px;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}

.result-item:hover {
  background: #f8f9fa;
}

.result-title {
  font-size: 14px;
  margin-bottom: 4px;
}

.result-metrics {
  font-size: 12px;
  color: #666;
  display: flex;
  gap: 12px;
}

.filter-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.filter-options {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-option {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-option label {
  font-size: 14px;
  color: #666;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-inputs input {
  width: 80px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.filter-option select {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn, .apply-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn {
  border: 1px solid var(--border-color);
  background: white;
}

.apply-btn {
  border: none;
  background: var(--primary-color);
  color: white;
}
</style> 