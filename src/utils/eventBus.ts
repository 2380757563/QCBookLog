import { ref } from 'vue';

const events = ref<any[]>([]);

export function useEventBus() {
  const emit = (eventName: string, data: any) => {
    events.value.push({ name: eventName, data, timestamp: Date.now() });
    console.log(`📢 事件发送: ${eventName}`, data);
  };

  const on = (eventName: string, callback: (data: any) => void) => {
    console.log(`📥 事件监听: ${eventName}`);
    return (data: any) => {
      if (data) {
        callback(data);
      }
    };
  };

  const off = (eventName: string, callback: (data: any) => void) => {
    events.value = events.value.filter(e => e.name !== eventName || e.callback !== callback);
  };

  const clear = () => {
    events.value = [];
  };

  return {
    emit,
    on,
    off,
    clear,
    events
  };
}