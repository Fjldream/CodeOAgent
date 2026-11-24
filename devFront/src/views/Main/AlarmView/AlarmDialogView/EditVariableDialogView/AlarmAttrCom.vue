<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
const { t } = useI18n();
const props = defineProps({
  alarmForm: Object,
});

const form = ref({
  ...props.alarmForm,
});
watch(
  () => props.alarmForm.Type,
  (row) => {
    form.value.Type = row;
  },
);
const formRules = ref({
  LoLoLimit: [regexValidator('number', t('numbersTips'))],
  LoLoString: [regexValidator('', '', false)],
  LoLoPriority: [regexValidator('number', t('numbersTips'))],
  LoLimit: [regexValidator('number', t('numbersTips'))],
  LoString: [regexValidator('', '', false)],
  LoPriority: [regexValidator('number', t('numbersTips'))],
  HiLimit: [regexValidator('number', t('numbersTips'))],
  HiString: [regexValidator('', '', false)],
  HiPriority: [regexValidator('number', t('numbersTips'))],
  HiHiLimit: [regexValidator('number', t('numbersTips'))],
  HiHiString: [regexValidator('', '', false)],
  HiHiPriority: [regexValidator('number', t('numbersTips'))],
  DiscPriority: [regexValidator('number', t('numbersTips'))],
  DiscOffString: [regexValidator('', '', false)],
  DiscOnString: [regexValidator('', '', false)],
  DiscOnToOffString: [regexValidator('', '', false)],
  DiscOffToOnString: [regexValidator('', '', false)],
});

const getForm = () => {
  return form.value;
};
const alarmType = computed(() => {
  if (form.value.Type === 2 || form.value.Type === 3 || form.value.Type === 4) {
    return 'number';
  } else if (form.value.Type === 1) {
    return 'bool';
  } else {
    return 'string';
  }
});
defineExpose({
  getForm,
});
</script>

<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="formRules"
    :label-position="alarmType === 'bool' ? 'left' : 'top'"
    label-width="auto"
  >
    <el-row :gutter="7">
      <el-col :span="24">
        <el-form-item>
          <el-checkbox v-model="form.AlarmEnable" size="small">{{ t('AlarmEnable') }}</el-checkbox>
        </el-form-item>
      </el-col>
    </el-row>
    <!-- 模拟值报警 type 1为离散 2、3、4为模拟-->
    <span v-if="alarmType === 'number'">
      <el-row :gutter="7">
        <el-col :span="24">
          <el-form-item>
            <el-checkbox v-model="form.LimitEnable" :disabled="!form.AlarmEnable" size="small">
              {{ t('LimitEnable') }}
            </el-checkbox>
          </el-form-item>
        </el-col>
        <el-col :span="6" :offset="6">
          <span>{{ t('limitValue') }}</span>
        </el-col>
        <el-col :span="6">
          <span>{{ t('alarmText') }}</span>
        </el-col>
        <el-col :span="6">
          <span>{{ t('priority') }}</span>
        </el-col>
        <el-col :span="3" class="df-col">
          <el-form-item>
            <el-checkbox v-model="form.LoLoEnable" :disabled="!form.LimitEnable || !form.AlarmEnable" size="small">
              {{ t('LowLow') }}
            </el-checkbox>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="LoLoLimit">
            <el-input
              v-model.number="form.LoLoLimit"
              :disabled="!form.LoLoEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="LoLoString">
            <el-input
              v-model="form.LoLoString"
              :disabled="!form.LoLoEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="LoLoPriority">
            <el-input
              v-model.number="form.LoLoPriority"
              :disabled="!form.LoLoEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="3" class="df-col">
          <el-form-item>
            <el-checkbox v-model="form.LoEnable" :disabled="!form.LimitEnable || !form.AlarmEnable" size="small">
              {{ t('Low') }}
            </el-checkbox>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="LoLimit">
            <el-input
              v-model.number="form.LoLimit"
              :disabled="!form.LoEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="LoString">
            <el-input
              v-model="form.LoString"
              :disabled="!form.LoEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="LoPriority">
            <el-input
              v-model.number="form.LoPriority"
              :disabled="!form.LoEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="3">
          <el-form-item>
            <el-checkbox v-model="form.HiEnable" :disabled="!form.LimitEnable || !form.AlarmEnable" size="small">
              {{ t('High') }}
            </el-checkbox>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="HiLimit">
            <el-input
              v-model.number="form.HiLimit"
              :disabled="!form.HiEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="HiString">
            <el-input
              v-model="form.HiString"
              :disabled="!form.HiEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="HiPriority">
            <el-input
              v-model.number="form.HiPriority"
              :disabled="!form.HiEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="3" class="df-col">
          <el-form-item>
            <el-checkbox v-model="form.HiHiEnable" :disabled="!form.LimitEnable || !form.AlarmEnable" size="small">
              {{ t('HighHigh') }}
            </el-checkbox>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="HiHiLimit">
            <el-input
              v-model.number="form.HiHiLimit"
              :disabled="!form.HiHiEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="HiHiString">
            <el-input
              v-model="form.HiHiString"
              :disabled="!form.HiHiEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="7">
          <el-form-item prop="HiHiPriority">
            <el-input
              v-model.number="form.HiHiPriority"
              :disabled="!form.HiHiEnable || !form.LimitEnable || !form.AlarmEnable"
              size="small"
            ></el-input>
          </el-form-item>
        </el-col>
      </el-row>
    </span>
    <!-- 离散值报警 -->
    <div v-else-if="alarmType === 'bool'">
      <el-row :gutter="7">
        <el-col :span="24">
          <el-form-item :label="t('priority')" prop="DiscPriority">
            <el-input v-model.number="form.DiscPriority" :disabled="!form.AlarmEnable" size="small"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item>
            <el-checkbox v-model="form.DiscEnable" :disabled="!form.AlarmEnable" size="small">
              {{ t('DiscEnable') }}
            </el-checkbox>
          </el-form-item>
        </el-col>
        <el-col :span="6" :offset="6">
          <span>{{ t('alarmText') }}</span>
        </el-col>
        <el-col :span="6" :offset="6">
          <span>{{ t('alarmText') }}</span>
        </el-col>
        <el-col :span="24">
          <el-radio-group
            v-model="form.DiscAlarmGenType"
            style="width: 100%; display: block"
            :disabled="!form.DiscEnable || !form.AlarmEnable"
          >
            <el-row :gutter="3">
              <el-col :span="12">
                <el-row>
                  <el-col :span="8">
                    <el-radio :value="0">
                      <span>{{ 'False' }}</span>
                    </el-radio>
                  </el-col>
                  <el-col :span="14" :offset="2">
                    <el-form-item prop="DiscOffString">
                      <el-input
                        v-model="form.DiscOffString"
                        :disabled="!form.DiscEnable || !form.AlarmEnable || form.DiscAlarmGenType !== 0"
                        size="small"
                      ></el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-radio :value="1">
                      <span>{{ 'True' }}</span>
                    </el-radio>
                  </el-col>
                  <el-col :span="14" :offset="2">
                    <el-form-item prop="DiscOnString">
                      <el-input
                        v-model="form.DiscOnString"
                        :disabled="!form.DiscEnable || !form.AlarmEnable || form.DiscAlarmGenType !== 1"
                        size="small"
                      ></el-input>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-col>
              <el-col :span="12">
                <el-row>
                  <el-col :span="6">
                    <el-radio :value="2">
                      <span>{{ t('change') }}</span>
                    </el-radio>
                  </el-col>
                  <el-col :span="8">
                    <span>{{ 'True -> False' }}</span>
                  </el-col>
                  <el-col :span="10">
                    <el-form-item prop="DiscOnToOffString">
                      <el-input
                        v-model="form.DiscOnToOffString"
                        :disabled="!form.DiscEnable || !form.AlarmEnable || form.DiscAlarmGenType !== 2"
                        size="small"
                      ></el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" :offset="6">
                    <span>{{ 'False -> True' }}</span>
                  </el-col>
                  <el-col :span="10">
                    <el-form-item prop="DiscOffToOnString">
                      <el-input
                        v-model="form.DiscOffToOnString"
                        :disabled="!form.DiscEnable || !form.AlarmEnable || form.DiscAlarmGenType !== 2"
                        size="small"
                      ></el-input>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-col>
            </el-row>
          </el-radio-group>
        </el-col>
      </el-row>
    </div>
  </el-form>
</template>

<style lang="scss" scoped>
::v-deep(.el-form-item__content) {
  flex-wrap: nowrap;
}

.df-col {
  display: flex;
  align-items: end;
}
</style>
