<template>
  <div class="visualization-placeholder">
    <div class="placeholder-content">
      <div class="viz-icon">📊</div>
      <div class="viz-text">{{ typeText }}可视化</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'heatmap'
  }
});

const typeText = computed(() => {
  const types = {
    'heatmap': '热力图',
    'force': '力导向图',
    'pca': 'PCA',
    'distribution': '分布图',
    'radar': '雷达图'
  };
  
  return types[props.type] || props.type;
});
</script>

<style scoped>
.visualization-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fc;
  border-radius: 4px;
}

.placeholder-content {
  text-align: center;
  color: #666;
}

.viz-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.viz-text {
  font-size: 14px;
}
</style> 