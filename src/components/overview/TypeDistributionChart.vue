<template>
  <div class="chart-container">
    <h3 class="chart-title">问题类型分布</h3>
    <div ref="chartContainer" class="type-distribution-chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';

const chartContainer = ref(null);
let chart = null;

// 问题类型样例数据
const typeData = [
  { type: '事实型', value: 35, color: '#4285F4' },
  { type: '推理型', value: 30, color: '#34A853' },
  { type: '生成型', value: 22, color: '#FBBC05' },
  { type: '复杂型', value: 13, color: '#EA4335' }
];

onMounted(() => {
  initChart();
  
  // 响应窗口大小变化
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener('resize', handleResize);
  
  // 销毁图表实例
  if (chart) {
    chart.dispose();
    chart = null;
  }
});

function handleResize() {
  if (chart) {
    chart.resize();
  }
}

function initChart() {
  if (!chartContainer.value) return;
  
  // 初始化ECharts实例
  chart = echarts.init(chartContainer.value);
  
  // 图表配置
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        let result = `<div style="font-weight:bold;margin-bottom:5px">问题分布</div>`;
        params.forEach(param => {
          result += `${param.seriesName}: ${param.value}%<br/>`;
        });
        return result;
      },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#E0E6F1',
      borderWidth: 1,
      textStyle: {
        color: '#333'
      },
      padding: [8, 12],
      extraCssText: 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);'
    },
    legend: {
      data: typeData.map(item => item.type),
      top: '8%',
      itemWidth: 16,
      itemHeight: 16,
      textStyle: {
        fontSize: 12,
        color: '#333'
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '15%',
      top: '25%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%',
        color: '#666',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#EAEEF2'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: ['问题类型'],
      axisLabel: {
        color: '#333',
        fontSize: 14,
        margin: 16
      },
      axisTick: {
        show: false
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#E0E6F1'
        }
      }
    },
    series: typeData.map(item => {
      return {
        name: item.type,
        type: 'bar',
        stack: '总量',
        barWidth: '50%',
        label: {
          show: true,
          formatter: function(params) {
            return params.value > 5 ? `${params.seriesName}: ${params.value}%` : '';
          },
          fontSize: 12,
          color: '#fff',
          position: 'inside'
        },
        itemStyle: {
          color: item.color,
          borderRadius: getBarBorderRadius(item, typeData)
        },
        emphasis: {
          itemStyle: {
            opacity: 0.9
          }
        },
        data: [item.value]
      };
    })
  };
  
  // 设置图表选项并渲染
  chart.setOption(option);
}

// 为堆叠条形图不同部分设置圆角
function getBarBorderRadius(item, allItems) {
  const firstItem = allItems[0].type;
  const lastItem = allItems[allItems.length - 1].type;
  
  if (item.type === firstItem) {
    return [4, 0, 0, 4]; // 左侧圆角
  } else if (item.type === lastItem) {
    return [0, 4, 4, 0]; // 右侧圆角
  } else {
    return [0, 0, 0, 0]; // 中间部分无圆角
  }
}
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0 0 16px 0;
  text-align: center;
}

.type-distribution-chart {
  width: 100%;
  height: calc(100% - 36px);
  min-height: 200px;
}
</style> 