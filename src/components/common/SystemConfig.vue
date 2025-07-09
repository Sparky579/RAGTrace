<template>
  <div class="system-config">
    <button class="config-btn" @click="showConfig = !showConfig">
      <span>System Configuration</span>
    </button>
    
    <div v-if="showConfig" class="config-panel">
      <div class="config-section">
        <h3>Model Selection</h3>
        <div class="placeholder">Model selection interface</div>
      </div>
      
      <div class="config-section">
        <h3>Temperature Settings</h3>
        <div class="placeholder">Temperature settings interface</div>
      </div>
      
      <div class="config-section">
        <h3>Other Parameters</h3>
        <div class="placeholder">Other parameters interface</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const showConfig = ref(false);
</script>

<style scoped>
.system-config {
  position: relative;
}

.config-btn {
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.config-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  margin-top: 8px;
  z-index: 100;
  color: var(--text-color);
}

.config-section {
  margin-bottom: 16px;
}

.config-section h3 {
  font-size: 16px;
  margin-bottom: 8px;
}
</style> 