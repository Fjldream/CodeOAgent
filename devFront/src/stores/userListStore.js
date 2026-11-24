import { defineStore } from 'pinia';
import { getUserListServer } from '@/api/allRequest/userManagerApi.js';
import { useLangStore } from '@/stores/langStore.js';

export const useUserListStore = defineStore('userListStore', () => {
  const userList = ref([]);
  const { i18nReactive } = useLangStore();

  const getUserList = async (groupIds) => {
    const { data = [] } = await getUserListServer(groupIds);
    for (let index = 0; index < data.length; index++) {
      if (data[index].userId === 2) {
        data[index].description = i18nReactive('systemAdministrator');
      }
    }
    userList.value = data;
  };

  return {
    userList,
    getUserList,
  };
});
