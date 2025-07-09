<template>
  <div class="force-diagram-chart" ref="chartContainer">
    <div v-if="selectedNode" class="node-tooltip" :style="tooltipStyle">
      <div class="tooltip-content">
        <p class="question-text">{{ selectedNode.description }}</p>
      </div>
    </div>
    
    <div class="legend-control-btn" @click="toggleLegend" v-if="!isLegendCollapsed">
      <span class="minus-symbol">&#8722;</span>
    </div>
    <div class="legend-control-btn legend-expand-btn" @click="toggleLegend" v-else>
      <span>+</span>
    </div>
    
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, reactive } from 'vue';
import * as d3 from 'd3';
import { useQuestionStore } from '../../store/questionStore';
import eventBus from '../../utils/eventBus';

// 基本引用和状态变量
const chartContainer = ref(null);
const isLoading = ref(true);
const selectedNode = ref(null);
const forceNodes = ref([]);
const questionStore = useQuestionStore();
const tooltipStyle = reactive({ left: '0px', top: '0px', opacity: 1 });
const mousePosition = reactive({ x: 0, y: 0 });
const isLegendCollapsed = ref(false);

// tooltip相关变量
let tooltipHideTimer = null;
let lastMousePosition = { x: 0, y: 0 };
let activeTooltip = null;
let legendGroup = null; // 引用色阶组

// 颜色定义
const colors = {
  retrievalFailure: '#e09192', // 浅红色
  promptFragility: '#dbc076',  // 稍深的黄色
  generationAnomaly: '#7eb0d5', // 浅蓝色
  standardDeviation: '#c5a3d0'  // 浅紫色（原来是绿色）
};

// 指标与顶点映射
const vertices = [
  { force: 'retrievalFailure', label: 'Retrieval', metric: 'retrieval_effectiveness' },
  { force: 'promptFragility', label: 'Instability', metric: 'retrieval_stability' },
  { force: 'generationAnomaly', label: 'Generation', metric: 'generation_reliability' },
  { force: 'standardDeviation', label: 'Standard Deviation', metric: 'knowledge_reliability' }
];

// SVG容器和力导向模拟相关变量
let svg = null;
let simulation = null;
let width = 700; 
let height = 700; 
let nodeElements = null; 

// 从外部文件加载指标
async function loadExternalMetrics(questionId) {
  try {
    if (!questionId) return null;
    
    // 从result8score2.json加载数据
    const externalMetricsModule = await import('../../statics/result8score2.json');
    const externalMetrics = externalMetricsModule.default || [];
    
    // 问题ID从1开始，数组索引从0开始
    const numericId = typeof questionId === 'string' ? parseInt(questionId) : questionId;
    const arrayIndex = numericId - 1;
    
    if (arrayIndex >= 0 && arrayIndex < externalMetrics.length) {
      // console.log(`找到问题ID ${questionId} 的外部指标数据:`, externalMetrics[arrayIndex]);
      return externalMetrics[arrayIndex];
    }
    
    return null;
  } catch (error) {
    console.error('加载外部指标数据失败:', error);
    return null;
  }
}

// 指标缓存
const externalMetricsCache = new Map();

// 监听密度变化
watch(() => questionStore.topQuestionCount, () => {
  if (svg && simulation) initSimulationWithFilteredNodes();
});

// 监听筛选问题变化
watch(() => questionStore.filteredQuestions, () => {
  if (svg && simulation) initSimulationWithFilteredNodes();
}, { deep: true });

// 监听选中问题ID
watch(() => questionStore.currentQuestionId, (newId) => {
  if (!newId) {
    selectedNode.value = null;
    resetNodeHighlights();
    return;
  }
  
  if (forceNodes.value.length > 0) {
    const foundNode = forceNodes.value.find(node => node.id === parseInt(newId));
    if (foundNode) {
      selectedNode.value = foundNode;
      highlightSelectedNode(foundNode.id);
    }
  }
});

// 初始化
onMounted(async () => {
  try {
    isLoading.value = true;
    await nextTick();
    
    if (!chartContainer.value) {
      console.error('Chart container not mounted');
      isLoading.value = false;
      return;
    }
    
    const questions = await questionStore.loadSummaryMetrics();
    
    if (questions && questions.length > 0) {
      forceNodes.value = questions.map(item => {
        if (!item.metrics) return null;
        
        return {
          id: item.id,
          name: `问题 ${item.id}`,
          description: item.question,
          details: item.question,
          forces: {
            retrievalFailure: 1 - item.metrics.retrieval_effectiveness || 0,
            promptFragility: 1 - item.metrics.retrieval_stability || 0,
            generationAnomaly: 1 - item.metrics.generation_reliability || 0,
            standardDeviation: 1 - item.metrics.knowledge_reliability || 0
          }
        };
      }).filter(node => node !== null);
    } else {
      console.error('无法加载问题数据或数据为空');
      isLoading.value = false;
      return;
    }
    
    await nextTick();
    await initChartContainer();
    window.addEventListener('resize', handleResize);
    setTimeout(() => initSimulationWithFilteredNodes(), 300);
    isLoading.value = false;
  } catch (error) {
    console.error('Force diagram initialization failed:', error);
    isLoading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  
  if (simulation) simulation.stop();
  if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
  
  document.removeEventListener('mousemove', checkMouseDistance);
  if (activeTooltip) activeTooltip.remove();
});

// 窗口大小变化处理
function handleResize() {
  if (!chartContainer.value || !svg) return;
  
  clearTimeout(window.resizeTimer);
  window.resizeTimer = setTimeout(() => {
    const containerRect = chartContainer.value.getBoundingClientRect();
    const newWidth = 700;  // 从900减少到700
    const newHeight = 700; // 从900减少到700
    
    if (Math.abs(width - newWidth) > 10 || Math.abs(height - newHeight) > 10) {
      width = newWidth;
      height = newHeight;
      
      const size = Math.min(width, height);
      svg.attr('viewBox', `0 0 ${size} ${size}`)
         .attr('preserveAspectRatio', 'xMidYMid meet');
      
      simulation.force('center', d3.forceCenter(size/2, size/2))
               .alpha(0.2)
               .restart();
    }
  }, 200);
}

// 初始化图表容器
async function initChartContainer() {
  if (!chartContainer.value) return;
  
  try {
    await questionStore.loadRankedIds();
    
    const containerRect = chartContainer.value.getBoundingClientRect();
    width = containerRect.width || 400; 
    height = containerRect.height || 400; 
    
    const size = Math.min(width, height);
    const paddingPercent = 0.04; 
    const padding = size * paddingPercent;
    const effectiveSize = size - 2 * padding;
    
    const cornerCoords = [
      { x: padding, y: padding },
      { x: padding + effectiveSize, y: padding },
      { x: padding + effectiveSize, y: padding + effectiveSize },
      { x: padding, y: padding + effectiveSize }
    ];
    
    d3.select(chartContainer.value).selectAll('*').remove();
    
    svg = d3.select(chartContainer.value)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${size} ${size}`) 
      .attr('preserveAspectRatio', 'xMidYMid meet'); 
    
    svg.append('rect')
      .attr('width', size)
      .attr('height', size)
      .attr('fill', 'transparent');
    
    await nextTick();
    drawCornerMarkers(svg, cornerCoords);
    drawColorLegend(svg, size);
    
    svg.append('g').attr('class', 'force-nodes');
    
    svg.on('click', () => {
      selectedNode.value = null;
      questionStore.setQuestion(null, null);
      resetNodeHighlights();
    });
  } catch (error) {
    console.error('Chart container initialization failed:', error);
  }
}

// 绘制四个角的三角形标记
function drawCornerMarkers(svg, corners) {
  const triangleSize = Math.min(width, height) * 0.1;
  
  drawTriangle(svg, corners[0].x, corners[0].y, triangleSize, 0, colors.retrievalFailure, 'Retrieval');
  drawTriangle(svg, corners[1].x, corners[1].y, triangleSize, 90, colors.promptFragility, 'Prompt');
  drawTriangle(svg, corners[2].x, corners[2].y, triangleSize, 180, colors.generationAnomaly, 'Generation');
  drawTriangle(svg, corners[3].x, corners[3].y, triangleSize, 270, colors.standardDeviation, 'Standard');
}

// 绘制三角形函数
function drawTriangle(svg, x, y, size, rotation, color, label) {
  const angle = (rotation * Math.PI) / 180;
  const angle1 = angle;
  const angle2 = angle + (Math.PI / 2);
  
  const x1 = x;
  const y1 = y;
  const x2 = x + size * Math.cos(angle1);
  const y2 = y + size * Math.sin(angle1);
  const x3 = x + size * Math.cos(angle2);
  const y3 = y + size * Math.sin(angle2);
  
  // 计算文本位置 - 根据角度调整文本位置
  let textX, textY, textAnchor, dominantBaseline;
  const offset = 30; // 文本偏移量，调整文本距离三角形的距离
  
  switch(rotation) {
    case 0: // 左上角 - Retrieval Failure
      textX = x1 + offset;
      textY = y1 + offset;
      textAnchor = 'start';
      dominantBaseline = 'hanging';
      break;
    case 90: // 右上角 - Prompt Fragility
      textX = x1 - offset;
      textY = y1 + offset;
      textAnchor = 'end';
      dominantBaseline = 'hanging';
      break;
    case 180: // 右下角 - Generation Anomaly
      textX = x1 - offset;
      textY = y1 - offset;
      textAnchor = 'end';
      dominantBaseline = 'auto';
      break;
    case 270: // 左下角 - Standard Deviation
      textX = x1 + offset;
      textY = y1 - offset;
      textAnchor = 'start';
      dominantBaseline = 'auto';
      break;
  }
  
  const triangle = svg.append('path')
    .attr('d', `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`)
    .attr('fill', color)
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('mouseover', function() {
      d3.select(this).attr('stroke-width', 2);
    })
    .on('mouseout', function() {
      d3.select(this).attr('stroke-width', 1);
    });
  
  // 添加永久显示的文本标签
  svg.append('text')
    .attr('class', 'corner-label')
    .attr('x', textX)
    .attr('y', textY)
    .attr('text-anchor', textAnchor)
    .attr('dominant-baseline', dominantBaseline)
    .attr('fill', '#333333')
    .attr('font-size', '16px')
    .attr('font-weight', 'bold')
    .text(label)
    .style('pointer-events', 'none'); // 防止文本干扰鼠标事件
  
  // 添加背景气泡效果
  const textNode = svg.select('.corner-label:last-child').node();
  if (textNode) {
    const bbox = textNode.getBBox();
    const padding = 6;
    
    svg.insert('rect', '.corner-label:last-child')
      .attr('x', bbox.x - padding)
      .attr('y', bbox.y - padding)
      .attr('width', bbox.width + padding * 2)
      .attr('height', bbox.height + padding * 2)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(255, 255, 255, 0.85)')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .style('pointer-events', 'none'); // 防止矩形干扰鼠标事件
  }
}

// 绘制色阶条
function drawColorLegend(svg, size) {
  const legendWidth = 120;
  const legendHeight = 60;
  const legendX = (size / 2) - (legendWidth / 2); // 居中
  const legendY = 10; // 调整为更下方的位置
  
  // 创建色阶条背景
  legendGroup = svg.append('g')
    .attr('class', 'color-legend')
    .attr('transform', `translate(${legendX}, ${legendY})`)
    .style('transition', 'opacity 0.3s ease')
    .style('cursor', 'pointer')
    .on('click', function() {
      toggleLegend();
    });
  
  // 添加标题
  legendGroup.append('text')
    .attr('x', legendWidth / 2)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '13px')
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .text('Performance');
  
  // 创建线性渐变
  const gradient = svg.append('defs')
    .append('linearGradient')
    .attr('id', 'legend-gradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');
  
  gradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', '#ffffff');
  
  gradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', '#7eb4a0');
  
  // 创建渐变色条
  legendGroup.append('rect')
    .attr('x', 10)
    .attr('y', 25)
    .attr('width', legendWidth - 20)
    .attr('height', 15)
    .attr('rx', 3)
    .attr('fill', 'url(#legend-gradient)')
    .attr('stroke', '#eee')
    .attr('stroke-width', 1);
  
  // 添加Low标签
  legendGroup.append('text')
    .attr('x', 10)
    .attr('y', 55)
    .attr('text-anchor', 'start')
    .attr('font-size', '11px')
    .attr('fill', '#555')
    .text('Low');
  
  // 添加High标签
  legendGroup.append('text')
    .attr('x', legendWidth - 10)
    .attr('y', 55)
    .attr('text-anchor', 'end')
    .attr('font-size', '11px')
    .attr('fill', '#555')
    .text('High');
}

// 使用筛选的节点初始化模拟
function initSimulationWithFilteredNodes() {
  if (!svg) return;
  
  try {
    const containerRect = chartContainer.value.getBoundingClientRect();
    const size = Math.min(containerRect.width, containerRect.height);
    
    const filteredIds = questionStore.filteredQuestions.map(q => q.id);
    const nodesToShow = forceNodes.value.filter(n => filteredIds.includes(n.id));
    
    if (nodesToShow.length === 0) return;
    
    const paddingPercent = 0.06; // 增加边距百分比 
    const padding = size * paddingPercent;
    const effectiveSize = size - 2 * padding;
    
    const cornerCoords = [
      { x: padding, y: padding },
      { x: padding + effectiveSize, y: padding },
      { x: padding + effectiveSize, y: padding + effectiveSize },
      { x: padding, y: padding + effectiveSize }
    ];
    
    const nodes = nodesToShow.map(node => {
      const initialX = 
        cornerCoords[0].x * node.forces.retrievalFailure + 
        cornerCoords[1].x * node.forces.promptFragility + 
        cornerCoords[2].x * node.forces.generationAnomaly + 
        cornerCoords[3].x * node.forces.standardDeviation;
      
      const initialY = 
        cornerCoords[0].y * node.forces.retrievalFailure + 
        cornerCoords[1].y * node.forces.promptFragility + 
        cornerCoords[2].y * node.forces.generationAnomaly + 
        cornerCoords[3].y * node.forces.standardDeviation;
      
      const sumForces = node.forces.retrievalFailure + node.forces.promptFragility + 
                      node.forces.generationAnomaly + node.forces.standardDeviation;
      
      return {
        ...node,
        x: sumForces > 0 ? initialX / sumForces : size / 2 + Math.random() * 80 - 40, // 增加随机性范围
        y: sumForces > 0 ? initialY / sumForces : size / 2 + Math.random() * 80 - 40, // 增加随机性范围
        radius: calculateNodeRadius(node.forces)
      };
    });
    
    if (simulation) simulation.stop();
    
    simulation = d3.forceSimulation(nodes)
      .force('center', d3.forceCenter(size / 2, size / 2).strength(0.0)) // 中心力设为0
      .force('charge', d3.forceManyBody().strength(-80)) // 进一步增大斥力，从-60到-100
      .force('collide', d3.forceCollide().radius(d => d.radius * 1.0)) // 减小碰撞半径，使点可以更靠近
      .on('tick', ticked);
    
    addVertexForces(cornerCoords);
    
    // 手动多运行几次来提高分散度
    for (let i = 0; i < 50; i++) { // 增加初始模拟次数，从20到50
      simulation.tick();
    }

    const nodeGroup = svg.select('.force-nodes');
    nodeGroup.selectAll('*').remove();
    
    // 使用修改后的函数初始化节点
    nodeElements = initializeNodesWithAsyncColors(nodeGroup, nodes);
  } catch (error) {
    console.error('Simulation initialization failed:', error);
  }
}

// 添加顶点力
function addVertexForces(corners) {
  const forceStrength = -60; // 增加顶点力强度，从90增加到200
  simulation
    .force('retrievalFailure', d3.forceRadial(d => d.forces.retrievalFailure * forceStrength, corners[0].x, corners[0].y).strength(d => (d.forces.retrievalFailure) * 0.3))
    .force('promptFragility', d3.forceRadial(d => d.forces.promptFragility * forceStrength, corners[1].x, corners[1].y).strength(d => (d.forces.promptFragility) * 0.3))
    .force('generationAnomaly', d3.forceRadial(d => d.forces.generationAnomaly * forceStrength, corners[2].x, corners[2].y).strength(d => (d.forces.generationAnomaly) * 0.3))
    .force('standardDeviation', d3.forceRadial(d => d.forces.standardDeviation * forceStrength, corners[3].x, corners[3].y).strength(d => (d.forces.standardDeviation) * 0.3));
  
  simulation.force('boundary', boundaryForce(corners));
}

// 边界约束力函数
function boundaryForce(corners) {
  return function() {
    for (const node of simulation.nodes()) {
      const minPadding = 15; // 减小边界填充，从25减到15
      const center = { 
        x: (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
        y: (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4
      };
      
      if (node.x < corners[0].x + minPadding) node.x = corners[0].x + minPadding;
      if (node.x > corners[1].x - minPadding) node.x = corners[1].x - minPadding;
      if (node.y < corners[0].y + minPadding) node.y = corners[0].y + minPadding;
      if (node.y > corners[3].y - minPadding) node.y = corners[3].y - minPadding;
      
      const dx = node.x - center.x;
      const dy = node.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.min(width, height) * 0.49; // 进一步增加最大距离
      
      if (dist > maxDist) {
        const centerForceStrength = 0.003; // 进一步减小中心力的强度，从0.006减到0.003
        node.vx = (node.vx || 0) - dx * centerForceStrength;
        node.vy = (node.vy || 0) - dy * centerForceStrength;
        node.x = center.x + (dx / dist) * maxDist;
        node.y = center.y + (dy / dist) * maxDist;
      }
    }
  };
}

// 更新节点位置
function ticked() {
  nodeElements
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
}

// 计算节点半径
function calculateNodeRadius(forces) {
  const avgForce = (forces.retrievalFailure + forces.promptFragility + 
                   forces.generationAnomaly + forces.standardDeviation) / 4;
  return 3 + (avgForce * 5);
}

// 获取初始节点颜色（同步版本）
function getInitialNodeColor(forces) {
  // 计算节点的平均性能指标（越低越差，越高越好）
  // 以检索失效指标 retrievalFailure 作为主要指标（越高值越差）
  // 将性能映射到绿色系，但通过透明度进行区分
  
  const performanceScore = 1 - forces.retrievalFailure; // 反转值，使得0表示最差，1表示最好
  
  // 使用固定的绿色，但透明度不同
  // 基础绿色值
  const r = 126;  // 绿色的R值
  const g = 180; // 绿色的G值
  const b = 160;  // 绿色的B值
  
  // 计算透明度，范围从0.25到1
  const alpha = 0.00 + (performanceScore * 1);
  
  // 混合透明度 - 与白色背景混合
  const bgR = 255;
  const bgG = 255;
  const bgB = 255;
  
  const finalR = Math.round(r * alpha + bgR * (1 - alpha));
  const finalG = Math.round(g * alpha + bgG * (1 - alpha));
  const finalB = Math.round(b * alpha + bgB * (1 - alpha));
  
  return rgbToHex(finalR, finalG, finalB);
}

// 初始化节点和应用异步颜色
function initializeNodesWithAsyncColors(nodeGroup, nodes) {
  // 创建节点元素
  nodeElements = nodeGroup
    .selectAll('circle.force-node')
    .data(nodes, d => d.id)
    .enter()
    .append('circle')
    .attr('class', 'force-node')
    .attr('r', d => d.radius)
    .attr('fill', d => getInitialNodeColor(d.forces)) // 使用同步函数初始设置颜色
    .attr('stroke', '#444444')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('r', d.radius * 1.5)
        .attr('stroke-width', 2);
      
      if (activeTooltip) activeTooltip.remove();
      if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
      
      selectedNode.value = d;
      mousePosition.x = event.clientX;
      mousePosition.y = event.clientY;
      lastMousePosition = { x: event.clientX, y: event.clientY };
      
      activeTooltip = d3.select('body')
        .append('div')
        .attr('class', 'node-tooltip-popup')
        .style('position', 'fixed')
        .style('background-color', 'rgba(255, 255, 255, 0.95)')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('padding', '8px 12px')
        .style('box-shadow', '0 2px 8px rgba(0, 0, 0, 0.15)')
        .style('max-width', '250px')
        .style('font-size', '12px')
        .style('z-index', '9999')
        .style('pointer-events', 'none')
        .style('transition', 'opacity 0.3s ease')
        .style('opacity', '1')
        .style('left', `${event.clientX + 10}px`)
        .style('top', `${event.clientY - 10}px`)
        .html(`
          <div style="font-weight:bold">Question ${d.id}</div>
          <div style="margin-top:4px">${d.description}</div>
        `);
      
      document.removeEventListener('mousemove', checkMouseDistance);
      document.addEventListener('mousemove', checkMouseDistance);
      
      if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
      tooltipHideTimer = setTimeout(() => hideTooltip(), 2000);
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('r', d.radius)
        .attr('stroke-width', 1);
      
      setTimeout(() => {
        const tooltip = document.querySelector('.node-tooltip-popup');
        if (tooltip && !tooltip.matches(':hover')) {
          hideTooltip();
        }
      }, 100);
    })
    .on('click', nodeClicked);
  
  // 异步更新节点颜色
  nodes.forEach(async (node) => {
    // 添加nodeId到forces对象，以便getNodeColor函数能获取到ID
    if (!node.forces.nodeId) {
      node.forces.nodeId = node.id;
    }
    
    // 异步获取颜色
    const color = await getNodeColor(node.forces);
    
    // 更新节点颜色
    nodeGroup
      .selectAll(`circle.force-node[data-id="${node.id}"]`)
      .attr('fill', color);
      
    // 使用data-id属性来选择特定节点
    nodeElements.filter(d => d.id === node.id)
      .attr('data-id', node.id)  // 添加data-id属性
      .attr('fill', color);
  });
  
  return nodeElements;
}

// 获取节点颜色
async function getNodeColor(forces) {
  // 从外部数据源获取正确性指标
  let performanceScore = 1 - forces.retrievalFailure; // 反转值，默认使用retrievalFailure
  
  try {
    // 从缓存获取指标数据，如果没有则从外部加载
    let nodeId = forces.nodeId;
    if (!nodeId && forces.node) {
      nodeId = forces.node.id;
    }
    
    if (nodeId) {
      if (!externalMetricsCache.has(nodeId)) {
        const externalMetrics = await loadExternalMetrics(nodeId);
        if (externalMetrics) {
          // 使用rouge-l-rag和embed的平均值作为性能指标
          const rougeLRag = externalMetrics['rouge-l-rag'] || 0;
          const embed = externalMetrics['embed'] || 0;
          
          // 计算平均值并确保在0-1之间（归一化）
          const combinedScore = (rougeLRag * 4 + embed) / 2;
          const normalizedScore = Math.max(0, Math.min(1, combinedScore));
          
          externalMetricsCache.set(nodeId, normalizedScore);
        }
      }
      
      // 从缓存获取性能得分
      if (externalMetricsCache.has(nodeId)) {
        performanceScore = externalMetricsCache.get(nodeId);
      }
    }
  } catch (error) {
    console.error('获取外部指标数据失败:', error);
  }
  
  // 使用固定的绿色，但透明度不同
  // 基础绿色值
  const r = 126;  // 绿色的R值
  const g = 180; // 绿色的G值
  const b = 160;  // 绿色的B值
  
  // 计算透明度，范围从0.25到1
  const alpha = 0.00 + (performanceScore * 1);
  
  // 混合透明度 - 与白色背景混合
  const bgR = 255;
  const bgG = 255;
  const bgB = 255;
  
  const finalR = Math.round(r * alpha + bgR * (1 - alpha));
  const finalG = Math.round(g * alpha + bgG * (1 - alpha));
  const finalB = Math.round(b * alpha + bgB * (1 - alpha));
  
  return rgbToHex(finalR, finalG, finalB);
}

// 十六进制颜色转RGB
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

// RGB转十六进制颜色
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// 高亮选中的节点
function highlightSelectedNode(nodeId) {
  if (!nodeElements) return;
  
  nodeElements
    .attr('r', d => d.id === nodeId ? d.radius * 1.5 : d.radius)
    .attr('stroke-width', d => d.id === nodeId ? 2 : 1)
    .attr('stroke', d => d.id === nodeId ? '#ffcc00' : '#444444');
}

// 重置节点高亮
function resetNodeHighlights() {
  if (!nodeElements) return;
  
  nodeElements
    .attr('r', d => d.radius)
    .attr('stroke-width', 1)
    .attr('stroke', '#444444');
}

// 点击节点事件处理
function nodeClicked(event, d) {
  event.stopPropagation();
  
  // 确保ID是数字
  const numericId = parseInt(d.id);
  
  // 高亮当前节点
  highlightSelectedNode(numericId);
  
  // 发送点击事件，包含ID和力引导图标记，让热力图按ID查找对应点
  eventBus.emit('pointSelected', {
    id: numericId,
    isFromForceChart: true // 添加标记，表明事件来自力引导图
  });
}

// 检测鼠标距离变化
function checkMouseDistance(event) {
  const dx = event.clientX - lastMousePosition.x;
  const dy = event.clientY - lastMousePosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // 减小距离阈值，使得鼠标移开一小段距离就会隐藏提示框
  if (distance > 50) {
    hideTooltip();
    document.removeEventListener('mousemove', checkMouseDistance);
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }
}

// 隐藏tooltip
function hideTooltip() {
  if (tooltipHideTimer) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
  }
  
  tooltipStyle.opacity = 0;
  setTimeout(() => {
    if (tooltipStyle.opacity === 0) selectedNode.value = null;
  }, 300);
  
  // 确保activeTooltip被移除
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

// 更新tooltip位置
function updateTooltipPosition() {
  tooltipStyle.left = `${mousePosition.x + 10}px`;
  tooltipStyle.top = `${mousePosition.y - 30}px`;
}

// 切换色阶条显示/隐藏
function toggleLegend() {
  isLegendCollapsed.value = !isLegendCollapsed.value;
  if (legendGroup) {
    legendGroup.style('opacity', isLegendCollapsed.value ? 0 : 1);
  }
}
</script>

<style scoped>
.force-diagram-chart {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  aspect-ratio: 1 / 1;
}

.node-tooltip {
  position: fixed;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-width: 250px;
  font-size: 12px;
  z-index: 100;
  pointer-events: none;
  transition: opacity 0.3s ease;
  opacity: v-bind('tooltipStyle.opacity');
}

.tooltip-content {
  max-height: 100px;
  overflow-y: auto;
}

.question-text {
  margin: 0;
  font-size: 12px;
  color: #333;
  line-height: 1.4;
  max-width: 200px;
  white-space: normal;
  word-break: break-word;
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

.color-legend {
  transition: opacity 0.3s ease;
}

.legend-control-btn {
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  font-size: 16px;
  font-weight: bold;
  color: #555;
  transition: all 0.2s ease;
}

.legend-control-btn:hover {
  background-color: rgba(245, 245, 245, 0.95);
  box-shadow: 0 2px 5px rgba(0,0,0,0.15);
}

.legend-expand-btn {
  top: 15px;
}

.minus-symbol {
  font-size: 18px;
  line-height: 18px;
  position: relative;
  top: -1px;
}
</style> 