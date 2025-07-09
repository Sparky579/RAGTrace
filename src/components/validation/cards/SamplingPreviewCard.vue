<template>
  <div class="sampling-preview-card">
    <div class="card-header">
      <h4 class="card-title">Sampling Preview</h4>
    </div>
    <div class="preview-content">
      <!-- Loading indicator -->
      <div v-if="isLoading" class="loading-container">
        <div class="loader"></div>
        <p class="loading-text">Generating sample questions...</p>
      </div>
    
      <div v-else class="sampled-questions">
        <p v-if="!sampledQuestions || sampledQuestions.length === 0" class="no-samples">No sampled questions, please preview in sampling settings</p>
        <div v-else v-for="(question, index) in displayedQuestions" :key="index" 
             class="question-item" 
             :class="{ 'selected': selectedQuestionIndex === index }"
             @click="selectQuestion(question, index)">
          <div class="question-header">
            <span class="question-number">{{ index + 1 }}</span>
            <span class="question-text">{{ question.question || question.text }}</span>
          </div>
        </div>
      </div>
      <div class="button-container">
        <button class="test-btn run-test-btn" @click="runTest" :disabled="isLoading || selectedQuestionIndex === null">Run Test</button>
        <button class="test-btn test-all-btn" @click="runTestAll" :disabled="isLoading || !hasDisplayQuestions">Test All</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, computed } from 'vue';
import { useQuestionStore } from '../../../store/questionStore';

const props = defineProps({
  sampledQuestions: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['run-test', 'select-question']);
const questionStore = useQuestionStore();

// Track selected question
const selectedQuestionIndex = ref(null);

// Check if there is loading state
const isLoading = computed(() => {
  return props.sampledQuestions && props.sampledQuestions.isLoading;
});

// Compute questions to display (handling different data formats)
const displayedQuestions = computed(() => {
  // Check if there is generatedQA property (from API response)
  if (props.sampledQuestions && props.sampledQuestions.generatedQA) {
    return props.sampledQuestions.generatedQA;
  }
  // Otherwise use original format
  return props.sampledQuestions;
});

// Check if we have questions to display
const hasDisplayQuestions = computed(() => {
  return displayedQuestions.value && displayedQuestions.value.length > 0;
});

// Select question - this will update Question Details
const selectQuestion = (question, index) => {
  // Update the selected index
  selectedQuestionIndex.value = index;
  
  // Set selected question in store
  const questionText = question.question || question.text;
  const questionId = question.id || `sample-${index}`;
  
  // 添加详细调试打印
  console.log('==== SamplingPreviewCard选中问题详情 ====');
  console.log('原始问题数据(stringified):', JSON.stringify(question));
  console.log('原始问题字段列表:', Object.keys(question));
  console.log('问题字段值:', question.text, question.question);
  console.log('GT字段值:', question.gt);
  console.log('answer字段值:', question.answer);
  console.log('chunk字段值:', question.chunk);
  
  // Create temporary question object with correct field mapping
  const questionWithMetrics = {
    ...question,
    id: questionId,
    text: questionText,
    question: questionText,
    // 确保gt和answer字段正确映射
    gt: question.gt || "No standard answer available",
    answer: question.answer || "No model answer available",
    metrics: {
      retrieval_effectiveness: 0.5,
      retrieval_stability: 0.5,
      generation_reliability: 0.5,
      knowledge_reliability: 0.5
    }
  };
  
  // 添加调试信息
  console.log('发送到store的问题对象:', JSON.stringify(questionWithMetrics));
  console.log('gt字段:', questionWithMetrics.gt);
  console.log('answer字段:', questionWithMetrics.answer);
  
  // Update the store
  questionStore.setQuestion(questionWithMetrics, questionId);
  
  // 添加延迟检查store中的数据
  setTimeout(() => {
    console.log('==== 检查store中的问题数据 ====');
    console.log('store中的currentQuestion:', JSON.stringify(questionStore.currentQuestion));
    console.log('store中的gt字段:', questionStore.currentQuestion?.gt);
    console.log('store中的answer字段:', questionStore.currentQuestion?.answer);
  }, 100);
  
  // 创建一个包含正确映射字段的对象作为事件数据
  const eventData = {
    ...question,
    gt: questionWithMetrics.gt,
    answer: questionWithMetrics.answer
  };
  
  // Emit event for parent component with correctly mapped fields
  emit('select-question', eventData);
};

// Run test for selected question
const runTest = () => {
  if (selectedQuestionIndex.value !== null && displayedQuestions.value[selectedQuestionIndex.value]) {
    const selectedQuestion = displayedQuestions.value[selectedQuestionIndex.value];
    // 确保传递完整的问题对象，包含所有必需的字段
    const completeQuestion = {
      ...selectedQuestion,
      question: selectedQuestion.question || selectedQuestion.text,
      gt: selectedQuestion.gt || "No standard answer available",
      chunk: selectedQuestion.chunk || ""
    };
    
    emit('run-test', [completeQuestion]);
  }
};

// Run test for all questions
const runTestAll = () => {
  // 确保每个问题对象都包含所有必需字段
  const completeQuestions = displayedQuestions.value.map(q => ({
    ...q,
    question: q.question || q.text,
    gt: q.gt || "No standard answer available",
    chunk: q.chunk || ""
  }));
  
  emit('run-test', completeQuestions);
};
</script>

<style scoped>
.sampling-preview-card {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  height: 100%;
  min-height: auto;
  max-height: none;
  flex: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background-color: #f8f9fa;
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #333;
}

.preview-content {
  flex: 1;
  padding: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Loading container styles */
.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.loader {
  border: 3px solid #f3f3f3;
  border-radius: 50%;
  border-top: 3px solid #4d7fa0;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  color: #666;
  font-size: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.sampled-questions {
  flex: 1;
  overflow-y: auto;
  background-color: #f9f9fa;
  padding: 8px 12px;
  scrollbar-width: none; /* Hide scrollbar for Firefox */
}

.sampled-questions::-webkit-scrollbar {
  width: 0; /* Hide scrollbar for Webkit browsers */
  display: none;
}

.button-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 10px;
  background-color: #f9f9fa;
  border-top: 1px solid #e8e8e8;
}

.test-btn {
  padding: 8px 20px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  transition: background-color 0.2s;
}

.run-test-btn {
  background-color: #4d7fa0;
}

.test-all-btn {
  background-color: #4d7fa0;
}

.test-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.test-btn:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
  opacity: 0.7;
}

.no-samples {
  color: #999;
  text-align: center;
  margin-top: 40px;
  font-size: 15px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.question-item {
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  margin-bottom: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.question-item:hover {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  background-color: #f5f7fa;
}

.question-item.selected {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid var(--primary-color, #4d7fa0);
  background-color: #f0f8ff;
}

.question-header {
  display: flex;
  padding: 8px 10px;
  align-items: center;
}

.question-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  margin-right: 10px;
  font-size: 14px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  flex-shrink: 0;
}

.question-text {
  flex: 1;
  font-size: 16px;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}
</style> 