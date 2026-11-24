import { regexValidator } from '@/utils/regexRules';
export const useCollectionVariables = ({ t }) => {
  const options = reactive({
    AccessType: [
      {
        id: 0,
        text: t('onlyRead'),
        selected: true,
      },
      {
        id: 1,
        text: t('onlyWrite'),
      },
      {
        id: 2,
        text: t('readWrite'),
      },
    ],

    DataConvertType: [
      {
        id: 0,
        text: t('none'),
        selected: true,
        value: 0,
      },
      {
        id: 1,
        text: t('linearConvert'),
        value: 1,
      },
    ],
    ForwardingType: [
      {
        id: 0,
        text: t('notForward'),
        selected: true,
        value: 0,
      },
      {
        id: 1,
        text: t('changeForward'),
        value: 1,
      },
      {
        id: 2,
        text: t('interForward'),
        value: 2,
      },
      {
        id: 4,
        text: t('collectForward'),
        value: 4,
      },
    ],
    storageType: [
      {
        id: 0,
        text: t('notStore'),
        selected: true,
        value: 0,
      },
      {
        id: 1,
        text: t('changeStore'),
        value: 1,
      },
      {
        id: 2,
        text: t('intervalStore'),
        value: 2,
      },
      {
        id: 4,
        text: t('collectStore'),
        value: 4,
      },
    ],
  });

  const defaultForm = {
    tagName: '', // 名称
    description: '', // 描述
    deviceName: '', // 关联设备
    regName: '', // 寄存器名称
    regAddress: '', // 寄存器地址
    regDataType: null, // 寄存器数据类型
    tagDataType: null, // 转换数据类型
    accessType: 2, // 读写类型
    collectTimeInterval: 1000, // 采集频率（ms）
    dataConvertType: 0, // 转换模式
    maxRawValue: 32767, //原始最大值
    minRawValue: -32768, // 原始最小值
    maxValue: 32767, // 工程最大值
    minValue: -32768, // 工程最小值
    deviceId: null, // 设备id
    channelDriver: '',
    deviceSeries: '',
    nonLinearName: '', // 非线性表
    dataConvertCoefficient: 1, // 系数
    dataConvertDeviation: 0, // 偏移
    dataCleaningType: 0, // 清洗模式
    valueRangeType: 0, // 值范围
    dataCleaningUpperLimit: 0, // 清晰最大值
    dataCleaningLowerLimit: 0, // 清洗最小值
    changeRate: 0, // 毛刺边界(%)
    deadbandRate: 0, //死区（%）
    tagType: 2,
    stepSize: 1, // 寄存器步长
    nameStepSize: 1, // 名称步长
    number: 1, // 个数
    uaTrans: 0, //0 不转发 1 转发 OPCUA转发
    daTrans: 0, // OPCDA转发
    mqTrans: 1, // MQTT转发
    mqInter: 1, //mqtt 间隔转发（秒）
    storEnable: 0, // 存储使能
    storMode: 0, // 存储模式
    storCycle: 1, // 存储周期（s）
    spaceTimeName: '', // 时空名称
    spaceTimeTagName: '', // 时空变量名
  };
  //通用正则
  const rules = reactive({
    tagName: [regexValidator('notEmpty', t('rule1Message'))],
    description: [regexValidator('', t('rule2Message'), false)],
    deviceId: [regexValidator('notEmpty', t('rule1Message'))],
    regName: [regexValidator('notEmpty', t('rule1Message'))],
    regAddress: [regexValidator('notEmpty', t('rule1Message'))],
    regDataType: [regexValidator('notEmpty', t('rule1Message'))],
    tagDataType: [regexValidator('notEmpty', t('rule1Message'))],
    accessType: [regexValidator('notEmpty', t('rule1Message'))],
    collectTimeInterval: [regexValidator('number', t('numbersTips'))],
    dataConvertCoefficient: [regexValidator('number', t('numbersTips'))],
    dataConvertDeviation: [regexValidator('number', t('numbersTips'))],
    dataConvertType: [regexValidator('notEmpty', t('rule1Message'))],
  });
  return { options, defaultForm, rules };
};
