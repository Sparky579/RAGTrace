<template>
  <div class="radar-chart-grid">
    <div class="radar-charts-container">
      <div 
        v-for="(question, index) in questions" 
        :key="index" 
        class="radar-chart-item"
      >
        <div class="chart-container" :ref="el => { if (el) chartRefs[index] = el }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, defineEmits } from 'vue';
import * as echarts from 'echarts';
import axios from 'axios';

const props = defineProps({
  type: {
    type: String,
    default: 'before'
  },
  selectedQuestion: {
    type: Object,
    default: null
  }
});

// 添加debug模式控制变量
const debug = ref(false); // 开启debug模式，显示三个测试数据

const emit = defineEmits(['test-completed']);

// 图表DOM引用
const chartRefs = ref([]);

// 模拟问题数据 - 增加更多案例
const questions = ref([
  { name: 'Performance Analysis', id: 'performance1' }
]);

// 在debug模式下添加两个问题
if (debug.value) {
  questions.value = [
    { name: 'Performance Analysis', id: 'performance1' },
    { name: 'Test Case 2', id: 'performance2' },
    { name: 'Test Case 3', id: 'performance3' }
  ];
}

// 性能指标数据 - 英文版本
const originalData = [
  { accuracy: 0.72, retrieval: 0.74, completeness: 0.68, latency: 520, satisfaction: 0.69, cost: 0.42 },
  { accuracy: 0.68, retrieval: 0.72, completeness: 0.62, latency: 540, satisfaction: 0.63, cost: 0.38 },
  { accuracy: 0.74, retrieval: 0.76, completeness: 0.70, latency: 500, satisfaction: 0.72, cost: 0.45 },
  { accuracy: 0.69, retrieval: 0.73, completeness: 0.64, latency: 530, satisfaction: 0.65, cost: 0.40 },
  { accuracy: 0.71, retrieval: 0.75, completeness: 0.67, latency: 510, satisfaction: 0.70, cost: 0.43 },
  { accuracy: 0.70, retrieval: 0.74, completeness: 0.65, latency: 525, satisfaction: 0.68, cost: 0.41 },
  { accuracy: 0.73, retrieval: 0.77, completeness: 0.69, latency: 515, satisfaction: 0.71, cost: 0.44 },
  { accuracy: 0.71, retrieval: 0.75, completeness: 0.66, latency: 530, satisfaction: 0.67, cost: 0.40 },
  { accuracy: 0.69, retrieval: 0.73, completeness: 0.64, latency: 540, satisfaction: 0.66, cost: 0.39 },
];

const beforeData = [
  { accuracy: 0.76, retrieval: 0.82, completeness: 0.65, latency: 450, satisfaction: 0.68, cost: 0.35 },
  { accuracy: 0.72, retrieval: 0.78, completeness: 0.61, latency: 480, satisfaction: 0.63, cost: 0.30 },
  { accuracy: 0.81, retrieval: 0.85, completeness: 0.71, latency: 420, satisfaction: 0.75, cost: 0.40 },
  { accuracy: 0.68, retrieval: 0.75, completeness: 0.59, latency: 510, satisfaction: 0.60, cost: 0.25 },
  { accuracy: 0.79, retrieval: 0.83, completeness: 0.68, latency: 430, satisfaction: 0.72, cost: 0.38 },
  { accuracy: 0.74, retrieval: 0.80, completeness: 0.66, latency: 460, satisfaction: 0.65, cost: 0.32 },
  { accuracy: 0.77, retrieval: 0.82, completeness: 0.67, latency: 440, satisfaction: 0.70, cost: 0.36 },
  { accuracy: 0.75, retrieval: 0.81, completeness: 0.65, latency: 450, satisfaction: 0.67, cost: 0.33 },
  { accuracy: 0.73, retrieval: 0.79, completeness: 0.63, latency: 470, satisfaction: 0.64, cost: 0.31 },
];

const afterData = [
  { accuracy: 0.85, retrieval: 0.88, completeness: 0.78, latency: 420, satisfaction: 0.79, cost: 0.39 },
  { accuracy: 0.82, retrieval: 0.86, completeness: 0.76, latency: 430, satisfaction: 0.75, cost: 0.36 },
  { accuracy: 0.89, retrieval: 0.92, completeness: 0.83, latency: 390, satisfaction: 0.86, cost: 0.44 },
  { accuracy: 0.80, retrieval: 0.84, completeness: 0.74, latency: 440, satisfaction: 0.73, cost: 0.34 },
  { accuracy: 0.87, retrieval: 0.90, completeness: 0.81, latency: 400, satisfaction: 0.83, cost: 0.42 },
  { accuracy: 0.83, retrieval: 0.87, completeness: 0.77, latency: 425, satisfaction: 0.76, cost: 0.38 },
  { accuracy: 0.86, retrieval: 0.89, completeness: 0.79, latency: 410, satisfaction: 0.80, cost: 0.40 },
  { accuracy: 0.84, retrieval: 0.88, completeness: 0.78, latency: 420, satisfaction: 0.78, cost: 0.39 },
  { accuracy: 0.81, retrieval: 0.85, completeness: 0.75, latency: 435, satisfaction: 0.74, cost: 0.37 },
];

// 存储API请求结果
const apiResults = ref({
  answer: null,
  rag: null,
  rag2: null
});

// 存储评估结果
const evaluationResults = ref({
  answer: null,
  rag: null,
  rag2: null
});

// 正则化数据到0-1范围，对于延迟和成本是反向的（越低越好）
function normalizeData(data) {
  return data.map(item => [
    item.accuracy,
    item.retrieval,
    item.completeness,
    1 - (item.latency - 380) / (550 - 380),  // 延迟 - 反向
    item.satisfaction,
    1 - (item.cost - 0.2) / (0.5 - 0.2)      // 成本 - 反向
  ]);
}

// 用于从评估结果正则化数据
function normalizeEvaluationData(data) {
  if (!data) return [0, 0, 0, 0, 0, 0];
  
  // 确保所有值在0-1范围内，并处理非标准范围的指标
  return [
    // accuracy已经是0-1范围
    Math.min(Math.max(data.accuracy || 0, 0), 1),
    
    // retrieval已经是0-1范围
    Math.min(Math.max(data.retrieval || 0, 0), 1),
    
    // similarity已经是0-1范围
    Math.min(Math.max(data.similarity || 0, 0), 1),
    
    // processing_time转换为响应速度(越快越好)
    // 假设processing_time从0.1到10秒，取反向值
    1 - Math.min(Math.max((data.processing_time || 0) / 5, 0), 1),
    
    // g_eval是1-10的整数，需要除以10转为0-1
    Math.min(Math.max((data.g_eval || 0) / 10, 0), 1),
    
    // length需要正则化到恰当的范围，太长太短都不好
    // 假设理想长度在30-300之间，长度适中的回答得分最高
    (() => {
      const len = data.length || 0;
      if (len < 30) return len / 30 * 0.8; // 太短的回答得分较低
      if (len > 300) return Math.max(1 - (len - 300) / 700, 0.2); // 太长的回答得分降低但不为0
      return 0.8 + (len - 30) / 270 * 0.2; // 在理想范围内，随长度适当增加得分
    })()
  ];
}

// 发送API请求获取答案
async function fetchAnswers(questionText) {
  try {
    console.log(`向API发送查询: "${questionText}"`);
    
    // 向三个不同的端点发送请求
    const [answerRes, ragRes, rag2Res] = await Promise.all([
      axios.post('http://localhost:5377/answer', { query: questionText }),
      axios.post('http://localhost:5377/rag', { query: questionText }),
      axios.post('http://localhost:5377/rag2', { query: questionText })
    ]);

    // 提取答案文本 - 处理不同的响应格式
    const extractAnswer = (response) => {
      if (!response || !response.data) return '';
      
      // 如果response.data直接是字符串
      if (typeof response.data === 'string') return response.data;
      
      // 如果response.data有answer属性
      if (response.data.answer) return response.data.answer;
      
      // 如果response.data有text属性
      if (response.data.text) return response.data.text;
      
      // 如果无法提取，则转为JSON字符串
      return JSON.stringify(response.data);
    };

    const answers = {
      answer: extractAnswer(answerRes),
      rag: extractAnswer(ragRes),
      rag2: extractAnswer(rag2Res)
    };
    
    // 存储API原始响应结果
    apiResults.value = {
      answer: answerRes.data,
      rag: ragRes.data,
      rag2: rag2Res.data
    };
    
    console.log('获取到三种答案:', {
      answer: answers.answer.substring(0, 50) + '...',
      rag: answers.rag.substring(0, 50) + '...',
      rag2: answers.rag2.substring(0, 50) + '...'
    });

    return answers;
  } catch (error) {
    console.error('获取答案时出错:', error);
    return null;
  }
}

// 评估答案质量
async function evaluateAnswers(questionText, answers, groundTruth, chunk) {
  try {
    const evaluations = {};
    
    // 为每个答案发送评估请求
    for (const [key, answer] of Object.entries(answers)) {
      // 提取答案文本 - 可能是对象或直接是字符串
      const answerText = typeof answer === 'object' ? 
                        (answer.answer || answer.text || JSON.stringify(answer)) : 
                        String(answer);
      
      console.log(`发送评估请求 - 类型: ${key}, 答案类型: ${typeof answer}, 答案长度: ${answerText.length}`);
      
      const evalResponse = await axios.post('http://localhost:5377/evaluate', {
        question: questionText,
        answer: answerText,
        gt: groundTruth,
        chunk: chunk
      });
      
      evaluations[key] = evalResponse.data;
    }
    
    // 存储评估结果
    evaluationResults.value = evaluations;
    
    return evaluations;
  } catch (error) {
    console.error('评估答案时出错:', error);
    return null;
  }
}

// 运行测试并更新雷达图
async function runTest(question) {
  if (!question) return;
  
  const questionText = question.question || question.text;
  const groundTruth = question.gt || "";
  const chunk = question.chunk || "";
  
  // 获取三个答案
  const answers = await fetchAnswers(questionText);
  if (!answers) return;
  
  // 评估答案
  const evaluations = await evaluateAnswers(questionText, answers, groundTruth, chunk);
  if (!evaluations) return;
  
  // 初始化/更新雷达图
  updateCharts(evaluations);
  
  // 发出测试完成事件
  emit('test-completed', { 
    question, 
    answers, 
    evaluations 
  });
}

// 初始化所有图表
function initCharts() {
  const charts = [];

  // 销毁现有图表
  charts.forEach(chart => chart && chart.dispose());
  charts.length = 0;

  // 生成正则化数据
  const normalizedData = {
    original: normalizeData(originalData),
    before: normalizeData(beforeData),
    after: normalizeData(afterData)
  };
  
  // 为每个问题创建图表
  chartRefs.value.forEach((chartDom, index) => {
    if (!chartDom) return;
    
    const chart = echarts.init(chartDom);
    charts.push(chart);
    
    // 在debug模式下，使用不同的索引获取数据，确保三个图表显示不同的数据
    const dataIndex = debug.value ? index : 0;
    
    const option = {
      color: ['rgba(110, 112, 121, 0.7)', 'rgba(65, 129, 217, 0.7)', 'rgba(67, 175, 126, 0.7)'],
      tooltip: {
        trigger: 'item',
        confine: true,
        appendToBody: true,
        extraCssText: 'z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.15);',
        position: function(point, params, dom, rect, size) {
          // 固定在鼠标右侧显示，保持一定距离
          return [point[0] + 20, point[1] - 30];
        },
        formatter: function(params) {
          const value = params.value;
          const indicators = ['准确性', '检索质量', '相似性', '响应速度', 'G-Eval', '长度'];
          let result = `<div style="font-weight:bold;margin-bottom:5px;">${params.name}</div>`;
          
          for (let i = 0; i < value.length; i++) {
            const val = (value[i] * 100).toFixed(0);
            result += `${indicators[i]}: <span style="float:right;font-weight:bold;">${val}%</span><br/>`;
          }
          
          return result;
        }
      },
      legend: {
        data: ['Original', 'Before RAG', 'After RAG'],
        bottom: '5px',
        selectedMode: 'multiple',
        textStyle: {
          fontSize: 12,
          color: '#555'
        },
        orient: 'horizontal',
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 15,
        padding: [5, 10],
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 4
      },
      radar: {
        shape: 'polygon',
        indicator: [
          { name: 'Accuracy', max: 1 },
          { name: 'Retrieval', max: 1 },
          { name: 'Similarity', max: 1 },
          { name: 'Latency', max: 1 },
          { name: 'G-Eval', max: 1 },
          { name: 'Length', max: 1 }
        ],
        radius: '62%',
        center: ['50%', '46%'],
        splitNumber: 4,
        nameGap: 8,
        axisName: {
          fontSize: 13,
          color: '#444',
          padding: [2, 2],
          formatter: function(value, indicator) {
            if (value === 'Accuracy') {
              return '{a|' + value + '}';
            }
            if (value === 'Cost') {
              return '{b|' + value + '}';
            }
            
            // 保证长文本在移动设备上能正常显示
            if (window.innerWidth < 768 && value.length > 7) {
              return value.substring(0, 6) + '...';
            }
            return value;
          },
          rich: {
            a: {
              padding: [8, 0, 0, 0]  // 为Accuracy添加顶部内边距
            },
            b: {
              padding: [0, 0, 3, 0]  // 为Cost添加底部内边距
            }
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(0, 0, 0, 0.25)',
            width: 1.2
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 0, 0, 0.15)',
            width: 1
          }
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(255, 255, 255, 0.3)', 'rgba(245, 245, 245, 0.5)']
          }
        }
      },
      series: [
        {
          type: 'radar',
          emphasis: {
            lineStyle: {
              width: 3
            }
          },
          data: [
            {
              value: normalizedData.original[dataIndex],
              name: 'Original',
              symbolSize: 5,
              symbol: 'circle',
              lineStyle: {
                width: 2
              },
              areaStyle: {
                opacity: 0.35
              }
            },
            {
              value: normalizedData.before[dataIndex],
              name: 'Before RAG',
              symbolSize: 5,
              symbol: 'circle',
              lineStyle: {
                width: 2
              },
              areaStyle: {
                opacity: 0.35
              }
            },
            {
              value: normalizedData.after[dataIndex],
              name: 'After RAG',
              symbolSize: 5,
              symbol: 'circle',
              lineStyle: {
                width: 2
              },
              areaStyle: {
                opacity: 0.35
              }
            }
          ]
        }
      ]
    };

    chart.setOption(option);
    
    // 添加resize事件
    window.addEventListener('resize', () => chart && chart.resize());
  });

  return charts;
}

// 使用评估结果更新第一个图表
function updateCharts(evaluations) {
  if (!chartRefs.value[0] || !evaluations) return;
  
  const chart = echarts.getInstanceByDom(chartRefs.value[0]);
  if (!chart) return;
  
  const answerData = normalizeEvaluationData(evaluations.answer);
  const ragData = normalizeEvaluationData(evaluations.rag);
  const rag2Data = normalizeEvaluationData(evaluations.rag2);
  
  const option = {
    series: [
      {
        type: 'radar',
        data: [
          {
            value: answerData,
            name: 'Original',
            symbolSize: 5,
            symbol: 'circle',
            lineStyle: {
              width: 2
            },
            areaStyle: {
              opacity: 0.35
            }
          },
          {
            value: ragData,
            name: 'Before RAG',
            symbolSize: 5,
            symbol: 'circle',
            lineStyle: {
              width: 2
            },
            areaStyle: {
              opacity: 0.35
            }
          },
          {
            value: rag2Data,
            name: 'After RAG',
            symbolSize: 5,
            symbol: 'circle',
            lineStyle: {
              width: 2
            },
            areaStyle: {
              opacity: 0.35
            }
          }
        ]
      }
    ]
  };
  
  chart.setOption(option);
}

let charts = [];

onMounted(() => {
  // 等待DOM更新后初始化图表
  setTimeout(() => {
    charts = initCharts();
  }, 0);
});

watch(() => props.type, () => {
  // 当类型改变时重新初始化图表
  setTimeout(() => {
    charts = initCharts();
  }, 0);
});

// 监听选中的问题变化
watch(() => props.selectedQuestion, (newQuestion) => {
  if (newQuestion) {
    // 当有新问题选中时，更新第一个问题的名称
    if (questions.value.length > 0) {
      questions.value[0].name = newQuestion.question || newQuestion.text || 'Performance Analysis';
    }
    
    // 执行测试和评估
    runTest(newQuestion);
  }
});

onUnmounted(() => {
  // 清理图表资源
  charts.forEach(chart => chart && chart.dispose());
  charts = [];
});
</script>

<style scoped>
.radar-chart-grid {
  width: 100%;
  height: 100%;
  overflow: auto;
  scrollbar-width: none; /* Firefox隐藏滚动条 */
  position: relative;
  padding: 0;
  margin: 0;
  background-color: white;
}

.radar-chart-grid::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none; /* Webkit浏览器隐藏滚动条 */
}

.radar-charts-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 5px;
  width: 100%;
  height: 100%;
  background-color: white;
}

.radar-chart-item {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 4px;
  padding: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 240px;
  height: 100%;
}

.chart-container {
  flex: 1;
  min-height: 240px;
  width: 100%;
  height: 100%;
}

.chart-title {
  display: none;
}

:deep(.echarts-tooltip) {
  z-index: 10000 !important;
  pointer-events: none;
  font-size: 13px !important;
}

:global(.echarts-tooltip) {
  background-color: rgba(255, 255, 255, 0.95) !important;
  border-radius: 4px !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1) !important;
  padding: 12px !important;
  border: 1px solid #eee !important;
  font-size: 13px !important;
}

@media (max-width: 1200px) {
  .radar-charts-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .radar-charts-container {
    grid-template-columns: 1fr;
  }
}
</style> 