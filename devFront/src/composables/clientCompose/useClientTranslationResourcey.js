import { getImportParams, fileChangeHandleTranslate } from '@/utils/commonUtils.js';
import { importTranslateSourceServer, saveProjectDataServer, translateDecrypt } from '@/api/allRequest/clientAPI.js';
import { exportTableToExcel } from '@/utils/importExportUtils.js';
import { getDateName } from '@/utils/dayjsUtil.js';
import { ElMessage } from 'element-plus';
import { useConfirm } from '@/composables/useConfirm.js';

export const useClientTranslationResourcey = ({ t, clientMenuStore, types }) => {
  const { getCustomeLangguageFile, getUserSourceFile } = clientMenuStore;
  //当前编辑状态
  const editingCell = ref({ rowIndex: null, field: null });
  const tableData = ref([]);
  const resouresNameData = ref([]);
  // 复选框选中行
  const selectRows = ref([]);
  const uploadRef = useTemplateRef('uploadRef');
  const languageNameOptions = computed(() => {
    return [
      {
        value: 'Chinese',
        label: '中文(简体,中国)',
        languageId: '1',
      },
      {
        value: 'English',
        label: 'English(United Kingdom)',
        languageId: '2',
      },
      {
        value: 'Danish',
        label: 'Dansk(Danmark)',
        languageId: '3',
      },
      {
        value: 'German',
        label: 'Deutsch(Deutschland)',
        languageId: '4',
      },
      {
        value: 'Greek',
        label: 'Ελληνικά(Ελλάδα)',
        languageId: '5',
      },
      {
        value: 'English',
        label: 'English(United States)',
        languageId: '6',
      },
      {
        value: 'Finnish',
        label: 'Suomi(Suomi)',
        languageId: '7',
      },
      {
        value: 'French',
        label: 'Français(France)',
        languageId: '8',
      },
      {
        value: 'Hungarian',
        label: 'Magyar(Magyarország)',
        languageId: '9',
      },
      {
        value: 'Icelandic',
        label: 'Íslenska(Ísland)',
        languageId: '10',
      },
      {
        value: 'Italian',
        label: 'Italiano(Italia)',
        languageId: '11',
      },
      {
        value: 'Japanese',
        label: '日本語(日本)',
        languageId: '12',
      },
      {
        value: 'Korean',
        label: '한국어(대한민국)',
        languageId: '13',
      },
      {
        value: 'Dutch',
        label: 'Nederlands(Nederland)',
        languageId: '14',
      },
      {
        value: 'Polish',
        label: 'Polski(Polska)',
        languageId: '15',
      },
      {
        value: 'Portuguese',
        label: 'Português(Brasil)',
        languageId: '16',
      },
      {
        value: 'Russian',
        label: 'Русский(Россия)',
        languageId: '17',
      },
      {
        value: 'Croatian',
        label: 'Hrvatski(Hrvatska)',
        languageId: '18',
      },
      {
        value: 'Swedish',
        label: 'Svenska(Sverige)',
        languageId: '19',
      },
      {
        value: 'Thai',
        label: 'ไทย(ประเทศไทย)',
        languageId: '20',
      },
      {
        value: 'Turkish',
        label: 'Türkçe(Türkiye)',
        languageId: '21',
      },
      {
        value: 'Urdu',
        label: 'اردو(پاکستان)',
        languageId: '22',
      },
      {
        value: 'Indonesian',
        label: 'Bahasa Indonesia(Indonesia)',
        languageId: '23',
      },
      {
        value: 'Belarusian',
        label: 'Беларуская(Беларусь)',
        languageId: '24',
      },
      {
        value: 'Slovenian',
        label: 'Slovenščina(Slovenija)',
        languageId: '25',
      },
      {
        value: 'Slovenian',
        label: 'Slovenščina(Slovenija)',
        languageId: '26',
      },
      {
        value: 'Lithuanian',
        label: 'Lietuvių(Lietuva)',
        languageId: '27',
      },
      {
        value: 'Vietnamese',
        label: 'Tiếng Việt(Việt Nam)',
        languageId: '28',
      },
      {
        value: 'Upper Sorbian',
        label: 'Hornjoserbšćina(Deutschland)',
        languageId: '29',
      },
      {
        value: 'Hindi',
        label: 'हिन्दी(भारत)',
        languageId: '30',
      },
      {
        value: 'Malay',
        label: 'Bahasa Melayu(Malaysia)',
        languageId: '31',
      },
      {
        value: 'Malay',
        label: 'Bahasa Melayu(Malaysia)',
        languageId: '32',
      },
      {
        value: 'Kyrgyz',
        label: 'Кыргызча(Кыргызстан)',
        languageId: '33',
      },
      {
        value: 'Bengali',
        label: 'বাংলা(ভারত)',
        languageId: '34',
      },
      {
        value: 'Gujarati',
        label: 'ગુજરાતી(ભારત)',
        languageId: '35',
      },
      {
        value: 'Odia',
        label: 'ଓଡିଆ(ଭାରତ)',
        languageId: '36',
      },
      {
        value: 'Sanskrit',
        label: 'संस्कृतम्(भारत)',
        languageId: '37',
      },
      {
        value: 'Mongolian',
        label: 'Монгол(Монгол)',
        languageId: '38',
      },
      {
        value: 'Tibetan',
        label: 'བོད་ཡིག(中国)',
        languageId: '39',
      },
      {
        value: 'Welsh',
        label: 'Cymraeg(United Kingdom)',
        languageId: '40',
      },
      {
        value: 'Syriac',
        label: 'ܣܘܪܝܝܐ(ܣܘܪܝܐ)',
        languageId: '41',
      },
      {
        value: 'Filipino',
        label: 'Filipino(Pilipinas)',
        languageId: '42',
      },
      {
        value: 'Bashkir',
        label: 'Башҡортса(Россия)',
        languageId: '43',
      },
      {
        value: 'Yi',
        label: 'ꆈꌠꉙ(中国)',
        languageId: '44',
      },
      {
        value: 'Uyghur',
        label: 'ئۇيغۇرچە(جۇڭگو)',
        languageId: '45',
      },
      {
        value: 'Maori',
        label: 'Māori(Aotearoa)',
        languageId: '46',
      },
      {
        value: 'Alsatian',
        label: 'Elsässerditsch(France)',
        languageId: '47',
      },
      {
        value: 'Yakut',
        label: 'Саха(Россия)',
        languageId: '48',
      },
      {
        value: 'Arabic',
        label: 'العربية(العراق)',
        languageId: '49',
      },
      {
        value: 'Arabic',
        label: 'العربية(المملكة العربية السعودية)',
        languageId: '50',
      },
      {
        value: 'German',
        label: 'Deutsch(Schweiz)',
        languageId: '51',
      },
      {
        value: 'Chinese',
        label: '中文(中國臺灣省)',
        languageId: '52',
      },
      {
        value: 'Spanish',
        label: 'Español(México)',
        languageId: '53',
      },
      {
        value: 'French',
        label: 'Français(Belgique)',
        languageId: '54',
      },
      {
        value: 'Italian',
        label: 'Italiano(Svizzera)',
        languageId: '55',
      },
      {
        value: 'Dutch',
        label: 'Nederlands(België)',
        languageId: '56',
      },
      {
        value: 'Portuguese',
        label: 'Português(Portugal)',
        languageId: '57',
      },
      {
        value: 'Swedish',
        label: 'Svenska(Suomi)',
        languageId: '58',
      },
      {
        value: 'Mongolian',
        label: 'ᠮᠣᠩᠭᠣᠯ(中国)',
        languageId: '59',
      },
      {
        value: 'Arabic',
        label: 'العربية(مصر)',
        languageId: '60',
      },
      {
        value: 'Chinese',
        label: '中文(中國香港特別行政區)',
        languageId: '61',
      },
      {
        value: 'German',
        label: 'Deutsch(Österreich)',
        languageId: '62',
      },
      {
        value: 'English',
        label: 'English(Australia)',
        languageId: '63',
      },
      {
        value: 'French',
        label: 'Français(Canada)',
        languageId: '64',
      },
      {
        value: 'Chinese',
        label: '中文(新加坡)',
        languageId: '65',
      },
      {
        value: 'Chinese',
        label: '中文(中國澳門特別行政區)',
        languageId: '66',
      },
      {
        value: 'French',
        label: 'Français(Monaco)',
        languageId: '67',
      },
      {
        value: 'Spanish',
        label: 'Español(Colombia)',
        languageId: '68',
      },
      {
        value: 'Spanish',
        label: 'Español(Argentina)',
        languageId: '69',
      },
      {
        value: 'English',
        label: 'English(India)',
        languageId: '70',
      },
    ];
  });

  const tableColumns = computed(() => {
    return [
      {
        label: t('originString'),
        props: 'name',
      },
      ...resouresNameData.value.map((col) => {
        return {
          ...col,
          label: `${col.customeLanguage}(${getByIdToLable(col.languageId)})`,
          props: col.languageId,
        };
      }),
    ];
  });

  const getByIdToLable = (id) => {
    return languageNameOptions.value.find((item) => item.languageId === id)?.label;
  };
  const getTableData = async () => {
    const userSourceList = await getUserSourceFile();
    if (!userSourceList) {
      return;
    }
    const customLanguageList = await getCustomeLangguageFile();
    if (!customLanguageList) {
      return;
    }
    const { languageArray, translateArray } = customLanguageList;
    resouresNameData.value = languageArray;

    translateArray.forEach((element) => {
      const { languageId, tranlateArray } = element;
      const tranlateNameMap = new Map(tranlateArray.map((item) => [item.name, item.translate]));
      userSourceList.forEach((item, index) => {
        const translate = tranlateNameMap.get(item.name);
        if (translate) {
          userSourceList[index][languageId] = translate;
        } else {
          userSourceList[index][languageId] = '';
        }
      });
    });
    // 去重
    tableData.value = [...new Map(userSourceList.map((item) => [item.name, item])).values()];
  };
  // 复选框选中的行的数据改变
  const handleSelectionChange = (val) => {
    selectRows.value = val;
  };
  // 导入
  const fileChangeFun = async (file, type) => {
    const params = {
      name: file.name,
      size: file.size,
      type: file.raw.type,
      message: await fileInfo(file),
    };
    let importData;
    const decryptData = await translateDecrypt(params);
    if (decryptData.data) {
      importData = getdecryptImportParams(decryptData.data, tableColumns.value);
    } else {
      importData = await fileChangeHandleTranslate(file, tableColumns.value);
    }
    const translateArray = getImportParams(importData);
    const { errorCode } = await importTranslateSourceServer({ translateArray, type });
    if (errorCode === 0) {
      ElMessage.success(t('importSuccess'));
    }
    await getTableData();
    uploadRef.value?.clearFiles();
  };
  // 加密文件信息
  const fileInfo = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file.raw);
      reader.onload = function (event) {
        const base64Data = event.target.result;
        resolve(base64Data);
      };
    });
  };
  const getdecryptImportParams = (data, columns) => {
    const result = data.map((row) => {
      return columns.reduce((obj, col) => {
        const key = col.props || col.languageId;
        obj[key] = row[col.label] || '';
        return obj;
      }, {});
    });
    return result;
  };
  //导出
  const exportHandle = async () => {
    await exportTableToExcel({
      tableData: selectRows.value,
      tableColumn: tableColumns,
      filename: `${t('translateResource', { dateName: getDateName() })}.xlsx`,
    });
  };

  //导出全部
  const allExportHandle = async () => {
    await exportTableToExcel({
      tableData: tableData.value.filter((row) => types.includes(row.type)),
      tableColumn: tableColumns,
      filename: `${t('translateResource', { dateName: getDateName() })}.xlsx`,
    });
  };
  //开始编辑
  const startEditing = (rowIndex, field) => {
    editingCell.value = { rowIndex, field };
  };
  //停止编辑
  const stopEditing = async (row, languageId) => {
    //编辑资源
    if (row.name) {
      const { guid: projectId } = clientMenuStore.currentClientEngineer;
      const paramData = {
        languageId: languageId,
        type: 'edit',
        tranlateArray: {
          name: row.name,
          translate: row[languageId],
        },
      };
      const type = 20;
      const name = 'customelangguage';
      const restful = await saveProjectDataServer({ name, paramData, projectId, type });
      if (restful && restful.errorCode === 0) {
        ElMessage.success(t('editSuccess'));
        await getTableData();
      }
    }
    editingCell.value = ref({ rowIndex: null, field: null });
  };
  //是否正在编辑
  const isEditing = (rowIndex, field) => {
    const current = editingCell.value;
    return (
      current.rowIndex !== null && current.field !== null && current.rowIndex === rowIndex && current.field === field
    );
  };
  //删除
  const handleDelete = async (toDeleteRows) => {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    await useConfirm(`${t(`sureForSelectRow`, { length: toDeleteRows.length })}`, t('sureForDelete'));
    const paramData = toDeleteRows.map((row) => row.name);
    const type = 20;
    const name = 'customelangguage';
    const restful = await saveProjectDataServer({ name, paramData, projectId, type });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
      await getTableData();
    } else {
      ElMessage.error(restful.message);
    }
  };
  // 排序
  const setSort = (tableInstance, props, order) => {
    tableInstance?.setSort(props, order);
  };

  return {
    selectRows,
    uploadRef,
    resouresNameData,
    languageNameOptions,
    tableColumns,
    tableData,
    getTableData,
    handleSelectionChange,
    fileChangeFun,
    exportHandle,
    allExportHandle,
    startEditing,
    stopEditing,
    isEditing,
    handleDelete,
    setSort,
  };
};
