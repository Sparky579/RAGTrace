<template>
  <div class="main-layout">
    <!-- <header class="header">
      <h1>RAGInsight</h1>
      <SystemConfig />
    </header> -->
    
    <main class="content">
      <div class="main-content">
        <UnifiedPanel />
      </div>
    </main>
  </div>
</template>

<script setup>
import SystemConfig from '../components/common/SystemConfig.vue';
import UnifiedPanel from '../components/UnifiedPanel.vue';
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.content {
  display: flex;
  flex: 1;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.main-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
</style> 