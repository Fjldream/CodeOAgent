// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
export const assistantState = ref('closed');
// end
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
export const scriptEntry = ref(null);
export const reportEntry = ref(null);
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
export const alarmTermEntry = ref(null);
export const dictionaryEntry = ref(null);
// end
// end
export const sourceEntry = ref(null);
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import { useAlarmMenuStore } from '@/stores/alarmMenuStore.js';
// end
export function useAssistantContext() {
  const route = useRoute(),
    clients = useClientMenuStore(),
    calculations = useCalculationMenuStore(),
    // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    scripts = useScriptEditorStore(),
    collections = useCollectionMenuStore(),
    alarms = useAlarmMenuStore();
  // end
  return computed(() => {
    const name = String(route.name || '');
    if (name.startsWith('calculate-') && calculations.currentCalculateEngineer?.guid) {
      const project = calculations.currentCalculateEngineer;
      if (scripts.editorVisible && !scripts.isMinimized && scriptEntry.value?.projectId === project.guid)
        return scriptEntry.value;
      // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
      const row = calculations.currentCalculateRow;
      if(name==='calculate-global-variable' && (!scripts.editorVisible || scripts.isMinimized) && dictionaryEntry.value?.projectId===project.guid && dictionaryEntry.value.group===String(row?.groupId??'-1')) return dictionaryEntry.value;
// end
      const calcMenu =
        name !== 'calculate-engineer-config' && (!scripts.editorVisible || scripts.isMinimized)
          ? name
          : undefined;
      return {
        kind: 'calculation',
        projectId: project.guid,
        label: project.name,
        ...(calcMenu && { calcMenu }),
        ...(calcMenu && row?.path === calcMenu && row.groupId != null && { group: String(row.groupId) }),
      };
      // end
    }
    if (name.startsWith('client-') && clients.currentClientEngineer?.guid) {
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      const project = clients.currentClientEngineer;
      if (reportEntry.value?.projectId === project.guid) return reportEntry.value;
      // end
      return { kind: 'client', projectId: project.guid, label: project.name };
    }
    // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    if (name.startsWith('collection-') && collections.currentCollectionEngineer?.guid) {
      const project = collections.currentCollectionEngineer;
      return { kind: 'collection', projectId: project.guid, label: '数采 / ' + project.name };
    }
    if (name.startsWith('alarm-') && alarms.currentAlarmEngineer?.guid) {
      const project = alarms.currentAlarmEngineer;
      // modified by jinlong.feng at 2026-11-22 KF报警规则回读
      const term = alarmTermEntry.value;
      if (
        name === 'alarm-data-dictionary' &&
        term?.projectId === project.guid &&
        term.group === alarms.currentAlarmRow?.id
      )
        return term;
      // end
      return { kind: 'alarm', projectId: project.guid, label: '报警 / ' + project.name };
    }
    if (name === 'datasource' && sourceEntry.value) return sourceEntry.value;
    return { kind: 'general', label: '开发中心' };
    // end
  });
}
// end
