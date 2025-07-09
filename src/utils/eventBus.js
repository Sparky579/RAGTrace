import { ref } from 'vue';

class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * 注册事件监听器
   * @param {String} eventName 事件名称
   * @param {Function} callback 回调函数
   */
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  /**
   * 移除事件监听器
   * @param {String} eventName 事件名称
   * @param {Function} callback 回调函数
   */
  off(eventName, callback) {
    if (!this.events[eventName]) return;
    if (!callback) {
      delete this.events[eventName];
      return;
    }
    this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
  }

  /**
   * 触发事件
   * @param {String} eventName 事件名称
   * @param {any} data 事件数据
   */
  emit(eventName, data) {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach(callback => {
      callback(data);
    });
  }
}

// 创建单例事件总线
const eventBus = new EventBus();
export default eventBus; 