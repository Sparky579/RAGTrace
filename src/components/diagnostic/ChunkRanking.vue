<template>
  <div class="chunk-ranking">
    <div class="ranking-controls">
      <div class="view-selector">
        <button class="view-btn active">比较视图</button>
        <button class="view-btn">详情视图</button>
      </div>
      <div class="ranking-filters">
        <select class="filter-select">
          <option value="all">全部文档块</option>
          <option value="top10">Top 10</option>
          <option value="relevant">高相关性</option>
        </select>
      </div>
    </div>
    
    <div class="chunk-comparison-view">
      <div class="column-headers">
        <div class="column-header">原始检索</div>
        <div class="column-header">改进检索</div>
        <div class="column-header">标准参考</div>
      </div>
      
      <div class="columns-wrapper">
        <!-- SVG连线覆盖层 - 提前放置确保在背景 -->
        <svg class="connection-lines"></svg>
        
        <div class="columns-container">
          <!-- 原始检索 -->
          <div class="chunk-column">
            <div v-for="i in 7" :key="`original-${i}`" 
                class="chunk-node"
                :class="{ 
                    'high-relevance': i <= 2, 
                    'medium-relevance': i > 2 && i <= 4, 
                    'low-relevance': i > 4,
                    'active-chunk': isChunkActive(['A', 'B', 'C', 'D', 'E', 'F', 'G'][i-1]),
                    'integrated': isChunkNameIntegrated(['A', 'B', 'C', 'D', 'E', 'F', 'G'][i-1])
                  }"
                @click="showChunkDetails($event, ['A', 'B', 'C', 'D', 'E', 'F', 'G'][i-1], (1 - (i-1) * 0.12).toFixed(2), i)">
              <div class="rank-number">{{ i }}</div>
              <div class="chunk-dot" :style="{ 
                'width': `${24 - (i-1) * 2}px`, 
                'height': `${24 - (i-1) * 2}px` 
              }" :data-chunk="['A', 'B', 'C', 'D', 'E', 'F', 'G'][i-1]"></div>
            </div>
          </div>
          
          <!-- 改进检索 -->
          <div class="chunk-column">
            <div v-for="(order, index) in [2, 1, 3, 5, 4, 7, 6]" :key="`improved-${index}`" 
                class="chunk-node" 
                :class="{ 
                    'high-relevance': order <= 2, 
                    'medium-relevance': order > 2 && order <= 4, 
                    'low-relevance': order > 4,
                    'active-chunk': isChunkActive(['A', 'B', 'C', 'D', 'E', 'F', 'G'][order-1]),
                    'integrated': isChunkNameIntegrated(['A', 'B', 'C', 'D', 'E', 'F', 'G'][order-1])
                  }"
                @click="showChunkDetails($event, ['A', 'B', 'C', 'D', 'E', 'F', 'G'][order-1], (1 - (order-1) * 0.12).toFixed(2), order)">
              <div class="rank-number">{{ index + 1 }}</div>
              <div class="chunk-dot" :style="{ 
                'width': `${24 - (order-1) * 2}px`, 
                'height': `${24 - (order-1) * 2}px` 
              }" :data-chunk="['A', 'B', 'C', 'D', 'E', 'F', 'G'][order-1]"></div>
            </div>
          </div>
          
          <!-- 标准参考 -->
          <div class="chunk-column">
            <div v-for="(order, index) in [1, 2, 4, 3, 6, 5, 7]" :key="`standard-${index}`" 
                class="chunk-node" 
                :class="{ 
                  'high-relevance': index < 2, 
                  'medium-relevance': index >= 2 && index < 5, 
                  'low-relevance': index >= 5,
                  'integrated': isChunkNameIntegrated(['A', 'B', 'C', 'D', 'E', 'F', 'G'][order-1]),
                  'active-chunk': isChunkActive(['A', 'B', 'C', 'D', 'E', 'F', 'G'][order-1])
                }"
                @click="showChunkDetails($event, ['A', 'B', 'C', 'D', 'E', 'F', 'G'][order-1], (1 - index * 0.12).toFixed(2), order)">
              <div class="rank-number">{{ index + 1 }}</div>
              <div class="chunk-dot" :style="{ 
                'width': `${24 - index * 2}px`, 
                'height': `${24 - index * 2}px` 
              }" :data-chunk="['A', 'B', 'C', 'D', 'E', 'F', 'G'][order-1]"></div>
            </div>
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
          <button class="action-btn add-to-prompt" ref="addToPromptBtn">
            <span class="action-icon">+</span> 添加到Prompt
          </button>
          <button class="action-btn remove-from-prompt" ref="removeFromPromptBtn">
            <span class="action-icon">-</span> 从Prompt移除
          </button>
        </div>
      </div>
    </div>
    
    <div class="chunk-details-panel">
      <div class="legend">
        <div class="legend-item">
          <div class="legend-dot high-relevance-dot"></div>
          <span>高相关性</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot medium-relevance-dot"></div>
          <span>中相关性</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot low-relevance-dot"></div>
          <span>低相关性</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot integrated-dot"></div>
          <span>已集成</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot active-dot"></div>
          <span>当前选中</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { useChunkStore } from '../../store/chunkStore';

const chunkStore = useChunkStore();
const chunkTooltip = ref(null);
const addToPromptBtn = ref(null);
const removeFromPromptBtn = ref(null);

// 当前选中的chunk
const selectedChunk = ref(null);
// 当前激活的chunk名称（用于高亮显示）
const activeChunkName = ref(null);

// 检查chunk是否已集成到Prompt
const isChunkIntegrated = (chunkId) => {
  return chunkStore.isChunkIntegrated(chunkId);
};

// 检查chunk是否处于激活状态
const isChunkActive = (chunkName) => {
  return activeChunkName.value === chunkName;
};

// 检查chunk名称是否已集成到Prompt
const isChunkNameIntegrated = (chunkName) => {
  return chunkStore.isChunkNameIntegrated(chunkName);
};

// 显示文档块详情
const showChunkDetails = (event, chunkName, score, chunkId) => {
  const tooltip = chunkTooltip.value;
  if (!tooltip) return;
  
  // 如果当前选中的chunk已经是激活状态，则关闭tooltip并清除激活状态
  if (activeChunkName.value === chunkName) {
    tooltip.style.display = 'none';
    activeChunkName.value = null;
    document.removeEventListener('click', closeTooltipListener);
    return;
  }
  
  // 设置激活的chunk
  activeChunkName.value = chunkName;
  
  // 保存选中的chunk信息
  selectedChunk.value = {
    id: chunkId,
    name: `Chunk ${chunkName}`,
    relevance: parseFloat(score),
    content: chunkStore.referenceChunks.find(c => c.id === chunkId)?.content || 
             `这是Chunk ${chunkName}的示例内容，包含与查询相关的信息...`
  };
  
  // 设置tooltip内容
  tooltip.querySelector('.tooltip-title').textContent = selectedChunk.value.name;
  tooltip.querySelector('.tooltip-score').textContent = `相关性: ${score}`;
  tooltip.querySelector('.tooltip-text').textContent = selectedChunk.value.content.substring(0, 80) + '...';
  
  // 显示/隐藏添加/移除按钮
  const isIntegrated = isChunkIntegrated(chunkId);
  addToPromptBtn.value.style.display = isIntegrated ? 'none' : 'flex';
  removeFromPromptBtn.value.style.display = isIntegrated ? 'flex' : 'none';
  
  // 显示tooltip
  tooltip.style.display = 'block';
  
  // 定位tooltip - 使用fixed定位，相对于视口
  const rect = event.currentTarget.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  // 计算左侧位置，确保不超出右侧边界
  let leftPos = rect.left + rect.width + 8;
  
  // 检查是否会超出右侧边界
  if (leftPos + tooltipRect.width > window.innerWidth) {
    // 如果会超出右侧边界，则显示在左侧
    leftPos = rect.left - tooltipRect.width - 8;
    
    // 如果左侧也放不下，则尽量靠近点但不超出左边界
    if (leftPos < 0) {
      leftPos = Math.max(0, rect.left - tooltipRect.width / 2 + rect.width / 2);
      
      // 如果仍然超出右侧边界，则靠右显示但不超出
      if (leftPos + tooltipRect.width > window.innerWidth) {
        leftPos = window.innerWidth - tooltipRect.width - 5;
      }
    }
  }
  
  // 计算顶部位置，确保不超出底部或顶部边界
  let topPos = rect.top + rect.height / 2;
  
  // 如果会超出底部边界
  if (topPos + tooltipRect.height > window.innerHeight) {
    topPos = window.innerHeight - tooltipRect.height - 5;
  }
  
  // 如果会超出顶部边界
  if (topPos < 0) {
    topPos = 5;
  }
  
  tooltip.style.left = `${leftPos}px`;
  tooltip.style.top = `${topPos}px`;
  
  // 移除之前的事件监听器
  document.removeEventListener('click', closeTooltipListener);
  
  // 点击其他地方关闭tooltip
  setTimeout(() => {
    document.addEventListener('click', closeTooltipListener);
  }, 0);
};

// 创建一个命名的监听器函数，方便移除
const closeTooltipListener = (e) => {
  const tooltip = chunkTooltip.value;
  const currentTarget = document.querySelector('.active-chunk');
  
  // 安全检查，避免null引用
  if (!tooltip) return;
  
  // 检查点击是否在tooltip外部，且不是在当前激活的chunk上
  if (!tooltip.contains(e.target) && (!currentTarget || !currentTarget.contains(e.target))) {
    tooltip.style.display = 'none';
    activeChunkName.value = null;
    document.removeEventListener('click', closeTooltipListener);
  }
};

// 添加文档块到Prompt
const addToPrompt = () => {
  if (selectedChunk.value) {
    const chunkToAdd = {
      id: `${selectedChunk.value.name}-${Date.now()}`,
      name: selectedChunk.value.name,
      content: selectedChunk.value.content,
      relevance: selectedChunk.value.relevance || 0.5,
    };
    
    chunkStore.addChunk(chunkToAdd);
    
    // 关闭tooltip并清除当前激活状态
    if (chunkTooltip.value) {
      chunkTooltip.value.style.display = 'none';
      document.removeEventListener('click', closeTooltipListener);
      activeChunkName.value = null;
    }
  }
};

// 从Prompt移除文档块
const removeFromPrompt = () => {
  if (selectedChunk.value) {
    // 查找集成的块中是否有匹配的
    const chunks = chunkStore.integratedChunks;
    
    // 根据名称找到所有匹配的块
    const matchingChunks = chunks.filter(c => 
      c.name === selectedChunk.value.name
    );
    
    // 移除所有匹配的块
    matchingChunks.forEach(chunk => {
      chunkStore.removeChunk(chunk.id);
    });
    
    // 关闭tooltip并清除当前激活状态
    if (chunkTooltip.value) {
      chunkTooltip.value.style.display = 'none';
      document.removeEventListener('click', closeTooltipListener);
      activeChunkName.value = null;
    }
  }
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
    
    // 为每对相邻列创建连线
    for (let colIndex = 0; colIndex < columns.length - 1; colIndex++) {
      const sourceNodes = columns[colIndex].querySelectorAll('.chunk-dot');
      const targetNodes = columns[colIndex + 1].querySelectorAll('.chunk-dot');
      
      sourceNodes.forEach(sourceNode => {
        const sourceChunk = sourceNode.getAttribute('data-chunk');
        
        targetNodes.forEach(targetNode => {
          const targetChunk = targetNode.getAttribute('data-chunk');
          
          if (sourceChunk === targetChunk) {
            // 获取点的中心坐标
            const sourceRect = sourceNode.getBoundingClientRect();
            const targetRect = targetNode.getBoundingClientRect();
            const svgRect = svg.getBoundingClientRect();
            
            // 转换为SVG坐标系
            const sourceX = sourceRect.left + (sourceRect.width / 2) - svgRect.left;
            const sourceY = sourceRect.top + (sourceRect.height / 2) - svgRect.top;
            
            const targetX = targetRect.left + (targetRect.width / 2) - svgRect.left;
            const targetY = targetRect.top + (targetRect.height / 2) - svgRect.top;
            
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
            
            // 设置渐变
            const parentNode = sourceNode.parentNode;
            if (parentNode.classList.contains('high-relevance')) {
              path.setAttribute('stroke', 'url(#highGradient)');
              path.classList.add('high-connection');
            } else if (parentNode.classList.contains('medium-relevance')) {
              path.setAttribute('stroke', 'url(#mediumGradient)');
              path.classList.add('medium-connection');
            } else {
              path.setAttribute('stroke', 'url(#lowGradient)');
              path.classList.add('low-connection');
            }
            
            // 如果当前chunk处于激活状态，则对连线也添加高亮效果
            if (sourceChunk === activeChunkName.value) {
              path.classList.add('active-connection');
            }
            
            // 如果当前chunk已集成，则对连线添加集成效果
            if (isChunkNameIntegrated(sourceChunk)) {
              path.classList.add('integrated-connection');
            }
            
            // 更新渐变方向以匹配路径
            const gradientId = path.getAttribute('stroke').replace('url(#', '').replace(')', '');
            const gradient = document.getElementById(gradientId);
            if (gradient) {
              gradient.setAttribute('x1', sourceX);
              gradient.setAttribute('y1', sourceY);
              gradient.setAttribute('x2', targetX);
              gradient.setAttribute('y2', targetY);
            }
            
            svg.appendChild(path);
          }
        });
      });
    }
  });
};

onMounted(() => {
  // 初始绘制
  drawConnections();
  
  // 设置SVG渐变定义
  const svg = document.querySelector('.connection-lines');
  if (svg) {
    // 创建渐变定义
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // 高相关性渐变
    const highGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    highGradient.setAttribute('id', 'highGradient');
    highGradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    
    const highStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    highStop1.setAttribute('offset', '0%');
    highStop1.setAttribute('stop-color', 'rgba(76, 175, 80, 0.8)');
    
    const highStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    highStop2.setAttribute('offset', '100%');
    highStop2.setAttribute('stop-color', 'rgba(76, 175, 80, 0.8)');
    
    highGradient.appendChild(highStop1);
    highGradient.appendChild(highStop2);
    defs.appendChild(highGradient);
    
    // 中相关性渐变
    const mediumGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    mediumGradient.setAttribute('id', 'mediumGradient');
    mediumGradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    
    const mediumStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    mediumStop1.setAttribute('offset', '0%');
    mediumStop1.setAttribute('stop-color', 'rgba(255, 152, 0, 0.8)');
    
    const mediumStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    mediumStop2.setAttribute('offset', '100%');
    mediumStop2.setAttribute('stop-color', 'rgba(255, 152, 0, 0.8)');
    
    mediumGradient.appendChild(mediumStop1);
    mediumGradient.appendChild(mediumStop2);
    defs.appendChild(mediumGradient);
    
    // 低相关性渐变
    const lowGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    lowGradient.setAttribute('id', 'lowGradient');
    lowGradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    
    const lowStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    lowStop1.setAttribute('offset', '0%');
    lowStop1.setAttribute('stop-color', 'rgba(244, 67, 54, 0.8)');
    
    const lowStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    lowStop2.setAttribute('offset', '100%');
    lowStop2.setAttribute('stop-color', 'rgba(244, 67, 54, 0.8)');
    
    lowGradient.appendChild(lowStop1);
    lowGradient.appendChild(lowStop2);
    defs.appendChild(lowGradient);
    
    svg.appendChild(defs);
  }
  
  // 绑定按钮事件
  addToPromptBtn.value.addEventListener('click', addToPrompt);
  removeFromPromptBtn.value.addEventListener('click', removeFromPrompt);
  
  // 监听窗口大小变化，重新绘制连线
  window.addEventListener('resize', drawConnections);
  
  // 监听store变化，刷新视图
  const unsubscribe = chunkStore.$subscribe(() => {
    nextTick(() => {
      drawConnections();
    });
  });
  
  // 当激活的chunk改变时，重新绘制连线以更新高亮状态
  const activeChunkTracker = () => {
    if (activeChunkName.value) {
      drawConnections();
    }
  };
  
  // 监听activeChunkName的变化
  watch(activeChunkName, activeChunkTracker);
  
  // 组件销毁时移除监听
  return () => {
    window.removeEventListener('resize', drawConnections);
    unsubscribe();
  };
});
</script>

<style scoped>
.chunk-ranking {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ranking-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.view-selector {
  display: flex;
  gap: 8px;
}

.view-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
}

.view-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.filter-select {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 13px;
}

.chunk-comparison-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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
  font-size: 14px;
  padding: 0;
}

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
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.chunk-column {
  display: flex;
  flex-direction: column;
  padding: 8px 0 24px 0;
  position: relative;
  gap: 24px;
  overflow-y: auto;
  align-items: center;
  justify-content: flex-start;
}

.chunk-node {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  width: 36px;
  height: 36px;
  margin-bottom: 8px;
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

.high-relevance .chunk-dot {
  background-color: #4caf50;
}

.medium-relevance .chunk-dot {
  background-color: #ff9800;
}

.low-relevance .chunk-dot {
  background-color: #f44336;
}

.integrated .chunk-dot {
  border: 2px solid #3f51b5;
  box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.3);
}

/* 新增：激活状态的样式 */
.active-chunk .chunk-dot {
  transform: scale(1.2);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.5) !important;
  border: 2px solid #2196f3 !important;
}

.connection-path {
  fill: none;
  stroke-width: 1px;
  stroke-dasharray: none;
  filter: drop-shadow(0px 0px 0.3px rgba(0, 0, 0, 0.05));
}

.high-connection {
  stroke: rgba(76, 175, 80, 0.8);
}

.medium-connection {
  stroke: rgba(255, 152, 0, 0.8);
}

.low-connection {
  stroke: rgba(244, 67, 54, 0.8);
}

/* 新增：激活状态的连线样式 */
.active-connection {
  stroke-width: 2px !important;
  stroke-dasharray: none !important;
  filter: drop-shadow(0px 0px 2px rgba(33, 150, 243, 0.7)) !important;
  stroke: #2196f3 !important;
}

/* 新增：已集成状态的连线样式 */
.integrated-connection {
  stroke-width: 2px !important;
  stroke-dasharray: 5, 3 !important;
  filter: drop-shadow(0px 0px 2px rgba(63, 81, 181, 0.5)) !important;
  stroke: #3f51b5 !important;
}

/* 既有激活又有集成状态的连线(激活优先) */
.active-connection.integrated-connection {
  stroke-dasharray: none !important;
  filter: drop-shadow(0px 0px 3px rgba(33, 150, 243, 0.8)) !important;
  stroke: #2196f3 !important;
}

.chunk-tooltip {
  position: fixed;
  z-index: 1000;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 0;
  width: 240px;
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
  padding: 10px 12px;
  background-color: #f5f7fa;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  border-bottom: 1px solid #eee;
}

.tooltip-title {
  font-weight: 500;
  font-size: 13px;
}

.tooltip-score {
  color: #4caf50;
  font-size: 12px;
}

.tooltip-text {
  padding: 10px 12px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  border-bottom: 1px solid #eee;
}

.tooltip-actions {
  display: flex;
  padding: 8px 12px;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 4px;
  border: none;
  font-size: 12px;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
  flex: 1;
}

.add-to-prompt {
  background-color: #4caf50;
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

.action-icon {
  font-size: 14px;
}

.chunk-details-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.high-relevance-dot {
  background-color: #4caf50;
}

.medium-relevance-dot {
  background-color: #ff9800;
}

.low-relevance-dot {
  background-color: #f44336;
}

.integrated-dot {
  background-color: white;
  border: 2px solid #3f51b5;
  box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.3);
}

/* 新增：选中状态图例样式 */
.active-dot {
  background-color: white;
  border: 2px solid #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.5);
}
</style> 