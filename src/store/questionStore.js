import { defineStore } from 'pinia';

export const useQuestionStore = defineStore('question', {
  state: () => ({
    currentQuestion: null,
    currentQuestionId: null,
    relatedChunks: [],
    distances: []
  }),
  actions: {
    setQuestion(question, id) {
      this.currentQuestion = question;
      this.currentQuestionId = id;
    },
    setRelatedChunks(chunks) {
      this.relatedChunks = chunks;
    },
    setDistances(distances) {
      this.distances = distances;
    }
  }
}); 