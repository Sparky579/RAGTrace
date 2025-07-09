/**
 * 热力图渲染模块
 * 负责绘制热力图、问题点等核心渲染逻辑
 */
import * as d3 from 'd3';
import { assignChunksToGridCell } from './ChunkHandler';
import { updateHighlightBorder } from './UiHandler';

/**
 * 绘制热力图网格和等高线
 * @param {Object} params 渲染参数
 */
export function drawHeatmap(params) {
  const { 
    zoomG, kdeData, xScale, yScale, width, height, 
    chunkStore, questionStore, embeddingsData, 
    currentTransform, handlePointClick 
  } = params;
  
  if (!zoomG) return false;
  
  // 清除已有热力图
  zoomG.select('.heatmap-group').remove();
  
  // 创建网格组
  const gridGroup = zoomG.append("g")
    .attr('class', 'heatmap-group');
  
  // 网格配置 - 修改这里，使用相同的网格尺寸，确保热力图为正方形
  const gridSize = 13;
  // 修改：不再基于宽高比调整Y轴的网格数，而是保持与X轴相同
  const gridSizeY = gridSize;
  
  // 使用当前坐标轴范围作为热力图范围
  const xRange = [xScale.domain()[0], xScale.domain()[1]];
  const yRange = [yScale.domain()[0], yScale.domain()[1]];
  
  // 计算网格单元尺寸 - 确保网格单元为正方形
  const cellWidth = (xScale(xRange[1]) - xScale(xRange[0])) / gridSize;
  const cellHeight = (yScale(yRange[0]) - yScale(yRange[1])) / gridSizeY;
  
  // 获取当前选中的单元格ID
  const currentGridCell = chunkStore.currentGridCell;
  
  // 绘制KDE热力图
  if (kdeData.density && kdeData.density.length) {
    const density = kdeData.density;
    const n = density.length;
    
    // 计算密度范围
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < density[i].length; j++) {
        min = Math.min(min, density[i][j]);
        max = Math.max(max, density[i][j]);
      }
    }
    
    // 创建颜色比例尺
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([min, max]);
    
    // 创建轮廓生成器
    const contours = d3.contours()
      .size([n, n])
      .thresholds(d3.range(min, max, (max - min) / 15));
    
    // 创建坐标转换比例尺 - 修改为正方形热力图的比例尺
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
    gridGroup.append("g")
      .attr('class', 'contours-group')
      .selectAll("path")
      .data(contours(density.flat()))
      .enter()
      .append("path")
      .attr("d", d3.geoPath().projection(transform))
      .attr("fill", d => colorScale(d.value))
      .attr("opacity", 0.2)
      .attr("stroke", "none");
  }
  
  // 创建不可见的交互网格单元组
  const cellsGroup = gridGroup.append("g")
    .attr("class", "cells-group");
  
  // 创建高亮边框组
  const highlightGroup = gridGroup.append("g")
    .attr("class", "highlight-group");
  
  // 绘制网格单元
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSizeY; j++) {
      const cellId = `cell-${i}-${j}`;
      
      // 创建小网格
      const gridX = xScale(xRange[0]) + i * cellWidth;
      const gridY = yScale(yRange[1]) + j * cellHeight;
      
      // 为该网格区域分配文档块
      assignChunksToGridCell(
        embeddingsData,
        chunkStore.setGridChunks,
        cellId, i, j, gridSize, gridSizeY, xRange, yRange
      );
      
      // 绘制不可见的网格单元（用于交互）
      cellsGroup.append("rect")
        .attr("x", gridX)
        .attr("y", gridY)
        .attr("width", cellWidth)
        .attr("height", cellHeight)
        .attr("fill", "transparent")
        .attr("stroke", "transparent")
        .attr("class", "grid-cell")
        .attr("data-cell-id", cellId)
        .attr("opacity", 1);
    }
  }
  
  // 如果有当前选中的单元格，在函数结束后触发高亮处理
  if (currentGridCell && questionStore.currentQuestionId) {
    setTimeout(() => {
      const currentQuestion = questionStore.allQuestions.find(q => q.id === questionStore.currentQuestionId);
      if (currentQuestion) {
        // 创建一个模拟事件，用于调用handlePointClick
        const simulatedEvent = { stopPropagation: () => {} };
        // 在下一帧调用handlePointClick，确保其他DOM操作已完成
        handlePointClick(simulatedEvent, currentQuestion);
      }
    }, 0);
  }
  
  return true;
}

/**
 * 绘制问题点
 * @param {Object} params 渲染参数
 */
export function drawPoints(params) {
  const { 
    zoomG, data, xScale, yScale, questionStore, 
    createTooltip, handlePointClick, handlePointMouseover
  } = params;
  
  if (!zoomG) return;
  
  let validDataPoints = data.filter(d => 
    d.embedding && 
    Array.isArray(d.embedding) && 
    d.embedding.length >= 2 && 
    !isNaN(d.embedding[0]) && 
    !isNaN(d.embedding[1])
  );
  
  if (!validDataPoints || validDataPoints.length === 0) return;
  
  const pointRadius = 6;
  const visibleQuestions = questionStore.filteredQuestions;
  
  // 分组数据点
  const foregroundPoints = [];
  const backgroundPoints = [];
  
  validDataPoints.forEach(d => {
    if (visibleQuestions.some(q => q.id === d.id)) {
      foregroundPoints.push(d);
    } else {
      backgroundPoints.push(d);
    }
  });
  
  // 绘制背景点
  zoomG.append('g')
    .attr('class', 'background-points-group')
    .selectAll('circle.background-point')
    .data(backgroundPoints)
    .enter()
    .append('circle')
    .attr('class', 'background-point data-point')
    .attr('cx', d => xScale(d.embedding[0]))
    .attr('cy', d => yScale(d.embedding[1]))
    .attr('r', pointRadius)
    .attr('fill', '#d3d3d3')
    .attr('opacity', 0.4)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .attr('pointer-events', 'all')
    .attr('cursor', 'pointer')
    .on('click', handlePointClick)
    .on('mouseover', (event, d) => handlePointMouseover(event, d, 0.7))
    .on('mouseout', function(event, d) {
      // 修复：检查点是否是当前选中的点，但不主动添加黄色高亮
      if (questionStore.currentQuestionId !== d.id) {
        d3.select(this)
          .attr('opacity', 0.4)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      }
    });
  
  // 绘制前景点
  zoomG.append('g')
    .attr('class', 'foreground-points-group')
    .selectAll('circle.foreground-point')
    .data(foregroundPoints)
    .enter()
    .append('circle')
    .attr('class', 'foreground-point data-point')
    .attr('cx', d => xScale(d.embedding[0]))
    .attr('cy', d => yScale(d.embedding[1]))
    .attr('r', pointRadius)
    .attr('fill', '#1a73e8')
    .attr('opacity', 0.6)
    .attr('stroke', '#AAAAAA')
    .attr('stroke-width', 1)
    .attr('pointer-events', 'all')
    .attr('cursor', 'pointer')
    .on('click', handlePointClick)
    .on('mouseover', (event, d) => handlePointMouseover(event, d, 0.8))
    .on('mouseout', function(event, d) {
      // 修复：检查点是否是当前选中的点，但不主动添加黄色高亮
      if (questionStore.currentQuestionId !== d.id) {
        d3.select(this)
          .attr('opacity', 0.5)
          .attr('stroke', '#AAAAAA')
          .attr('stroke-width', 1);
      }
    });
}

/**
 * 创建SVG元素
 * @param {HTMLElement} container 容器元素
 * @param {Number} width 宽度
 * @param {Number} height 高度
 * @param {Number} relativeWidth 相对宽度
 * @param {Number} relativeHeight 相对高度
 * @param {Function} handleZoom 缩放处理函数
 * @returns {Object} 包含svg和zoomG的对象
 */
export function createSvgElements(container, width, height, relativeWidth, relativeHeight, handleZoom) {
  if (!container) return { svg: null, zoomG: null };
  
  // 清除之前的图表
  d3.select(container).selectAll('*').remove();
  
  // 创建SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('width', '100%')
    .style('height', '100%');
  
  // 添加视图盒，确保图表适应当前视口
  svg.attr('viewBox', `0 0 ${relativeWidth} ${relativeHeight}`);
  
  // 创建可缩放的组
  const zoomG = svg.append('g');
  
  // 创建专门用于高亮框的组（确保在zoomG之后创建，这样它总是位于顶部）
  svg.append('g')
    .attr('class', 'top-highlight-group')
    .attr('pointer-events', 'none')
    .style('z-index', '1000');
  
  // 创建专门用于显示选中点的组
  svg.append('g')
    .attr('class', 'selected-point-group')
    .attr('pointer-events', 'none')
    .style('z-index', '2000');
  
  // 设置缩放功能
  const zoom = d3.zoom()
    .scaleExtent([0.5, 8])
    .on('zoom', handleZoom);
  
  svg.call(zoom);
  
  return { svg, zoomG };
}

/**
 * 计算数据的坐标范围
 * @param {Array} validData 问题数据
 * @param {Array} validChunks 文档块数据
 * @returns {Object} 包含x和y轴的范围
 */
export function calculateDataExtent(validData, validChunks) {
  // 默认范围
  let xExtent = [-1, 1];
  let yExtent = [-1, 1];
  
  const hasValidData = validData && validData.length > 0;
  const hasValidChunks = validChunks && validChunks.length > 0;
  
  // 计算问题数据范围
  let questionExtentX, questionExtentY;
  if (hasValidData) {
    questionExtentX = d3.extent(validData, d => d.embedding[0]);
    questionExtentY = d3.extent(validData, d => d.embedding[1]);
  }
  
  // 计算文档块范围
  let chunksExtentX, chunksExtentY;
  if (hasValidChunks) {
    chunksExtentX = d3.extent(validChunks, d => d.vector[0]);
    chunksExtentY = d3.extent(validChunks, d => d.vector[1]);
  }
  
  // 合并范围
  if (hasValidData && hasValidChunks) {
    xExtent = [
      Math.min(questionExtentX[0], chunksExtentX[0]),
      Math.max(questionExtentX[1], chunksExtentX[1])
    ];
    yExtent = [
      Math.min(questionExtentY[0], chunksExtentY[0]),
      Math.max(questionExtentY[1], chunksExtentY[1])
    ];
  } else if (hasValidData) {
    xExtent = questionExtentX;
    yExtent = questionExtentY;
  } else if (hasValidChunks) {
    xExtent = chunksExtentX;
    yExtent = chunksExtentY;
  }
  
  return { xExtent, yExtent };
} 