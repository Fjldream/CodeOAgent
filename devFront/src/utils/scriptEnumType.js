/**
 * @desc 枚举store中用到的实体信息
 * @auth jinlong.feng
 * @date 2025-07-08
 * @version 1.0.0.1
 */
// 枚举-授权产品ID
export const enum_entity = {
  conditionalevent_script: {
    entityName: 'conditions',
    groupName: 'conditionalevent_script',
  },

  selfdefinefunc_script: {
    entityName: 'functions',
    groupName: 'selfdefinefunc_script',
  },
  dataAccess: {
    entityName: 'dataAccess',
  },
  datachange_script: {
    entityName: 'dataChanges',
    groupName: 'datachange_script',
  },
  global_variable: {
    entityName: 'globalVars',
    groupName: 'global_variable',
  },

  NPMs: {
    entityName: 'NPMs',
  },
  askcalculate_script: {
    entityName: 'APIs',
    groupName: 'askcalculate_script',
  },
  systemScripts: {
    entityName: 'systemScripts',
  },
  period_script: {
    entityName: 'periods',
    groupName: 'period_script',
  },
  normal: {
    entityName: 'normal',
  },
};
