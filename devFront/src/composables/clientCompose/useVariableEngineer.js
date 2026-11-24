import { useI18n } from 'vue-i18n';

export const useVariableEngineer = ({ t }) => {
  const getQuickAddTabColumns = () => {
    return computed(() => {
      return [
        {
          label: t('name'),
          props: 'TagName',
          minWidth: '25%',
        },
        {
          label: t('type'),
          props: 'dataType',
          minWidth: '25%',
        },
        {
          label: t('variableNameDescription'),
          props: 'TagDescription',
          minWidth: '25%',
        },
      ];
    });
  };
  const getFilterOptions = () => {
    return computed(() => {
      return [
        {
          label: t('variableType'),
          value: t('variableType'),
        },
        {
          label: t('variableName'),
          value: t('variableName'),
        },
      ];
    });
  };
  const getTagTypeName = () => {
    return computed(() => {
      return [t('boolTag'), t('numberTag'), t('stringTag')];
    });
  };

  const translateVariableData = (varArr, isedit = false) => {
    return varArr.map((data) => {
      return {
        name: data.name,
        dataType: data.type,
        id: isedit ? data.id : '',
        comment: data.description,
        defaultValue: data.value,
        isMap: data.isMap,
        isSub: true,
        type: data.dataSourceName ? data.dataSourceName : '',
        securityConfig: {},
        writeAndRead: data.writeAndRead,
        dataSourceType: data.dataSourceType,
        projectDataSourceId: data.projectDataSourceId ? data.projectDataSourceId : '',
        basicItem: {
          defaultValue: data.value,
        },
        dataSourceItem: data.dataSourceItem,
        linkType: data.linkType, // 采集/订阅方式
        frequent: data.frequent, //订阅频率
      };
    });
  };

  return {
    getQuickAddTabColumns,
    getFilterOptions,
    getTagTypeName,
    translateVariableData,
  };
};
