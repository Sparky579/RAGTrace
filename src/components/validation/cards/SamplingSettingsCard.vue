<template>
  <div class="sampling-settings-card">
    <div class="card-header">
      <h4 class="card-title">Sampling Settings</h4>
    </div>
    <div class="settings-content">
      <!-- Top row with Temperature and Chunks settings -->
      <div class="settings-row">
        <!-- Temperature slider -->
        <div class="setting-item">
          <div class="setting-header">
            <span class="setting-label">Diversity</span>
            <span class="value-indicator">{{ temperature }}</span>
          </div>
          <input 
            type="range" 
            v-model="temperature" 
            min="0" 
            max="1" 
            step="0.05"
            class="compact-slider"
          >
        </div>
        
        <!-- Chunks per question input -->
        <div class="setting-item">
          <div class="setting-header">
            <span class="setting-label">Total Chunks</span>
            <input 
              type="number" 
              v-model="chunkNumbers" 
              min="1" 
              max="100"
              class="number-input"
            >
          </div>
        </div>
      </div>

      <!-- Keywords and Tags in one row -->
      <div class="settings-row">
        <!-- Keywords section -->
        <div class="setting-item tags-section">
          <div class="setting-header">
            <span class="setting-label">Retrieval Question</span>
          </div>
          <div class="tags-input-container">
            <input 
              type="text" 
              v-model="keywordInput"
              @keydown.enter="addKeyword"
              placeholder="Enter keyword"
              class="tag-input"
            >
          </div>
          <div class="tags-container">
            <span v-if="keywords.length === 0" class="no-tags">No keywords added</span>
            <span v-for="(keyword, index) in keywords" :key="index" class="tag">
              {{ keyword }}
              <button class="tag-remove" @click="removeKeyword(index)">×</button>
            </span>
          </div>
        </div>
        
        <!-- Tags section -->
        <div class="setting-item tags-section">
          <div class="setting-header">
            <span class="setting-label">Retrieval Tags</span>
          </div>
          <div class="tags-input-container">
            <input 
              type="text" 
              v-model="tagInput"
              @keydown.enter="addTag"
              placeholder="Enter tag"
              class="tag-input"
            >
          </div>
          <div class="tags-container">
            <span v-if="tags.length === 0" class="no-tags">No tags added</span>
            <span v-for="(tag, index) in tags" :key="index" class="tag">
              {{ tag }}
              <button class="tag-remove" @click="removeTag(index)">×</button>
            </span>
          </div>
        </div>
      </div>
      
      <!-- Bottom row with Sample count and Preview button -->
      <div class="settings-row bottom-row">
        <!-- Sample count input -->
        <div class="setting-item sample-count-item">
          <div class="setting-header">
            <span class="setting-label">Questions to Sample</span>
            <input 
              type="number" 
              v-model="sampleCount" 
              min="1" 
              max="20" 
              class="number-input"
            >
          </div>
        </div>
        
        <!-- Preview button -->
        <div class="setting-item preview-button-item">
          <button 
            class="preview-btn" 
            @click="startPreview"
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const temperature = ref(0.7);
const chunkNumbers = ref(20);
const keywordInput = ref('');
const keywords = ref([]);
const tagInput = ref('');
const tags = ref([]);
const sampleCount = ref(5);

// Set debug mode directly in the code (false = real API, true = mock data)
const DEBUG_MODE = false;

// Emit event when preview button is clicked
const emit = defineEmits(['preview']);

// Add keyword
const addKeyword = () => {
  if (keywordInput.value.trim() && !keywords.value.includes(keywordInput.value.trim())) {
    keywords.value.push(keywordInput.value.trim());
    keywordInput.value = '';
  }
};

// Remove keyword
const removeKeyword = (index) => {
  keywords.value.splice(index, 1);
};

// Add tag
const addTag = () => {
  if (tagInput.value.trim() && !tags.value.includes(tagInput.value.trim())) {
    tags.value.push(tagInput.value.trim());
    tagInput.value = '';
  }
};

// Remove tag
const removeTag = (index) => {
  tags.value.splice(index, 1);
};

// Start preview with API call
const startPreview = async () => {
  // Basic settings object for both modes
  const settingsData = {
    temperature: temperature.value,
    chunkNumbers: chunkNumbers.value,
    keywords: [...keywords.value],
    tags: [...tags.value],
    sampleCount: sampleCount.value,
    isLoading: true // Set loading state
  };
  
  // Emit initial loading state
  emit('preview', settingsData);
  
  if (DEBUG_MODE) {
    // In debug mode, use static data (original mode)
    setTimeout(() => {
      // Update with loading state set to false
      settingsData.isLoading = false;
      emit('preview', settingsData);
    }, 800); // Simulate API delay
    
    return;
  }
  
  // Use real API data
  try {
    const response = await axios.post('http://localhost:5000/api/generate_questions', {
      related_question: keywords.value.join(' '),
      related_tags: tags.value.join(' '),
      num_chunks: chunkNumbers.value,
      temperature: temperature.value,
      question_numbers: sampleCount.value
    });
    
    // Update settings with API response data
    const result = {
      ...settingsData,
      isLoading: false,
      // Add API response data
      generatedQA: response.data.generated_qa.map(item => ({
        question: item.question,
        gt: item.answer,
        chunk: item.chunk
      }))
    };
    
    emit('preview', result);
  } catch (error) {
    console.error('Failed to get preview data:', error);
    // Error handling
    alert('Failed to get preview data. Please check if the API server is running.');
    
    // Update with loading state set to false
    settingsData.isLoading = false;
    emit('preview', settingsData);
  }
};
</script>

<style scoped>
.sampling-settings-card {
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
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background-color: #f8f9fa;
  border-bottom: 1px solid var(--border-color, #eaeaea);
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #333;
}

.settings-content {
  flex: 1;
  padding: 8px 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-row {
  display: flex;
  gap: 8px;
}

.bottom-row {
  margin-top: 2px;
}

.setting-item {
  background-color: #f9f9fa;
  border-radius: 4px;
  padding: 6px 8px;
  flex: 1;
}

.sample-count-item {
  flex: 0.6;
}

.preview-button-item {
  flex: 0.4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.setting-label {
  font-size: 16px;
  font-weight: 600;
  color: #555;
}

.value-indicator {
  font-size: 16px;
  color: #666;
  min-width: 20px;
  text-align: center;
}

.compact-slider {
  width: 100%;
  height: 4px;
  accent-color: #4d7fa0;
}

.number-input {
  width: 50px;
  padding: 2px 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  text-align: center;
}

.tags-section {
  display: flex;
  flex-direction: column;
}

.tags-input-container {
  margin-bottom: 4px;
}

.tag-input {
  width: 100%;
  padding: 3px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 24px;
  max-height: 50px;
  overflow-y: auto;
}

.no-tags {
  color: #999;
  font-style: italic;
  font-size: 16px;
}

.tag {
  display: inline-flex;
  align-items: center;
  background-color: #e3f2fd;
  color: #1976d2;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 16px;
  border: 1px solid #bbdefb;
}

.tag-remove {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 16px;
  cursor: pointer;
  margin-left: 2px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.preview-btn {
  background-color: #4d7fa0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 16px;
  cursor: pointer;
  width: 100%;
  height: 30px;
  font-weight: 500;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-btn:hover {
  background-color: #6d94b2;
}
</style> 