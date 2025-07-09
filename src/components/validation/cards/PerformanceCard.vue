<template>
  <div class="metrics-card">
    <!-- <div class="card-header">
      <h4 class="card-title">Performance Metrics</h4>
    </div> -->
    <div class="metrics-visualization">
      <RadarChartGrid :type="type" />
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import RadarChartGrid from '../RadarChartGrid.vue';

const props = defineProps({
  type: {
    type: String,
    default: 'before'
  }
});
</script>

<style scoped>
.metrics-card {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  height: 100%;
  min-height: auto;
  max-height: none;
  width: 100%;
  position: relative;
  padding: 0;
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background-color: #f8f9fa;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #000;
}

.metrics-visualization {
  flex: 1;
  height: 100%;
  background-color: white;
  padding: 0;
  margin: 0;
  overflow: visible;
  position: relative;
  display: flex;
  flex-direction: column;
}
</style> 