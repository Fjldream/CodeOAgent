import { defineStore } from 'pinia';
import { getRoleListServer } from '@/api/allRequest/rolesAPI.js';

export const useRolesStore = defineStore('rolesStore', () => {
  const roleList = ref([]);

  const getRoleList = async () => {
    const { data } = await getRoleListServer();
    roleList.value = data;
  };

  return {
    roleList,
    getRoleList,
  };
});
