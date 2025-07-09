<template>
  <div class="filter-view">
    <!-- Top compact control section -->
    <div class="control-section">
      <div class="main-controls">
        <!-- Search and display count controls -->
        <div class="search-section">
          <input 
            type="text" 
            class="search-box" 
            placeholder="Search questions..." 
            v-model="searchQuery"
            @input="handleSearch"
          />
          <button class="search-btn" @click="performSearch">
            <i class="search-icon">🔍</i>
          </button>
          <button class="confirm-btn" @click="handleAddQuestion">
            <i class="confirm-icon">✓</i>
          </button>
        </div>
        <div class="slider-container">
          <span class="slider-label">Display:</span>
          <input 
            type="range" 
            min="10" 
            max="100" 
            step="10" 
            class="density-slider" 
            v-model="displayCount"
            @input="updateDisplayCount"
          />
          <span class="slider-value">{{ displayCount }}</span>
        </div>
      </div>
      
      <!-- Active filter tags compact display -->
      <div class="active-filters" v-if="hasActiveFiltersOrTags">
        <div class="filter-chips">
          <div v-for="(filter, index) in activeFilters" :key="`filter-${index}`" class="filter-chip">
            <span>{{ filter.label }}:{{ filter.value }}</span>
            <button class="remove-filter" @click="removeFilter(filter.key)">×</button>
          </div>
          
          <!-- Custom tags display -->
          <div v-for="(tag, index) in customTags" :key="`tag-${index}`" class="tag-chip">
            <span class="tag-icon">🏷️</span><span>{{ tag }}</span>
            <button class="remove-tag" @click="removeTag(index)">×</button>
          </div>
          
          <button class="clear-all" @click="clearAllFilters">Clear</button>
        </div>
      </div>
    </div>
    
    <!-- Question preview area -->
    <div class="question-preview">
      <h3 class="section-title">Question Preview</h3>
      <div v-if="questionStore.filteredQuestions.length > 0" class="preview-list">
        <div v-for="(question, index) in previewQuestions" :key="question.id" class="preview-item"
            :class="{ 'highlighted': question.id === questionStore.currentQuestionId }"
            @click="selectQuestion(question)">
          <span class="item-id">#{{ question.id }}</span>
          <span class="item-text">{{ truncateText(question.text || question.question, 80) }}</span>
        </div>
        <div v-if="questionStore.filteredQuestions.length > previewCount" class="more-items">
          {{ questionStore.filteredQuestions.length - previewCount }} more questions...
        </div>
      </div>
      <div v-else class="empty-preview">
        No matching questions, please adjust filter conditions
      </div>
    </div>

    <!-- Inline filter section - always visible -->
    <div class="inline-filter-section">
      <div class="filter-header">
        <h3>Filter Settings</h3>
      </div>

      <!-- Filter options -->
      <div class="filter-options">
        <!-- Weight settings area -->
        <div class="weights-section">
          
          <!-- Sliders instead of button groups -->
          <div class="weights-grid">
            <div class="weight-item">
              <label class="weight-label" style="color: #e09192">Retrieval Ineffectiveness</label>
              <div class="weight-control">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="1" 
                  class="weight-slider" 
                  v-model="weights.retrieval_effectiveness"
                />
                <span class="weight-value">{{ weights.retrieval_effectiveness }}</span>
              </div>
            </div>
            
            <div class="weight-item">
              <label class="weight-label" style="color: #dbc076">Prompt Fragility</label>
              <div class="weight-control">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="1" 
                  class="weight-slider" 
                  v-model="weights.retrieval_stability"
                />
                <span class="weight-value">{{ weights.retrieval_stability }}</span>
              </div>
            </div>
            
            <div class="weight-item">
              <label class="weight-label" style="color: #c5a3d0">Standard Anomaly</label>
              <div class="weight-control">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="1" 
                  class="weight-slider" 
                  v-model="weights.knowledge_reliability"
                />
                <span class="weight-value">{{ weights.knowledge_reliability }}</span>
              </div>
            </div>
            
            <div class="weight-item">
              <label class="weight-label" style="color: #7eb0d5">Generation Anomaly</label>
              <div class="weight-control">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="1" 
                  class="weight-slider" 
                  v-model="weights.generation_reliability"
                />
                <span class="weight-value">{{ weights.generation_reliability }}</span>
              </div>
            </div>
            
            <div class="weight-item">
              <label class="weight-label" style="color: #34495E">Question Correctness</label>
              <div class="weight-control">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="1" 
                  class="weight-slider" 
                  v-model="weights.correctness"
                />
                <span class="weight-value">{{ weights.correctness }}</span>
              </div>
            </div>
            
            <div class="weight-item">
              <label class="weight-label" style="color: #34495E">Topic Relevance</label>
              <div class="weight-control">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="1" 
                  class="weight-slider" 
                  v-model="weights.relevance"
                />
                <span class="weight-value">{{ weights.relevance }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- <div class="tags-section">
          <h4 class="subsection-title">Tag Management</h4>
          
          <div class="tags-input-container">
            <input 
              type="text" 
              class="tag-input" 
              placeholder="Add new tag..." 
              v-model="newTag"
              @keydown.enter="addTag(newTag)"
            />
            <button class="add-tag-btn" @click="addTag(newTag)">Add</button>
          </div>
          
          <div class="tags-list">
            <div v-if="customTags.length === 0" class="no-tags">
              No custom tags yet
            </div>
            <div v-for="(tag, index) in customTags" :key="index" class="tag-item">
              <span class="tag-name">{{ tag }}</span>
              <button class="remove-tag-btn" @click="removeTag(index)">×</button>
            </div>
          </div>
        </div> -->

        <!-- <div class="filter-footer">
          <button class="apply-btn" @click="applyChanges">Apply</button>
        </div> -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useQuestionStore } from '../../store/questionStore';
import eventBus from '../../utils/eventBus';

const questionStore = useQuestionStore();

// 搜索和显示设置
const searchQuery = ref('');
const displayCount = ref(50);
const previewCount = ref(5);
const isRankedSearch = ref(false); 

// 过滤器状态
const filters = reactive({
  retrieval_effectiveness: { min: 0, max: 1 },
  retrieval_stability: { min: 0, max: 1 },
  generation_reliability: { min: 0, max: 1 },
  knowledge_reliability: { min: 0, max: 1 }
});

// 权重设置
const weights = reactive({
  retrieval_effectiveness: 3,
  retrieval_stability: 3,
  generation_reliability: 3,
  knowledge_reliability: 3,
  correctness: 3,
  relevance: 3
});

// 自定义标签
const customTags = ref([]);
const newTag = ref('');

// 备份当前过滤状态
const filtersBackup = reactive({});
const weightsBackup = reactive({});
const tagsBackup = ref([]);

onMounted(async () => {
  await questionStore.loadSummaryMetrics();
  displayCount.value = questionStore.topQuestionCount;
  Object.assign(filters, JSON.parse(JSON.stringify(questionStore.filterConditions)));
  Object.assign(filtersBackup, JSON.parse(JSON.stringify(filters)));
  Object.assign(weightsBackup, JSON.parse(JSON.stringify(weights)));
  tagsBackup.value = [...customTags.value];
});

// 监听状态变化
watch(() => questionStore.topQuestionCount, (newCount) => {
  displayCount.value = newCount;
}, { immediate: true });

watch(() => questionStore.filterConditions, (newConditions) => {
  Object.assign(filters, JSON.parse(JSON.stringify(newConditions)));
}, { deep: true });

// 预览区域问题列表
const previewQuestions = computed(() => {
  return questionStore.filteredQuestions.slice(0, previewCount.value);
});

// 更新搜索查询
async function handleSearch() {
  isRankedSearch.value = false;
  await questionStore.setSearchQuery(searchQuery.value, false);
}

// 更新显示数量
function updateDisplayCount() {
  const countValue = parseInt(displayCount.value);
  const validCount = isNaN(countValue) ? 50 : Math.max(10, Math.min(100, countValue));
  questionStore.setTopQuestionCount(validCount);
}

// 更新过滤器（实时预览）
function updateFilter() {
  Object.values(filters).forEach(range => {
    if (parseFloat(range.min) > parseFloat(range.max)) {
      range.min = range.max;
    }
  });
}

// 执行搜索 - 使用排序模式，优先级最高
async function performSearch() {
  try {
    console.log('执行排序搜索模式...');
    
    // 1. 设置本地状态，明确标记为排序模式
    isRankedSearch.value = true;
    
    // 2. 先清空本地搜索输入框的监听器触发，防止正常搜索逻辑覆盖排序逻辑
    document.activeElement?.blur();
    
    // 3. 准备请求数据
    const requestData = {
      question: searchQuery.value,
      weights: {
        similarity_count: parseFloat((weights.relevance / 5).toFixed(4)),
        generation_reliability: parseFloat((weights.generation_reliability / 5).toFixed(4)),
        knowledge_reliability: parseFloat((weights.knowledge_reliability / 5).toFixed(4)),
        retrieval_effectiveness: parseFloat((weights.retrieval_effectiveness / 5).toFixed(4)),
        retrieval_stability: parseFloat((weights.retrieval_stability / 5).toFixed(4)),
        question_correctness: parseFloat((weights.correctness / 5).toFixed(4))
      }
    };
    
    console.log('发送API请求到后端:', requestData);
    
    // 4. 发送请求到后端API
    const response = await fetch('http://localhost:5000/api/weighted_rank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('接收到后端响应:', data);
    
    if (!data.ranked_ids || !Array.isArray(data.ranked_ids)) {
      throw new Error('后端响应格式错误，缺少ranked_ids数组');
    }
    
    console.log('API返回的ranked_ids数量:', data.ranked_ids.length, '前5个:', data.ranked_ids.slice(0, 5));
    
    // 5. 重置questionStore的状态，确保使用新的排序
    questionStore.useRankedSearch = true;  // 明确设置为true
    questionStore.rankedIds = data.ranked_ids;
    
    // 重置所有过滤条件以获得完整原始排序效果
    console.log('重置所有过滤条件以确保纯粹的排序效果');
    questionStore.filterConditions = {
      retrieval_effectiveness: { min: 0, max: 1 },
      retrieval_stability: { min: 0, max: 1 },
      generation_reliability: { min: 0, max: 1 },
      knowledge_reliability: { min: 0, max: 1 }
    };
    
    // 6. 确保解除可能的阻塞
    questionStore.isUpdatingFilters = false;
    
    // 7. 强制刷新状态 - 直接调用applyFilters
    console.log('直接调用applyFilters强制刷新');
    await questionStore.applyFilters();
    
    // 8. 验证rankedIds是否正确应用
    const firstFiveFiltered = questionStore.filteredQuestions.slice(0, 5).map(q => q.id);
    const firstFiveRanked = data.ranked_ids.slice(0, 5);
    console.log('排序搜索执行结果对比:');
    console.log('- API返回的前5个ID:', firstFiveRanked);
    console.log('- 过滤后的前5个ID:', firstFiveFiltered);
    console.log('- 是否匹配:', JSON.stringify(firstFiveFiltered) === JSON.stringify(firstFiveRanked));
    
    // 如果不匹配，尝试强制再次应用
    if (JSON.stringify(firstFiveFiltered) !== JSON.stringify(firstFiveRanked)) {
      console.log('排序未正确应用，再次尝试...');
      // 直接修改filteredQuestions，按照ranked_ids的顺序重新排列
      const orderedQuestions = [];
      
      for (const id of data.ranked_ids) {
        const numericId = typeof id === 'string' ? parseInt(id) : id;
        let question = questionStore.allQuestions.find(q => {
          const qId = q.id;
          const numericQId = typeof qId === 'string' ? parseInt(qId) : qId;
          return numericId === numericQId || numericId === qId || 
                (typeof numericId === 'number' && numericId.toString() === qId);
        });
        
        if (question) {
          orderedQuestions.push(question);
        }
      }
      
      // 取前N个问题并直接更新
      const displayCount = Math.min(orderedQuestions.length, questionStore.topQuestionCount);
      questionStore.filteredQuestions = orderedQuestions.slice(0, displayCount);
      
      console.log('强制排序后的前5个问题ID:', 
        questionStore.filteredQuestions.slice(0, 5).map(q => q.id));
    }
  } catch (error) {
    console.error('排序搜索出错:', error);
    alert('搜索请求失败: ' + error.message);
  }
}

// 在热图中显示 - 使用普通搜索模式
function showInHeatmap() {
  if (!searchQuery.value.trim()) return;
  
  // 普通搜索模式 - 明确指定不使用排序数据
  isRankedSearch.value = false;
  
  // 确保普通搜索模式不会被意外覆盖
  questionStore.setSearchQuery(searchQuery.value, false);
  
  // 使用普通搜索模式的事件
  eventBus.emit('showSearchInHeatmap', {
    query: searchQuery.value,
    position: 'center',
    useRanking: false, // 明确指定不使用排序数据
    timestamp: Date.now() // 添加时间戳确保事件唯一性
  });
}

// 添加标签
function addTag(tag) {
  if (tag && tag.trim()) {
    customTags.value.push(tag.trim());
    newTag.value = '';
  }
}

// 移除标签
function removeTag(index) {
  customTags.value.splice(index, 1);
}

// 应用过滤器
async function applyChanges() {
  await nextTick();
  await questionStore.setFilterConditions(filters);
  
  Object.assign(filtersBackup, JSON.parse(JSON.stringify(filters)));
  Object.assign(weightsBackup, JSON.parse(JSON.stringify(weights)));
  tagsBackup.value = [...customTags.value];
}

// 移除特定过滤器
async function removeFilter(key) {
  if (key && filters[key]) {
    filters[key].min = 0;
    filters[key].max = 1;
    await questionStore.setFilterConditions(filters);
  }
}

// 清除所有过滤器和标签
async function clearAllFilters() {
  await questionStore.resetFilters();
  searchQuery.value = '';
  customTags.value = [];
}

// 选择问题
async function selectQuestion(question) {
  // 优先从result8.json中获取完整数据
  try {
    // 加载问题数据
    const dataModule = await import('../../statics/result8.json');
    const result8Data = dataModule.default || [];
    
    // 直接使用id-1作为索引获取问题
    const id = parseInt(question.id);
    const completeQuestion = result8Data[id-1];
    
    console.log('从result8获取的问题(index:', id-1, '):', completeQuestion);
    console.log('gt字段:', completeQuestion.gt);
    console.log('answer字段:', completeQuestion.answer);
    
    // 使用完整问题数据更新store
    if (completeQuestion) {
      questionStore.setQuestion(completeQuestion, question.id);
    } else {
      // 如果在result8中找不到，再使用传入的问题
      questionStore.setQuestion(question, question.id);
    }
  } catch (error) {
    console.error('从result8加载问题数据失败:', error);
    // 出错时使用传入的问题
    questionStore.setQuestion(question, question.id);
  }
  
  // 使用pointSelected事件通知热力图
  const eventData = {
    id: question.id,
    isFromFilterView: true
  };
  
  eventBus.emit('pointSelected', eventData);
}

// 截断文本
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 计算是否有活动过滤器
const hasActiveFiltersOrTags = computed(() => {
  return activeFilters.value.length > 0 || customTags.value.length > 0;
});

// 活动过滤器列表
const activeFilters = computed(() => {
  const result = [];
  
  const filterNames = {
    retrieval_effectiveness: 'Retrieval Failure',
    retrieval_stability: 'Prompt Fragility',
    generation_reliability: 'Generation Anomaly',
    knowledge_reliability: 'Standard Deviation'
  };
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value.min > 0) {
      result.push({
        key,
        label: `${filterNames[key]} Min`,
        value: `${Math.round(value.min * 100)}%`
      });
    }
    
    if (value.max < 1) {
      result.push({
        key,
        label: `${filterNames[key]} Max`,
        value: `${Math.round(value.max * 100)}%`
      });
    }
  });
  
  return result;
});

// 添加新问题处理函数
const handleAddQuestion = () => {
  const query = searchQuery.value.trim();
  if (query) {
    questionStore.addNewQuestion(query);
    // 可选：添加后清空搜索框
    // searchQuery.value = ''; 
  } else {
    console.warn("Search query is empty, cannot add question.");
    // 这里可以添加一些用户提示，例如弹出一个小的提示信息
  }
};
</script>

<style scoped>
.filter-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  width: 100%; /* Ensure using full width */
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 12px;
  overflow: hidden;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Compact control area styles */
.control-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
}

.main-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-section {
  display: flex;
  align-items: center;
  flex: 1;
  margin-right: 6px;
}

.search-box {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  height: 30px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.filter-btn, .search-btn, .confirm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
  margin-left: 4px;
  cursor: pointer;
}

.filter-icon, .search-icon, .confirm-icon {
  font-style: normal;
  font-size: 16px;
}

.confirm-btn {
  background-color: #e3f2fd;
  border-color: #bbdefb;
}

.confirm-icon {
  color: #2196f3;
}

.slider-container {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.slider-label {
  font-size: 16px;
  color: #555;
  margin-right: 4px;
}

.density-slider {
  width: 80px;
  margin: 0 4px;
  height: 4px;
  accent-color: #4d7fa0;
}

.slider-value {
  font-size: 16px;
  color: #555;
  min-width: 20px;
}

/* Compact filter tags styles */
.active-filters {
  padding: 4px;
  background-color: #f7f9fa;
  border-radius: 4px;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.filter-chip, .tag-chip {
  display: flex;
  align-items: center;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 16px;
  height: 24px;
}

.filter-chip {
  background-color: #e0e0e0;
}

.tag-chip {
  background-color: #e3f2fd;
  border: 1px solid #bbdefb;
}

.remove-filter, .remove-tag {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  margin-left: 2px;
  padding: 0 2px;
  line-height: 1;
}

.remove-tag {
  color: #2196f3;
}

.tag-icon {
  margin-right: 2px;
  font-size: 14px;
}

.clear-all {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 16px;
  padding: 1px 4px;
  height: 24px;
}

/* Question preview area styles */
.question-preview {
  border-top: 1px solid #f0f0f0;
  padding-top: 4px;
  width: 100%; /* Ensure using full width */
  flex: 1; /* 允许预览区域灵活变化高度 */
  min-height: 120px; /* 最小高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #333;
}

.preview-list {
  font-size: 16px;
  flex: 1; /* 使列表填充剩余空间 */
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  overflow-x: hidden;
  width: 100%; /* Ensure using full width */
}

.preview-list::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.preview-item {
  padding: 4px 6px;
  font-size: 16px;
  border-radius: 3px;
  margin-bottom: 2px;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  line-height: 1.2;
}

.preview-item:hover {
  background-color: #f5f5f5;
}

.preview-item.highlighted {
  background-color: #e3f2fd;
}

.item-id {
  color: #888;
  margin-right: 8px;
  font-size: 16px;
  flex-shrink: 0;
}

.item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-items {
  text-align: center;
  color: #888;
  font-size: 16px;
  padding: 4px;
  font-style: italic;
}

.empty-preview {
  color: #888;
  text-align: center;
  padding: 20px;
  font-style: italic;
  font-size: 16px;
}

/* Inline filter section */
.inline-filter-section {
  border-top: 1px solid #f0f0f0;
  margin-top: 6px;
  padding-top: 4px;
  width: 100%;
  flex-shrink: 0; /* 防止这部分被压缩 */
  display: flex;
  flex-direction: column;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.filter-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subsection-title {
  margin: 0 0 6px 0;
  font-size: 16px;
  color: #555;
  font-weight: normal;
}

/* Weight settings section */
.weights-section {
  background-color: #f9f9fa;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 6px; /* 添加下边距 */
}

.weights-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px; /* 减小间距 */
}

.weight-item {
  display: flex;
  flex-direction: column;
}

.weight-label {
  font-size: 16px;
  margin-bottom: 2px; /* 减小下边距 */
}

.weight-control {
  display: flex;
  align-items: center;
}

.weight-slider {
  flex: 1;
  height: 4px;
  accent-color: #4d7fa0;
}

.weight-value {
  margin-left: 6px;
  font-size: 16px;
  color: #555;
  width: 18px;
  text-align: center;
}

/* Tag management section */
.tags-section {
  background-color: #f9f9fa;
  padding: 8px;
  border-radius: 4px;
}

.tags-input-container {
  display: flex;
  margin-bottom: 8px;
}

.tag-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.add-tag-btn {
  padding: 4px 8px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  margin-left: 4px;
  font-size: 16px;
  cursor: pointer;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 60px; /* 减小标签列表的最大高度 */
  overflow-y: auto;
}

.tag-item {
  background-color: #e3f2fd;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.tag-name {
  margin-right: 4px;
}

.remove-tag-btn {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}

.no-tags {
  color: #999;
  font-style: italic;
  text-align: center;
  width: 100%;
  padding: 8px;
  font-size: 16px;
}

/* Bottom buttons */
.filter-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.apply-btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  background-color: #3498db;
  border: none;
  color: white;
}
</style>