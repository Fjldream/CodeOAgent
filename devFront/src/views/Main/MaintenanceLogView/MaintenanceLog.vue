<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { getFormatDate, getStartAndEndTime } from '@/utils/dayjsUtil';
import { handleMaintenanceLogServer, handleUserSelectionLogServer } from '@/api/allRequest/logAPI';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import { useSystemConfigStore } from '@/stores/systemConfigStore.js';

const { t } = useI18n();

const systemConfigStore = useSystemConfigStore();
// 选择的库名
const dbName = ref('logs_center');
// 表格ref
const tableRef = ref('');
// 当前页码
const currentPage = ref(1);
const sizePage = ref(10);
// 总条数
const totalDataNum = ref(1);
// 过滤条件
const searchFormData = ref({
  dateRange: getStartAndEndTime(),
  contentSearch: '',
  userName: t('allUser'),
  logType: 'opration',
  funcModule: '',
  logLevel: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly', 'fatal', 'trace'],
});
// 日志类型
const changeLogType = { system: t('systemLog'), script: t('scriptLog'), opration: t('operatorLog') };

const selectList = [
  { label: t('leftMenus.clientEngineer'), value: 'client', showPath: 'client' },
  { label: t('leftMenus.dataSourceEngineer'), value: 'datasource', showPath: 'datasource' },
  { label: t('leftMenus.calculationEngineer'), value: 'calculation', showPath: 'calculate' },
  { label: t('leftMenus.alarmEngineer'), value: 'alarm', showPath: 'alarm' },
  { label: t('leftMenus.collectionEngineer'), value: 'collect', showPath: 'collection' },
  { label: t('userManager'), value: 'user', showPath: 'user_manager' },
];
// 日志类型下拉框
const logSelectOptions = computed(() => {
  return [
    { label: t('systemLog'), value: 'system' },
    { label: t('operatorLog'), value: 'opration' },
  ];
});
// 日志等级下拉框
const logLevelOptions = [
  { label: 'error', value: 'error' },
  { label: 'warn', value: 'warn' },
  { label: 'info', value: 'info' },
  { label: 'http', value: 'http' },
  { label: 'verbose', value: 'verbose' },
  { label: 'debug', value: 'debug' },
  { label: 'silly', value: 'silly' },
  { label: 'fatal', value: 'fatal' },
  { label: 'trace', value: 'trace' },
];

// 功能模块下拉框
const funcSelectOptions = computed(() => {
  return selectList.filter((item) => systemConfigStore.mainRoutesConfig.some((row) => item.value.search(row) !== -1));
});
// 日志级别与颜色的映射表
const logLevelColourMap = {
  INFO: 'log-info',
  WARN: 'log-warn',
  ERROR: 'log-error',
  VERBOSE: 'log-verbose',
  DEBUG: 'log-debug',
  SILLY: 'log-silly',
  FATAL: 'log-error',
  TRACE: 'log-debug',
};
// 表格数据
const tableInfoData = ref([]);
const infoTableColumns = computed(() => {
  return [
    {
      label: t('time'),
      props: 'time',
      minWidth: '15%',
    },
    {
      label: t('logLevel'),
      props: 'logLevel',
      minWidth: '15%',
    },
    {
      label: t('logType'),
      props: 'logType',
      minWidth: '15%',
    },
    {
      label: t('operatorM'),
      props: 'operator',
      minWidth: '15%',
    },
    {
      label: t('operatorIP'),
      props: 'operatorIP',
      minWidth: '15%',
    },
    {
      label: t('context'),
      props: 'context',
      minWidth: '35%',
    },
  ];
});

// 选择用户下拉框
const userSelectOptions = ref([]);

nextTick(async () => {
  await initPageData();
});

/**
 * @function initPageData
 * @description 初始化页面数据，下拉框数据
 * @returns null
 */
async function initPageData() {
  handleUserSelectionOptions();
  handleSearchLog(true);
}

/**
 * @function handleUserSelectionOptions
 * @description 初始化下拉框数据
 * @returns null
 */
async function handleUserSelectionOptions() {
  const result = await handleUserSelectionLogServer({
    dbName: dbName.value,
    tableName: 'gateway',
    startTime: getFormatDate(searchFormData.value.dateRange[0]),
    endTime: getFormatDate(searchFormData.value.dateRange[1]),
  });
  let currentUserIsExist = false;
  if (result.errorCode === 0 && result.data) {
    userSelectOptions.value = [];
    const data = result.data.set_user.filter((item) => {
      return item && item !== '无';
    });
    if (data?.length > 0) {
      userSelectOptions.value = data.map((item) => {
        if (!currentUserIsExist) {
          currentUserIsExist = item === searchFormData.value.userName;
        }
        return { label: item, value: item };
      });
    }
    userSelectOptions.value.unshift({ label: t('allUser'), value: t('allUser') });
    if (!currentUserIsExist) {
      searchFormData.value.userName = t('allUser');
    }
  }
}

/**
 * @function handleSearchLog
 * @description 查询函数，第一次查询，页码切换至第一页
 * @param {*} isFirst
 * @returns null
 */
async function handleSearchLog(isFirst = false) {
  if (isFirst) {
    tableRef.value.handleCurrentPage(1);
  }
  if (!searchFormData.value.dateRange[0] || !searchFormData.value.dateRange[1]) {
    return;
  }
  let tableName = 'gateway';
  const isSystem = searchFormData.value.logType === 'system';
  if (isSystem) {
    switch (searchFormData.value.funcModule) {
      case 'client':
        tableName = 'kingclient';
        break;
      case 'datasource':
        tableName = 'kingdbmanager';
        break;
      case 'calculation':
        tableName = 'kingcalcu';
        break;
      case 'alarm':
        tableName = 'kingalarm';
        break;
      case 'collect':
        tableName = 'kingioserver';
        break;
      case 'user':
        tableName = 'kingoauth';
        break;
      case 'role':
        tableName = 'kingoauth';
        break;
      default:
        tableName = 'gateway';
        break;
    }
  }

  const searchData = {
    dbName: dbName.value,
    tableName: tableName,
    startTime: getFormatDate(searchFormData.value.dateRange[0]),
    endTime: getFormatDate(searchFormData.value.dateRange[1]),
    searchContext: searchFormData.value.contentSearch,
    pagingCondition: {
      limit: sizePage.value,
      offset: currentPage.value - 1,
    },
    filterCondition: {
      level: searchFormData.value.logLevel,
      type: [searchFormData.value.logType],
    },
  };
  if (searchFormData.value.userName && searchFormData.value.userName !== t('allUser')) {
    searchData.filterCondition.user = [searchFormData.value.userName];
  }
  const { data, errorCode } = await handleMaintenanceLogServer(searchData);
  tableInfoData.value = [];
  totalDataNum.value = 0;
  if (errorCode === 0) {
    const resultData = [];
    if (data[0]?.count) {
      totalDataNum.value = data[0].count;
    }
    for (let i = 0; i < data.length; i++) {
      resultData.push({
        time: data[i].timestamp,
        logLevel: data[i].level.toUpperCase(),
        logType: changeLogType[data[i].type],
        operator: data[i].user,
        operatorIP: data[i].ip,
        context: isSystem ? data[i].context : data[i].message,
      });
    }
    tableInfoData.value = resultData;
  }
}

/**
 * @function handleCurrentChange
 * @description 改变页码
 * @param {*} val
 * @returns null
 */
async function handleCurrentChange(val) {
  currentPage.value = val;
  await handleSearchLog();
}
/**
 * @function handleSizeChange
 * @description 页面显示条数改变
 * @param {*} val
 * @returns null
 */
async function handleSizeChange(val) {
  sizePage.value = val;
  await handleSearchLog(true);
}
function handleLogTypeChange(logType) {
  if (logType === 'system') {
    searchFormData.value.funcModule = 'client';
  }
}
function defaultTime() {
  const date = new Date();
  return [new Date(date.setHours(0, 0, 0)), new Date(date.setHours(23, 59, 59))];
}
</script>

<template>
  <header>
    <div class="button-icon">
      <CustomIcon name="logEngineer" class="mr-10" />
      <span>{{ t('systemLog') }}</span>
    </div>
    <div class="btn-list-con">
      <el-form>
        <el-form-item :label="t('dateRange')">
          <el-date-picker
            v-model="searchFormData.dateRange"
            value-format="YYYY-MM-DD HH:mm:ss"
            type="datetimerange"
            :default-time="defaultTime()"
            @change="handleUserSelectionOptions()"
          />
        </el-form-item>
        <el-form-item :label="t('logLevel')" class="log-level">
          <el-select
            v-model="searchFormData.logLevel"
            multiple
            collapse-tags
            collapse-tags-tooltip
            :placeholder="t('plsSetlect')"
          >
            <el-option
              v-for="item in logLevelOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('logType')">
          <el-select v-model="searchFormData.logType" :placeholder="t('plsSetlect')" @change="handleLogTypeChange">
            <el-option
              v-for="item in logSelectOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('funcModule')">
          <el-select
            v-model="searchFormData.funcModule"
            :placeholder="t('plsSetlect')"
            :disabled="searchFormData.logType === 'opration'"
          >
            <el-option
              v-for="item in funcSelectOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('operatorM')">
          <el-select
            v-model="searchFormData.userName"
            :placeholder="t('plsSetlect')"
            :disabled="searchFormData.logType === 'system'"
          >
            <el-option
              v-for="item in userSelectOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>

      <div class="search-box">
        <el-input
          v-model="searchFormData.contentSearch"
          :placeholder="t('plsInputKeywordSearch')"
          :suffix-icon="Search"
          class="search-input"
          clearable
        />
        <el-button type="primary" @click="handleSearchLog(true)">
          {{ t('query') }}
        </el-button>
      </div>
    </div>
  </header>
  <CustomStyleTable
    ref="tableRef"
    :tableData="tableInfoData"
    max-height="calc(100vh - 200px)"
    class="layout-card table-custom"
    :totalNum="totalDataNum"
    :paginateValid="false"
    @currentPageChangeHandle="handleCurrentChange"
    @sizeChange="handleSizeChange"
  >
    <el-table-column type="index" :label="t('serialNumber')" align="center" width="55" />
    <el-table-column
      v-for="(row, index) of infoTableColumns"
      :key="index"
      :label="row.label"
      :min-width="row.minWidth"
      :prop="row.props"
      align="center"
      show-overflow-tooltip
    >
      <template v-if="row.props === 'logLevel'" #default="{ row }">
        <span :class="logLevelColourMap[row.logLevel]">{{ row.logLevel }}</span>
      </template>
    </el-table-column>
  </CustomStyleTable>
</template>

<style lang="scss" scoped>
header {
  display: block;
  width: 100%;
  align-items: center;
  .button-icon {
    display: flex;
  }
  span {
    color: #1f2937;
    font-size: 18px;
    padding-right: 8px;
    padding-left: 10px;
    font-weight: 700;
  }
  margin-bottom: 10px;
}

.btn-list-con {
  width: 100%;
  margin-bottom: 20px;
  margin-top: 20px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  .el-form {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .el-form-item {
    margin-right: 12px;
    max-height: 30px;
  }
  .log-level {
    :deep(.el-form-item__content) {
      min-width: 160px;
    }
  }

  :deep(.el-form-item__content) {
    min-width: 120px;
  }
}

.log-info {
  color: green;
}
.log-warn {
  color: #faad14;
}
.log-error {
  color: red;
}
.log-verbose {
  color: blue;
}
.log-debug {
  color: cyan;
}
.log-silly {
  color: grey;
}
::v-deep(.search-box) {
  display: flex;
  min-width: 190px;
  margin-top: 8px;
  height: 30px;
  @media screen and (min-width: 768px) {
    margin-top: 0;
  }
  .search-input {
    width: 170px;
    margin-right: 15px;
  }
}
</style>
