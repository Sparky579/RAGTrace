/**
 * 文档块处理模块
 * 负责处理文档块的分配、过滤和展示相关功能
 */

/**
 * 为网格单元分配文档块
 * @param {Array} embeddingsData 文档块数据
 * @param {Function} setGridChunks 设置网格单元文档块的函数
 * @param {String} cellId 网格单元格ID
 * @param {Number} i 网格行索引
 * @param {Number} j 网格列索引
 * @param {Number} gridSize 网格大小
 * @param {Number} gridSizeY 网格垂直尺寸
 * @param {Array} xRange X轴范围
 * @param {Array} yRange Y轴范围
 */
export function assignChunksToGridCell(
  embeddingsData,
  setGridChunks,
  cellId,
  i,
  j,
  gridSize,
  gridSizeY,
  xRange,
  yRange
) {
  // 计算该网格单元对应的数据范围
  const xMin = xRange[0] + (xRange[1] - xRange[0]) * (i / gridSize);
  const xMax = xRange[0] + (xRange[1] - xRange[0]) * ((i + 1) / gridSize);
  
  // 修正y轴方向 - 将j映射到正确的数据坐标系
  // SVG中j从上到下增加(0在顶部)，而数据中y轴从下到上增加
  const yFactor = gridSizeY - j - 1; // 反转j的顺序
  const yMin = yRange[0] + (yRange[1] - yRange[0]) * (yFactor / gridSizeY);
  const yMax = yRange[0] + (yRange[1] - yRange[0]) * ((yFactor + 1) / gridSizeY);
  
  // 找出落在该范围内的文档块
  const cellChunks = embeddingsData.filter(chunk => {
    if (!chunk.vector || chunk.vector.length < 2) return false;
    const x = chunk.vector[0];
    const y = chunk.vector[1];
    return x >= xMin && x < xMax && y >= yMin && y < yMax;
  });
  
  // 将文档块保存到store中
  if (cellChunks.length > 0) {
    setGridChunks(cellId, cellChunks);
  }
}

/**
 * 绘制文档块点
 * @param {Object} zoomG D3缩放组
 * @param {Array} validChunks 有效的文档块数据
 * @param {Function} xScale X轴比例尺
 * @param {Function} yScale Y轴比例尺
 * @param {Array} cachedChunks 缓存的文档块数据
 * @param {Function} createTooltip 创建工具提示的函数
 * @returns {Array} 更新的缓存文档块数据
 */
export function drawChunkPoints(zoomG, validChunks, xScale, yScale, cachedChunks, createTooltip) {
  if (!zoomG || !validChunks || validChunks.length === 0) return cachedChunks;
  
  // 如果文档块点已经存在，不重新绘制
  if (zoomG.select('.chunk-points-group').size() > 0 && cachedChunks) return cachedChunks;
  
  // 绘制文档块点
  zoomG.append('g')
    .attr('class', 'chunk-points-group')
    .selectAll('circle.chunk-point')
    .data(validChunks)
    .enter()
    .append('circle')
    .attr('class', 'chunk-point')
    .attr('cx', d => xScale(d.vector[0]))
    .attr('cy', d => yScale(d.vector[1]))
    .attr('r', 1)
    .attr('fill', '#c0d6e4')
    .attr('opacity', 0.6)
    .on('mouseover', function(event, d) {
      createTooltip(event, `
        <div style="font-size:11px;font-weight:bold">Chunk</div>
        <div style="font-size:10px;max-height:150px;overflow:hidden;text-overflow:ellipsis;">${d.text.substring(0, 150)}${d.text.length > 150 ? '...' : ''}</div>
      `, 1000);
    });
  
  return validChunks;
}

/**
 * 生成默认密度数据（用于热力图）
 * @returns {Array} 密度数据数组
 */
export function generateDefaultDensity() {
  const size = 20;
  const density = [];
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      const x = i / size - 0.5;
      const y = j / size - 0.5;
      const value = Math.exp(-(x*x + y*y) / 0.1);
      row.push(value);
    }
    density.push(row);
  }
  return density;
}

/**
 * 过滤有效的文档块数据
 * @param {Array} embeddingsData 文档块数据
 * @param {Number} limit 数据限制条数
 * @returns {Array} 有效的文档块数据
 */
export function filterValidChunks(embeddingsData, limit = 15000) {
  return embeddingsData.filter(d => 
    d.vector && Array.isArray(d.vector) && d.vector.length >= 2 &&
    !isNaN(d.vector[0]) && !isNaN(d.vector[1])
  ).slice(0, limit);
} 