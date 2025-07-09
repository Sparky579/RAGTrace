<template>
  <div class="chunk-ranking">
    <div class="chunk-comparison-view">
      <div class="column-headers">
        <div class="column-header" @click="handleOriginalClick">
          Original
          <div v-if="loadingType === 'original'" class="loading-indicator"></div>
        </div>
        <div class="column-header" @click="handleImprovedClick">
          Improved
          <div v-if="loadingType === 'improved'" class="loading-indicator"></div>
        </div>
        <div class="column-header" @click="handleStandardClick">
          Standard
          <div v-if="loadingType === 'standard'" class="loading-indicator"></div>
        </div>
      </div>
      
      <div class="columns-wrapper">
        <!-- SVG连线覆盖层 - 提前放置确保在背景 -->
        <svg class="connection-lines"></svg>
        
        <div class="columns-container">
          <!-- 使用组件复用列，减少重复代码 -->
          <div class="chunk-column" v-for="(columnType, colIndex) in columnTypes" :key="columnType.type">
            <div v-for="(chunk, index) in getColumnData(columnType.type)" 
                :key="`${columnType.type}-${index}`" 
                class="chunk-node"
                :class="{ 
                  'active-chunk': isContentActive(chunk.content),
                  'integrated': isChunkNameIntegrated(`${columnType.prefix}${index + 1}`)
                }"
                @click="showChunkDetails($event, `${columnType.prefix}${index + 1}`, chunk.score.toFixed(2), index + 1, chunk.content)">
              <div class="rank-number">{{ columnType.prefix }}{{ index + 1 }}</div>
              <div class="chunk-dot" 
                :style="{ 
                  'width': `${16 + Math.pow(chunk.score, 2) * 20}px`, 
                  'height': `${16 + Math.pow(chunk.score, 2) * 20}px`,
                  'background-color': getColorByState(chunk.state)
                }" 
                :data-chunk="`${columnType.prefix}${index + 1}`"
                :data-content="chunk.content"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 问题编辑模态框 -->
    <div class="question-edit-modal" ref="questionEditModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ loadingType === 'original' ? '自定义Original查询' : loadingType === 'improved' ? '自定义Improved查询' : '编辑问题' }}</h3>
          <button class="close-modal-btn" @click="closeQuestionEditModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="question-edit">问题：</label>
            <textarea id="question-edit" v-model="editedQuestion" rows="4" class="form-control"></textarea>
          </div>
          <div class="modal-footer">
            <button class="action-btn submit-btn" @click="submitEditedQuestion">{{ loadingType ? '执行查询' : '提交' }}</button>
            <button class="action-btn cancel-btn" @click="closeQuestionEditModal">取消</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="chunk-tooltip" ref="chunkTooltip" style="display: none; position: fixed;">
      <div class="tooltip-content">
        <div class="tooltip-header">
          <span class="tooltip-title"></span>
          <span class="tooltip-score"></span>
        </div>
        <div class="tooltip-text"></div>
        <div class="tooltip-actions">
          <button class="action-btn view-full-content" ref="viewFullContentBtn">
            <span class="action-icon"><i class="fas fa-eye"></i></span> View Full
          </button>
          <button class="action-btn add-to-prompt" ref="addToPromptBtn">
            <span class="action-icon">+</span> Add to Prompt
          </button>
          <button class="action-btn remove-from-prompt" ref="removeFromPromptBtn">
            <span class="action-icon">-</span> Remove from Prompt
          </button>
          <button class="action-btn track-evidence" ref="trackEvidenceBtn">
            <span class="action-icon"><i class="fas fa-link"></i></span> Track Evidence
          </button>
        </div>
      </div>
    </div>
    
    <!-- 全文内容模态框 -->
    <div class="full-content-modal" ref="fullContentModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"></h3>
          <button class="close-modal-btn" @click="closeFullContentModal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="full-content-text"></p>
        </div>
      </div>
    </div>
    
    <div class="chunk-details-panel">
      <div class="legend">
        <div class="legend-item">
          <div class="legend-dot" style="background-color: #7ea6c4;"></div>
          <span>Relevant</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background-color: rgb(211, 211, 211);"></div>
          <span>Irrelevant</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background-color: rgb(150, 150, 150);"></div>
          <span>Negative</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot integrated-dot"></div>
          <span>Integrated</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot active-dot"></div>
          <span>Current</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, inject, computed } from 'vue';
import { useChunkStore } from '../../store/chunkStore';
import { useQuestionStore } from '../../store/questionStore';
import { evidenceService } from '../../services/evidenceService';
import axios from 'axios';

const chunkStore = useChunkStore();
const questionStore = useQuestionStore();
const chunkTooltip = ref(null);
const addToPromptBtn = ref(null);
const removeFromPromptBtn = ref(null);
const viewFullContentBtn = ref(null);
const trackEvidenceBtn = ref(null);
const fullContentModal = ref(null);
const questionEditModal = ref(null);
const editedQuestion = ref('');

// 定义列类型配置
const columnTypes = [
  { type: 'original', prefix: 'O', key: 'similar_chunks_original' },
  { type: 'improved', prefix: 'I', key: 'similar_chunks_after' },
  { type: 'standard', prefix: 'S', key: 'similar_chunks_standard' }
];

// 从questionStore获取当前问题
const currentQuestion = computed(() => questionStore.currentQuestion);
const groundTruth = computed(() => currentQuestion.value?.gt || null);

// 注入evidenceTrackerRef
const evidenceTrackerRef = inject('evidenceTrackerRef', null);

// 状态变量
let caseChunksData = ref(null);
const isLoading = ref(false);
const loadingType = ref(null);
const selectedChunk = ref(null);
const activeContent = ref(null);

// 处理Original按钮点击
const handleOriginalClick = () => {
  if (!currentQuestion.value?.question) {
    console.warn('没有当前问题信息，无法编辑');
    return;
  }
  
  // 设置编辑框中的初始内容
  editedQuestion.value = currentQuestion.value.question;
  
  // 设置当前正在编辑的列类型
  loadingType.value = 'original';
  
  // 显示编辑模态框
  if (questionEditModal.value) {
    questionEditModal.value.style.display = 'flex';
    
    // 添加ESC键关闭事件
    document.addEventListener('keydown', escEditModalHandler);
    
    // 添加点击外部关闭事件
    setTimeout(() => {
      document.addEventListener('click', editModalOutsideClickHandler);
    }, 100);
  }
};

// 处理Improved按钮点击
const handleImprovedClick = () => {
  if (!currentQuestion.value?.question) {
    console.warn('没有当前问题信息，无法编辑');
    return;
  }
  
  // 设置编辑框中的初始内容
  editedQuestion.value = currentQuestion.value.question;
  
  // 设置当前正在编辑的列类型
  loadingType.value = 'improved';
  
  // 显示编辑模态框
  if (questionEditModal.value) {
    questionEditModal.value.style.display = 'flex';
    
    // 添加ESC键关闭事件
    document.addEventListener('keydown', escEditModalHandler);
    
    // 添加点击外部关闭事件
    setTimeout(() => {
      document.addEventListener('click', editModalOutsideClickHandler);
    }, 100);
  }
};

// 处理Standard按钮点击
const handleStandardClick = () => {
  if (!currentQuestion.value?.question || !groundTruth.value) {
    console.warn('没有足够的问题信息，无法处理标准查询');
    return;
  }
  
  // 构建"{question} is {gt}"格式的查询
  const standardQuery = `${currentQuestion.value.question} is ${groundTruth.value}`;
  
  // 使用构建的查询发送请求
  fetchSimilarChunksWithCustomQuery('standard', standardQuery);
};

// 使用自定义查询获取相似文档块
const fetchSimilarChunksWithCustomQuery = async (type, customQuery) => {
  if (!customQuery) {
    console.warn('没有提供自定义查询');
    return;
  }
  
  try {
    isLoading.value = true;
    loadingType.value = type;
    
    const requestData = {
      question: customQuery,
      gt: groundTruth.value,
      top_k: 6
    };
    
    const response = await axios.post('http://localhost:5000/api/search_similar', requestData);
    
    if (response.data) {
      const similarChunks = formatSimilarChunks(response.data.similar_chunks || []);
      
      if (!caseChunksData.value) {
        caseChunksData.value = {
          question: currentQuestion.value.question,
          similar_chunks_original: [],
          similar_chunks_after: [],
          similar_chunks_standard: []
        };
      }
      
      const columnConfig = columnTypes.find(col => col.type === type);
      if (columnConfig) {
        caseChunksData.value[columnConfig.key] = similarChunks;
      }
      
      nextTick(() => drawConnections());
    }
  } catch (error) {
    console.error(`获取${type}类型的相似文档块失败:`, error);
  } finally {
    isLoading.value = false;
    loadingType.value = null;
  }
};

// 关闭问题编辑模态框
const closeQuestionEditModal = () => {
  if (questionEditModal.value) {
    questionEditModal.value.style.display = 'none';
    
    // 移除事件监听器
    document.removeEventListener('keydown', escEditModalHandler);
    document.removeEventListener('click', editModalOutsideClickHandler);
  }
};

// ESC键关闭编辑模态框
const escEditModalHandler = (e) => {
  if (e.key === 'Escape') {
    closeQuestionEditModal();
  }
};

// 点击编辑模态框外部关闭
const editModalOutsideClickHandler = (e) => {
  const modalContent = questionEditModal.value?.querySelector('.modal-content');
  if (modalContent && !modalContent.contains(e.target) && questionEditModal.value.contains(e.target)) {
    closeQuestionEditModal();
  }
};

// 提交编辑后的问题
const submitEditedQuestion = () => {
  if (editedQuestion.value.trim() === '') {
    alert('问题不能为空');
    return;
  }
  
  // 保存当前列类型
  const currentType = loadingType.value || 'original';
  
  // 使用编辑后的问题获取相似文档块
  fetchSimilarChunksWithCustomQuery(currentType, editedQuestion.value);
  
  // 关闭模态框
  closeQuestionEditModal();
};

// 获取指定列的数据
const getColumnData = (type) => {
  if (!caseChunksData.value) return [];
  
  const columnConfig = columnTypes.find(col => col.type === type);
  return columnConfig ? caseChunksData.value[columnConfig.key] || [] : [];
};

// 实用函数
const isChunkIntegrated = (chunkId) => chunkStore.isChunkIntegrated(chunkId);
const isContentActive = (content) => activeContent.value === content;
const isChunkNameIntegrated = (chunkName) => chunkStore.isChunkNameIntegrated(chunkName);

// 简化颜色状态函数
const getColorByState = (state) => {
  if (state > 0) return '#7ea6c4';    // 相关 - 蓝色
  if (state === 0) return 'rgb(211, 211, 211)'; // 无关 - 浅灰色
  return 'rgb(150, 150, 150)';                  // 负面 - 更浅的深灰色
}

// 获取相似文档块
const fetchSimilarChunks = async (type) => {
  if (!currentQuestion.value?.question) {
    console.warn('没有当前问题信息，无法获取相似文档块');
    return;
  }
  
  try {
    isLoading.value = true;
    loadingType.value = type;
    
    const requestData = {
      question: currentQuestion.value.question,
      gt: groundTruth.value,
      top_k: 6
    };
    
    const response = await axios.post('http://localhost:5000/api/search_similar', requestData);
    
    if (response.data) {
      const similarChunks = formatSimilarChunks(response.data.similar_chunks || []);
      
      if (!caseChunksData.value) {
        caseChunksData.value = {
          question: currentQuestion.value.question,
          similar_chunks_original: [],
          similar_chunks_after: [],
          similar_chunks_standard: []
        };
      }
      
      const columnConfig = columnTypes.find(col => col.type === type);
      if (columnConfig) {
        caseChunksData.value[columnConfig.key] = similarChunks;
      }
      
      nextTick(() => drawConnections());
    }
  } catch (error) {
    console.error(`获取${type}类型的相似文档块失败:`, error);
  } finally {
    isLoading.value = false;
    loadingType.value = null;
  }
};

// 格式化相似文档块数据
const formatSimilarChunks = (chunks) => {
  if (!Array.isArray(chunks)) return [];
  
  return chunks.map(chunk => ({
    content: chunk.content || '',
    score: typeof chunk.score === 'number' ? chunk.score : 0.5,
    state: typeof chunk.state === 'number' ? chunk.state : 0
  }));
};

// 显示文档块详情
const showChunkDetails = (event, chunkName, score, chunkId, content) => {
  const tooltip = chunkTooltip.value;
  if (!tooltip) return;
  
  // 如果当前选中的chunk已经是激活状态，则关闭tooltip并清除激活状态
  if (activeContent.value === content) {
    closeTooltip();
    return;
  }
  
  // 设置激活的内容
  activeContent.value = content;
  
  // 保存选中的chunk信息
  selectedChunk.value = {
    id: chunkId,
    name: `Chunk ${chunkName}`,
    relevance: parseFloat(score),
    content: content || "No content found"
  };
  
  // 设置tooltip内容
  tooltip.querySelector('.tooltip-title').textContent = selectedChunk.value.name;
  tooltip.querySelector('.tooltip-score').textContent = `Relevance: ${selectedChunk.value.relevance.toFixed(2)}`;
  tooltip.querySelector('.tooltip-text').textContent = selectedChunk.value.content.substring(0, 200) + '...';
  
  // 显示/隐藏添加/移除按钮
  const isIntegrated = isChunkIntegrated(chunkId);
  addToPromptBtn.value.style.display = isIntegrated ? 'none' : 'flex';
  removeFromPromptBtn.value.style.display = isIntegrated ? 'flex' : 'none';
  
  // 显示tooltip
  tooltip.style.display = 'block';
  
  // 定位tooltip - 使用fixed定位，相对于视口
  const rect = event.currentTarget.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  // 计算位置，确保在视窗内
  const { left: leftPos, top: topPos } = calculateTooltipPosition(rect, tooltipRect);
  
  tooltip.style.left = `${leftPos}px`;
  tooltip.style.top = `${topPos}px`;
  
  // 添加点击外部关闭tooltip的事件
  setTimeout(() => {
    document.removeEventListener('click', closeTooltipListener);
    document.addEventListener('click', closeTooltipListener);
  }, 0);
  
  // 高亮所有相同内容的点并重新绘制连线
  drawConnections();
};

// 计算tooltip位置
const calculateTooltipPosition = (triggerRect, tooltipRect) => {
  // 计算左侧位置，确保不超出右侧边界
  let leftPos = triggerRect.left + triggerRect.width + 8;
  
  // 检查是否会超出右侧边界
  if (leftPos + tooltipRect.width > window.innerWidth) {
    // 如果会超出右侧边界，则显示在左侧
    leftPos = triggerRect.left - tooltipRect.width - 8;
    
    // 如果左侧也放不下，则调整位置不超出边界
    if (leftPos < 0) {
      leftPos = Math.max(0, Math.min(window.innerWidth - tooltipRect.width - 5, 
                         triggerRect.left - tooltipRect.width / 2 + triggerRect.width / 2));
    }
  }
  
  // 计算顶部位置，确保不超出底部或顶部边界
  let topPos = triggerRect.top + triggerRect.height / 2;
  topPos = Math.max(5, Math.min(window.innerHeight - tooltipRect.height - 5, topPos));
  
  return { left: leftPos, top: topPos };
};

// 关闭tooltip
const closeTooltip = () => {
  if (chunkTooltip.value) {
    chunkTooltip.value.style.display = 'none';
    activeContent.value = null;
    document.removeEventListener('click', closeTooltipListener);
    drawConnections();
  }
};

// 点击外部关闭tooltip
const closeTooltipListener = (e) => {
  const tooltip = chunkTooltip.value;
  const currentTargets = document.querySelectorAll('.active-chunk');
  
  if (!tooltip) return;
  
  // 检查点击是否在tooltip外部，且不是在当前激活的chunk上
  let isOnActiveChunk = false;
  currentTargets.forEach(target => {
    if (target.contains(e.target)) {
      isOnActiveChunk = true;
    }
  });
  
  if (!tooltip.contains(e.target) && !isOnActiveChunk) {
    closeTooltip();
  }
};

// 添加文档块到Prompt
const addToPrompt = () => {
  if (!selectedChunk.value) return;
  
  const selectedContent = selectedChunk.value.content;
  
  // 查找所有列中具有相同内容的chunks
  columnTypes.forEach(columnType => {
    const chunks = getColumnData(columnType.type);
    
    chunks.forEach((chunk, index) => {
      if (chunk.content === selectedContent && 
          !chunkStore.isChunkNameIntegrated(`${columnType.prefix}${index + 1}`)) {
        
        const chunkToAdd = {
          id: `Chunk ${columnType.prefix}${index + 1}-${Date.now() + index}`,
          name: `Chunk ${columnType.prefix}${index + 1}`,
          content: chunk.content,
          relevance: chunk.score || 0.5,
        };
        
        chunkStore.addChunk(chunkToAdd);
      }
    });
  });
  
  closeTooltip();
};

// 从Prompt移除文档块
const removeFromPrompt = () => {
  if (!selectedChunk.value) return;
  
  // 获取选中的chunk内容，并移除所有匹配内容的块
  const selectedContent = selectedChunk.value.content;
  const chunksToRemove = chunkStore.integratedChunks.filter(c => c.content === selectedContent);
  
  chunksToRemove.forEach(chunk => {
    chunkStore.removeChunk(chunk.id);
  });
  
  closeTooltip();
};

// 绘制连线的函数
const drawConnections = () => {
  nextTick(() => {
    const svg = document.querySelector('.connection-lines');
    if (!svg) return;
    
    // 清除现有连线，但保留defs定义
    const defs = svg.querySelector('defs');
    svg.innerHTML = '';
    if (defs) svg.appendChild(defs);
    
    // 设置SVG尺寸
    const container = document.querySelector('.columns-wrapper');
    if (container) {
      svg.setAttribute('width', container.offsetWidth);
      svg.setAttribute('height', container.offsetHeight);
    }
    
    // 获取所有节点
    const columns = document.querySelectorAll('.chunk-column');
    if (columns.length < 2) return;
    
    if (!caseChunksData.value) return;
    
    // 创建内容到索引的映射
    const contentToIndices = buildContentToIndicesMap();
    
    // 更新相同内容节点的激活状态
    updateActiveNodes();
    
    // 为每个内容相同的chunk之间创建连线
    drawConnectionLines(columns, contentToIndices);
  });
};

// 构建内容到索引的映射
const buildContentToIndicesMap = () => {
  const contentToIndices = new Map();
  
  // 处理所有列的数据
  columnTypes.forEach(columnType => {
    const chunks = getColumnData(columnType.type);
    
    chunks.forEach((chunk, index) => {
      if (!contentToIndices.has(chunk.content)) {
        const indices = { original: -1, after: -1, standard: -1 };
        indices[columnType.type === 'improved' ? 'after' : columnType.type] = index;
        contentToIndices.set(chunk.content, indices);
      } else {
        const indices = contentToIndices.get(chunk.content);
        indices[columnType.type === 'improved' ? 'after' : columnType.type] = index;
      }
    });
  });
  
  return contentToIndices;
};

// 更新节点激活状态
const updateActiveNodes = () => {
  if (activeContent.value) {
    document.querySelectorAll('.chunk-dot').forEach(dot => {
      const parentNode = dot.closest('.chunk-node');
      if (!parentNode) return;
      
      if (dot.dataset.content === activeContent.value) {
        parentNode.classList.add('active-chunk');
      } else {
        parentNode.classList.remove('active-chunk');
      }
    });
  }
};

// 绘制连接线
const drawConnectionLines = (columns, contentToIndices) => {
  const svg = document.querySelector('.connection-lines');
  if (!svg) return;
  
  contentToIndices.forEach((indices, content) => {
    const isActive = content === activeContent.value;
    
    // 从原始到改进
    if (indices.original >= 0 && indices.after >= 0) {
      connectChunks(columns[0], columns[1], indices.original, indices.after, 
                   getChunkState('original', indices.original), svg, isActive);
    }
    
    // 从改进到标准
    if (indices.after >= 0 && indices.standard >= 0) {
      connectChunks(columns[1], columns[2], indices.after, indices.standard, 
                   getChunkState('improved', indices.after), svg, isActive);
    }
    
    // 从原始到标准
    if (indices.original >= 0 && indices.standard >= 0) {
      connectChunks(columns[0], columns[2], indices.original, indices.standard, 
                   getChunkState('original', indices.original), svg, isActive);
    }
  });
};

// 获取指定chunk的状态
const getChunkState = (type, index) => {
  const columnConfig = columnTypes.find(col => col.type === type);
  if (!columnConfig || !caseChunksData.value) return 0;
  
  const chunks = caseChunksData.value[columnConfig.key];
  return chunks && chunks[index] ? chunks[index].state : 0;
};

// 连接两个chunk
const connectChunks = (sourceColumn, targetColumn, sourceIndex, targetIndex, state, svg, isActive = false) => {
  const sourceNode = sourceColumn.querySelectorAll('.chunk-dot')[sourceIndex];
  const targetNode = targetColumn.querySelectorAll('.chunk-dot')[targetIndex];
  
  if (!sourceNode || !targetNode) return;
  
  // 获取点的中心坐标
  const { x: sourceX, y: sourceY } = getNodeCenterCoordinates(sourceNode, svg);
  const { x: targetX, y: targetY } = getNodeCenterCoordinates(targetNode, svg);
  
  // 绘制贝塞尔曲线
  const path = createConnectionPath(sourceX, sourceY, targetX, targetY, state, isActive);
  svg.appendChild(path);
};

// 获取节点中心坐标
const getNodeCenterCoordinates = (node, svg) => {
  const nodeRect = node.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  
  return {
    x: nodeRect.left + (nodeRect.width / 2) - svgRect.left,
    y: nodeRect.top + (nodeRect.height / 2) - svgRect.top
  };
};

// 创建连接路径
const createConnectionPath = (sourceX, sourceY, targetX, targetY, state, isActive) => {
  // 使用平滑的贝塞尔曲线，调整控制点位置使曲线更自然
  const distanceX = Math.abs(targetX - sourceX);
  const controlPointDistance = distanceX * 0.4; // 控制点距离为距离的40%
  
  // 创建路径
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M${sourceX},${sourceY} 
                     C${sourceX + controlPointDistance},${sourceY} 
                     ${targetX - controlPointDistance},${targetY} 
                     ${targetX},${targetY}`);
  
  // 设置路径样式属性
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('fill', 'none');
  path.setAttribute('class', 'connection-path');
  
  // 根据state设置线的颜色
  const color = getColorByState(state);
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '2');
  
  // 如果内容处于激活状态，则对连线也添加高亮效果
  if (isActive) {
    path.classList.add('active-connection');
  }
  
  return path;
};

// 显示全文内容
const showFullContent = () => {
  if (selectedChunk.value && fullContentModal.value) {
    // 设置模态框标题和内容
    fullContentModal.value.querySelector('.modal-title').textContent = selectedChunk.value.name;
    fullContentModal.value.querySelector('.full-content-text').textContent = selectedChunk.value.content;
    
    // 显示模态框
    fullContentModal.value.style.display = 'flex';
    
    // 添加ESC键关闭事件和点击外部关闭事件
    document.addEventListener('keydown', escKeyHandler);
    setTimeout(() => {
      document.addEventListener('click', modalOutsideClickHandler);
    }, 100);
  }
};

// 关闭全文内容模态框
const closeFullContentModal = () => {
  if (fullContentModal.value) {
    fullContentModal.value.style.display = 'none';
    document.removeEventListener('keydown', escKeyHandler);
    document.removeEventListener('click', modalOutsideClickHandler);
  }
};

// ESC键关闭模态框
const escKeyHandler = (e) => {
  if (e.key === 'Escape') {
    closeFullContentModal();
  }
};

// 点击模态框外部关闭
const modalOutsideClickHandler = (e) => {
  const modalContent = fullContentModal.value?.querySelector('.modal-content');
  if (modalContent && !modalContent.contains(e.target) && fullContentModal.value.contains(e.target)) {
    closeFullContentModal();
  }
};

// 处理Track Evidence点击
const trackEvidence = async () => {
  if (!selectedChunk.value?.content) return;
  
  // 关闭tooltip
  closeTooltip();
  
  // 显示加载状态
  const loadingMsg = createLoadingMessage();
  document.body.appendChild(loadingMsg);
  
  try {
    // 获取证据链
    const evidenceChains = await evidenceService.getEvidenceChains(
      questionStore.currentQuestion || "默认问题", 
      selectedChunk.value.content
    );
    
    // 更新证据面板
    if (evidenceTrackerRef?.value) {
      evidenceTrackerRef.value.updateEvidence(evidenceChains);
    } else {
      // 后备方案：发出自定义事件
      const evidenceTracker = document.querySelector('.evidence-panel');
      if (evidenceTracker) {
        evidenceTracker.dispatchEvent(new CustomEvent('updateEvidences', { 
          detail: { evidences: evidenceChains }
        }));
      }
    }
  } finally {
    // 移除加载状态
    document.body.removeChild(loadingMsg);
  }
};

// 创建加载消息元素
const createLoadingMessage = () => {
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'loading-message';
  loadingMsg.textContent = 'Loading...';
  loadingMsg.style.position = 'fixed';
  loadingMsg.style.top = '50%';
  loadingMsg.style.left = '50%';
  loadingMsg.style.transform = 'translate(-50%, -50%)';
  loadingMsg.style.padding = '10px 20px';
  loadingMsg.style.backgroundColor = 'rgba(0,0,0,0.7)';
  loadingMsg.style.color = 'white';
  loadingMsg.style.borderRadius = '4px';
  loadingMsg.style.zIndex = '9999';
  return loadingMsg;
};

// 加载测试数据
const loadTestData = () => {
  return {
    question: "Test question",
    similar_chunks_original: [
      { content: "Test content 1", score: 0.8, state: 1 },
      { content: "Test content 2", score: 0.7, state: 0 },
      { content: "Test content 3", score: 0.6, state: -1 },
      { content: "Test content 4", score: 0.5, state: 0.5 },
      { content: "Test content 5", score: 0.4, state: -0.5 },
      { content: "Test content 6", score: 0.3, state: 1 }
    ],
    similar_chunks_after: [
      { content: "Test content 1", score: 0.75, state: 1 },
      { content: "Test content 2", score: 0.65, state: 0 },
      { content: "Test content 7", score: 0.55, state: -1 },
      { content: "Test content 4", score: 0.45, state: 0.5 },
      { content: "Test content 5", score: 0.35, state: -0.5 },
      { content: "Test content 6", score: 0.25, state: 1 }
    ],
    similar_chunks_standard: [
      { content: "Test content 1", score: 0.85, state: 1 },
      { content: "Test content 2", score: 0.75, state: 0 },
      { content: "Test content 3", score: 0.65, state: -1 },
      { content: "Test content 8", score: 0.55, state: 0.5 },
      { content: "Test content 5", score: 0.45, state: -0.5 },
      { content: "Test content 6", score: 0.35, state: 1 }
    ]
  };
};

// 初始化chunk数据到store
const initializeChunkStore = () => {
  if (!caseChunksData.value) return;
  
  // 转换成store所需的格式
  const chunks = caseChunksData.value.similar_chunks_original.map((chunk, index) => ({
    id: index + 1,
    name: `Chunk O${index + 1}`,
    relevance: chunk.score,
    content: chunk.content,
    state: chunk.state
  }));
  
  // 添加到store
  chunkStore.initializeReferenceChunks(chunks);
};

onMounted(async () => {
  // 尝试加载数据
  if (currentQuestion.value?.question) {
    // 显式调用fetchSimilarChunks，避免使用handleOriginalClick，因为那会打开模态框
    await fetchSimilarChunks('original');
  } else {
    try {
      const dataModule = await import('../../statics/case_chunks_1.json');
      caseChunksData.value = dataModule.default || {};
    } catch (error) {
      console.error('加载JSON数据失败:', error);
      caseChunksData.value = loadTestData();
    }
    
    // 初始化chunk数据
    initializeChunkStore();
  }
  
  // 初始绘制
  drawConnections();
  
  // 设置SVG渐变定义
  const svg = document.querySelector('.connection-lines');
  if (svg) {
    svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
  }
  
  // 绑定按钮事件
  addToPromptBtn.value.addEventListener('click', addToPrompt);
  removeFromPromptBtn.value.addEventListener('click', removeFromPrompt);
  viewFullContentBtn.value.addEventListener('click', showFullContent);
  trackEvidenceBtn.value.addEventListener('click', trackEvidence);
  
  // 监听窗口大小变化，重新绘制连线
  window.addEventListener('resize', drawConnections);
  
  // 监听store变化，刷新视图
  const unsubscribe = chunkStore.$subscribe(() => nextTick(drawConnections));
  
  // 监听activeContent的变化
  watch(activeContent, drawConnections);
  
  // 组件销毁时移除监听
  return () => {
    window.removeEventListener('resize', drawConnections);
    unsubscribe();
    // 清理编辑模态框相关的事件监听器
    document.removeEventListener('keydown', escEditModalHandler);
    document.removeEventListener('click', editModalOutsideClickHandler);
  };
});

// 监听当前问题变化
watch(currentQuestion, async (newQuestion, oldQuestion) => {
  if (newQuestion?.question && (!oldQuestion || newQuestion.id !== oldQuestion.id)) {
    // 初始化caseChunksData，确保improved chunk为空
    if (!caseChunksData.value) {
      caseChunksData.value = {
        question: newQuestion.question,
        similar_chunks_original: [],
        similar_chunks_after: [],
        similar_chunks_standard: []
      };
    } else {
      // 重置improved chunk为空数组
      caseChunksData.value.similar_chunks_after = [];
      caseChunksData.value.question = newQuestion.question;
    }
    
    // 获取original类型的相似文档块
    await fetchSimilarChunks('original');
    
    // 确保连线重新绘制
    nextTick(() => drawConnections());
  }
});
</script>

<style scoped>
.chunk-ranking {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chunk-comparison-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-height: 280px;
}

/* 头部样式 */
.column-headers {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 8px 0;
  margin: 0;
  border-bottom: 1px solid #eee;
}

.column-header {
  text-align: center;
  font-weight: 500;
  font-size: 16px;
  padding: 0;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.column-header:hover {
  background-color: #f5f7fa;
}

/* 列和连线容器 */
.columns-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.connection-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.columns-container {
  display: flex;
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* 列样式 */
.chunk-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 4px;
  overflow: hidden;
  gap: 18px;
  justify-content: space-evenly;
  padding-top: 12px;
  padding-bottom: 12px;
}

/* 节点样式 */
.chunk-node {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  width: 36px;
  height: 36px;
}

.rank-number {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  color: #666;
  font-size: 12px;
  font-weight: 600;
}

.chunk-dot {
  border-radius: 50%;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chunk-node:hover .chunk-dot {
  transform: scale(1.2);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

/* 状态样式 */
.integrated .chunk-dot {
  border: 2px solid #3f51b5;
  box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.3);
}

.active-chunk .chunk-dot {
  transform: scale(1.2);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.5) !important;
  border: 2px solid #2196f3 !important;
}

/* 连线样式 */
.connection-path {
  fill: none;
  stroke-width: 2px;
  stroke-dasharray: none;
  filter: drop-shadow(0px 0px 0.3px rgba(0, 0, 0, 0.05));
}

.active-connection {
  stroke-width: 3px !important;
  stroke-dasharray: none !important;
  filter: drop-shadow(0px 0px 2px rgba(33, 150, 243, 0.7)) !important;
  stroke: #2196f3 !important;
}

.integrated-connection {
  stroke-width: 2px !important;
  stroke-dasharray: 5, 3 !important;
  filter: drop-shadow(0px 0px 2px rgba(63, 81, 181, 0.5)) !important;
  stroke: #3f51b5 !important;
}

/* Tooltip样式 */
.chunk-tooltip {
  position: fixed;
  z-index: 1000;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 0;
  width: 320px;
  max-width: calc(100% - 20px);
  pointer-events: auto;
  overflow: hidden;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  border-bottom: 1px solid #eee;
}

.tooltip-title {
  font-weight: 500;
  font-size: 15px;
}

.tooltip-score {
  color: #4caf50;
  font-size: 14px;
}

.tooltip-text {
  padding: 12px 14px;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  border-bottom: 1px solid #eee;
  max-height: 150px;
  overflow-y: auto;
}

/* 按钮样式 */
.tooltip-actions {
  display: flex;
  padding: 12px 16px;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 4px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
  flex: 1;
}

.action-icon {
  font-size: 14px;
}

/* 按钮颜色 */
.add-to-prompt {
  background-color: #4d9078;
}

.add-to-prompt:hover {
  background-color: #388e3c;
}

.remove-from-prompt {
  background-color: #f44336;
}

.remove-from-prompt:hover {
  background-color: #d32f2f;
}

.view-full-content, .action-btn.track-evidence {
  background-color: #4d7fa0;
}

.view-full-content:hover, .action-btn.track-evidence:hover {
  background-color: #1976d2;
}

/* 图例样式 */
.chunk-details-panel {
  margin-top: 8px;
  overflow: hidden;
}

.legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  color: #666;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.integrated-dot {
  background-color: white;
  border: 2px solid #3f51b5;
  box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.3);
}

.active-dot {
  background-color: white;
  border: 2px solid #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.5);
}

/* 模态框样式 */
.full-content-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #666;
}

.close-modal-btn:hover {
  color: #333;
}

.modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  max-height: calc(85vh - 70px);
}

.full-content-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
  color: #333;
}

/* 加载状态样式 */
.loading-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 6px;
  font-size: 16px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: pulse 1.5s infinite;
}

.loading-indicator {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 8px;
}

/* 动画 */
@keyframes pulse {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 问题编辑模态框样式 */
.question-edit-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.submit-btn {
  background-color: #4d9078;
}

.submit-btn:hover {
  background-color: #388e3c;
}

.cancel-btn {
  background-color: #9e9e9e;
}

.cancel-btn:hover {
  background-color: #757575;
}
</style> 