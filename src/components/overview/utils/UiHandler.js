/**
 * UI处理模块
 * 负责处理工具提示、高亮和用户交互相关的UI功能
 */
import * as d3 from 'd3';

// tooltip管理状态
let tooltipHideTimer = null;
let lastMousePosition = { x: 0, y: 0 };
let activeTooltip = null;

/**
 * 创建工具提示
 * @param {Event} event 事件对象
 * @param {String} content 提示内容HTML
 * @param {Number} timeout 超时时间
 */
export function createTooltip(event, content, timeout = 3000) {
  try {
    if (activeTooltip) activeTooltip.remove();
    if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
    
    lastMousePosition = { x: event.clientX, y: event.clientY };
    
    activeTooltip = d3.select('body')
      .append('div')
      .attr('class', 'point-tooltip')
      .style('position', 'fixed')
      .style('background', 'rgba(255, 255, 255, 0.9)')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('max-width', '250px')
      .style('z-index', '9999')
      .style('pointer-events', 'none')
      .style('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.15)')
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`)
      .style('opacity', '1')
      .style('transition', 'opacity 0.3s ease')
      .html(content);
    
    document.addEventListener('mousemove', checkMouseDistance);
    tooltipHideTimer = setTimeout(hideTooltip, timeout);
  } catch (error) {
    console.error('创建提示框错误:', error);
  }
}

/**
 * 检测鼠标距离
 * @param {Event} event 事件对象
 */
function checkMouseDistance(event) {
  const dx = event.clientX - lastMousePosition.x;
  const dy = event.clientY - lastMousePosition.y;
  if (Math.sqrt(dx * dx + dy * dy) > 100) hideTooltip();
}

/**
 * 隐藏工具提示
 */
export function hideTooltip() {
  if (activeTooltip) {
    activeTooltip.style('opacity', '0');
    setTimeout(() => {
      if (activeTooltip) {
        activeTooltip.remove();
        activeTooltip = null;
      }
    }, 300);
  }
  
  if (tooltipHideTimer) {
    clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
  }
  
  document.removeEventListener('mousemove', checkMouseDistance);
}

/**
 * 清理UI资源
 */
export function cleanupUiResources() {
  if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
  document.removeEventListener('mousemove', checkMouseDistance);
  if (activeTooltip) activeTooltip.remove();
}

/**
 * 更新高亮边框
 * @param {Object} svg SVG元素
 * @param {String} cellId 单元格ID
 * @param {Object} currentTransform 当前变换
 * @param {Function} xScale X轴比例尺
 * @param {Function} yScale Y轴比例尺
 * @param {Number} width 画布宽度
 * @param {Number} height 画布高度
 */
export function updateHighlightBorder(svg, cellId, currentTransform, xScale, yScale, width, height) {
  if (!svg || !cellId) return;
  
  const matches = cellId.match(/cell-(\d+)-(\d+)/);
  if (!matches) return;
  
  const gridX = parseInt(matches[1]);
  const gridY = parseInt(matches[2]);
  
  // 计算网格配置 - 修改为固定正方形网格
  const gridSize = 13;
  // 修改：使用固定的网格大小，不再基于宽高比调整
  const gridSizeY = gridSize;
  
  // 使用当前坐标轴范围
  const xRange = [xScale.domain()[0], xScale.domain()[1]];
  const yRange = [yScale.domain()[0], yScale.domain()[1]];
  
  // 计算网格单元位置
  const gridX0 = xScale(xRange[0]) + gridX * ((xScale(xRange[1]) - xScale(xRange[0])) / gridSize);
  const gridY0 = yScale(yRange[1]) + gridY * ((yScale(yRange[0]) - yScale(yRange[1])) / gridSizeY);
  const cellWidth = (xScale(xRange[1]) - xScale(xRange[0])) / gridSize;
  const cellHeight = (yScale(yRange[0]) - yScale(yRange[1])) / gridSizeY;
  
  // 确保存在top-highlight-group
  let topHighlightGroup = svg.select(".top-highlight-group");
  if (topHighlightGroup.empty()) {
    topHighlightGroup = svg.append("g")
      .attr("class", "top-highlight-group")
      .attr("pointer-events", "none");
  }
  
  // 移除当前的高亮边框
  topHighlightGroup.selectAll(".highlight-border").remove();
  
  // 创建新的高亮边框 - 修复:不直接乘以缩放因子k，而是让变换自动处理
  topHighlightGroup
    .append("rect")
    .attr("class", "highlight-border")
    .attr("x", gridX0)
    .attr("y", gridY0)
    .attr("width", cellWidth)
    .attr("height", cellHeight)
    .attr("fill", "transparent")
    .attr("stroke", "#4285F4")
    .attr("stroke-width", 3 / currentTransform.k) // 调整笔画宽度与缩放成反比
    .attr("rx", 8 / currentTransform.k) // 调整圆角与缩放成反比
    .attr("ry", 8 / currentTransform.k) // 调整圆角与缩放成反比
    .attr("data-cell-id", cellId)
    .attr("pointer-events", "none")
    .attr("transform", currentTransform); // 应用整个变换矩阵
}

/**
 * 更新选中点
 * @param {Number} id 选中点ID
 * @param {Object} zoomG 缩放组
 * @param {Object} svg SVG元素
 * @param {Function} xScale X轴比例尺
 * @param {Function} yScale Y轴比例尺
 */
export function updateSelectedPoint(id, zoomG, svg, xScale, yScale) {
  if (!zoomG || !svg || !id) return;
  
  // 检查selected-point-group是否存在，不存在则创建
  let selectedPointGroup = svg.select('.selected-point-group');
  if (selectedPointGroup.empty()) {
    selectedPointGroup = svg.append('g')
      .attr('class', 'selected-point-group')
      .attr('pointer-events', 'none');
  }
  
  // 清除之前的内容 - 确保每次调用都移除旧的高亮点
  selectedPointGroup.selectAll('*').remove();
  
  // 找到原始的点 - 使用更准确的选择器匹配前景点和背景点
  const selectedPoint = zoomG.selectAll('circle.foreground-point, circle.background-point')
    .filter(d => d && d.id === parseInt(id));
  
  // 如果找到了点，高亮显示它
  if (!selectedPoint.empty()) {
    const pointData = selectedPoint.datum();
    
    // 确保embedding数据存在
    if (!pointData || !pointData.embedding || !Array.isArray(pointData.embedding) || pointData.embedding.length < 2) {
      console.warn('无法找到有效的embedding数据来高亮点:', id);
      return;
    }
    
    const cx = xScale(pointData.embedding[0]);
    const cy = yScale(pointData.embedding[1]);
    
    // 获取选中点的颜色
    const originalFill = selectedPoint.attr('fill');
    
    // 在顶层组中创建高亮点
    selectedPointGroup
      .append('circle')
      .attr('class', 'selected-point')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', 8)  // 略大于原始点
      .attr('fill', originalFill)
      .attr('stroke', '#ff0')
      .attr('stroke-width', 3)
      .attr('opacity', 1);
  } else {
    console.warn('无法找到ID对应的点进行高亮:', id);
  }
}

/**
 * 安全的DOM更新函数，使用锁避免并发冲突
 * @param {Function} callback 更新回调函数 
 */
export function safeDomUpdate(callback) {
  // 使用闭包保存锁的状态
  const lock = { locked: false };
  
  if (lock.locked) return;
  
  try {
    lock.locked = true;
    callback();
  } catch (error) {
    console.error('DOM更新错误:', error);
  } finally {
    // 确保锁会被释放
    setTimeout(() => {
      lock.locked = false;
    }, 100);
  }
} 