<template>
  <div class="improvement-metrics" :class="type">
    <h4 class="metrics-title">{{ title }}</h4>
    
    <div class="metrics-grid">
      <div class="metric-item">
        <div class="metric-name">Accuracy</div>
        <div class="metric-value" :class="getValueClass('accuracy')">
          {{ getMetricValue('accuracy') }}
        </div>
      </div>
      
      <div class="metric-item">
        <div class="metric-name">Retrieval Accuracy</div>
        <div class="metric-value" :class="getValueClass('retrieval')">
          {{ getMetricValue('retrieval') }}
        </div>
      </div>
      
      <div class="metric-item">
        <div class="metric-name">Completeness</div>
        <div class="metric-value" :class="getValueClass('completeness')">
          {{ getMetricValue('completeness') }}
        </div>
      </div>
      
      <div class="metric-item">
        <div class="metric-name">Latency</div>
        <div class="metric-value" :class="getValueClass('latency', true)">
          {{ getMetricValue('latency') }}ms
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'before'
  }
});

// 模拟数据，实际应从API获取
const beforeMetrics = {
  accuracy: 0.76,
  retrieval: 0.82,
  completeness: 0.65,
  latency: 450
};

const afterMetrics = {
  accuracy: 0.85,
  retrieval: 0.88,
  completeness: 0.78,
  latency: 420
};

const getMetricValue = (metricName) => {
  const metrics = props.type === 'after' ? afterMetrics : beforeMetrics;
  return metricName === 'latency' ? metrics[metricName] : metrics[metricName].toFixed(2);
};

const getValueClass = (metricName, isInverse = false) => {
  if (props.type === 'before') return '';
  
  const beforeValue = beforeMetrics[metricName];
  const afterValue = afterMetrics[metricName];
  
  if (isInverse) {
    return afterValue < beforeValue ? 'improved' : afterValue > beforeValue ? 'worse' : '';
  } else {
    return afterValue > beforeValue ? 'improved' : afterValue < beforeValue ? 'worse' : '';
  }
};
</script>

<style scoped>
.improvement-metrics {
  background-color: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  width: 220px;
}

.improvement-metrics.before {
  background-color: #f5f7fc;
}

.improvement-metrics.after {
  background-color: #f9fcf5;
}

.metrics-title {
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}

.after .metrics-title {
  color: #4caf50;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 16px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 16px;
  font-weight: 500;
}

.improved {
  color: #4caf50;
}

.improved::after {
  content: '↑';
  margin-left: 2px;
  font-size: 12px;
}

.worse {
  color: #f44336;
}

.worse::after {
  content: '↓';
  margin-left: 2px;
  font-size: 12px;
}
</style> 