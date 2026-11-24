import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { getProjectJSONDataServer } from '@/api/allRequest/calculationAPI.js';
import { useCalculateScriptTree } from '@/composables/CalculateMng/useCalculateScriptTree.js';

export const useScriptGlobalSearch = ({ t }) => {
  const scriptEditorStore = useScriptEditorStore();
  const { addScriptEditorList, setVisible } = scriptEditorStore;
  const { setTrees } = useCalculateScriptTree({ t, scriptEditorStore });

  const handleLeaveForScriptEditor = async (scriptData) => {
    await setTrees();
    const { context } = await getProjectJSONDataServer({
      type: scriptData.type,
      scriptId: scriptData.GUID,
    });
    const editorData = {
      ...scriptData.originalData,
      id: scriptData.GUID,
      name: scriptData.originalData.name,
      code: context,
      JSONname: 'periods.json',
      fileType: scriptData.type,
      save: true,
      isHover: true,
      group: scriptData.scriptPath,
    };
    switch (scriptData.type) {
      case 'periods':
        editorData.JSONname = 'periods.json';
        break;
      case 'dataChanges':
        editorData.JSONname = 'dataChanges.json';
        editorData.headerForm = { ...scriptData.originalData };
        break;
      case 'conditions':
        editorData.JSONname = 'conditions.json';
        editorData.cssVars = { '--header-height': '150px', '--ace-height': '490px' };
        editorData.headerForm = { ...scriptData.originalData };
        editorData.treeHeader = {
          interval: scriptData.originalData.interval,
          unit: scriptData.originalData.unit,
        };
        editorData.tabsList = [
          {
            name: t('occurshen'),
            id: 'in',
            code: context.in,
            save: true,
            isHover: true,
            cycleValue: '',
            cycleSelect: '',
          },
          {
            name: t('existsWhen'),
            id: 'exist',
            code: context.exist,
            save: true,
            isHover: true,
            cycleValue: '',
            cycleSelect: '',
          },
          {
            name: t('overWhen'),
            id: 'out',
            code: context.out,
            save: true,
            isHover: true,
            cycleValue: '',
            cycleSelect: '',
          },
        ];
        break;
      case 'functions':
        editorData.JSONname = 'selfdefinefunc_script.json';
        editorData.name = scriptData.originalData.expression;
        break;
      case 'APIs':
        editorData.JSONname = 'RESTfulAPI.json';
        editorData.name = `${scriptData.originalData.name}(InParam,OutParam,RequestID,Token)`;
        break;
      default:
        break;
    }
    addScriptEditorList(editorData);
    setVisible(true);
  };
  return {
    handleLeaveForScriptEditor,
  };
};
