<template>
    <div class="force-diagram-chart">
      <div class="chart-container" ref="chartContainer"></div>
      
      <div v-if="selectedNode" class="node-details">
        <div class="details-header">
          <h3>{{ selectedNode.name }}</h3>
          <button class="close-btn" @click="closeDetails">×</button>
        </div>
        <p class="description">{{ selectedNode.description }}</p>
        <div class="forces-grid">
          <div class="force-item">
            <span class="force-label" style="color: #E74C3C">检索失效:</span>
            <div class="force-bar">
              <div class="force-fill" :style="{ width: `${selectedNode.forces.retrievalFailure * 100}%`, backgroundColor: '#E74C3C' }"></div>
            </div> 
            <span class="force-value">{{ Math.round(selectedNode.forces.retrievalFailure * 100) }}%</span>
          </div>
          <div class="force-item">
            <span class="force-label" style="color: #F1C40F">Prompt脆弱性:</span>
            <div class="force-bar">
              <div class="force-fill" :style="{ width: `${selectedNode.forces.promptFragility * 100}%`, backgroundColor: '#F1C40F' }"></div>
            </div>
            <span class="force-value">{{ Math.round(selectedNode.forces.promptFragility * 100) }}%</span>
          </div>
          <div class="force-item">
            <span class="force-label" style="color: #3498DB">生成异常:</span>
            <div class="force-bar">
              <div class="force-fill" :style="{ width: `${selectedNode.forces.generationAnomaly * 100}%`, backgroundColor: '#3498DB' }"></div>
            </div>
            <span class="force-value">{{ Math.round(selectedNode.forces.generationAnomaly * 100) }}%</span>
          </div>
          <div class="force-item">
            <span class="force-label" style="color: #2ECC71">标准异常:</span>
            <div class="force-bar">
              <div class="force-fill" :style="{ width: `${selectedNode.forces.standardDeviation * 100}%`, backgroundColor: '#2ECC71' }"></div>
            </div>
            <span class="force-value">{{ Math.round(selectedNode.forces.standardDeviation * 100) }}%</span>
          </div>
        </div>
        <div class="details-text">
          <h4>详细信息:</h4>
          <p>{{ selectedNode.details }}</p>
        </div>
      </div>
      
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import * as d3 from 'd3';
  
  const chartContainer = ref(null);
  const isLoading = ref(true);
  const selectedNode = ref(null);
  const forceNodes = ref([]);
  
  // 颜色定义
  const colors = {
    retrievalFailure: '#E74C3C', // 红色
    promptFragility: '#F1C40F',  // 黄色
    generationAnomaly: '#3498DB', // 蓝色
    standardDeviation: '#2ECC71'  // 绿色
  };
  
  // 四个顶点坐标常量
  const vertices = [
    { x: 0, y: 0, force: 'retrievalFailure', label: '检索失效' },
    { x: 1, y: 0, force: 'promptFragility', label: 'Prompt脆弱性' },
    { x: 1, y: 1, force: 'generationAnomaly', label: '生成异常' },
    { x: 0, y: 1, force: 'standardDeviation', label: '标准异常' }
  ];
  
  // SVG容器和力导向模拟相关变量
  let svg = null;
  let simulation = null;
  let width = 380; // 更新默认宽度与容器保持一致
  let height = 380; // 更新默认高度与容器保持一致
  let nodeElements = null; 
  
  // 确保数据加载和初始化
  onMounted(async () => {
    console.log('ForceDiagramChart mounted');
    try {
      isLoading.value = true;
      
      // 等待DOM完全渲染
      await nextTick();
      
      // 检查容器是否已挂载
      if (!chartContainer.value) {
        console.error('图表容器未挂载');
        isLoading.value = false;
        return;
      }
      
      // 加载测试数据
      console.log('加载数据...');
      try {
        const dataModule = await import('../../statics/force_diagram_data.json');
        forceNodes.value = dataModule.default || [];
        console.log(`加载了 ${forceNodes.value.length} 条数据`);
        
        // 填充默认数据（如果没有数据）
        if (!forceNodes.value.length) {
          console.log('使用默认数据');
          forceNodes.value = generateDefaultData();
        }
      } catch (error) {
        console.error('数据加载失败，使用默认数据:', error);
        forceNodes.value = generateDefaultData();
      }
      
      // 等待下一帧确保容器尺寸已计算
      await nextTick();
      
      // 初始化图表
      console.log('初始化图表...');
      await initForceChart();
      
      // 添加resize事件监听
      window.addEventListener('resize', handleResize);
      
      // 模拟一次resize事件以确保正确布局
      setTimeout(() => {
        handleResize();
      }, 300);
      
      isLoading.value = false;
      console.log('图表初始化完成');
    } catch (error) {
      console.error('力导向图初始化失败:', error);
      isLoading.value = false;
    }
  });
  
  onUnmounted(() => {
    console.log('ForceDiagramChart unmounted');
    window.removeEventListener('resize', handleResize);
    
    if (simulation) {
      simulation.stop();
    }
  });
  
  // 生成默认测试数据
  function generateDefaultData() {
    const defaultData = [];
    for (let i = 1; i <= 20; i++) {
      defaultData.push({
        id: i,
        name: `测试节点 ${i}`,
        description: `这是测试节点 ${i} 的描述`,
        details: `测试节点 ${i} 的详细信息`,
        forces: {
          retrievalFailure: Math.random(),
          promptFragility: Math.random(),
          generationAnomaly: Math.random(),
          standardDeviation: Math.random()
        }
      });
    }
    return defaultData;
  }
  
  function handleResize() {
    // 当窗口大小变化时重新初始化图表
    if (chartContainer.value && svg) {
      // 使用防抖，避免频繁重绘导致的性能问题
      clearTimeout(window.resizeTimer);
      window.resizeTimer = setTimeout(() => {
        // 获取新的容器尺寸
        const containerRect = chartContainer.value.getBoundingClientRect();
        const newWidth = containerRect.width || 380;
        const newHeight = containerRect.height || 380;
        
        // 仅当尺寸有明显变化时才更新
        if (Math.abs(width - newWidth) > 10 || Math.abs(height - newHeight) > 10) {
          console.log(`尺寸变化: ${width}x${height} -> ${newWidth}x${newHeight}`);
          width = newWidth;
          height = newHeight;
          
          // 使用新的固定比例视图框
          const size = Math.min(width, height);
          svg.attr('viewBox', `0 0 ${size} ${size}`)
             .attr('preserveAspectRatio', 'xMidYMid meet');
          
          // 更新力导向图中心点
          simulation.force('center', d3.forceCenter(size/2, size/2))
                   .alpha(0.1)
                   .restart();
        }
      }, 200);
    }
  }
  
  function closeDetails() {
    selectedNode.value = null;
  }
  
  async function initForceChart() {
    if (!chartContainer.value || forceNodes.value.length === 0) {
      console.error('初始化失败：容器未挂载或数据为空');
      return;
    }
    
    try {
      // 获取容器尺寸
      const containerRect = chartContainer.value.getBoundingClientRect();
      width = containerRect.width || 380;
      height = containerRect.height || 380;
      
      console.log(`图表尺寸: ${width}x${height}`);
      
      // 对于正方形布局，确保我们使用最小边长作为参考
      const size = Math.min(width, height);
      
      // 计算顶点的实际坐标 - 减小留白以确保三角形贴近边缘
      const paddingPercent = 0.05; // 减小留白比例
      const padding = size * paddingPercent;
      const effectiveSize = size - 2 * padding;
      
      // 四个角的坐标
      const cornerCoords = [
        { x: padding, y: padding },                     // 左上 - 检索失效
        { x: padding + effectiveSize, y: padding },     // 右上 - Prompt脆弱性
        { x: padding + effectiveSize, y: padding + effectiveSize }, // 右下 - 生成异常
        { x: padding, y: padding + effectiveSize }     // 左下 - 标准异常
      ];
      
      // 清除之前的图表
      d3.select(chartContainer.value).selectAll('*').remove();
      
      // 创建SVG - 使用固定的viewBox
      svg = d3.select(chartContainer.value)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${size} ${size}`) // 使用固定比例的视图框
        .attr('preserveAspectRatio', 'xMidYMid meet'); // 确保内容居中
      
      // 绘制背景
      svg.append('rect')
        .attr('width', size)
        .attr('height', size)
        .attr('fill', 'transparent');
      
      // 创建四角顶点标记
      await nextTick();
      drawCornerMarkers(svg, cornerCoords);
      
      // 处理节点数据
      const nodes = forceNodes.value.map(node => {
        // 计算初始位置 - 受四个力的加权影响
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
        
        // 归一化坐标
        const sumForces = node.forces.retrievalFailure + node.forces.promptFragility + 
                         node.forces.generationAnomaly + node.forces.standardDeviation;
        
        return {
          ...node,
          x: initialX / sumForces,
          y: initialY / sumForces,
          radius: 5 + Math.random() * 3 // 随机半径，使节点大小略有差异
        };
      });
      
      // 创建力导向模拟 - 使用正方形中心作为中心力的锚点
      simulation = d3.forceSimulation(nodes)
        .force('center', d3.forceCenter(size / 2, size / 2))
        .force('charge', d3.forceManyBody().strength(-30))
        .force('collide', d3.forceCollide().radius(d => d.radius * 2))
        .on('tick', ticked);
      
      // 添加顶点力
      addVertexForces(cornerCoords);
      
      // 绘制节点
      nodeElements = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => getNodeColor(d.forces))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('r', d.radius * 1.5)
            .attr('stroke-width', 2);
        })
        .on('mouseout', function(event, d) {
          if (selectedNode.value && selectedNode.value.id === d.id) return;
          d3.select(this)
            .attr('r', d.radius)
            .attr('stroke-width', 1);
        })
        .on('click', function(event, d) {
          event.stopPropagation();
          selectedNode.value = d;
          
          // 高亮选中的节点
          svg.selectAll('circle')
            .attr('r', node => node.radius)
            .attr('stroke-width', 1)
            .attr('stroke', '#fff');
          
          d3.select(this)
            .attr('r', d.radius * 1.5)
            .attr('stroke-width', 2)
            .attr('stroke', '#ffcc00');
        });
      
      // 添加SVG背景点击事件，用于关闭详细信息面板
      svg.on('click', () => {
        selectedNode.value = null;
        
        // 恢复所有节点样式
        svg.selectAll('circle')
          .attr('r', d => d.radius)
          .attr('stroke-width', 1)
          .attr('stroke', '#fff');
      });
      
      // 启动模拟
      simulation.alpha(1).restart();
      console.log('力导向图初始化完成');
    } catch (error) {
      console.error('力导向图绘制过程中出错:', error);
    }
  }
  
  // 绘制四个角的三角形标记
  function drawCornerMarkers(svg, corners) {
    // 三角形的大小 - 增大三角形的尺寸以便更容易点击
    const triangleSize = Math.min(width, height) * 0.1; // 增大三角形尺寸
    
    // 添加左上角的红色三角形 - 检索失效
    drawTriangle(svg, corners[0].x, corners[0].y, triangleSize, 0, colors.retrievalFailure, '检索失效');
    
    // 添加右上角的黄色三角形 - Prompt脆弱性
    drawTriangle(svg, corners[1].x, corners[1].y, triangleSize, 90, colors.promptFragility, 'Prompt脆弱性');
    
    // 添加右下角的蓝色三角形 - 生成异常
    drawTriangle(svg, corners[2].x, corners[2].y, triangleSize, 180, colors.generationAnomaly, '生成异常');
    
    // 添加左下角的绿色三角形 - 标准异常
    drawTriangle(svg, corners[3].x, corners[3].y, triangleSize, 270, colors.standardDeviation, '标准异常');
  }
  
  // 绘制三角形函数
  function drawTriangle(svg, x, y, size, rotation, color, label) {
    // 计算三角形的三个顶点
    const angle = (rotation * Math.PI) / 180;
    const angle1 = angle;
    const angle2 = angle + (Math.PI / 2);
    const angle3 = angle + (Math.PI / 4);
    
    const x1 = x;
    const y1 = y;
    const x2 = x + size * Math.cos(angle1);
    const y2 = y + size * Math.sin(angle1);
    const x3 = x + size * Math.cos(angle2);
    const y3 = y + size * Math.sin(angle2);
    
    // 绘制三角形
    const triangle = svg.append('path')
      .attr('d', `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`)
      .attr('fill', color)
      .attr('stroke', 'white')
      .attr('stroke-width', 1);
    
    // 添加提示效果
    triangle.style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this)
          .attr('stroke-width', 2)
          .attr('stroke', '#fff');
        
        // 添加提示文本
        const tooltipX = (x1 + x2 + x3) / 3;
        const tooltipY = (y1 + y2 + y3) / 3;
        
        svg.append('text')
          .attr('class', 'corner-tooltip')
          .attr('x', tooltipX)
          .attr('y', tooltipY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'white')
          .attr('stroke', 'black')
          .attr('stroke-width', 0.5)
          .attr('font-size', '12px')
          .text(label);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', 1);
        
        svg.selectAll('.corner-tooltip').remove();
      });
  }
  
  // 添加顶点力
  function addVertexForces(corners) {
    // 为每个顶点添加力
    simulation
      .force('retrievalFailure', d3.forceRadial(d => d.forces.retrievalFailure * 300, corners[0].x, corners[0].y).strength(d => d.forces.retrievalFailure * 0.1))
      .force('promptFragility', d3.forceRadial(d => d.forces.promptFragility * 300, corners[1].x, corners[1].y).strength(d => d.forces.promptFragility * 0.1))
      .force('generationAnomaly', d3.forceRadial(d => d.forces.generationAnomaly * 300, corners[2].x, corners[2].y).strength(d => d.forces.generationAnomaly * 0.1))
      .force('standardDeviation', d3.forceRadial(d => d.forces.standardDeviation * 300, corners[3].x, corners[3].y).strength(d => d.forces.standardDeviation * 0.1));
  }
  
  // 更新节点位置
  function ticked() {
    nodeElements
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
  }
  
  // 获取节点颜色 - 根据四种力的比例混合颜色
  function getNodeColor(forces) {
    // 获取每个力的值
    const r = forces.retrievalFailure;
    const p = forces.promptFragility;
    const g = forces.generationAnomaly;
    const s = forces.standardDeviation;
    
    // 计算总和
    const total = r + p + g + s;
    
    // 如果总和为0，返回默认灰色
    if (total === 0) return '#999';
    
    // 从RGB颜色中计算混合颜色
    // 红色 - 检索失效
    const redComponent = hexToRgb(colors.retrievalFailure);
    // 黄色 - Prompt脆弱性
    const yellowComponent = hexToRgb(colors.promptFragility);
    // 蓝色 - 生成异常
    const blueComponent = hexToRgb(colors.generationAnomaly);
    // 绿色 - 标准异常
    const greenComponent = hexToRgb(colors.standardDeviation);
    
    // 计算加权平均
    const mixedColor = {
      r: Math.round((redComponent.r * r + yellowComponent.r * p + blueComponent.r * g + greenComponent.r * s) / total),
      g: Math.round((redComponent.g * r + yellowComponent.g * p + blueComponent.g * g + greenComponent.g * s) / total),
      b: Math.round((redComponent.b * r + yellowComponent.b * p + blueComponent.b * g + greenComponent.b * s) / total)
    };
    
    // 转换回十六进制颜色
    return rgbToHex(mixedColor.r, mixedColor.g, mixedColor.b);
  }
  
  // 辅助函数: 十六进制颜色转RGB
  function hexToRgb(hex) {
    // 去掉#
    hex = hex.replace('#', '');
    
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }
  
  // 辅助函数: RGB转十六进制颜色
  function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
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
    aspect-ratio: 1 / 1; /* 确保容器始终保持正方形 */
  }
  
  .chart-container {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .node-details {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 320px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    z-index: 10;
  }
  
  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .details-header h3 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
  }
  
  .description {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
  }
  
  .forces-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .force-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .force-label {
    width: 100px;
    font-size: 12px;
    text-align: right;
    font-weight: 500;
  }
  
  .force-bar {
    flex: 1;
    height: 8px;
    background-color: #eee;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .force-fill {
    height: 100%;
    border-radius: 4px;
  }
  
  .force-value {
    width: 40px;
    font-size: 12px;
    text-align: right;
  }
  
  .details-text {
    border-top: 1px solid #eee;
    padding-top: 12px;
  }
  
  .details-text h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #333;
  }
  
  .details-text p {
    margin: 0;
    font-size: 13px;
    color: #666;
    line-height: 1.5;
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