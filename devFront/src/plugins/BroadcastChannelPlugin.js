import { useCrossTabStore } from '@/stores/useCrossTabStore.js';

export default {
  install(app, options = {}) {
    const channelName = options.channelName || 'app_channel';

    const crossTabStore = useCrossTabStore();
    crossTabStore.init(channelName);
    app.config.globalProperties.$crossTab = crossTabStore;

    app.provide('crossTab', crossTabStore);
  },
};
