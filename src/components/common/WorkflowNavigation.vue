<template>
  <nav class="workflow-nav">
    <h2 class="nav-title">Workflow</h2>
    
    <div class="nav-steps">
      <button 
        class="nav-step" 
        :class="{ active: currentStep === 'overview' }"
        @click="changeStep('overview')"
      >
        <span class="step-number">1</span>
        <span class="step-name">Problem Overview</span>
      </button>
      
      <button 
        class="nav-step" 
        :class="{ active: currentStep === 'diagnostic' }"
        @click="changeStep('diagnostic')"
      >
        <span class="step-number">2</span>
        <span class="step-name">Diagnostic Analysis</span>
      </button>
      
      <button 
        class="nav-step" 
        :class="{ active: currentStep === 'validation' }"
        @click="changeStep('validation')"
      >
        <span class="step-number">3</span>
        <span class="step-name">Validation</span>
      </button>
    </div>
    
    <div class="workflow-info">
      <div class="placeholder">Workflow Description</div>
    </div>
  </nav>
</template>

<script setup>
defineProps({
  currentStep: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['change-step']);

const changeStep = (step) => {
  emit('change-step', step);
};
</script>

<style scoped>
.workflow-nav {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.nav-title {
  font-size: 18px;
  color: var(--primary-color);
  margin-bottom: 20px;
}

.nav-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.nav-step {
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.nav-step:hover {
  background-color: rgba(74, 110, 224, 0.08);
}

.nav-step.active {
  background-color: rgba(74, 110, 224, 0.12);
  font-weight: 500;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-size: 14px;
}

.active .step-number {
  background-color: var(--secondary-color);
}

.workflow-info {
  margin-top: auto;
  padding-top: 20px;
}
</style> 