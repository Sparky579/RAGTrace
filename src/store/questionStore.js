import { defineStore } from 'pinia';

export const useQuestionStore = defineStore('question', {
  state: () => ({
    currentQuestion: null,
    currentQuestionId: null,
    currentGroundTruth: null,
    relatedChunks: [],
    distances: [],
    allQuestions: [],
    questionDisplayDensity: 0.5,
    topQuestionCount: 50,
    filteredQuestions: [],
    summaryMetrics: [],
    metricsLoaded: false,
    searchQuery: '',
    useRankedSearch: false,
    rankedIds: [],
    isUpdatingFilters: false,
    filterConditions: {
      retrieval_effectiveness: { min: 0, max: 1 },
      retrieval_stability: { min: 0, max: 1 },
      generation_reliability: { min: 0, max: 1 },
      knowledge_reliability: { min: 0, max: 1 }
    }
  }),
  actions: {
    setQuestion(question, id) {
  console.log('==== QuestionStore.setQuestion ====');
  console.log('接收到的问题:', JSON.stringify(question));
  console.log('接收到的ID:', id);
  
  if (this.currentQuestionId === id && this.currentQuestion) return;
  
  const numericId = typeof id === 'string' ? parseInt(id) : id;
  
  // 总是尝试从allQuestions中获取完整数据
  if (numericId && this.allQuestions.length > 0) {
    const foundQuestion = this.allQuestions.find(q => q.id === numericId);
    if (foundQuestion) {
      this.currentQuestion = {
        ...foundQuestion,
        ...question,
        id: numericId,
        text: question.text || foundQuestion.text || foundQuestion.question,
        question: question.text || foundQuestion.text || foundQuestion.question,
        gt: question.gt || foundQuestion.gt,
        answer: question.answer || foundQuestion.answer,
        type: question.type || foundQuestion.type,
        embedding: question.embedding || foundQuestion.embedding,
        metrics: question.metrics || foundQuestion.metrics,
        raw_values: question.raw_values || foundQuestion.raw_values
      };
    } else {
      this.currentQuestion = {
        ...question,
        id: numericId,
        text: question.text || question.question,
        question: question.text || question.question
      };
    }
  } else {
    this.currentQuestion = {
      ...question,
      text: question.text || question.question,
      question: question.text || question.question
    };
  }
  
  this.currentQuestionId = numericId;
},
    setRelatedChunks(chunks) {
      this.relatedChunks = chunks;
    },
    setDistances(distances) {
      this.distances = distances;
    },
    setCurrentGroundTruth(groundTruth) {
      this.currentGroundTruth = groundTruth;
      console.log('已更新全局ground truth:', groundTruth);
    },
    setAllQuestions(questions) {
      if (!questions || !Array.isArray(questions)) return;
      
      this.allQuestions = questions.map((q, index) => ({
        ...q,
        id: q.id || index + 1,
        question: q.text || q.question || `问题${index + 1}`
      }));
      
      this.updateFilteredQuestions();
    },
    setQuestionDisplayDensity(density) {
      const validDensity = Math.max(0.1, Math.min(1, parseFloat(density) || 0.5));
      this.questionDisplayDensity = validDensity;
      
      const count = Math.ceil(this.allQuestions.length * validDensity);
      this.setTopQuestionCount(Math.min(count, 100));
    },
    setTopQuestionCount(count) {
      const validCount = Math.max(10, Math.min(100, parseInt(count) || 50));
      this.topQuestionCount = validCount;
      
      if (this.allQuestions.length > 0) {
        this.questionDisplayDensity = Math.min(1, validCount / this.allQuestions.length);
      }
      
      this.updateFilteredQuestions();
    },
    async loadRankedIds() {
      if (this.rankedIds.length > 0) return this.rankedIds;
      
      try {
        console.log('尝试从API获取排序数据...');
        
        console.log('未获取到API排序数据，使用空数组');
        return [];
      } catch (error) {
        console.error('加载排序数据失败:', error);
        return [];
      }
    },
    async updateFilteredQuestions() {
      await this.loadRankedIds();
      
      let filtered = [...this.allQuestions];
      
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(q => 
          (q.text && q.text.toLowerCase().includes(query)) || 
          (q.question && q.question.toLowerCase().includes(query)) ||
          (q.answer && q.answer.toLowerCase().includes(query))
        );
      }
      
      if (this.filterConditions.type && this.filterConditions.type !== 'all') {
        filtered = filtered.filter(q => q.type === this.filterConditions.type);
      }
      
      if (filtered.length === 0) {
        filtered = [...this.allQuestions];
      }
      
      if (this.useRankedSearch && this.rankedIds.length > 0) {
        let orderedQuestions = [];
        
        for (const id of this.rankedIds) {
          const numericId = typeof id === 'string' ? parseInt(id) : id;
          
          let question = this.allQuestions.find(q => q.id === numericId);
          
          if (!question && typeof numericId === 'number') {
            question = this.allQuestions.find(q => q.id === numericId.toString());
          }
          
          if (question) {
            console.log(`找到ID ${numericId} 的问题`);
            orderedQuestions.push(question);
          } else {
            console.log(`未找到ID ${numericId} 的问题`);
          }
        }
        
        for (const question of this.allQuestions) {
          const qId = question.id;
          const numericQId = typeof qId === 'string' ? parseInt(qId) : qId;
          
          const isInRankedIds = this.rankedIds.some(id => {
            const numericId = typeof id === 'string' ? parseInt(id) : id;
            return numericId === numericQId || numericId === qId || 
                   (typeof numericId === 'number' && numericId.toString() === qId);
          });
          
          if (!isInRankedIds) {
            orderedQuestions.push(question);
          }
        }
        
        filtered = orderedQuestions;
      }
      
      const displayCount = Math.min(filtered.length, this.topQuestionCount);
      this.filteredQuestions = filtered.slice(0, displayCount);
    },
    async applyFilters() {
      if (!this.allQuestions.length || this.isUpdatingFilters) return;
      
      try {
        this.isUpdatingFilters = true;
        
        console.log('应用过滤器 - 排序模式:', this.useRankedSearch, '排序ID数量:', this.rankedIds.length);
        
        const beforeIds = this.filteredQuestions.slice(0, 3).map(q => q.id);
        
        if (this.useRankedSearch && this.rankedIds.length > 0) {
          console.log('使用排序模式 - rankedIds.length:', this.rankedIds.length);
          console.log('第一个排序ID应该是:', this.rankedIds[0]);
          
          let orderedQuestions = [];
          
          // 添加从rankedIds获取的问题
          for (const id of this.rankedIds) {
            const numericId = typeof id === 'string' ? parseInt(id) : id;
            
            let question = this.allQuestions.find(q => {
              const qId = q.id;
              const numericQId = typeof qId === 'string' ? parseInt(qId) : qId;
              return numericId === numericQId || numericId === qId || 
                    (typeof numericId === 'number' && numericId.toString() === qId);
            });
            
            if (question) {
              // console.log(`找到ID ${numericId} 的问题`);
              orderedQuestions.push(question);
            } else {
              // console.log(`未找到ID ${numericId} 的问题`);
            }
          }
          
          console.log('按rankedIds排序后获取的问题数:', orderedQuestions.length);
          if (orderedQuestions.length > 0) {
            console.log('排序后的前3个问题ID:', orderedQuestions.slice(0, 3).map(q => q.id));
          }
          
          // 添加不在rankedIds中的问题
          for (const question of this.allQuestions) {
            const qId = question.id;
            const numericQId = typeof qId === 'string' ? parseInt(qId) : qId;
            
            const isInRankedIds = this.rankedIds.some(id => {
              const numericId = typeof id === 'string' ? parseInt(id) : id;
              return numericId === numericQId || numericId === qId || 
                     (typeof numericId === 'number' && numericId.toString() === qId);
            });
            
            if (!isInRankedIds) {
              orderedQuestions.push(question);
            }
          }
          
          if (this.searchQuery) {
            const searchLower = this.searchQuery.toLowerCase();
            const beforeFilterLength = orderedQuestions.length;
            
            orderedQuestions = orderedQuestions.filter(q => 
              (q.question && q.question.toLowerCase().includes(searchLower)) ||
              (q.text && q.text.toLowerCase().includes(searchLower))
            );
            
            console.log('搜索过滤后的问题数:', orderedQuestions.length, '(过滤前:', beforeFilterLength, ')');
          }
          
          // 应用指标过滤
          const beforeMetricsFilterLength = orderedQuestions.length;
          
          orderedQuestions = orderedQuestions.filter(q => {
            if (!q.metrics) return true;
            
            const retrieval_effectiveness = q.metrics.retrieval_effectiveness ?? 0.5;
            const retrieval_stability = q.metrics.retrieval_stability ?? 0.5;
            const generation_reliability = q.metrics.generation_reliability ?? 0.5;
            const knowledge_reliability = q.metrics.knowledge_reliability ?? 0.5;
            
            return (
              retrieval_effectiveness >= this.filterConditions.retrieval_effectiveness.min &&
              retrieval_effectiveness <= this.filterConditions.retrieval_effectiveness.max &&
              retrieval_stability >= this.filterConditions.retrieval_stability.min &&
              retrieval_stability <= this.filterConditions.retrieval_stability.max &&
              generation_reliability >= this.filterConditions.generation_reliability.min &&
              generation_reliability <= this.filterConditions.generation_reliability.max &&
              knowledge_reliability >= this.filterConditions.knowledge_reliability.min &&
              knowledge_reliability <= this.filterConditions.knowledge_reliability.max
            );
          });
          
          console.log('指标过滤后的问题数:', orderedQuestions.length, '(过滤前:', beforeMetricsFilterLength, ')');
          
          if (orderedQuestions.length === 0 && this.allQuestions.length > 0) {
            console.log('过滤后没有问题，重置为原始排序');
            this.applyQuestionRanking();
            orderedQuestions = [...this.allQuestions];
          }
          
          const displayCount = Math.min(orderedQuestions.length, this.topQuestionCount);
          this.filteredQuestions = orderedQuestions.slice(0, displayCount);
        } else {
          this.applyNormalFilters();
        }
        
        const afterIds = this.filteredQuestions.slice(0, 3).map(q => q.id);
        console.log('应用过滤器后问题ID变化:', {
          '之前': beforeIds,
          '之后': afterIds,
          '变化': !this.isSameArray(beforeIds, afterIds)
        });
      } catch (error) {
        console.error('应用过滤器错误:', error);
      } finally {
        this.isUpdatingFilters = false;
      }
    },
    // 辅助函数，比较两个数组是否包含相同元素（顺序也要相同）
    isSameArray(arr1, arr2) {
      if (!arr1 || !arr2) return false;
      if (arr1.length !== arr2.length) return false;
      
      for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
      }
      
      return true;
    },
    // 添加一个辅助方法，根据rankedIds重新排列问题
    applyQuestionRanking() {
      if (!this.rankedIds.length || !this.allQuestions.length) return;
      
      let orderedQuestions = [];
      
      // 添加从rankedIds获取的问题
      for (const id of this.rankedIds) {
        const numericId = typeof id === 'string' ? parseInt(id) : id;
        
        let question = this.allQuestions.find(q => {
          const qId = q.id;
          const numericQId = typeof qId === 'string' ? parseInt(qId) : qId;
          return numericId === numericQId || numericId === qId || 
                 (typeof numericId === 'number' && numericId.toString() === qId);
        });
        
        if (question) {
          orderedQuestions.push(question);
        }
      }
      
      // 添加不在rankedIds中的问题
      for (const question of this.allQuestions) {
        const qId = question.id;
        const numericQId = typeof qId === 'string' ? parseInt(qId) : qId;
        
        const isInRankedIds = this.rankedIds.some(id => {
          const numericId = typeof id === 'string' ? parseInt(id) : id;
          return numericId === numericQId || numericId === qId || 
                 (typeof numericId === 'number' && numericId.toString() === qId);
        });
        
        if (!isInRankedIds) {
          orderedQuestions.push(question);
        }
      }
      
      if (orderedQuestions.length > 0) {
        this.allQuestions = orderedQuestions;
      }
    },
    async setSearchQuery(query, useRanking = false) {
      this.searchQuery = query;
      
      if (useRanking) {
        console.log('强制启用排序模式', '当前排序ID数:', this.rankedIds.length);
        this.useRankedSearch = true;
        
        // 确保排序ID已加载
        if (this.rankedIds.length === 0) {
          await this.loadRankedIds();
          console.log('延迟加载排序ID - 数量:', this.rankedIds.length, '前5个:', this.rankedIds.slice(0, 5));
        }
      } else {
        console.log('使用普通搜索模式');
        this.useRankedSearch = false;
      }
      
      await this.applyFilters();
    },
    async setFilterConditions(conditions) {
      if (this.isUpdatingFilters) return;
      
      this.filterConditions = {
        ...this.filterConditions,
        ...conditions
      };
      
      setTimeout(async () => {
        await this.applyFilters();
      }, 0);
    },
    async resetFilters() {
      this.searchQuery = '';
      this.filterConditions = {
        retrieval_effectiveness: { min: 0, max: 1 },
        retrieval_stability: { min: 0, max: 1 },
        generation_reliability: { min: 0, max: 1 },
        knowledge_reliability: { min: 0, max: 1 }
      };
      await this.updateFilteredQuestions();
    },
    applyNormalFilters() {
      let filtered = [...this.allQuestions];
      
      if (this.searchQuery) {
        const searchLower = this.searchQuery.toLowerCase();
        filtered = filtered.filter(q => 
          (q.question && q.question.toLowerCase().includes(searchLower)) ||
          (q.text && q.text.toLowerCase().includes(searchLower))
        );
      }
      
      filtered = filtered.filter(q => {
        if (!q.metrics) return true;
        
        const retrieval_effectiveness = q.metrics.retrieval_effectiveness ?? 0.5;
        const retrieval_stability = q.metrics.retrieval_stability ?? 0.5;
        const generation_reliability = q.metrics.generation_reliability ?? 0.5;
        const knowledge_reliability = q.metrics.knowledge_reliability ?? 0.5;
        
        return (
          retrieval_effectiveness >= this.filterConditions.retrieval_effectiveness.min &&
          retrieval_effectiveness <= this.filterConditions.retrieval_effectiveness.max &&
          retrieval_stability >= this.filterConditions.retrieval_stability.min &&
          retrieval_stability <= this.filterConditions.retrieval_stability.max &&
          generation_reliability >= this.filterConditions.generation_reliability.min &&
          generation_reliability <= this.filterConditions.generation_reliability.max &&
          knowledge_reliability >= this.filterConditions.knowledge_reliability.min &&
          knowledge_reliability <= this.filterConditions.knowledge_reliability.max
        );
      });
      
      if (filtered.length === 0) {
        filtered = [...this.allQuestions];
      }
      
      const displayCount = Math.min(filtered.length, this.topQuestionCount);
      this.filteredQuestions = filtered.slice(0, displayCount);
    },
    async loadSummaryMetrics() {
      if (this.metricsLoaded) return this.allQuestions;
      
      try {
        // 确保在加载数据之前已获取过排序ID
        const hasRankedIds = this.rankedIds.length > 0;
        console.log('加载指标数据, 当前是否有排序ID:', hasRankedIds);
        
        try {
          const metricsModule = await import('../statics/summary_metrics.json');
          const metricsData = metricsModule.default || {};
          
          if (metricsData && metricsData.per_item_metrics && metricsData.per_item_metrics.length > 0) {
            const metrics = metricsData.per_item_metrics;
            
            const processedQuestions = metrics.map((item, index) => ({
              id: item.id || index + 1,
              question: item.question || `问题${item.id || index + 1}`,
              metrics: item.metrics || {},
              raw_values: item.raw_values || {}
            }));
            
            this.allQuestions = processedQuestions;
            
            // 如果已有排序ID，则按排序ID重新排列问题
            if (hasRankedIds) {
              console.log('使用现有排序ID重新排列问题');
              this.applyQuestionRanking();
            }
            
            const displayCount = Math.min(this.allQuestions.length, this.topQuestionCount);
            this.filteredQuestions = this.allQuestions.slice(0, displayCount);
            
            this.metricsLoaded = true;
            return this.allQuestions;
          }
        } catch (error) {
          console.error('加载summary_metrics.json失败:', error);
        }
        
        const questionsModule = await import('../statics/result8.json');
        const questions = questionsModule.default || [];
        
        if (questions && questions.length > 0) {
          const processedQuestions = questions.map((q, index) => ({
            ...q,
            id: q.id || index + 1,
            question: q.text || q.question || `问题${index + 1}`,
            metrics: q.metrics || {
              retrieval_effectiveness: Math.random() * 0.5,
              retrieval_stability: Math.random() * 0.5,
              generation_reliability: Math.random() * 0.5,
              knowledge_reliability: Math.random() * 0.5
            }
          }));
          
          this.allQuestions = processedQuestions;
          
          // 如果已有排序ID，则按排序ID重新排列问题
          if (hasRankedIds) {
            console.log('使用现有排序ID重新排列问题');
            this.applyQuestionRanking();
          }
          
          const displayCount = Math.min(this.allQuestions.length, this.topQuestionCount);
          this.filteredQuestions = this.allQuestions.slice(0, displayCount);
          
          this.metricsLoaded = true;
          return this.allQuestions;
        }
        
        return [];
      } catch (error) {
        console.error('加载问题数据失败:', error);
        return [];
      }
    },
    addNewQuestion(questionText) {
      if (!questionText || typeof questionText !== 'string' || questionText.trim() === '') {
        console.warn('尝试添加空的问题文本');
        return;
      }

      const newId = this.allQuestions.length > 0
        ? Math.max(...this.allQuestions.map(q => parseInt(q.id || 0))) + 1
        : 1;

      const newQuestion = {
        id: newId.toString(), // 确保 ID 是字符串，与其他地方保持一致
        question: questionText.trim(),
        text: questionText.trim(), // 保持 question 和 text 一致
        answer: "no answer available", // 临时回答
        gt: "no ground truth available", // 假设没有 ground truth
        type: "user-added", // 标记问题来源
        metrics: { // 提供默认 metrics 结构，避免后续访问出错
          retrieval_effectiveness: 0,
          retrieval_stability: 0,
          generation_reliability: 0,
          knowledge_reliability: 0,
          correctness: 0,
          relevance: 0,
        },
        raw_values: { // 提供默认 raw_values 结构
          retrieval_effectiveness: 0,
          retrieval_stability: 0,
          generation_reliability: 0,
          knowledge_reliability: 0,
          correctness: 0,
          relevance: 0,
        },
        // 可以根据需要添加其他默认字段
      };

      console.log('添加新问题:', JSON.stringify(newQuestion));

      this.allQuestions.push(newQuestion);
      // 添加后立即更新过滤列表，确保新问题可见
      this.updateFilteredQuestions();
      // 可选：清空搜索框或选中新添加的问题
      // this.setSearchQuery('');
      // this.setQuestion(newQuestion, newQuestion.id);
    }
  }
}); 