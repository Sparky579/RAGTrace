<template>
  <div class="heatmap-chart" ref="chartContainer">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import * as d3 from 'd3';
import { useQuestionStore } from '../../store/questionStore';
import { useChunkStore } from '../../store/chunkStore';
import { generateDefaultDensity, drawChunkPoints, filterValidChunks } from './utils/ChunkHandler';
import { createTooltip, updateHighlightBorder, updateSelectedPoint, cleanupUiResources, safeDomUpdate } from './utils/UiHandler';
import { drawHeatmap, drawPoints, createSvgElements, calculateDataExtent } from './utils/ChartRenderer';
import eventBus from '../../utils/eventBus';

const chartContainer = ref(null);
const questionStore = useQuestionStore();
const chunkStore = useChunkStore();
const isLoading = ref(true);

// 基础配置
const relativeWidth = 600;
const relativeHeight = 600;
let width = 600;
let height = 400;
const margin = { top: 10, right: 10, bottom: 10, left: 10 };

// 状态变量
let svg = null;
let zoomG = null;
let data = [];
let embeddingsData = [];
let kdeData = {};
let xScale, yScale;
let currentTransform = d3.zoomIdentity;
let cachedChunks = null;

// 事件监听器相关函数
function setupEventListeners() {
  eventBus.on('questionSelected', handleExternalQuestionSelected);
  eventBus.on('pointSelected', handleExternalPointSelected);
  eventBus.on('showSearchInHeatmap', handleShowSearchInHeatmap);
}

function cleanupEventListeners() {
  eventBus.off('questionSelected');
  eventBus.off('pointSelected');
  eventBus.off('showSearchInHeatmap');
}

// 清除所有高亮标记
function clearAllHighlights() {
  // 清除chunkStore中的状态
  chunkStore.setCurrentGridCell(null);
  
  // 移除高亮边框和选中点组内的内容
  if (svg) {
    svg.select('.top-highlight-group').selectAll('.highlight-border').remove();
    clearSelectedPoint();
    
    // 清除搜索点和标签
    zoomG.selectAll('.search-point, .search-label').remove();
  }
}

// 专门清除黄色高亮点
function clearSelectedPoint() {
  if (svg) {
    // 确保彻底清除所有选中点
    svg.select('.selected-point-group').selectAll('*').remove();
  }
}

// 处理外部点选择事件
function handleExternalPointSelected(eventData) {
  if (!eventData || !eventData.id) return;
  
  console.log('热力图收到外部点选择事件:', eventData);
  
  // 清除黄色高亮点 - 确保彻底清除
  clearSelectedPoint();
  
  // 更新选中的点
  if (svg && zoomG) {
    // 确保高亮被清除后再更新
    setTimeout(() => {
      updateSelectedPoint(eventData.id, zoomG, svg, xScale, yScale);
    }, 0);
  }
  
  let embedding = null;
  const numericId = parseInt(eventData.id);
  
  // 如果是来自力引导图的事件，直接在热力图数据中查找对应ID的点
  if (eventData.isFromForceChart) {
    console.log('事件来自力引导图，在热力图数据中查找点:', numericId);
    
    // 从热力图的数据中查找对应ID的点
    // 过滤有效数据
    const validData = data.filter(d => 
      d.embedding && 
      Array.isArray(d.embedding) && 
      d.embedding.length >= 2 && 
      !isNaN(d.embedding[0]) && 
      !isNaN(d.embedding[1])
    );
    
    // 在有效数据中查找匹配ID的点
    const foundPoint = validData.find(d => d.id === numericId);
    if (foundPoint?.embedding) {
      console.log('在热力图数据中找到对应点:', foundPoint);
      embedding = foundPoint.embedding;
      
      // 直接使用找到的点更新questionStore
      questionStore.setQuestion(foundPoint, numericId);
    }
  }
  
  // 如果未找到embedding，尝试从事件数据或questionStore中获取
  if (!embedding) {
    // 1. 检查事件数据本身
    if (eventData.embedding && Array.isArray(eventData.embedding) && eventData.embedding.length >= 2) {
      console.log('使用事件中的 embedding 数据:', eventData.embedding);
      embedding = eventData.embedding;
    } 
    // 2. 从 questionStore 获取
    else {
      const question = questionStore.allQuestions.find(q => q.id === numericId);
      if (question?.embedding && Array.isArray(question.embedding) && question.embedding.length >= 2) {
        console.log('从 questionStore 找到 embedding:', question.embedding);
        embedding = question.embedding;
      }
    }
  }
  
  // 如果找到 embedding 数据，高亮对应的网格单元格
  if (embedding) {
    console.log('用于高亮的最终 embedding 数据:', embedding);
    highlightGridCellForPoint(embedding);
  } else {
    console.warn('无法高亮网格，缺少有效的坐标数据');
  }
}

// 处理外部问题选择事件
function handleExternalQuestionSelected(data) {
  handleExternalPointSelected(data);
}

// 处理显示搜索问题在热力图中的事件
function handleShowSearchInHeatmap(eventData) {
  if (!eventData || !eventData.query) return;
  
  console.log('热力图收到显示搜索问题事件:', eventData);
  
  // 清除之前的高亮
  clearAllHighlights();
  
  // 确保数据已加载
  if (!xScale || !yScale || !svg || !zoomG) {
    console.warn('热力图组件尚未初始化，无法显示搜索问题');
    return;
  }
  
  // 计算热力图中心位置
  const centerX = (xScale.domain()[0] + xScale.domain()[1]) / 2;
  const centerY = (yScale.domain()[0] + yScale.domain()[1]) / 2;
  
  // 创建一个临时问题对象
  const searchQuestion = {
    id: 'search-' + Date.now(), // 生成临时ID
    text: eventData.query,
    question: eventData.query,
    embedding: [centerX, centerY], // 放在中心位置
    isSearchQuestion: true // 标记为搜索问题
  };
  
  // 显示蓝点
  zoomG.append('circle')
    .attr('class', 'search-point')
    .attr('cx', xScale(centerX))
    .attr('cy', yScale(centerY))
    .attr('r', 8)
    .attr('fill', '#1E88E5') // 使用蓝色
    .attr('stroke', '#FFFFFF')
    .attr('stroke-width', 2)
    .attr('opacity', 0.8);
  
  // 高亮中心网格单元格
  highlightGridCellForPoint([centerX, centerY]);
}

// 生命周期钩子
onMounted(async () => {
  try {
    isLoading.value = true;
    await loadData();
    await nextTick();
    
    adjustChartSize();
    initChart();
    setupEventListeners();
    isLoading.value = false;
    
    window.addEventListener('resize', handleResize);
  } catch (error) {
    console.error('热力图初始化失败:', error);
    isLoading.value = false;
  }
});

onUnmounted(() => {
  if (svg) svg.on('.zoom', null);
  if (window.resizeTimer) clearTimeout(window.resizeTimer);
  cleanupUiResources();
  cleanupEventListeners();
  window.removeEventListener('resize', handleResize);
});

// 数据加载
async function loadData() {
  await questionStore.loadRankedIds();
  
  try {
    const dataModule = await import('../../statics/result8.json');
    // 保留原始数据的所有字段，并确保数据结构一致性
    data = (dataModule.default || []).map((item, index) => {
      // 为每个条目分配一个唯一的数字ID
      const numericId = index + 1;
      
      return {
        ...item,
        id: numericId, // 使用数字ID
        text: item.text || item.question,
        // 其他默认字段
        question: item.text // 确保question字段与text一致
      };
    });
    
    console.log('加载的问题数据示例:', data[0]); // 添加调试日志
    questionStore.setAllQuestions(data);
  } catch (error) {
    console.error('加载问题数据失败:', error);
    data = questionStore.allQuestions;
  }
  
  try {
    const kdeModule = await import('../../statics/kde_result3.json');
    kdeData = kdeModule.default || { density: [] };
  } catch (error) {
    kdeData = { density: generateDefaultDensity() };
  }
  
  try {
    const chunksModule = await import('../../statics/chunk_res.json');
    embeddingsData = chunksModule.default || [];
  } catch (error) {
    embeddingsData = [];
  }
}

// 图表初始化
function initChart() {
  safeDomUpdate(() => {
    try {
      // 过滤有效数据
      const validData = data.filter(d => 
        d.embedding && 
        Array.isArray(d.embedding) && 
        d.embedding.length >= 2 && 
        !isNaN(d.embedding[0]) && 
        !isNaN(d.embedding[1])
      );
      
      if (validData.length === 0) return;
      
      // 过滤有效文档块
      const validChunks = filterValidChunks(embeddingsData);
      
      // 计算数据范围
      const { xExtent, yExtent } = calculateDataExtent(validData, validChunks);
      
      // 计算边距
      const xPadding = (xExtent[1] - xExtent[0]) * 0.01; 
      const yPadding = (yExtent[1] - yExtent[0]) * 0.01;
      
      // 创建比例尺
      xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([margin.left, relativeWidth - margin.right]);
      
      yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([relativeHeight - margin.bottom, margin.top]);
      
      // 创建SVG元素
      const svgElements = createSvgElements(
        chartContainer.value, 
        width, 
        height, 
        relativeWidth, 
        relativeHeight, 
        handleZoom
      );
      
      svg = svgElements.svg;
      zoomG = svgElements.zoomG;
      
      // 绘制图表各层
      drawHeatmap({
        zoomG, 
        kdeData, 
        xScale, 
        yScale, 
        width, 
        height,
        chunkStore,
        questionStore,
        embeddingsData,
        currentTransform,
        handlePointClick
      });
      
      // 绘制文档块点
      cachedChunks = drawChunkPoints(zoomG, validChunks, xScale, yScale, cachedChunks, createTooltip);
      
      // 绘制问题点
      drawPoints({
        zoomG,
        data: validData,
        xScale,
        yScale,
        questionStore,
        createTooltip,
        handlePointClick,
        handlePointMouseover
      });
      
      // 如果有当前选中的问题，确保高亮正确显示
      if (questionStore.currentQuestionId) {
        const currentQuestion = questionStore.allQuestions.find(q => q.id === questionStore.currentQuestionId);
        if (currentQuestion?.embedding) {
          nextTick(() => {
            updateSelectedPoint(questionStore.currentQuestionId, zoomG, svg, xScale, yScale);
            highlightGridCellForPoint(currentQuestion.embedding);
          });
        }
      }
    } catch (error) {
      console.error('绘制图表失败:', error);
    }
  });
}

// 事件处理函数
function handleZoom(event) {
  if (!zoomG) return;
  
  currentTransform = event.transform;
  zoomG.attr('transform', currentTransform);
  
  // 更新高亮边框和选中点
  if (chunkStore.currentGridCell) {
    updateHighlightBorder(svg, chunkStore.currentGridCell, currentTransform, xScale, yScale, width, height);
  }
  if (svg) {
    svg.select('.selected-point-group').attr('transform', currentTransform);
  }
}

function handlePointClick(event, d) {
  event.stopPropagation();
  
  // 先清除黄色高亮点 - 确保完全清除所有选中点
  clearSelectedPoint();
  
  // 设置选中的问题，传递完整的问题数据
  const questionData = {
    ...d, // 直接展开所有原始字段
    id: d.id,
    text: d.text || d.question
  };
  
  console.log('点击问题数据:', questionData);
  
  questionStore.setQuestion(questionData, d.id);
  
  // 确保有embedding数据
  if (!d.embedding || !Array.isArray(d.embedding) || d.embedding.length < 2) {
    console.warn('点击的点没有有效的embedding数据');
    return;
  }
  
  // 高亮选中的点
  if (svg && zoomG) {
    updateSelectedPoint(d.id, zoomG, svg, xScale, yScale);
  }
  
  // 高亮对应的网格单元格
  nextTick(() => {
    highlightGridCellForPoint(d.embedding);
  });
}

function handlePointMouseover(event, d, opacity) {
  if (questionStore.currentQuestionId !== d.id) {
    d3.select(event.currentTarget).attr('opacity', opacity);
  }
  
  createTooltip(event, `
    <div style="font-weight:bold">Question ${d.id}</div>
    <div>${d.text || d.question || 'Question Content'}</div>
  `);
}

// 更新问题点 - 当过滤条件变化时调用
function updateQuestionPoints() {
  if (!zoomG) return;
  
  safeDomUpdate(() => {
    zoomG.selectAll('circle.background-point, circle.foreground-point').remove();
    drawPoints({
      zoomG,
      data,
      xScale,
      yScale,
      questionStore,
      createTooltip,
      handlePointClick,
      handlePointMouseover
    });
  });
}

// 窗口大小相关
function handleResize() {
  if (!chartContainer.value) return;
  if (window.resizeTimer) clearTimeout(window.resizeTimer);
  
  window.resizeTimer = setTimeout(() => {
    adjustChartSize();
    cachedChunks = null;
    initChart();
  }, 250);
}

function adjustChartSize() {
  if (!chartContainer.value) return;
  
  const containerRect = chartContainer.value.getBoundingClientRect();
  if (containerRect.width > 0 && containerRect.height > 0) {
    width = containerRect.width;
    height = containerRect.height;
  }
}

// 监听 store 变化
watch(() => questionStore.currentQuestionId, (newId) => {
  if (!newId) return;
  
  // 清除黄色高亮点 - 确保完全清除旧的选中点
  clearSelectedPoint();
  
  // 更新选中的点 - 使用setTimeout确保清除操作完成后再添加新高亮
  if (svg && zoomG) {
    setTimeout(() => {
      updateSelectedPoint(newId, zoomG, svg, xScale, yScale);
    }, 0);
  }
  
  // 高亮对应的网格单元格
  const question = questionStore.currentQuestion;
  if (question?.embedding) {
    highlightGridCellForPoint(question.embedding);
  }
});

// 高亮网格单元格
function highlightGridCellForPoint(embedding) {
  if (!embedding || !xScale || !yScale || !svg) {
    console.error('无法高亮网格：缺少必要参数');
    return;
  }
  
  let pointX, pointY;
  
  // 处理不同格式的embedding
  if (Array.isArray(embedding)) {
    [pointX, pointY] = embedding;
  } else if (embedding.x !== undefined && embedding.y !== undefined) {
    pointX = embedding.x;
    pointY = embedding.y;
  } else {
    console.error('无效的embedding格式');
    return;
  }
  
  // 检查坐标有效性
  if (isNaN(pointX) || isNaN(pointY)) {
    console.error('embedding坐标不是有效数字');
    return;
  }
  
  // 计算网格配置 - 修改为固定正方形网格
  const gridSize = 13;
  // 修改：使用与ChartRenderer.js相同的网格大小，不再基于宽高比调整
  const gridSizeY = gridSize;
  
  // 确保使用当前的坐标轴范围
  const xRange = xScale.domain();
  const yRange = yScale.domain();
  
  // 计算网格索引 - 修正计算方式
  const xStep = (xRange[1] - xRange[0]) / gridSize;
  const yStep = (yRange[1] - yRange[0]) / gridSizeY;
  
  const gridX = Math.floor((pointX - xRange[0]) / xStep);
  // 注意Y轴在SVG中是从上到下增加的，而我们的数据是从下到上，所以需要反转
  const gridY = Math.floor((yRange[1] - pointY) / yStep);
  
  // 限制在有效范围内
  const validGridX = Math.max(0, Math.min(gridSize - 1, gridX));
  const validGridY = Math.max(0, Math.min(gridSizeY - 1, gridY));
  
  const cellId = `cell-${validGridX}-${validGridY}`;
  
  // 更新高亮
  chunkStore.setCurrentGridCell(cellId);
  
  // 延迟一帧再更新高亮边框，确保DOM已经准备好
  setTimeout(() => {
    updateHighlightBorder(svg, cellId, currentTransform, xScale, yScale, width, height);
  }, 0);
}

// 监听过滤器变化
watch(() => questionStore.topQuestionCount, () => {
  if (svg && zoomG) setTimeout(updateQuestionPoints, 0);
});

watch(() => questionStore.filterConditions, () => {
  if (svg && zoomG) setTimeout(updateQuestionPoints, 0);
}, { deep: true });

watch(() => questionStore.filteredQuestions, () => {
  if (svg && zoomG) setTimeout(updateQuestionPoints, 0);
});
</script>

<style scoped>
.heatmap-chart {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  /* 确保热力图容器保持正方形 */
  aspect-ratio: 1/1;
}

.heatmap-chart :deep(svg) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  max-height: 100%;
  display: block;
  pointer-events: auto !important;
}

.heatmap-chart :deep(g),
.heatmap-chart :deep(circle),
.heatmap-chart :deep(path) {
  pointer-events: auto !important;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color, #4285F4);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.loading-text {
  font-size: 14px;
  color: #666;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.heatmap-chart :deep(.search-point) {
  filter: drop-shadow(0 0 8px rgba(30, 136, 229, 0.6));
}

.heatmap-chart :deep(.search-label) {
  text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white;
}
</style>

<style>
.point-tooltip {
  position: fixed;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-width: 250px;
  font-size: 12px;
  z-index: 9999 !important;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

circle.foreground-point,
circle.background-point,
circle.chunk-point,
rect.grid-cell {
  transition: stroke 0.2s ease, stroke-width 0.2s ease, rx 0.2s ease, ry 0.2s ease;
}

/* Z-index层级关系 */
.heatmap-group { z-index: 5; position: relative; }
.contours-group { z-index: 1; }
.cells-group { z-index: 2; }
.chunk-points-group { z-index: 10; }
.background-points-group, .foreground-points-group { z-index: 20; }
.highlight-group { z-index: 50 !important; position: relative; }
.top-highlight-group { z-index: 1000 !important; pointer-events: none; }
.selected-point-group { z-index: 2000 !important; pointer-events: none; }

/* 选中点和高亮边框样式 */
.selected-point {
  filter: drop-shadow(0 0 6px rgba(255, 255, 0, 0.8));
  transition: all 0.2s ease-in-out;
}

.highlight-border {
  stroke: var(--highlight-color, #4285F4);
  stroke-opacity: 1;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 5px rgba(66, 133, 244, 0.9));
  transition: all 0.2s ease-in-out;
}

/* 变量定义 */
:root {
  --highlight-color: #4285F4;
  --highlight-shadow: rgba(66, 133, 244, 0.8);
}
</style> 