import CrossTab from '@/utils/CrossTab.js';

export const useCrossTabStore = defineStore('crossTabStore', () => {
  const crossTab = ref();
  const message = ref([]);
  const channelName = ref('app_channel');

  const init = (name = channelName.value) => {
    if (name !== channelName.value || !crossTab.value) {
      crossTab.value = new CrossTab(name);
      crossTab.value.onMessage((msg) => {
        message.value.push(msg);
      });
    }
  };

  const postMessage = (row) => {
    if (!crossTab.value) {
      return;
    }
    crossTab.value.postMessage(row);
  };

  const onMessage = (callback) => {
    if (!crossTab.value) {
      return;
    }
    crossTab.value.onMessage(callback);
  };

  const closeCrossTab = () => {
    if (!crossTab.value) {
      crossTab.value.close();
      crossTab.value = null;
    }
  };
  return {
    init,
    postMessage,
    onMessage,
    closeCrossTab,
  };
});
