<template>
  <div class="chunk-distribution-bar">
    <div class="content-container">
      <div v-if="!chunkStore.currentGridCell" class="empty-state">
        <div class="empty-message">Please Select a Question</div>
      </div>
      <div v-else class="word-frequency-list">
        <div v-if="frequencyWords.length === 0" class="no-data">
          No Chunk Data Available
        </div>
        <div v-else class="frequency-items">
          <div 
            v-for="(word, index) in frequencyWords" 
            :key="index" 
            class="frequency-item"
          >
            <div class="word-container">
              <span class="word-text">{{ word.text }}</span>
              <span class="word-count">{{ word.count }}</span>
            </div>
            <div class="frequency-bar-container">
              <div 
                class="frequency-bar" 
                :style="{ width: getBarWidth(word.count) }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuestionStore } from '../../store/questionStore';
import { useChunkStore } from '../../store/chunkStore';

const questionStore = useQuestionStore();
const chunkStore = useChunkStore();

// 计算属性：获取当前网格单元的高频词
const frequencyWords = computed(() => {
  if (!chunkStore.currentGridCell) return [];
  return chunkStore.getGridTopFrequencyWords(chunkStore.currentGridCell, 5);
});

// 计算柱状图宽度的函数
const getBarWidth = (count) => {
  if (frequencyWords.value.length === 0) return '0%';
  
  // 获取最大频率值
  const maxCount = Math.max(...frequencyWords.value.map(w => w.count));
  
  // 计算相对宽度
  const percentage = (count / maxCount) * 90;
  return `${percentage}%`;
};

// 监听当前选中的网格单元变化
watch(() => chunkStore.currentGridCell, (newCellId) => {
  // 可以在这里添加一些网格单元变化时的逻辑
  console.log('当前选中的网格单元ID:', newCellId);
});
</script>

<style scoped>
.chunk-distribution-bar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  padding: 8px;
  box-sizing: border-box;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-message {
  color: #999;
  font-size: 12px;
  text-align: center;
}

.word-frequency-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.no-data {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 10px;
}

.frequency-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.frequency-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.word-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.word-text {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.word-count {
  font-size: 16px;
  color: #666;
  font-weight: 500;
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 24px;
  text-align: center;
}

.frequency-bar-container {
  height: 7px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.frequency-bar {
  height: 7px;
  background-color: #4d7fa0;
  border-radius: 4px;
  transition: width 0.3s ease;
}
</style> 