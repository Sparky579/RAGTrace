<template>
  <div class="heatmap-chart">
    <div class="slider-controls" v-if="!isLoading">
      <div class="slider-label">文档块</div>
      <input 
        type="range" 
        class="density-slider" 
        v-model="embeddingDensity" 
        min="0" 
        max="100" 
        step="5"
        title="调整文档块显示比例"
      >
      <div class="slider-value">{{ embeddingDensity }}%</div>
    </div>
    
    <div ref="chartContainer" class="chart-container"></div>
    
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as d3 from 'd3';
import { useQuestionStore } from '../../store/questionStore';

const chartContainer = ref(null);
const questionStore = useQuestionStore();
const isLoading = ref(true);
const embeddingDensity = ref(100); // 默认显示100%的文档块

// 数据和状态
const width = 380;
const height = 380;
const margin = { top: 10, right: 10, bottom: 10, left: 10 };
let svg = null;
let zoomG = null;
let data = [];
let embeddingsData = [];
let displayedEmbeddings = [];
let kdeData = {};
let xScale, yScale;
let zoom = null;
let currentTransform = d3.zoomIdentity;

// 组件挂载后绘制图表
onMounted(async () => {
  try {
    isLoading.value = true;
    
    // 导入问题数据
    const dataModule = await import('../../statics/result8.json');
    data = dataModule.default || [];
    
    // 尝试加载KDE数据
    try {
      const kdeModule = await import('../../statics/kde_result3.json');
      kdeData = kdeModule.default || { density: [] };
    } catch (error) {
      console.warn('KDE数据加载失败，使用默认热力图:', error);
      // 创建默认密度数据
      kdeData = { density: generateDefaultDensity() };
    }
    
    // 加载嵌入向量数据 - 使用chunk_res.json文件替代embeddings_2d.json
    try {
      const chunksModule = await import('../../statics/chunk_res.json');
      embeddingsData = chunksModule.default || [];
      console.log(`加载了 ${embeddingsData.length} 个文档块`);
    } catch (error) {
      console.warn('文档块数据加载失败:', error);
      embeddingsData = [];
    }
    
    drawChart();
    isLoading.value = false;
  } catch (error) {
    console.error('数据加载失败:', error);
    isLoading.value = false;
  }
});

// 在组件卸载时清理
onUnmounted(() => {
  if (svg) {
    svg.on('.zoom', null);
  }
});

// 监听选中的问题变化
watch(() => questionStore.currentQuestionId, (newId) => {
  if (newId !== null && svg) {
    updateSelectedPoint(newId);
  }
});

// 监听文档块显示密度变化
watch(() => embeddingDensity.value, (newDensity) => {
  if (svg && zoomG) {
    updateEmbeddingPoints(newDensity);
  }
});

// 更新显示的文档块数量
function updateEmbeddingPoints(density) {
  // 移除现有的文档块点
  zoomG.select('.embedding-points-group').remove();
  
  if (density > 0) {
    // 根据密度值计算要显示的文档块数量
    const displayCount = Math.ceil(embeddingsData.length * (density / 100));
    // 抽样显示
    displayedEmbeddings = embeddingsData
      .filter(d => 
        d.vector && 
        Array.isArray(d.vector) && 
        d.vector.length >= 2 &&
        !isNaN(d.vector[0]) && 
        !isNaN(d.vector[1])
      )
      .slice(0, displayCount);
    
    // 重新绘制文档块点
    drawEmbeddingPoints(displayedEmbeddings);
  }
}

function generateDefaultDensity() {
  const size = 20;
  const density = [];
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      // 创建一个简单的高斯分布
      const x = i / size - 0.5;
      const y = j / size - 0.5;
      const value = Math.exp(-(x*x + y*y) / 0.1);
      row.push(value);
    }
    density.push(row);
  }
  return density;
}

function drawChart() {
  if (!chartContainer.value) return;
  
  // 清除之前的图表
  d3.select(chartContainer.value).selectAll('*').remove();
  
  // 创建SVG
  svg = d3.select(chartContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  
  // 添加缩放和平移功能
  zoom = d3.zoom()
    .scaleExtent([0.5, 8])
    .on('zoom', handleZoom);
  
  svg.call(zoom);
  
  // 创建可缩放的组
  zoomG = svg.append('g');
  
  // 单独计算问题点和嵌入向量点的范围
  let questionExtentX = d3.extent(data, d => d.embedding && d.embedding[0]);
  let questionExtentY = d3.extent(data, d => d.embedding && d.embedding[1]);
  
  // 计算chunks的范围 - 注意这里使用vector字段而非embedding
  let chunksExtentX, chunksExtentY;
  if (embeddingsData.length > 0) {
    chunksExtentX = d3.extent(embeddingsData, d => d.vector && d.vector[0]);
    chunksExtentY = d3.extent(embeddingsData, d => d.vector && d.vector[1]);
  }
  
  // 合并两个范围以确定最终的坐标范围
  let xExtent = [-1, 1];
  let yExtent = [-1, 1];
  
  if (data.length > 0 && embeddingsData.length > 0) {
    // 同时包含问题数据和文档块数据时
    xExtent = [
      Math.min(questionExtentX[0], chunksExtentX[0]),
      Math.max(questionExtentX[1], chunksExtentX[1])
    ];
    
    yExtent = [
      Math.min(questionExtentY[0], chunksExtentY[0]),
      Math.max(questionExtentY[1], chunksExtentY[1])
    ];
    
    console.log('数据范围:', { 
      问题X: questionExtentX, 
      问题Y: questionExtentY,
      文档块X: chunksExtentX, 
      文档块Y: chunksExtentY,
      合并X: xExtent,
      合并Y: yExtent
    });
  } else if (data.length > 0) {
    // 只有问题数据
    xExtent = questionExtentX;
    yExtent = questionExtentY;
  } else if (embeddingsData.length > 0) {
    // 只有文档块数据
    xExtent = chunksExtentX;
    yExtent = chunksExtentY;
  }
  
  // 进一步减小边距以确保元素贴边
  const xPadding = (xExtent[1] - xExtent[0]) * 0.01; // 从0.02减小到0.01
  const yPadding = (yExtent[1] - yExtent[0]) * 0.01; // 从0.02减小到0.01
  
  // 将margin值更进一步减小
  const effectiveMargin = {
    top: 10,     // 从15减小到10
    right: 3,    // 从5减小到3
    bottom: 3,   // 从5减小到3
    left: 10     // 从15减小到10
  };
  
  xScale = d3.scaleLinear()
    .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
    .range([effectiveMargin.left, width - effectiveMargin.right]);
  
  yScale = d3.scaleLinear()
    .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
    .range([height - effectiveMargin.bottom, effectiveMargin.top]);
  
  // 绘制热力图
  drawHeatmap();
  
  // 根据滑动条值显示文档块点
  updateEmbeddingPoints(embeddingDensity.value);
  
  // 绘制问题点
  drawPoints();
}

function handleZoom(event) {
  currentTransform = event.transform;
  zoomG.attr('transform', currentTransform);
}

function zoomIn() {
  svg.transition().duration(300).call(zoom.scaleBy, 1.5);
}

function zoomOut() {
  svg.transition().duration(300).call(zoom.scaleBy, 0.75);
}

function resetZoom() {
  svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
}

function drawEmbeddingPoints(pointsData) {
  if (!pointsData || pointsData.length === 0) return;
  
  console.log(`绘制 ${pointsData.length} 个文档块点`);
  
  // 绘制文档块点
  zoomG.append('g')
    .attr('class', 'embedding-points-group')
    .selectAll('circle.embedding-point')
    .data(pointsData)
    .enter()
    .append('circle')
    .attr('class', 'embedding-point')
    .attr('cx', d => xScale(d.vector[0]))
    .attr('cy', d => yScale(d.vector[1]))
    .attr('r', 0.8) // 小的点
    .attr('fill', '#c0d6e4') // 文档块使用蓝色
    .attr('opacity', 0.6)
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('r', 4)
        .attr('opacity', 0.9);
      
      // 显示提示框
      const tooltip = d3.select(chartContainer.value)
        .append('div')
        .attr('class', 'point-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(255, 255, 255, 0.9)')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('padding', '4px 8px')
        .style('font-size', '10px')
        .style('max-width', '250px')
        .style('pointer-events', 'none')
        .style('z-index', '100')
        .style('overflow', 'hidden')
        .style('text-overflow', 'ellipsis')
        .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
        .style('left', `${event.pageX + 5}px`)
        .style('top', `${event.pageY - 5}px`)
        .html(`
          <div style="font-size:11px;font-weight:bold">文档块</div>
          <div style="font-size:10px;max-height:60px;overflow:hidden;text-overflow:ellipsis;">${d.text.substring(0, 150)}${d.text.length > 150 ? '...' : ''}</div>
        `);
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('r', 0.8)
        .attr('opacity', 0.6);
      
      // 移除提示框
      d3.select('.point-tooltip').remove();
    });
}

function drawHeatmap() {
  if (!kdeData.density || !kdeData.density.length) return;
  
  const density = kdeData.density;
  const n = density.length;
  
  // 找出密度的最小值和最大值
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < density[i].length; j++) {
      min = Math.min(min, density[i][j]);
      max = Math.max(max, density[i][j]);
    }
  }
  
  // 创建颜色比例尺
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([min, max]);
  
  // 使用当前坐标轴范围作为热力图范围，而不是仅使用问题数据的范围
  const xRange = [xScale.domain()[0], xScale.domain()[1]];
  const yRange = [yScale.domain()[0], yScale.domain()[1]];
  
  // 创建轮廓生成器
  const contours = d3.contours()
    .size([n, n])
    .thresholds(d3.range(min, max, (max - min) / 15));
  
  // 创建坐标转换比例尺
  const contourScaleX = d3.scaleLinear()
    .domain([0, n - 1])
    .range([xScale(xRange[0]), xScale(xRange[1])]);
  
  const contourScaleY = d3.scaleLinear()
    .domain([0, n - 1])
    .range([yScale(yRange[0]), yScale(yRange[1])]);
  
  // 创建地理投影转换
  const transform = d3.geoTransform({
    point: function(y, x) {
      this.stream.point(contourScaleX(x), contourScaleY(y));
    }
  });
  
  // 绘制等高线
  zoomG.append("g")
    .attr('class', 'heatmap-group')
    .selectAll("path")
    .data(contours(density.flat()))
    .enter()
    .append("path")
    .attr("d", d3.geoPath().projection(transform))
    .attr("fill", d => colorScale(d.value))
    .attr("opacity", 0.3)  // 降低热力图不透明度，使小点更清晰
    .attr("stroke", "none");
}

function drawPoints() {
  // 为不同问题类型创建颜色映射
  const typeColors = {
    'factual': '#3498db',
    'reasoning': '#2ecc71',
    'generation': '#e67e22',
    'complex': '#9b59b6',
    'none': '#e67e22'  // 默认颜色
  };
  
  // 绘制数据点
  const points = zoomG.append('g')
    .selectAll('circle.data-point')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', d => `data-point point-${d.id || data.indexOf(d) + 1}`)
    .attr('cx', d => xScale(d.embedding[0]))
    .attr('cy', d => yScale(d.embedding[1]))
    .attr('r', d => d.type === 'none' ? 4 : 6) // 缩小灰点的大小
    .attr('fill', d => typeColors[d.type] || typeColors.none)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .attr('opacity', d => d.type === 'none' ? 0.5 : 0.7) // 降低灰点的不透明度
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('r', d.type === 'none' ? 5 : 8)
        .attr('stroke-width', 2)
        .attr('opacity', d.type === 'none' ? 0.7 : 0.8);
        
      // 显示问题内容的提示框
      const tooltip = d3.select(chartContainer.value)
        .append('div')
        .attr('class', 'point-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(255, 255, 255, 0.9)')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('padding', '8px 12px')
        .style('font-size', '12px')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
        .style('max-width', '250px')
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
        .html(`
          <div style="font-weight:bold">${d.type ? `【${translateType(d.type)}】` : ''}</div>
          <div>${d.text || '问题内容'}</div>
        `);
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('r', d.type === 'none' ? 4 : 6)
        .attr('stroke-width', 1)
        .attr('opacity', d.type === 'none' ? 0.5 : 0.7);
        
      // 移除提示框
      d3.select('.point-tooltip').remove();
    })
    .on('click', function(event, d) {
      // 获取问题ID
      const id = d.id || data.indexOf(d) + 1;
      
      // 使用Pinia存储更新当前选中的问题
      questionStore.setQuestion(d.text, id);
      
      // 如果有相关联的文档块，也可以更新
      if (d.related_chunks) {
        questionStore.setRelatedChunks(d.related_chunks);
      }
      
      // 如果有相似度信息，也可以更新
      if (d.distances) {
        questionStore.setDistances(d.distances);
      }
      
      // 高亮选中的点
      updateSelectedPoint(id);
    });
    
    // 确保点在最上层
    points.raise();
}

// 辅助函数：翻译问题类型
function translateType(type) {
  const typeNames = {
    'factual': '事实型',
    'reasoning': '推理型',
    'generation': '生成型',
    'complex': '复杂型',
    'none': '其他'
  };
  return typeNames[type] || type;
}

function updateSelectedPoint(id) {
  // 重置所有点的样式
  zoomG.selectAll('circle.data-point')
    .attr('r', d => d.type === 'none' ? 4 : 6)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .attr('opacity', d => d.type === 'none' ? 0.5 : 0.7);
  
  // 突出显示选中的点
  zoomG.select(`.point-${id}`)
    .attr('r', 8)
    .attr('stroke', '#ffcc00')
    .attr('stroke-width', 2)
    .attr('opacity', 1)
    .raise(); // 将点移到最上层
}
</script>

<style scoped>
.heatmap-chart {
  width: 100%;
  height: 100%;
  position: relative;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.chart-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.slider-controls {
  position: absolute;
  top: 10px;
  left: 50px;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  padding: 4px 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.slider-label {
  font-size: 11px;
  color: #555;
  white-space: nowrap;
}

.slider-value {
  font-size: 11px;
  color: #555;
  min-width: 36px;
  text-align: right;
}

.density-slider {
  width: 80px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #e0e0e0;
  outline: none;
  border-radius: 3px;
  margin: 0 5px;
}

.density-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4285F4;
  cursor: pointer;
}

.density-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4285F4;
  cursor: pointer;
  border: none;
}

.zoom-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.control-btn:hover {
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
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
</style> 