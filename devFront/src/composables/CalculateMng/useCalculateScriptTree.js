import { getProjectJSONSettingsServer, dependanceListServer } from '@/api/allRequest/calculationAPI.js';
import { useBaseTreeKeys } from '@/composables/useBaseTreeKeys.js';

const AsynKSUpdateDatasTips = `let datas=[{TagName:"FlowMeter_A",DataType:10,DataValue:1.66,TimeStamp:"2018-03-22 11:06:39.000",QualityStamp:"Good"}];`;
/**
 * 脚本树
 */
export const useCalculateScriptTree = ({ t, scriptEditorStore }) => {
  const { setScriptTree, setKeyWordList } = scriptEditorStore;
  const { baseTreeKeys } = useBaseTreeKeys({ t });
  const treeData = computed(() => [
    { ...baseTreeKeys.value },
    { id: 80001300, text: t('dataDictionary'), iconCls: 'scriptEditor', children: [] },
    {
      id: 80001600,
      text: t('function'),
      iconCls: 'scriptEditor',
      children: [
        {
          text: 'KingHistorian',
          iconCls: 'scriptEditor',
          type: 'kh',
          children: [
            {
              text: 'KHAddDatas',
              iconCls: 'script',
              desp: t('KHAddDatas'),
              funcbody: 'let ret = await KHAddDatas(dataSourceName , datas , errorCodes)',
              type: 'func',
            },
            {
              text: 'KHQueryRawDatas',
              iconCls: 'script',
              desp: t('KHQueryRawDatas'),
              funcbody:
                'let ret = await KHQueryRawDatas(dataSourceName , tagNames , startTime , endTime , DataVersion , filter , dataQuality , datas)',
              type: 'func',
            },
            {
              text: 'KHQuerySampleDatas1',
              iconCls: 'script',
              desp: t('KHQuerySampleDatas1'),
              funcbody:
                'let ret = await KHQuerySampleDatas1(dataSourceName , tagNames , specificTime,  let samplingMode , datas)',
              type: 'func',
            },
            {
              text: 'KHQuerySampleDatas2',
              iconCls: 'script',
              desp: t('KHQuerySampleDatas2'),
              funcbody:
                'let ret = await KHQuerySampleDatas2 (dataSourceName , tagNames , startTime , endTime,  let samplingMode, let  samplingInterval , calculationMode , datas)',
              type: 'func',
            },
            {
              text: 'KHGetCurrentValue',
              iconCls: 'script',
              desp: t('KHGetCurrentValue'),
              funcbody: 'let ret = await KHGetCurrentValue(dataSourceName , tagNames , datas)',
              type: 'func',
            },
            {
              text: 'AsynKHAddDatas',
              iconCls: 'script',
              desp: t('AsynKHAddDatas'),
              funcbody: 'let ret = AsynKHAddDatas(dataSourceName , datas, callback)',
              type: 'func',
            },
            {
              text: 'AsynKHQueryRawDatas',
              iconCls: 'script',
              desp: t('AsynKHQueryRawDatas'),
              funcbody:
                'let ret = AsynKHQueryRawDatas(dataSourceName , tagNames , startTime , endTime , DataVersion , filter , dataQuality, callback)',
              type: 'func',
            },
            {
              text: 'AsynKHQuerySampleDatas1',
              iconCls: 'script',
              desp: t('AsynKHQuerySampleDatas1'),
              funcbody:
                'let ret = AsynKHQuerySampleDatas1(dataSourceName , tagNames , specificTime , samplingMode, callback)',
              type: 'func',
            },
            {
              text: 'AsynKHQuerySampleDatas2',
              iconCls: 'script',
              desp: t('AsynKHQuerySampleDatas2'),
              funcbody:
                'let ret = AsynKHQuerySampleDatas2 (dataSourceName , tagNames , startTime , endTime , samplingMode , samplingInterval , calculationMode, callback)',
              type: 'func',
            },
          ],
        },
        {
          text: 'KingView',

          iconCls: 'scriptEditor',
          type: 'ks',
          children: [
            {
              text: 'KVQueryDatas',
              iconCls: 'script',
              desp: t('KVQueryDatas'),
              funcbody: 'let ret = await KVQueryDatas(dataSourceName , tagNames , datas)',
              type: 'func',
            },
            {
              text: 'KVUpdateDatas',
              iconCls: 'script',
              desp: `${t('KVUpdateDatas')}${AsynKSUpdateDatasTips}`,
              funcbody: 'let ret = await KVUpdateDatas(dataSourceName , datas , errorCodes)',
              type: 'func',
            },
            {
              text: 'KVQueryHistoryDatas',
              iconCls: 'script',
              desp: t('KVQueryHistoryDatas'),
              funcbody:
                'let ret = await KVQueryHistoryDatas(dataSourceName, tagNames, startTime, endTime, dataVersion, filter, dataQuality,datas)',
              type: 'func',
            },
            {
              text: 'AsynKVQueryDatas',
              iconCls: 'script',
              desp: t('AsynKVQueryDatas'),
              funcbody: 'let ret = AsynKVQueryDatas(dataSourceName,tagNames,callback)',
              type: 'func',
            },
            {
              text: 'AsynKVUpdateDatas',
              iconCls: 'script',
              desp: `${t('AsynKVUpdateDatas')}${AsynKSUpdateDatasTips}`,
              funcbody: 'let ret = AsynKVUpdateDatas(dataSourceName, datas,callback)',
              type: 'func',
            },
            {
              text: 'AsynKVQueryHistoryDatas',
              iconCls: 'script',
              desp: t('AsynKVQueryHistoryDatas'),
              funcbody:
                'let ret = AsynKVQueryHistoryDatas(dataSourceName, tagNames, startTime, endTime, dataVersion, filter, dataQuality, callback)',
              type: 'func',
            },
          ],
        },
        {
          text: 'KingSCADA',

          iconCls: 'scriptEditor',
          type: 'ks',
          children: [
            {
              text: 'KSQueryDatas',
              iconCls: 'script',
              desp: t('KSQueryDatas'),
              funcbody: 'let ret = await KSQueryDatas(dataSourceName, tagNames,datas)',
              type: 'func',
            },
            {
              text: 'KSUpdateDatas',
              iconCls: 'script',
              desp: `${t('KSUpdateDatas')}${AsynKSUpdateDatasTips}`,
              funcbody: 'let ret = await KSUpdateDatas(dataSourceName , datas , errorCodes)',
              type: 'func',
            },
            {
              text: 'KSQueryHistoryDatas',
              iconCls: 'script',
              desp: t('KSQueryHistoryDatas'),
              funcbody:
                'let ret = await KSQueryHistoryDatas(dataSourceName , tagNames , startTime , endTime , dataVersion , filter , dataQuality , datas)',
              type: 'func',
            },
            {
              text: 'AsynKSQueryDatas',
              iconCls: 'script',
              desp: t('AsynKSQueryDatas'),
              funcbody: 'let ret = AsynKSQueryDatas(dataSourceName , tagNames,callback)',
              type: 'func',
            },
            {
              text: 'AsynKSUpdateDatas',
              iconCls: 'script',
              desp: `${t('AsynKSUpdateDatas')}${AsynKSUpdateDatasTips}`,
              funcbody: 'let ret = AsynKSUpdateDatas(dataSourceName , datas,callback)',
              type: 'func',
            },
            {
              text: 'AsynKSQueryHistoryDatas',
              iconCls: 'script',
              desp: t('AsynKSQueryHistoryDatas'),
              funcbody:
                'let ret = AsynKSQueryHistoryDatas(dataSourceName , tagNames , startTime , endTime , dataVersion , filter , dataQuality, callback)',
              type: 'func',
            },
          ],
        },
        {
          text: 'KingIOServer',

          iconCls: 'scriptEditor',
          type: 'kio',
          children: [
            {
              text: 'KIOQueryDatas',
              iconCls: 'script',
              desp: t('KIOQueryDatas'),
              funcbody: 'let ret = await KIOQueryDatas(dataSourceName, tagNames, datas)',
              type: 'func',
            },
            {
              text: 'KIOUpdateDatas',
              iconCls: 'script',
              desp: t('KIOUpdateDatas'),
              funcbody: 'let ret = await KIOUpdateDatas(dataSourceName , dataJson , errorcode)',
              type: 'func',
            },
            {
              text: 'AsynKIOQueryDatas',
              iconCls: 'script',
              desp: t('AsynKIOQueryDatas'),
              funcbody: 'let ret = AsynKIOQueryDatas(dataSourceName , tagNames,callback)',
              type: 'func',
            },
            {
              text: 'AsynKIOUpdateDatas',
              iconCls: 'script',
              desp: t('AsynKIOUpdateDatas'),
              funcbody: 'let ret = AsynKIOUpdateDatas(dataSourceName , dataJson,callback)',
              type: 'func',
            },
          ],
        },
        {
          text: 'SQL',

          iconCls: 'scriptEditor',
          type: 'sql',
          children: [
            {
              text: 'SQLQuery',
              iconCls: 'script',
              desp: t('SQLQuery'),
              funcbody: 'let ret = await SQLQuery(dataSourceName , sqlString , recordSet , timeout);',
              type: 'func',
            },
            {
              text: 'AsynSQLQuery',
              iconCls: 'script',
              desp: t('AsynSQLQuery'),
              funcbody: 'let ret = AsynSQLQuery(dataSourceName , sqlString, callback , timeout);',
              type: 'func',
            },
            {
              text: 'SQLExecute',
              iconCls: 'script',
              desp: t('SQLExecute'),
              funcbody: 'let ret = await SQLExecute(dataSourceName , sqlString , timeout);',
              type: 'func',
            },
            {
              text: 'AsynSQLExecute',
              iconCls: 'script',
              desp: 'AsynSQLExecute',
              funcbody: 'let ret = AsynSQLExecute(dataSourceName , sqlString, callback , timeout);',
              type: 'func',
            },
          ],
        },
        {
          text: 'System',

          iconCls: 'scriptEditor',
          type: 'system',
          children: [
            {
              text: t('logs'),
              iconCls: 'scriptEditor',
              type: 'logfunc',
              children: [
                {
                  text: 'Trace',
                  iconCls: 'script',
                  desp: t('Trace'),
                  funcbody: 'Trace(logInfo)',
                  type: 'func',
                },
              ],
            },
            {
              text: t('files'),
              iconCls: 'scriptEditor',
              type: 'logfunc',
              children: [
                {
                  text: 'isFileExists',
                  iconCls: 'script',
                  desp: t('isFileExists'),
                  funcbody: 'let ret = await isFileExists(filename);',
                  type: 'func',
                },
                {
                  text: 'ReadFile',
                  iconCls: 'script',
                  desp: t('ReadFile'),
                  funcbody: 'let ret = await ReadFile (filename , options , buffer);',
                  type: 'func',
                },
                {
                  text: 'WriteFile',
                  iconCls: 'script',
                  desp: t('WriteFile'),
                  funcbody: 'let ret = await WriteFile (type , filename , data , options);',
                  type: 'func',
                },
                {
                  text: 'AsynIsFileExists',
                  iconCls: 'script',
                  desp: t('AsynIsFileExists'),
                  funcbody: 'let ret = AsynIsFileExists(filename, callback);',
                  type: 'func',
                },
                {
                  text: 'AsynReadFile',
                  iconCls: 'script',
                  desp: t('AsynReadFile'),
                  funcbody: 'let ret = AsynReadFile (filename , options, callback);',
                  type: 'func',
                },
                {
                  text: 'AsynWriteFile',
                  iconCls: 'script',
                  desp: t('AsynWriteFile'),
                  funcbody: 'let ret = AsynWriteFile (type , filename , data , options, callback);',
                  type: 'func',
                },
              ],
            },
            {
              text: t('errorCode'),
              iconCls: 'scriptEditor',
              type: 'errorcode',
              children: [
                {
                  text: 'GetErrorCodeDescription',
                  iconCls: 'script',
                  desp: t('GetErrorCodeDescription'),
                  funcbody: 'let description = GetErrorCodeDescription (errCode)',
                  type: 'func',
                },
              ],
            },
            {
              text: t('eventChange'),
              iconCls: 'scriptEditor',
              type: 'emit',
              children: [
                {
                  text: 'eventEmit',
                  iconCls: 'script',
                  desp: t('eventEmit'),
                  funcbody: 'eventEmit(eventName , eventParam)',
                  type: 'func',
                },
              ],
            },
            {
              text: t('mathFun'),
              iconCls: 'scriptEditor',
              type: 'math',
              children: [
                {
                  text: 'Abs',
                  iconCls: 'script',
                  desp: t('Abs'),
                  funcbody: 'Abs(number)',
                  type: 'func',
                },
                {
                  text: 'ArcCos',
                  iconCls: 'script',
                  desp: t('ArcCos'),
                  funcbody: 'ArcCos(number)',
                  type: 'func',
                },
                {
                  text: 'ArcSin',
                  iconCls: 'script',
                  desp: t('ArcSin'),
                  funcbody: 'ArcSin(number)',
                  type: 'func',
                },
                {
                  text: 'ArcTan',
                  iconCls: 'script',
                  desp: t('ArcTan'),
                  funcbody: 'ArcTan(number)',
                  type: 'func',
                },
                {
                  text: 'Average',
                  iconCls: 'script',
                  desp: t('Average'),
                  funcbody: 'Average(array)',
                  type: 'func',
                },
                {
                  text: 'Cos',
                  iconCls: 'script',
                  desp: t('Cos'),
                  funcbody: 'Cos(number)',
                  type: 'func',
                },
                {
                  text: 'Exp',
                  iconCls: 'script',
                  desp: t('Exp'),
                  funcbody: 'Exp(number)',
                  type: 'func',
                },
                {
                  text: 'LogE',
                  iconCls: 'script',
                  desp: t('LogE'),
                  funcbody: 'LogE(number)',
                  type: 'func',
                },
                {
                  text: 'LogN',
                  iconCls: 'script',
                  desp: t('LogN'),
                  funcbody: 'LogN(number , base)',
                  type: 'func',
                },
                {
                  text: 'PI',
                  iconCls: 'script',
                  desp: t('PI'),
                  funcbody: 'PI()',
                  type: 'func',
                },
                {
                  text: 'Pow',
                  iconCls: 'script',
                  desp: t('Pow'),
                  funcbody: 'Pow(x , y)',
                  type: 'func',
                },
                {
                  text: 'Sgn',
                  iconCls: 'script',
                  desp: t('Sgn'),
                  funcbody: 'Sgn(number)',
                  type: 'func',
                },
                {
                  text: 'Sin',
                  iconCls: 'script',
                  desp: t('Sin'),
                  funcbody: 'Sin(number)',
                  type: 'func',
                },
                {
                  text: 'Sqrt',
                  iconCls: 'script',
                  desp: t('Sqrt'),
                  funcbody: 'Sqrt(number)',
                  type: 'func',
                },
                {
                  text: 'Sum',
                  iconCls: 'script',
                  desp: t('Sum'),
                  funcbody: 'Sum(array)',
                  type: 'func',
                },
                {
                  text: 'Tan',
                  iconCls: 'script',
                  desp: t('Tan'),
                  funcbody: 'Tan(number)',
                  type: 'func',
                },
                {
                  text: 'Trunc',
                  iconCls: 'script',
                  desp: t('Trunc'),
                  funcbody: 'Trunc(number)',
                  type: 'func',
                },
              ],
            },
            {
              text: t('npmText'),
              iconCls: 'scriptEditor',
              type: 'logfunc',
              children: [
                {
                  text: 'LoadDllFile',
                  iconCls: 'script',
                  desp: t('LoadDllFile'),
                  funcbody: 'let ret = LoadDllFile(dllName , handle)',
                  type: 'func',
                },
                {
                  text: 'ExecuteDllFunction',
                  iconCls: 'script',
                  desp: t('ExecuteDllFunction'),
                  funcbody: 'let ret = ExecuteDllFunction(handle , funcName , inputString , resultdatas)',
                  type: 'func',
                },
                {
                  text: 'UnloadDllFile',
                  iconCls: 'script',
                  desp: t('UnloadDllFile'),
                  funcbody: 'let ret = UnloadDllFile(handle)',
                  type: 'func',
                },
              ],
            },
            {
              text: t('requestCalculate'),
              iconCls: 'scriptEditor',
              type: 'logfunc',
              children: [
                {
                  text: 'sendHttpRequestwithToken',
                  iconCls: 'script',
                  desp: t('sendHttpRequestwithToken'),
                  funcbody: 'sendHttpRequestwithToken(token , Url , ScriptName , InParam, callback)',
                  type: 'func',
                },
                {
                  text: 'sendHttpRequestwithUser',
                  iconCls: 'script',
                  desp: t('sendHttpRequestwithUser'),
                  funcbody: 'sendHttpRequestwithUser(user , password , Url , ScriptName , InParam, callback)',
                  type: 'func',
                },
                {
                  text: 'endResponse',
                  iconCls: 'script',
                  desp: t('endResponse'),
                  funcbody: 'endResponse(RequestID)',
                  type: 'func',
                },
                {
                  text: 'AuthorizedEncryption',
                  iconCls: 'script',
                  desp: t('AuthorizedEncryption'),
                  funcbody: 'AuthorizedEncryption(data)',
                  type: 'func',
                },
                {
                  text: 'AuthorizedDecryption',
                  iconCls: 'script',
                  desp: t('AuthorizedDecryption'),
                  funcbody: 'AuthorizedDecryption(data)',
                  type: 'func',
                },
              ],
            },
            {
              text: t('getToken'),
              iconCls: 'scriptEditor',
              type: 'tokenfunc',
              children: [
                {
                  text: 'getTokenbyUser',
                  iconCls: 'script',
                  desp: t('getTokenbyUser'),
                  funcbody: 'let ret = await getTokenbyUser(user , password)',
                  type: 'func',
                },
              ],
            },
            {
              text: t('getUserToken'),
              iconCls: 'scriptEditor',
              type: 'tokenfunc',
              children: [
                {
                  text: 'getUserInfobyToken',
                  iconCls: 'script',
                  desp: t('getUserInfobyToken'),
                  funcbody: 'getUserInfobyToken(validAccessToken , callback);',
                  type: 'func',
                },
              ],
            },
          ],
        },
        {
          id: 80001610,
          text: 'Custom',
          iconCls: 'scriptEditor',
          children: [],
        },
        {
          text: 'Redis',

          iconCls: 'scriptEditor',
          type: 'redis',
          children: [
            {
              text: 'redisExists',
              iconCls: 'script',
              desp: t('redisExists'),
              funcbody: 'let ret = await redisExists(dataSourceName , key);',
              type: 'func',
            },
            {
              text: 'redisGet',
              iconCls: 'script',
              desp: t('redisGet'),
              funcbody: 'let value = await redisGet(dataSourceName , key);',
              type: 'func',
            },
            {
              text: 'redisHget',
              iconCls: 'script',
              desp: t('redisHget'),
              funcbody: 'let value = await redisHget(dataSourceName , key , attribute);',
              type: 'func',
            },
            {
              text: 'redisSet',
              iconCls: 'script',
              desp: t('redisSet'),
              funcbody: 'let ret = await redisSet(dataSourceName , key , value);',
              type: 'func',
            },
            {
              text: 'redisHset',
              iconCls: 'script',
              desp: t('redisHset'),
              funcbody: 'let ret = await redisHset(dataSourceName , key , attribute , value);',
              type: 'func',
            },
            {
              text: 'redisDel',
              iconCls: 'script',
              desp: t('redisDel'),
              funcbody: 'let ret = await redisDel(dataSourceName , key);',
              type: 'func',
            },
            {
              text: 'redisHdel',
              iconCls: 'script',
              desp: t('redisHdel'),
              funcbody: 'let ret = await redisHdel(dataSourceName , key , attribute);',
              type: 'func',
            },
          ],
        },
        {
          text: 'MongoDB',

          iconCls: 'scriptEditor',
          type: 'MongoDB',
          children: [
            {
              text: 'MongoDBQuery',
              iconCls: 'script',
              desp: t('MongoDBQuery'),
              funcbody: 'let ret = await MongoDBQuery (dataSourceName , tableName , whereStr , datas);',
              type: 'func',
            },
            {
              text: 'MongoDBInsertMany',
              iconCls: 'script',
              desp: t('MongoDBInsertMany'),
              funcbody: 'let ret = await MongoDBInsertMany(dataSourceName , tableName , ducment);',
              type: 'func',
            },
            {
              text: 'MongoDBUpdateMany',
              iconCls: 'script',
              desp: t('MongoDBUpdateMany'),
              funcbody: 'let ret = await MongoDBUpdateMany (dataSourceName , tableName , whereStr , updateStr);',
              type: 'func',
            },
            {
              text: 'MongoDBDeleteMany',
              iconCls: 'script',
              desp: t('MongoDBDeleteMany'),
              funcbody: 'let ret = await MongoDBDeleteMany(dataSourceName , tableName , whereStr);',
              type: 'func',
            },
            {
              text: 'AsynMongoDBQuery',
              iconCls: 'script',
              desp: t('AsynMongoDBQuery'),
              funcbody: 'let ret = AsynMongoDBQuery (dataSourceName , tableName , whereStr, callback);',
              type: 'func',
            },
            {
              text: 'AsynMongoDBInsertMany',
              iconCls: 'script',
              desp: t('MongoDBInsertMany'),
              funcbody: 'let ret = AsynMongoDBInsertMany(dataSourceName , tableName , ducment, callback);',
              type: 'func',
            },
            {
              text: 'AsynMongoDBUpdateMany',
              iconCls: 'script',
              desp: t('AsynMongoDBUpdateMany'),
              funcbody: 'let ret = AsynMongoDBUpdateMany (dataSourceName , tableName , whereStr , updateStr,callback);',
              type: 'func',
            },
            {
              text: 'AsynMongoDBDeleteMany',
              iconCls: 'script',
              desp: t('MongoDBDeleteMany'),
              funcbody: 'let ret = AsynMongoDBDeleteMany(dataSourceName , tableName , whereStr, callback);',
              type: 'func',
            },
          ],
        },
        {
          text: 'MQTT',
          iconCls: 'scriptEditor',
          type: 'MQTT',
          children: [
            {
              text: 'MQTTSubscribe',
              iconCls: 'script',
              desp: t('MQTTSubscribe'),
              funcbody: 'let ret = await MQTTSubscribe (dataSourceName , topic , opts, SubscribeCallback);',
              type: 'func',
            },
            {
              text: 'MQTTUnSubscribe',
              iconCls: 'script',
              desp: t('MQTTUnSubscribe'),
              funcbody: 'let ret = await MQTTUnSubscribe(dataSourceName , topic , opts);',
              type: 'func',
            },
            {
              text: 'MQTTPublish',
              iconCls: 'script',
              desp: t('publish'),
              funcbody: 'let ret = await MQTTPublish (dataSourceName , topic , message , opts);',
              type: 'func',
            },
            {
              text: 'AsynMQTTSubscribe',
              iconCls: 'script',
              desp: t('AsynMQTTSubscribe'),
              funcbody: 'let ret = AsynMQTTSubscribe (dataSourceName , topic , opts, callback);',
              type: 'func',
            },
            {
              text: 'AsynMQTTUnSubscribe',
              iconCls: 'script',
              desp: t('MQTTUnSubscribe'),
              funcbody: 'let ret = AsynMQTTUnSubscribe(dataSourceName , topic , opts, callback);',
              type: 'func',
            },
            {
              text: 'AsynMQTTPublish',
              iconCls: 'script',
              desp: t('publish'),
              funcbody: 'let ret = AsynMQTTPublish (dataSourceName , topic , message , opts, callback);',
              type: 'func',
            },
          ],
        },
        {
          text: 'H5Stream',
          iconCls: 'scriptEditor',
          type: 'H5Stream',
          children: [
            {
              text: 'H5StreamSnapshot',
              iconCls: 'script',
              desp: t('H5StreamSnapshot'),
              funcbody: 'let ret = await H5StreamSnapshot (dataSourceName , token , storeFileInfo);',
              type: 'func',
            },
            {
              text: 'H5StreamManualRecordStart',
              iconCls: 'script',
              desp: t('H5StreamManualRecordStart'),
              funcbody: 'let ret = await H5StreamManualRecordStart (dataSourceName , token , storeFileInfo);',
              type: 'func',
            },
            {
              text: 'H5StreamManualRecordStop',
              iconCls: 'script',
              desp: t('H5StreamManualRecordStop'),
              funcbody: 'let ret = await H5StreamManualRecordStop (dataSourceName , token);',
              type: 'func',
            },
            {
              text: 'H5StreamArchive',
              iconCls: 'script',
              desp: t('H5StreamArchive'),
              funcbody:
                'let ret = await H5StreamArchive (dataSourceName , token , start1 , start2 , duration , speed , foreach264 , storeFileInfo);',
              type: 'func',
            },
            {
              text: 'VideoAnalysis',
              iconCls: 'script',
              desp: t('VideoAnalysis'),
              funcbody: 'let ret =  VideoAnalysis(address);',
              type: 'func',
            },
            {
              text: 'AsynH5StreamSnapshot',
              iconCls: 'script',
              desp: t('AsynH5StreamSnapshot'),
              funcbody: 'let ret =  AsynH5StreamSnapshot (dataSourceName , token, callback);',
              type: 'func',
            },
            {
              text: 'AsynH5StreamManualRecordStart',
              iconCls: 'script',
              desp: t('AsynH5StreamManualRecordStart'),
              funcbody: 'let ret =  AsynH5StreamManualRecordStart (dataSourceName , token , callback);',
              type: 'func',
            },
            {
              text: 'AsynH5StreamManualRecordStop',
              iconCls: 'script',
              desp: t('AsynH5StreamManualRecordStop'),
              funcbody: 'let ret =  AsynH5StreamManualRecordStop (dataSourceName , token, callback);',
              type: 'func',
            },
            {
              text: 'AsynH5StreamArchive',
              iconCls: 'script',
              desp: t('AsynH5StreamArchive'),
              funcbody:
                'let ret = AsynH5StreamArchive (dataSourceName , token , start1 , start2 , duration , speed , foreach264, callback);',
              type: 'func',
            },
          ],
        },
      ],
    },
    {
      id: 80001700,
      text: t('scriptRequire'),
      iconCls: 'scriptEditor',
      children: [
        {
          id: 80001710,
          iconCls: 'scriptEditor',
          text: t('ordinaryDependence'),
          children: [
            {
              id: 80001711,
              text: 'JavaScript',
              iconCls: 'scriptEditor',
              type: 'func',
              children: [],
            },
            {
              id: 80001712,
              text: 'Python',
              iconCls: 'scriptEditor',
              type: 'func',
              children: [],
            },
            {
              id: 80001713,
              text: 'C++',
              iconCls: 'scriptEditor',
              type: 'func',
              children: [],
            },
          ],
        },
        {
          id: 80001720,
          iconCls: 'scriptEditor',
          text: t('systemDependence'),
          children: [],
        },
        { id: 80001730, iconCls: 'scriptEditor', text: t('NPMDependence'), children: [] },
      ],
    },
  ]);

  const setTrees = async () => {
    const dicData = await getProjectJSONSettingsServer({
      type: 'globalVars',
      groupId: -1,
    });
    const customFuns = await getProjectJSONSettingsServer({
      type: 'functions',
      groupId: -1,
    });
    const { data: javaScriptDependence } = await dependanceListServer('normal');
    const { data: pythonDependence } = await dependanceListServer('python');
    const { data: npmDependenceData } = await dependanceListServer('npm');
    const systemDependence = npmDependenceData.filter((item) => item.type === 'system');
    const npmDependence = npmDependenceData.filter((item) => item.type === 'user');

    const dicTreeData = treeData.value.find((item) => item.id === 80001300);
    dicTreeData.children = dicData.map((item) => {
      return {
        id: item.id,
        text: item.name,
        iconCls: 'script',
        type: item.type,
        desp: item.description,
        funcbody: `global.${item.name}`,
      };
    });
    const customFuncData = treeData.value
      .find((item) => item.id === 80001600)
      .children.find((item) => item.id === 80001610);
    customFuncData.children = customFuns.map((item) => {
      return {
        id: item.GUID,
        text: item.functionName,
        iconCls: 'script',
        type: 'customFunction',
        desp: item.description,
        funcbody: item.expression,
      };
    });
    // 普通依赖-JavaScript
    const javaScriptDependenceTreeData = treeData.value
      .find((item) => item.id === 80001700)
      .children.find((item) => item.id === 80001710)
      .children.find((item) => item.id === 80001711);
    javaScriptDependenceTreeData.children = javaScriptDependence.map((item) => {
      return {
        text: item.name,
        iconCls: 'script',
        type: 'func',
        desp: item.description,
        funcbody: `const ${item.name} = require('./normal_modules/JS/${item.name}/${item.fileName}');`,
      };
    });
    // 普通依赖-python
    const pythonDependenceTreeData = treeData.value
      .find((item) => item.id === 80001700)
      .children.find((item) => item.id === 80001710)
      .children.find((item) => item.id === 80001712);
    pythonDependenceTreeData.children = pythonDependence.map((item) => {
      return {
        text: item.name,
        iconCls: 'script',
        type: 'func',
        desp: item.description,
        funcbody: `function executePython(InParam){
	const spawn = require('child_process').spawn;
	var process = spawn('python',[execProjectPath + './normal_modules/Python/${item.name}/${item.fileName}',InParam]);

	var chunks = '';
	process.stdout.on('data', data =>{
		console.log('data event');
		chunks += data.toString();
	});
	process.stdout.on('end',() =>{
		console.log('data end');
		try{
			console.log(chunks);
		}catch(e){
			console.log(e);
		}
	});
}
//executePython(var InParam);`,
      };
    });
    // 系统依赖
    const systemDependenceTreeData = treeData.value
      .find((item) => item.id === 80001700)
      .children.find((item) => item.id === 80001720);
    systemDependenceTreeData.children = systemDependence.map((item) => {
      return {
        text: item.name,
        iconCls: 'script',
        type: 'func',
        desp: item.description,
        funcbody: `var fs = require('fs');
var execPath = fs.readFileSync(__dirname + '/Common/project.json', 'utf-8');
execPath = JSON.parse(execPath);
execPath = execPath.execPath;
const ${item.name} = require(execPath + '/node_modules/${item.name}');`,
      };
    });
    // npm依赖
    const npmDependenceTreeData = treeData.value
      .find((item) => item.id === 80001700)
      .children.find((item) => item.id === 80001730);
    npmDependenceTreeData.children = npmDependence.map((item) => {
      return {
        text: item.name,
        iconCls: 'script',
        type: 'func',
        desp: item.description,
        funcbody: `const ${item.name} = require('${item.name}');`,
      };
    });

    setScriptTree(treeData.value);
    addKeyWord();
  };
  const addKeyWord = () => {
    const keywordIds = [80001300, 80001600, 80001700];
    const keyWords = treeData.value.filter((item) => keywordIds.includes(item.id));
    let funcKeyWordList = [];
    for (const keyWordElement of keyWords) {
      const data = keyWordElement.children.reduce((curr, target) => {
        if (!target.children) {
          curr = [...curr, ...extractCurr([target])];
        } else {
          curr = [...curr, ...extractCurr(target.children)];
        }
        return curr;
      }, []);
      funcKeyWordList = [...funcKeyWordList, ...data];
    }
    setKeyWordList(funcKeyWordList);
  };
  return { setTrees };
};

function extractCurr(target) {
  const curr = [];

  function traverse(nodes) {
    if (!nodes) {
      return;
    }
    for (const node of nodes) {
      if (node?.children?.length) {
        traverse(node.children);
      } else {
        curr.push({
          caption: node.text,
          value: node.funcbody,
        });
      }
    }
  }

  traverse(target);
  return curr;
}
