<script setup>
import { useI18n } from 'vue-i18n';
import { getNowStr } from '@/utils/dayjsUtil.js';
import { regexValidator } from '@/utils/regexRules.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

// 子组件props 定义
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: () => false,
  },

  modifyData: {
    type: Object,
    default: () => {},
  },
});
const { t } = useI18n();
const emits = defineEmits(['update:dialogVisible', 'closeDialog', 'submitPeriodicScript']);

// 1-31 日选项
const monthLoopOptions = createMonthLoopOption();
// 1-12 月选项
const monthOfYearOptions = createMonthOfYeatOption();

// emit事件定义
// 表单控件
const periodicFormRef = useTemplateRef('periodicFormRef');
//表单数据
const periodicFormData = reactive({});

const unitOptions = [
  { value: 'ms', label: t('milliseconds') },
  { value: 's', label: t('sconds') },
  { value: 'min', label: t('minutes') },
  { value: 'hour', label: t('hours') },
];

const loopOptions = [
  { value: 'day', label: t('everyDay') },
  { value: 'week', label: t('everyWeek') },
  { value: 'month', label: t('everyMonth') },
  { value: 'year', label: t('everyYear') },
];

const weekLoopOptions = [
  { value: '1', label: t('monday') },
  { value: '2', label: t('tuesday') },
  { value: '3', label: t('wendnesday') },
  { value: '4', label: t('thursday') },
  { value: '5', label: t('friday') },
  { value: '6', label: t('saturday') },
  { value: '7', label: t('sunday') },
];

function createMonthLoopOption() {
  const options = [];
  for (let i = 0; i < 31; i++) {
    options.push({ value: i + 1 + '', label: t(`perDayTime`, { day: i + 1 }) });
  }
  return options;
}

const monthType2Option = [
  { value: '1', label: t('theFirst') },
  { value: '2', label: t('theSecond') },
  { value: '3', label: t('theThird') },
  { value: '4', label: t('theFourth') },
  { value: '0', label: t('theLastone') },
];

function createMonthOfYeatOption() {
  const options = [];
  for (let i = 0; i < 12; i++) {
    options.push({ value: i + 1 + '', label: t(`monthTime`, { month: i + 1 }) });
  }
  return options;
}

nextTick(() => {
  handleInitCreate();
});

// 大小月options 计算属性
const yearLoopDateOptions = computed(() => {
  const bigMonth = ['1', '3', '5', '7', '8', '10', '12'];
  const options = createMonthLoopOption();
  if (bigMonth.includes(periodicFormData.monthVal)) {
    return options;
  } else {
    if (periodicFormData.dayVal === '31') {
      periodicFormData.dayVal = '30';
    }
    return options.slice(0, -1);
  }
});

const formRules = computed(() => {
  return createPeriodicScriptRules(periodicFormData);
});

/**
 * @function handleConfirm
 * @description 确认按钮弹窗函数
 * @returns null
 */
function handleConfirm() {
  periodicFormRef.value.validate((valid, errorFields) => {
    if (valid) {
      emits('submitPeriodicScript', periodicFormData);
      emits('closeDialog', false);
    }
  });
}

/**
 * @function handleInitCreate
 * @description 打开新建脚本窗口
 * @returns null
 */
function handleInitCreate() {
  if (!props.modifyData.GUID) {
    Object.assign(periodicFormData, {
      name: '',
      createTime: getNowStr(),
      modifyTime: getNowStr(),
      startTime: getNowStr(),
      endTime: '',
      endTimeChose: false,
      periodType: 'interval',
      mode: 'day',
      interval: '1',
      times: '-1',
      unit: 's',
      pattern: 'day',
      triggerTime: '00:00:00',
      week: [], // 循环模式为周
      monthLoopMode: 'type1',
      monthLoopType1: '',
      monthDay: '1',
      yearLoopMode: 'type1',
      monthVal: '',
      dayVal: '',
      seriesNo: '',
      weekVal: '',
      description: '',
    });
  } else {
    Object.assign(periodicFormData, props.modifyData);
    periodicFormData.endTimeChose = !!props.modifyData.endTime;
    switch (props.modifyData.periodType) {
      case 'calendar':
        if (props.modifyData.pattern === 'month') {
          const monthData = props.modifyData.month;
          if (monthData.type === 'type1') {
            periodicFormData.monthLoopType1 = monthData.day;
          } else {
            periodicFormData.seriesNo = monthData.weekIndex;
            periodicFormData.monthDay = monthData.week;
          }
          periodicFormData.monthLoopMode = monthData.type;
        } else if (props.modifyData.pattern === 'year') {
          const yearData = props.modifyData.year;
          if (yearData.type === 'type1') {
            periodicFormData.dayVal = yearData.day;
          } else {
            periodicFormData.seriesNo = yearData.weekIndex;
            periodicFormData.weekVal = yearData.week;
          }
          periodicFormData.monthVal = yearData.month;
          periodicFormData.yearLoopMode = yearData.type;
        }
        break;

      default:
        break;
    }
  }
}

const createPeriodicScriptRules = (formData) => {
  function checkEndTime(rule, value, callback) {
    if (formData.endTimeChose && !formData.endTime) {
      return callback(new Error(t('plsSelectOverTime')));
    }
    callback();
  }

  function checkIntervalTime(rule, value, callback) {
    if (formData.periodType !== 'interval') return callback();
    if (!formData.interval) return callback(new Error(t('plsInputTimeInterval')));
    const reg = /^-?\d+$/;
    if (formData.interval <= 0 || !reg.test(formData.interval))
      return callback(new Error(t('plsInputSuccessTimeInterval')));
    callback();
  }

  function checkExcuteCnt(rule, value, callback) {
    if (formData.periodType !== 'interval') return callback();
    if (!formData.times) return callback(new Error(t('plsInputExecNumber')));
    const reg = /^-?\d+$/;
    if (formData.times < -1 || !reg.test(formData.times)) return callback(new Error(t('plsInputSuccessExecNumber')));
    callback();
  }

  function checkTriggerTime(rule, value, callback) {
    if (formData.triggerMode !== 'calendar') return callback();
    if (!formData.triggerTime) return callback(new Error(t('plsSelectTiggerTime')));
    callback();
  }

  function checkWeekLoop(rule, value, callback) {
    if (formData.triggerMode !== 'calendar') return callback();
    if (formData.mode !== 'week') return callback();
    if (formData.week.length === 0) return callback(new Error(t('plsSelectTiggerCondition')));
    callback();
  }

  return {
    name: [regexValidator('safaText', t('nameRule'))],
    startTime: [{ required: true, message: t('plsSelectScriptBeginTime'), trigger: 'change' }],
    endTime: [{ validator: checkEndTime, trigger: 'change' }],
    createTime: [{ required: true, message: t('plsSelectScriptCreateTime'), trigger: 'change' }],
    modifyTime: [{ required: true, message: t('plsSelectScriptEditTime'), trigger: 'change' }],
    interval: [{ required: true, validator: checkIntervalTime, trigger: 'blur' }],
    unit: [{ required: true, message: t('plsSelectUnit'), trigger: 'blur' }],
    excuteCnt: [{ required: true, validator: checkExcuteCnt, trigger: 'blur' }],
    triggerTime: [{ validator: checkTriggerTime, trigger: 'blur' }],
    week: [{ validator: checkWeekLoop, trigger: 'change' }],
    description: [regexValidator('noXss', t('illegalInput'), false)],
    pattern: [{ required: true, message: t('plsSelectPattern'), trigger: 'blur' }],
  };
};

const handleEndTimeChoseChange = (value) => {
  if (!value) {
    periodicFormData.endTime = '';
  }
};
</script>

<template>
  <CustomDialog
    v-if="dialogVisible"
    :dialog-visible="dialogVisible"
    :title="modifyData.GUID ? t('editPeriodsScript') : t('creqtePeriodsScript')"
    width="860"
    @confirm="handleConfirm"
    @update:dialog-visible="emits('update:dialogVisible', $event)"
  >
    <el-main>
      <el-form ref="periodicFormRef" :model="periodicFormData" :rules="formRules" label-width="auto">
        <el-form-item :label="t('scriptName')" prop="name">
          <el-input v-model="periodicFormData.name"></el-input>
        </el-form-item>
        <el-form-item :label="t('cycle')">
          <div class="period-panel-con">
            <el-row :gutter="20" style="margin-bottom: 10px">
              <el-col :span="12">
                <el-form-item :label="t('start')" prop="startTime">
                  <el-date-picker
                    v-model="periodicFormData.startTime"
                    :placeholder="t('plsSelectBeginTime')"
                    type="datetime"
                  ></el-date-picker>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item prop="endTime">
                  <el-checkbox v-model="periodicFormData.endTimeChose" @change="handleEndTimeChoseChange">
                    <span style="margin-right: 12px">{{ t('over') }}</span>
                    <el-date-picker
                      v-model="periodicFormData.endTime"
                      :disabled="!periodicFormData.endTimeChose"
                      :placeholder="t('plsSelectOverTime')"
                      type="datetime"
                    ></el-date-picker>
                  </el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item :label="t('periodType')">
              <el-radio-group v-model="periodicFormData.periodType">
                <el-radio value="interval">{{ t('fixedCycleTigger') }}</el-radio>
                <el-radio value="calendar">{{ t('calenderCycleTigger') }}</el-radio>
              </el-radio-group>
            </el-form-item>
            <div v-if="periodicFormData.periodType === 'interval'" class="trigger-mode-con">
              <el-row :gutter="20" style="margin-bottom: 18px">
                <el-col :span="12">
                  <el-form-item :label="t('timeInterval')" prop="interval">
                    <el-input v-model="periodicFormData.interval"></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="t('unit')" prop="unit">
                    <el-select v-model="periodicFormData.unit" :placeholder="t('plsSelectUnit')">
                      <el-option
                        v-for="item in unitOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item :label="t('excuteCnt')" prop="excuteCnt">
                    <el-input v-model="periodicFormData.times"></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <span>{{ t('excuteTip') }}</span>
                </el-col>
              </el-row>
            </div>
            <div v-else class="trigger-mode-con">
              <el-row :gutter="20" style="margin-bottom: 18px">
                <el-col :span="12">
                  <el-form-item :label="t('pattern')" prop="pattern">
                    <el-select v-model="periodicFormData.pattern" :placeholder="t('plsSelectUnit')">
                      <el-option
                        v-for="item in loopOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="t('tiggerTime')" prop="triggerTime">
                    <el-time-select
                      v-model="periodicFormData.triggerTime"
                      end="23:59"
                      format="HH:mm:ss"
                      start="00:00"
                      step="00:01"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              <div class="trigger-select-mode">
                <!-- 每周循环模式 -->
                <el-form-item prop="week">
                  <el-checkbox-group v-if="periodicFormData.pattern === 'week'" v-model="periodicFormData.week">
                    <el-checkbox
                      v-for="item in weekLoopOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    ></el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
                <!-- 每月循环模式 -->
                <el-radio-group v-if="periodicFormData.pattern === 'month'" v-model="periodicFormData.monthLoopMode">
                  <el-radio value="type1">
                    <el-select
                      v-model="periodicFormData.monthLoopType1"
                      :disabled="periodicFormData.monthLoopMode !== 'type1'"
                      style="width: 100px"
                    >
                      <el-option
                        v-for="item in monthLoopOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-radio>
                  <el-radio value="type2">
                    <el-select
                      v-model="periodicFormData.seriesNo"
                      :disabled="periodicFormData.monthLoopMode !== 'type2'"
                    >
                      <el-option
                        v-for="item in monthType2Option"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                    <el-select
                      v-model="periodicFormData.monthDay"
                      :disabled="periodicFormData.monthLoopMode !== 'type2'"
                    >
                      <el-option
                        v-for="item in weekLoopOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-radio>
                </el-radio-group>
                <!-- 每年循环模式 -->

                <el-radio-group v-if="periodicFormData.pattern === 'year'" v-model="periodicFormData.yearLoopMode">
                  <el-radio value="type1">
                    <el-select
                      v-model="periodicFormData.monthVal"
                      :disabled="periodicFormData.yearLoopMode !== 'type1'"
                    >
                      <el-option
                        v-for="item in monthOfYearOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                    <el-select v-model="periodicFormData.dayVal" :disabled="periodicFormData.yearLoopMode !== 'type1'">
                      <el-option
                        v-for="item in yearLoopDateOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-radio>
                  <el-radio value="type2">
                    <el-select
                      v-model="periodicFormData.monthVal"
                      :disabled="periodicFormData.yearLoopMode !== 'type2'"
                    >
                      <el-option
                        v-for="item in monthOfYearOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                    <el-select
                      v-model="periodicFormData.seriesNo"
                      :disabled="periodicFormData.yearLoopMode !== 'type2'"
                    >
                      <el-option
                        v-for="item in monthType2Option"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                    <el-select v-model="periodicFormData.weekVal" :disabled="periodicFormData.yearLoopMode !== 'type2'">
                      <el-option
                        v-for="item in weekLoopOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      ></el-option>
                    </el-select>
                  </el-radio>
                </el-radio-group>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('createTime')" prop="createTime">
              <el-input v-model="periodicFormData.createTime" :disabled="true"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('modifyTime')" prop="modifyTime">
              <el-input v-model="periodicFormData.modifyTime" :disabled="true"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="t('description')" prop="description">
          <el-input v-model="periodicFormData.description" type="textarea"></el-input>
        </el-form-item>
      </el-form>
    </el-main>
  </CustomDialog>
</template>

<style lang="scss" scoped>
@mixin dashed-border($color: #d3d3d3, $width: 1px, $dash-length: 18px, $gap-length: 8px) {
  $total-length: $dash-length + $gap-length;
  background:
    linear-gradient(90deg, $color $dash-length, transparent $dash-length #{$total-length}) 0 0 / #{$total-length}
      #{$width} repeat-x,
    linear-gradient(90deg, $color $dash-length, transparent $dash-length #{$total-length}) 0 100% / #{$total-length}
      #{$width} repeat-x,
    linear-gradient(0deg, $color $dash-length, transparent $dash-length #{$total-length}) 0 0 / #{$width}
      #{$total-length} repeat-y,
    linear-gradient(0deg, $color $dash-length, transparent $dash-length #{$total-length}) 100% 0 / #{$width}
      #{$total-length} repeat-y;
}

.el-dialog {
  main {
    :deep(.el-textarea__inner) {
      min-height: 80px !important;
    }

    .period-panel-con {
      width: 100%;
      padding: 20px;
      @include dashed-border();
    }

    .trigger-mode-con {
      width: 100%;
      padding: 15px;
      @include dashed-border();

      .trigger-select-mode {
        height: 60px;

        :deep(.el-checkbox) {
          margin-right: 70px;

          &:nth-child(5) {
            margin-right: 0px;
          }
        }

        :deep(.el-select) {
          margin-right: 8px;
          width: 100px;
        }
      }
    }
  }

  footer {
    display: flex;
    flex-direction: row;
    justify-content: right;

    .el-button {
      border-radius: 0px;
      width: 80px;
    }
  }
}
</style>
