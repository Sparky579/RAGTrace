<template>
  <div class="visualization-placeholder">
    <div class="placeholder-content">
      <div class="viz-icon">📊</div>
      <div class="viz-text">{{ typeText }} Visualization</div>
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
    'heatmap': 'Heatmap',
    'force': 'Force Diagram',
    'pca': 'PCA',
    'distribution': 'Distribution Chart',
    'radar': 'Radar Chart'
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