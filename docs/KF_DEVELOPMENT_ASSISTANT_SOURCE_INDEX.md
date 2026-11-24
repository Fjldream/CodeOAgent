<!-- modified by jinlong.feng at 2026-11-21 KF开发助手能力盘点 -->
# KF 开发助手源码索引与覆盖统计

由 [audit-kf-assistant-capabilities.mjs](../scripts/audit-kf-assistant-capabilities.mjs) 离线生成。能力分级及下一项开发的验收条件见[客户动作对照表](KF_DEVELOPMENT_ASSISTANT_CAPABILITIES.md)。

## 按客户动作统计

共审阅 **53 组客户动作**。同一行可能覆盖几个同类菜单；一行按一个动作组计数。每格依次列出「实 / 限 / 缺 / 免」的组数。

| 领域 | 动作组 | 操作指导 | 读取配置 | 核验运行 |
| --- | ---: | --- | --- | --- |
| 数采 | 7 | 5 / 0 / 2 / 0 | 2 / 2 / 2 / 1 | 1 / 0 / 3 / 3 |
| 数据源 | 3 | 1 / 1 / 1 / 0 | 0 / 3 / 0 / 0 | 0 / 1 / 2 / 0 |
| 报警 | 4 | 3 / 0 / 1 / 0 | 1 / 2 / 1 / 0 | 1 / 0 / 2 / 1 |
| 计算 | 13 | 12 / 1 / 0 / 0 | 12 / 0 / 0 / 1 | 2 / 11 / 0 / 0 |
| 客户端、原生编辑器与报表 | 17 | 8 / 3 / 6 / 0 | 6 / 6 / 5 / 0 | 0 / 4 / 9 / 4 |
| 跨工程、发布与实例 | 8 | 6 / 1 / 1 / 0 | 0 / 5 / 1 / 2 | 1 / 2 / 0 / 5 |
| 方案起步 | 1 | 1 / 0 / 0 / 0 | 0 / 1 / 0 / 0 | 0 / 0 / 0 / 1 |
| 合计 | 53 | 36 / 6 / 11 / 0 | 21 / 19 / 9 / 4 | 5 / 18 / 16 / 14 |

## 开发中心路由和对应审阅项

从基础路由、异步路由和动态挂载的主容器取得 53 个静态路径键。角色和安装配置共同决定可见菜单。缺少归属的新路由或已删除的路由会使检查失败。

| 路由声明 | 页面组件 | 客户动作或范围 |
| --- | --- | --- |
| [`/ssoLogin`](../devFront/src/router/index.js#L4) | [LoginPageSSO.vue](../devFront/src/views/Login/LoginPageSSO.vue) | 导航与权限 |
| [`/login`](../devFront/src/router/index.js#L10) | [LoginPage.vue](../devFront/src/views/Login/LoginPage.vue) | 导航与权限 |
| [`/`](../devFront/src/router/index.js#L16) | 默认重定向 | 导航与权限 |
| [`system-overview`](../devFront/src/router/asyncRoutes.js#L6) | [SystemOverview.vue](../devFront/src/views/Main/SystemOverView/SystemOverview.vue) | 导航与权限 |
| [`client`](../devFront/src/router/asyncRoutes.js#L13) | [ClientEngineer.vue](../devFront/src/views/Main/ClientView/ClientEngineer.vue) | 根据客户新定义的实时数值指标生成周期性和请求式脚本；从当前工程生成日冻结累计表底差的周期性和请求式脚本；从已保存的二维引用或计算读写追到上游采集点；在同一方案中找已有输入的其他使用者；核对工程已发布的版本及实际部署；查询有权 App 的节点部署标记和进程状态；对照工程配置、数采样本与运行客户端显示；跨标签续聊并确认个人方案变更；选择工程组、核对工程共享和访问来源；导入、导出工程并核对副本完整性；从空入口按输入和交付目标选择工程、查可复用候选 |
| [`client-engineer-config`](../devFront/src/router/asyncRoutes.js#L20) | [ClientEngineerConfig.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientEngineerConfig.vue) | 导航与权限 |
| [`client-page-management`](../devFront/src/router/asyncRoutes.js#L28) | [ClientPageManage.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientPageManageView/ClientPageManage.vue) | 根据客户新定义的实时数值指标生成周期性和请求式脚本；从当前工程生成日冻结累计表底差的周期性和请求式脚本；列出工程页面，打开独立二维编辑页；在二维选区绑定工程变量并核对显示来源；配置报警窗事件源并核对显示事件；配置控件动态属性、用户事件和页面启动脚本；配置趋势图曲线和坐标轴，核对实际显示的趋势；管理页面资源、导入页面或从回收站恢复页面 |
| [`client-data-source-management`](../devFront/src/router/asyncRoutes.js#L34) | [ClientDataSourceManagement.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientDataSourceManagementView/ClientDataSourceManagement.vue) | 核对客户端工程的实时源连接 |
| [`client-report-library`](../devFront/src/router/asyncRoutes.js#L42) | [ClientReportLibrary.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientReportLibraryView/ClientReportLibrary.vue) | 从报表格追到自定义数据集成员、请求脚本及运行显示；解释历史或关系库数据集的绑定与查询结果 |
| [`client-system-script`](../devFront/src/router/asyncRoutes.js#L48) | [ClientSystemScript.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientSystemScriptView/ClientSystemScript.vue) | 编辑客户端系统、定时、数据变化、自定义或热键脚本 |
| [`client-timer-script`](../devFront/src/router/asyncRoutes.js#L54) | [ClientTimerScript.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientTimerScriptView/ClientTimerScript.vue) | 编辑客户端系统、定时、数据变化、自定义或热键脚本 |
| [`client-data-change-script`](../devFront/src/router/asyncRoutes.js#L60) | [ClientDataChangeScript.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientDataChangeScriptView/ClientDataChangeScript.vue) | 编辑客户端系统、定时、数据变化、自定义或热键脚本 |
| [`client-custom-script`](../devFront/src/router/asyncRoutes.js#L68) | [ClientCustomScript.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientCustomScriptView/ClientCustomScript.vue) | 编辑客户端系统、定时、数据变化、自定义或热键脚本 |
| [`client-hotkey-script`](../devFront/src/router/asyncRoutes.js#L74) | [ClientHotkeyScriptView.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/ClientHotkeyScriptView/ClientHotkeyScriptView.vue) | 编辑客户端系统、定时、数据变化、自定义或热键脚本 |
| [`client-graphic-model-library`](../devFront/src/router/asyncRoutes.js#L80) | [GraphicModelLibrary.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/GraphicModelLibraryView/GraphicModelLibrary.vue) | 定义图形模型并在页面复用 |
| [`client-variables-engineer`](../devFront/src/router/asyncRoutes.js#L86) | [VariableEngineer.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/VariableEngineerView/VariableEngineer.vue) | 查客户端已保存变量数、内置数和映射数；快速添加采集点并核对这一条映射 |
| [`client-safe-object`](../devFront/src/router/asyncRoutes.js#L92) | [SafeObject.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/SafeObjectView/SafeObject.vue) | 配置安全对象及其对运行访问的约束 |
| [`client-3d-resource-management`](../devFront/src/router/asyncRoutes.js#L97) | [3dResourceNanagement.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/3dResourceNanagementView/3dResourceNanagement.vue) | 打开 3D 原生编辑器并核对登记场景；核对 3D 模型数据绑定及发布后的表现 |
| [`client-translation-resource`](../devFront/src/router/asyncRoutes.js#L103) | [TranslationResource.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/TranslationResourceView/TranslationResource.vue) | 配置翻译资源或自定义翻译器 |
| [`client-custom-translator`](../devFront/src/router/asyncRoutes.js#L109) | [CustomTranslator.vue](../devFront/src/views/Main/ClientView/ClientEngineerConfigView/CustomTranslatorView/CustomTranslator.vue) | 配置翻译资源或自定义翻译器 |
| [`datasource`](../devFront/src/router/asyncRoutes.js#L117) | [DataSource.vue](../devFront/src/views/Main/DataSourceView/DataSource.vue) | 核对实时数据源类型及上游数采工程；核对事件源与报警工程的关联；配置历史、关系库或网络适配器并测试连接；选择工程组、核对工程共享和访问来源；从空入口按输入和交付目标选择工程、查可复用候选 |
| [`calculate`](../devFront/src/router/asyncRoutes.js#L124) | [CalculateEngineer.vue](../devFront/src/views/Main/CalculateView/CalculateEngineer.vue) | 从已保存的二维引用或计算读写追到上游采集点；在同一方案中找已有输入的其他使用者；核对工程已发布的版本及实际部署；查询有权 App 的节点部署标记和进程状态；跨标签续聊并确认个人方案变更；选择工程组、核对工程共享和访问来源；从空入口按输入和交付目标选择工程、查可复用候选 |
| [`calculate-engineer-config`](../devFront/src/router/asyncRoutes.js#L131) | [CalculateEngineerConfig.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/CalculateEngineerConfig.vue) | 根据客户新定义的实时数值指标生成周期性和请求式脚本；从当前工程生成日冻结累计表底差的周期性和请求式脚本；查计算宿主的全局函数和脚本写法；导航与权限 |
| [`calculate-global-variable`](../devFront/src/router/asyncRoutes.js#L139) | [DataDictionary.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/DataDictionaryView/DataDictionary.vue) | 维护计算数据词典、全局变量 |
| [`calculate-data-source-management`](../devFront/src/router/asyncRoutes.js#L145) | [DataSourceManage.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/DataSourceManageView/DataSourceManage.vue) | 建立计算工程内连接，核对别名与目标 |
| [`calculate-system-scripts`](../devFront/src/router/asyncRoutes.js#L152) | [SystemScripts.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/SystemScriptsViews/SystemScripts.vue) | 生成系统启动与关闭正文 |
| [`calculate-askcalculate-script`](../devFront/src/router/asyncRoutes.js#L159) | [RequestScripts.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/RequestScriptsViews/RequestScripts.vue) | 根据客户新定义的实时数值指标生成周期性和请求式脚本；从当前工程生成日冻结累计表底差的周期性和请求式脚本；生成请求式脚本并核对回包；根据已确认的业务口径生成并验证新计算脚本 |
| [`calculate-datachange-script`](../devFront/src/router/asyncRoutes.js#L165) | [DataChangeScripts.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/DataChangeScriptsView/DataChangeScripts.vue) | 生成数据变化脚本 |
| [`calculate-conditionalevent-script`](../devFront/src/router/asyncRoutes.js#L171) | [ConditionalScripts.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/ConditionalScriptsView/ConditionalScripts.vue) | 生成条件事件的进入、存在、离开正文 |
| [`calculate-period-script`](../devFront/src/router/asyncRoutes.js#L179) | [PeriodicScriptsViews.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/PeriodicScriptsViews/PeriodicScriptsViews.vue) | 根据客户新定义的实时数值指标生成周期性和请求式脚本；从当前工程生成日冻结累计表底差的周期性和请求式脚本；生成周期性脚本并核对读写；根据已确认的业务口径生成并验证新计算脚本 |
| [`calculate-selfdefine-script`](../devFront/src/router/asyncRoutes.js#L187) | [CustomFunctions.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/CustomFunctionsView/CustomFunctions.vue) | 定义、复用和调用自定义函数 |
| [`calculate-npm-dependencies`](../devFront/src/router/asyncRoutes.js#L193) | [NpmDependViews.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/NpmDependViews/NpmDependViews.vue) | 配置 npm、普通文件、Python 依赖 |
| [`calculate-normal-dependencies`](../devFront/src/router/asyncRoutes.js#L199) | [NpmDependViews.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/NpmDependViews/NpmDependViews.vue) | 配置 npm、普通文件、Python 依赖 |
| [`calculate-py-dependencies`](../devFront/src/router/asyncRoutes.js#L205) | [NpmDependViews.vue](../devFront/src/views/Main/CalculateView/CalculateEngineerConfigView/NpmDependViews/NpmDependViews.vue) | 配置 npm、普通文件、Python 依赖 |
| [`alarm`](../devFront/src/router/asyncRoutes.js#L213) | [AlarmEngineer.vue](../devFront/src/views/Main/AlarmView/AlarmEngineer.vue) | 核对工程已发布的版本及实际部署；查询有权 App 的节点部署标记和进程状态；选择工程组、核对工程共享和访问来源；从空入口按输入和交付目标选择工程、查可复用候选 |
| [`alarm-engineer-config`](../devFront/src/router/asyncRoutes.js#L220) | [AlarmEngineerConfig.vue](../devFront/src/views/Main/AlarmView/AlarmEngineerConfigView/AlarmEngineerConfig.vue) | 导航与权限 |
| [`alarm-data-dictionary`](../devFront/src/router/asyncRoutes.js#L228) | [AlarmDictionary.vue](../devFront/src/views/Main/AlarmView/AlarmEngineerConfigView/AlarmDictionaryView/AlarmDictionary.vue) | 在词典加入点，设置限值、死区和延时；核对同一条报警的发生、保持和恢复 |
| [`alarm-data-source`](../devFront/src/router/asyncRoutes.js#L234) | [AlarmDataSourceManage.vue](../devFront/src/views/Main/AlarmView/AlarmEngineerConfigView/AlarmDataSourceManageView/AlarmDataSourceManage.vue) | 核对报警工程数据源别名和目标 |
| [`alarm-custom`](../devFront/src/router/asyncRoutes.js#L240) | [AlarmCustom.vue](../devFront/src/views/Main/AlarmView/AlarmEngineerConfigView/AlarmCustomView/AlarmCustom.vue) | 配置报警自定义逻辑或系统选项 |
| [`alarm-system-config`](../devFront/src/router/asyncRoutes.js#L245) | [AlarmSystemConfig.vue](../devFront/src/views/Main/AlarmView/AlarmEngineerConfigView/AlarmSystemConfigView/AlarmSystemConfig.vue) | 配置报警自定义逻辑或系统选项 |
| [`collection`](../devFront/src/router/asyncRoutes.js#L253) | [CollectionEngineer.vue](../devFront/src/views/Main/CollectionView/CollectionEngineer.vue) | 打开或新建有权的数采工程；核对工程已发布的版本及实际部署；查询有权 App 的节点部署标记和进程状态；对照工程配置、数采样本与运行客户端显示；选择工程组、核对工程共享和访问来源；导入、导出工程并核对副本完整性；从空入口按输入和交付目标选择工程、查可复用候选 |
| [`collection-engineer-config`](../devFront/src/router/asyncRoutes.js#L260) | [CollectionEngineerConfig.vue](../devFront/src/views/Main/CollectionView/CollectionEngineerConfigView/CollectionEngineerConfig.vue) | 导航与权限 |
| [`collection-daq-equipment`](../devFront/src/router/asyncRoutes.js#L268) | [CollectionDaqEquipment.vue](../devFront/src/views/Main/CollectionView/CollectionEngineerConfigView/CollectionDaqEquipmentView/CollectionDaqEquipment.vue) | 按设备协议选驱动并配置连接；核对当前平台的驱动、设备寄存器和可选数据类型 |
| [`collection-daq-variables`](../devFront/src/router/asyncRoutes.js#L276) | [CollectionDaqVariables.vue](../devFront/src/views/Main/CollectionView/CollectionEngineerConfigView/CollectionDaqVariablesView/CollectionDaqVariables.vue) | 建点并核对所属设备和地址；读取指定数采 App 的一个点值、质量和源时间；核对当前平台的驱动、设备寄存器和可选数据类型 |
| [`collection-network-configuration`](../devFront/src/router/asyncRoutes.js#L284) | [CollectionNetworkConfig.vue](../devFront/src/views/Main/CollectionView/CollectionEngineerConfigView/CollectionNetworkConfigView/CollectionNetworkConfig.vue) | 配置数采网络、存储或转发 |
| [`collection-storage-configuration`](../devFront/src/router/asyncRoutes.js#L292) | [CollectionStorageConfig.vue](../devFront/src/views/Main/CollectionView/CollectionEngineerConfigView/CollectionStorageConfigView/CollectionStorageConfig.vue) | 配置数采网络、存储或转发 |
| [`collection-forwarding-configuration`](../devFront/src/router/asyncRoutes.js#L300) | [CollectionForwardConfig.vue](../devFront/src/views/Main/CollectionView/CollectionEngineerConfigView/CollectionForwardConfigView/CollectionForwardConfig.vue) | 配置数采网络、存储或转发 |
| [`collection-opc-ua`](../devFront/src/router/asyncRoutes.js#L308) | [CollectionOpcua.vue](../devFront/src/views/Main/CollectionView/CollectionEngineerConfigView/CollectionOpcuaView/CollectionOpcua.vue) | 配置 OPC UA 或 OPC DA |
| [`collection-opc-da`](../devFront/src/router/asyncRoutes.js#L314) | [CollectionOpcda.vue](../devFront/src/views/Main/CollectionView/CollectionEngineerConfigView/CollectionOpcdaView/CollectionOpcda.vue) | 配置 OPC UA 或 OPC DA |
| [`gatewayLog_manager`](../devFront/src/router/asyncRoutes.js#L322) | [MaintenanceLog.vue](../devFront/src/views/Main/MaintenanceLogView/MaintenanceLog.vue) | 导航与权限 |
| [`user_manager`](../devFront/src/router/asyncRoutes.js#L329) | [UserManager.vue](../devFront/src/views/Main/UserManagerView/UserManager.vue) | 导航与权限 |
| [`permission_manager`](../devFront/src/router/asyncRoutes.js#L336) | [PermissionManager.vue](../devFront/src/views/Main/PermissionManagerView/PermissionManager.vue) | 导航与权限 |
| [`/main`](../devFront/src/router/asyncRoutes.js#L348) | [MainIndex.vue](../devFront/src/views/Main/MainIndex.vue) | 导航与权限；从空入口按输入和交付目标选择工程、查可复用候选 |

## 菜单、弹窗与前端调用

菜单读取静态 path 与 showPath，Vue 文件按模块列出，API 按具名导出函数列出；直接调用 axiosRequest 的函数同时标出方法和路径。按钮可见性仍需用目标版本和账号核实。

<details><summary>alarmMenuStore.js（4）</summary>

[源码](../devFront/src/stores/alarmMenuStore.js)

- `alarm-custom`
- `alarm-data-dictionary`
- `alarm-data-source`
- `alarm-system-config`

</details>

<details><summary>calculationMenuStore.js（11）</summary>

[源码](../devFront/src/stores/calculationMenuStore.js)

- `calculate-askcalculate-script`
- `calculate-conditionalevent-script`
- `calculate-data-source-management`
- `calculate-datachange-script`
- `calculate-global-variable`
- `calculate-normal-dependencies`
- `calculate-npm-dependencies`
- `calculate-period-script`
- `calculate-py-dependencies`
- `calculate-selfdefine-script`
- `calculate-system-scripts`

</details>

<details><summary>clientMenuStore.js（14）</summary>

[源码](../devFront/src/stores/clientMenuStore.js)

- `client-3d-resource-management`
- `client-custom-script`
- `client-custom-translator`
- `client-data-change-script`
- `client-data-source-management`
- `client-graphic-model-library`
- `client-hotkey-script`
- `client-page-management`
- `client-report-library`
- `client-safe-object`
- `client-system-script`
- `client-timer-script`
- `client-translation-resource`
- `client-variables-engineer`

</details>

<details><summary>collectionMenuStore.js（7）</summary>

[源码](../devFront/src/stores/collectionMenuStore.js)

- `collection-daq-equipment`
- `collection-daq-variables`
- `collection-forwarding-configuration`
- `collection-network-configuration`
- `collection-opc-da`
- `collection-opc-ua`
- `collection-storage-configuration`

</details>

<details><summary>mainLeftMenusStore.js（9）</summary>

[源码](../devFront/src/stores/mainLeftMenusStore.js)

- `alarm`
- `calculate`
- `client`
- `collection`
- `datasource`
- `gatewayLog_manager`
- `permission_manager`
- `system-overview`
- `user_manager`

</details>

<details><summary>AlarmView 页面及弹窗（11）</summary>

[源码](../devFront/src/views/Main/AlarmView)

- `AlarmDialogView/AddOrEditCustomDialog.vue`
- `AlarmDialogView/AlarmQuickAddVariableDialog.vue`
- `AlarmDialogView/EditVariableDialogView/AlarmAttrCom.vue`
- `AlarmDialogView/EditVariableDialogView/BaseAttrCom.vue`
- `AlarmDialogView/EditVariableDialogView/EditVariableDialog.vue`
- `AlarmEngineer.vue`
- `AlarmEngineerConfigView/AlarmCustomView/AlarmCustom.vue`
- `AlarmEngineerConfigView/AlarmDataSourceManageView/AlarmDataSourceManage.vue`
- `AlarmEngineerConfigView/AlarmDictionaryView/AlarmDictionary.vue`
- `AlarmEngineerConfigView/AlarmEngineerConfig.vue`
- `AlarmEngineerConfigView/AlarmSystemConfigView/AlarmSystemConfig.vue`

</details>

<details><summary>CalculateView 页面及弹窗（21）</summary>

[源码](../devFront/src/views/Main/CalculateView)

- `CalculateDialogView/AddEditorDataDictionary.vue`
- `CalculateDialogView/CustomDebugging.vue`
- `CalculateDialogView/CustomFuctionAttrEditor.vue`
- `CalculateDialogView/ImportNpmDependDialog.vue`
- `CalculateDialogView/InstallNpmDependDialog.vue`
- `CalculateDialogView/PeriodicScriptAttrEditor.vue`
- `CalculateDialogView/ReleasePosition.vue`
- `CalculateDialogView/ScriptMoveDialog.vue`
- `CalculateDialogView/ScriptsGlobalSearch.vue`
- `CalculateDialogView/UpsertRequestScriptsDialog.vue`
- `CalculateEngineer.vue`
- `CalculateEngineerConfigView/CalculateEngineerConfig.vue`
- `CalculateEngineerConfigView/ConditionalScriptsView/ConditionalScripts.vue`
- `CalculateEngineerConfigView/CustomFunctionsView/CustomFunctions.vue`
- `CalculateEngineerConfigView/DataChangeScriptsView/DataChangeScripts.vue`
- `CalculateEngineerConfigView/DataDictionaryView/DataDictionary.vue`
- `CalculateEngineerConfigView/DataSourceManageView/DataSourceManage.vue`
- `CalculateEngineerConfigView/NpmDependViews/NpmDependViews.vue`
- `CalculateEngineerConfigView/PeriodicScriptsViews/PeriodicScriptsViews.vue`
- `CalculateEngineerConfigView/RequestScriptsViews/RequestScripts.vue`
- `CalculateEngineerConfigView/SystemScriptsViews/SystemScripts.vue`

</details>

<details><summary>ClientView 页面及弹窗（44）</summary>

[源码](../devFront/src/views/Main/ClientView)

- `ClientDialogView/AppOfflineReleaseDialog.vue`
- `ClientDialogView/ClientGraphicRepeat.vue`
- `ClientDialogView/ClientPageMoveDialog.vue`
- `ClientDialogView/ClientPageRecycleDialog.vue`
- `ClientDialogView/ClientReleaseDialog.vue`
- `ClientDialogView/ClientScriptMoveDialog.vue`
- `ClientDialogView/DataItemDialog.vue`
- `ClientDialogView/DataSetDialog.vue`
- `ClientDialogView/GetProjectImgDialog.vue`
- `ClientDialogView/GetProjectPageDialog.vue`
- `ClientDialogView/PageManagerImportDialog.vue`
- `ClientDialogView/QuickAddReportDialog.vue`
- `ClientDialogView/QuickAddResolveDialog.vue`
- `ClientDialogView/QuickAddVariableDialog.vue`
- `ClientDialogView/ReportEditorDialogView/ReportEditorContainerView/ReportAttrRight.vue`
- `ClientDialogView/ReportEditorDialogView/ReportEditorContainerView/ReportDataSetLeft.vue`
- `ClientDialogView/ReportEditorDialogView/ReportEditorContainerView/ReportModels.vue`
- `ClientDialogView/ReportEditorDialogView/ReportEditorDialog.vue`
- `ClientDialogView/ReportImportDialog.vue`
- `ClientDialogView/ResourcesManagerDialog.vue`
- `ClientDialogView/SetProjectDialog.vue`
- `ClientDialogView/UpsertAssociatedUsersDialog.vue`
- `ClientDialogView/UpsertGraphicModeDialog.vue`
- `ClientDialogView/UpsertResourcesDialog.vue`
- `ClientDialogView/UpsertResourcesExtractDialog.vue`
- `ClientDialogView/UpsertSafeObjectDialog.vue`
- `ClientDialogView/UpsertVariableEngineerDialog.vue`
- `ClientDialogView/VariableChooseDialog.vue`
- `ClientEngineer.vue`
- `ClientEngineerConfigView/3dResourceNanagementView/3dResourceNanagement.vue`
- `ClientEngineerConfigView/ClientCustomScriptView/ClientCustomScript.vue`
- `ClientEngineerConfigView/ClientDataChangeScriptView/ClientDataChangeScript.vue`
- `ClientEngineerConfigView/ClientDataSourceManagementView/ClientDataSourceManagement.vue`
- `ClientEngineerConfigView/ClientEngineerConfig.vue`
- `ClientEngineerConfigView/ClientHotkeyScriptView/ClientHotkeyScriptView.vue`
- `ClientEngineerConfigView/ClientPageManageView/ClientPageManage.vue`
- `ClientEngineerConfigView/ClientReportLibraryView/ClientReportLibrary.vue`
- `ClientEngineerConfigView/ClientSystemScriptView/ClientSystemScript.vue`
- `ClientEngineerConfigView/ClientTimerScriptView/ClientTimerScript.vue`
- `ClientEngineerConfigView/CustomTranslatorView/CustomTranslator.vue`
- `ClientEngineerConfigView/GraphicModelLibraryView/GraphicModelLibrary.vue`
- `ClientEngineerConfigView/SafeObjectView/SafeObject.vue`
- `ClientEngineerConfigView/TranslationResourceView/TranslationResource.vue`
- `ClientEngineerConfigView/VariableEngineerView/VariableEngineer.vue`

</details>

<details><summary>CollectionView 页面及弹窗（24）</summary>

[源码](../devFront/src/views/Main/CollectionView)

- `CollectionDialogView/AddOpcdaVariableDialog.vue`
- `CollectionDialogView/AddOpcuaVariableDialog.vue`
- `CollectionDialogView/AddOrEditDeviceDialog.vue`
- `CollectionDialogView/AddOrEditForwardDialog.vue`
- `CollectionDialogView/AddOrEditOpcdaDialog.vue`
- `CollectionDialogView/AddOrEditOpcuaDialog.vue`
- `CollectionDialogView/AddOrEditProjectDialog.vue`
- `CollectionDialogView/AddOrEditStorageDialog.vue`
- `CollectionDialogView/CsvEncodingSelect.vue`
- `CollectionDialogView/DriverLibraryDialog.vue`
- `CollectionDialogView/DriverSettingDialog.vue`
- `CollectionDialogView/EditOpcuaOrOpcdaVariableDialog.vue`
- `CollectionDialogView/UpsertOpcdaConnectionDialog/AddOpcdaOpcdaConnectionDialog.vue`
- `CollectionDialogView/UpsertOpcdaConnectionDialog/UpsertOpcdaConnectionDialog.vue`
- `CollectionDialogView/UpsertVariableEngineerDialog.vue`
- `CollectionEngineer.vue`
- `CollectionEngineerConfigView/CollectionDaqEquipmentView/CollectionDaqEquipment.vue`
- `CollectionEngineerConfigView/CollectionDaqVariablesView/CollectionDaqVariables.vue`
- `CollectionEngineerConfigView/CollectionEngineerConfig.vue`
- `CollectionEngineerConfigView/CollectionForwardConfigView/CollectionForwardConfig.vue`
- `CollectionEngineerConfigView/CollectionNetworkConfigView/CollectionNetworkConfig.vue`
- `CollectionEngineerConfigView/CollectionOpcdaView/CollectionOpcda.vue`
- `CollectionEngineerConfigView/CollectionOpcuaView/CollectionOpcua.vue`
- `CollectionEngineerConfigView/CollectionStorageConfigView/CollectionStorageConfig.vue`

</details>

<details><summary>DataSourceView 页面及弹窗（2）</summary>

[源码](../devFront/src/views/Main/DataSourceView)

- `DataSource.vue`
- `DataSourceDialogView/UpsertProjectDialog.vue`

</details>

<details><summary>MainDialogView 页面及弹窗（2）</summary>

[源码](../devFront/src/views/Main/MainDialogView)

- `OemConifgDialog.vue`
- `ShareEngineerDialog.vue`

</details>

<details><summary>MainHeaderView 页面及弹窗（1）</summary>

[源码](../devFront/src/views/Main/MainHeaderView)

- `MainHeader.vue`

</details>

<details><summary>MaintenanceLogView 页面及弹窗（1）</summary>

[源码](../devFront/src/views/Main/MaintenanceLogView)

- `MaintenanceLog.vue`

</details>

<details><summary>PermissionManagerView 页面及弹窗（2）</summary>

[源码](../devFront/src/views/Main/PermissionManagerView)

- `PermissionDialogView/CreateEditPermissionDialog.vue`
- `PermissionManager.vue`

</details>

<details><summary>SystemOverView 页面及弹窗（1）</summary>

[源码](../devFront/src/views/Main/SystemOverView)

- `SystemOverview.vue`

</details>

<details><summary>UserManagerView 页面及弹窗（5）</summary>

[源码](../devFront/src/views/Main/UserManagerView)

- `UserListView/UserList.vue`
- `UserManager.vue`
- `UserManagerDialogView/AddEditorUser.vue`
- `UserManagerDialogView/RoleAllocation.vue`
- `UserSafeSetView/UserSafeSet.vue`

</details>

<details><summary>alarmAPI.js（36）</summary>

[源码](../devFront/src/api/allRequest/alarmAPI.js)

- `createAlarmProjectServer → POST /alarm/project`
- `createCustomConfigServer → POST /alarm/customConfig`
- `createCustomGroupServer → POST /alarm/customGroup`
- `createDataDirectoryGroupServer → POST /alarm/group`
- `createDataDirectoryServer → POST /alarm/tags`
- `createDataSourceServer → POST /alarm/dataSource`
- `deleteAlarmProjectServer → DELETE /alarm/project`
- `deleteAllShareAlarmProjectServer → DELETE /alarm/share/all`
- `deleteCustomConfigServer → DELETE /alarm/customConfig`
- `deleteCustomGroupServer → DELETE /alarm/customGroup`
- `deleteDataDirectoryGroupServer → DELETE /alarm/group`
- `deleteDataDirectoryServer → DELETE /alarm/tags`
- `deleteDataSourceServer → DELETE /alarm/dataSource`
- `deleteShareAlarmProjectServer → DELETE /alarm/share`
- `editAlarmProjectServer → PUT /alarm/project`
- `editCustomConfigServer → PUT /alarm/customConfig`
- `editCustomGroupServer → PUT /alarm/customGroup`
- `editCustomScriptServer → POST /alarm/customScript`
- `editDataDirectoryGroupServer → PUT /alarm/group`
- `editDataDirectoryServer → POST /alarm/alarmConfig`
- `editDataSourceServer → PUT /alarm/dataSource`
- `editSystemConfigServer → POST /alarm/systemConfig`
- `exportAlarmProjectServer → POST /alarm/exportProject`
- `exportDirectoryServer → POST /alarm/exportTags`
- `getAlarmProjectServer → GET /alarm/project`
- `getAllTagsServer → GET /alarm/allTags`
- `getCustomConfigServer → GET /alarm/customConfig`
- `getCustomGroupServer → GET /alarm/customGroup`
- `getCustomScriptServer → GET /alarm/customScript`
- `getDataDirectoryGroupServer → GET /alarm/group`
- `getDataDirectoryServer → GET /alarm/tags`
- `getDataSourceServer → GET /alarm/dataSource`
- `getSystemConfigServer → GET /alarm/systemConfig`
- `importAlarmProjectServer → POST /alarm/importProject`
- `importDirectoryServer → POST /alarm/importTags`
- `shareAlarmProjectServer → POST /alarm/share`

</details>

<details><summary>calculationAPI.js（32）</summary>

[源码](../devFront/src/api/allRequest/calculationAPI.js)

- `addProjectJSONDataServer → POST /calculation/projectJsonData`
- `addScriptGroupServer → POST /calculation/addScriptGroup`
- `createSolutionProjectServer → POST /calculation/project`
- `delDependanceServer → DELETE /calculation/deleteDependence`
- `deleteProjectJSONDataServer → DELETE /calculation/projectJsonData`
- `deleteProjectServer → DELETE /calculation/project`
- `deleteScripteGroupServer → DELETE /calculation/deleteScripteGroup`
- `deleteShareAllUserServer → DELETE /calculation/share/all`
- `deleteShareUserServer → DELETE /calculation/share`
- `dependanceListServer → GET /calculation/getDependenceslist`
- `editProjectJSONDataServer → PUT /calculation/scriptData`
- `exportProjectServer → POST /calculation/exportProject`
- `forceUnlockScriptServer → PUT /calculation/forceUnlockScript`
- `getLockerListServer → GET /calculation/lockerList`
- `getProjectInfoServer → GET /calculation/project`
- `getProjectJSONDataServer → GET /calculation/scriptData`
- `getProjectJSONSettingsServer → GET /calculation/projectJsonData`
- `getProjectScriptGroupServer → GET /calculation/openProject`
- `getScriptGroupServer → GET /calculation/scriptGroup`
- `importDependanceServer → POST /calculation/addDependence`
- `importProjectServer → POST /calculation/importProjects`
- `installDependanceServer → POST /calculation/installDependence`
- `modifyProjectJSONDataServer → PUT /calculation/projectJsonData`
- `modifyProjectServer → PUT /calculation/project`
- `modifyScriptGroupServer → PUT /calculation/modifyScriptGroup`
- `modifyScriptInvalidStatusServer → PUT /calculation/modifyScriptInvalidStatus`
- `moveScriptGroupServer → POST /calculation/moveScript`
- `scriptDebuggerServer → GET /calculation/serverDebug`
- `scriptSearchServer → GET /calculation/scriptSearch`
- `shareUserServer → POST /calculation/share`
- `unInstallDependanceServer → DELETE /calculation/unInstallDependence`
- `unlockScriptServer → PUT /calculation/unlockScript`

</details>

<details><summary>clientAPI.js（91）</summary>

[源码](../devFront/src/api/allRequest/clientAPI.js)

- `addDataSourceServer → POST /client/addDataSource`
- `addVariableGroupServer → POST /client/addVariableGroup`
- `addVariableServer → POST /client/addVariable`
- `batchDeleteModuleServer → GET /client/batchDeleteModule`
- `batchExportModuleServer → POST /client/batchExportModule`
- `batchGetPageFileServer → GET /client/batchGetPageFile`
- `batchGetReportServer → GET /client/batchGetReport`
- `batchUpdateModuleServer → POST /client/batchUpdateModule`
- `createDateItemServer → POST /client/createDateItem`
- `createDateSetServer → POST /client/createDateSet`
- `createGroupServer → POST /client/createGroup`
- `createPageServer → POST /client/createPage`
- `createProjectServer → POST /client/createProject`
- `createReportGroupServer → POST /client/createReportGroupServer`
- `createReportManagerServer → POST /client/createReportManager`
- `createRoleServer → POST /client/createRole`
- `createScriptGroupServer → POST /client/createScriptGroup`
- `delDataItemServer → DELETE /client/delDataItem`
- `delDataSetServer → DELETE /client/delDataSet`
- `delGroupByIdServer → DELETE /client/delGroupById`
- `delImgServer → DELETE /client/delImg`
- `delReportManagerServer → DELETE /client/delReportManagerServer`
- `deleteDataSourceServer → DELETE /client/deleteDataSource`
- `deletePageBatchServer → POST /client/deletePageBatch`
- `deleteProjectServer → DELETE /client/deleteProject`
- `deleteReportGroupServer → DELETE /client/deleteReportGroupServer`
- `deleteRoleServer → DELETE /client/deleteRole`
- `deleteScriptGroupServer → DELETE /client/deleteScriptGroup`
- `deleteShareAllUserServer → DELETE /client/share/all`
- `deleteShareUserServer → DELETE /client/share`
- `deleteVariableGroup → DELETE /client/deleteVariableGroup`
- `deleteVariableServer → POST /client/deleteVariable`
- `editDataItemServer → PUT /client/editDataItem`
- `editDataSetServer → PUT /client/editDataSet`
- `editDataSourceServer → PUT /client/editDataSource`
- `editModuleServer → POST /client/editModule`
- `editReportManagerServer → PUT /client/editReportManager`
- `editReportServer → PUT /client/editReport`
- `editRoleServer → PUT /client/editRole`
- `exportAppProjectServer → POST /client/exportAppProject`
- `exportProjectServer → POST /client/handleProject`
- `extractResourcesServer → POST /client/extractResources`
- `getAllReleaseDataServer → GET /client/getAllSeat`
- `getAllResourceServer → GET /client/getAllResource`
- `getDataItemServer → GET /client/getDataItem`
- `getDataSetItemItemServer → GET /client/getDataSetItem`
- `getDataSetServer → GET /client/getDataSet`
- `getDataSourceListServer → GET /client/getDataSourceList`
- `getGlobalScriptServer → GET /client/getGlobalScript`
- `getMultiSeatServer → POST /client/getMultiSeat`
- `getPageMngIDServer → GET /client/getPageMngID`
- `getPagesServer → GET /client/getPages`
- `getProjectConfigureTreeServer → GET /client/getProjectConfigureTree`
- `getProjectFileServer → GET /client/getProjectFile`
- `getProjectInfoServer → GET /client/projectList`
- `getReportManagerServer → GET /client/getReportManager`
- `getReportServer → GET /client/getReport`
- `getResourceServer → GET /client/getResource`
- `getRoleListServer → GET /client/getRoleList`
- `getSceneInfoServer → GET /client/getSceneInfo`
- `getScriptGroupServer → GET /client/getScriptGroupServer`
- `getVariableListServer → GET /client/getVariableList`
- `handlePageRecordMngServer → POST /client/handlePageRecordMng`
- `importPageServer → POST /client/importPage`
- `importProjectServer → POST /client/handleProject`
- `importReportServer → POST /client/importReport`
- `importTranslateSourceServer → POST /client/importTranslateSource`
- `importVariableServer → POST /client/importVariable`
- `modifyProjectServer → PUT /client/updateProject`
- `modifyVariableServer → PUT /client/editVariable`
- `moveScriptGroupServer → POST /client/moveScriptGroupServer`
- `movesToGroupServer → PUT /client/movesToGroup`
- `pasteGraphicServer → POST /client/pasteGraphic`
- `pastePageServer → POST /client/pastePage`
- `releaseMultiSeatServer → POST /client/releaseMultiSeat`
- `releaseReportSeatServer → POST /client/releaseMultiSeat`
- `saveModuleImgServer → POST /client/saveModuleImg`
- `saveProjectDataServer → POST /client/saveProjectData`
- `setAppNameServer → PUT /client/setAppName`
- `setDefaultNameServer → PUT /client/setDefaultName`
- `setGlobalScriptServer → POST /client/setGlobalScript`
- `setReportSeatServer → POST /client/setMultiSeat`
- `setVariableFileServer → POST /client/setVariableFile`
- `shareUserServer → POST /client/share`
- `translateDecrypt → POST /client/translateDecrypt`
- `updateGroupServer → PUT /client/updateGroup`
- `updateModuleImgServer → POST /client/updateModuleImg`
- `updatePageServer → PUT /client/updatePage`
- `updatePageTagIdServer → GET /client/updatePageTagId`
- `updateReportGroupServer → PUT /client/updateReportGroupServer`
- `updateScriptGroupServer → PUT /client/updateScriptGroup`

</details>

<details><summary>collectionAPI.js（84）</summary>

[源码](../devFront/src/api/allRequest/collectionAPI.js)

- `addDaDeviceServer → POST /collect/daDevice`
- `addDaServer → POST /collect/daServer`
- `addDaVariablesServer → POST /collect/daVariables`
- `addStorageConfigServer → POST /collect/addStorageConfig`
- `addTransConfigServer → POST /collect/addTransConfig`
- `createCollectionProjectServer → POST /collect/project`
- `createDeviceGroupServer → POST /collect/createDeviceGroup`
- `createDeviceServer → POST /collect/devices`
- `createVarGroupServer → POST /collect/createVarGroup`
- `createVariableServer → POST /collect/variables`
- `daConenctTestServer → GET /collect/daTestConnect`
- `daExportVarsServer → POST /collect/daExportVars`
- `daImportVarsServer → POST /collect/daImportVars`
- `daRootSourcesServer → GET /collect/daRootSources`
- `delDaDeviceServer → DELETE /collect/daDevice`
- `delDaServer → DELETE /collect/daServer`
- `delDaVariablesServer → DELETE /collect/daVariables`
- `delPointMappingFileServer → DELETE /collect/delPointMapping`
- `delStorageConfigServer → DELETE /collect/delStorageConfig`
- `delVarGroupServer → DELETE /collect/deleteVarGroup`
- `deleteCollectionProjectServer → DELETE /collect/project`
- `deleteDeviceGroupServer → DELETE /collect/delDeviceGroup`
- `deleteDeviceServer → DELETE /collect/devices`
- `deleteDeviceValidateServer → GET /collect/delDeviceValidate`
- `deleteShareAllUserServer → DELETE /collect/share/all`
- `deleteShareUserServer → DELETE /collect/share`
- `deleteTransConfigServer → DELETE /collect/deleteTransConfig`
- `deleteVariableServer → DELETE /collect/variables`
- `editCollectionProjectServer → PUT /collect/project`
- `editDaDeviceServer → PUT /collect/daDevice`
- `editDaServer → PUT /collect/daServer`
- `editDaVariablesServer → PUT /collect/daVariables?projectId={…}&deviceId={…}`
- `editDeviceGroupServer → PUT /collect/editDeviceGroup`
- `editDeviceServer → PUT /collect/devices`
- `editStorageConfigByIdServer → PUT /collect/editStorageConfigById`
- `editTransConfigServer → PUT /collect/editTransConfig`
- `editVarGroupServer → PUT /collect/editVarGroup`
- `editVariableServer → PUT /collect/variables`
- `exportDevicesServer → POST /collect/exportDevices`
- `exportDriverDependencyServer → POST /collect/driverSettingDownload`
- `exportPointMappingServer → POST /collect/pointMappingFileDownload`
- `exportProjectServer → POST /collect/exportProject`
- `exportTagsServer → POST /collect/exportTags`
- `exportUaVarsServer → POST /collect/exportUaVars`
- `getCollectionProjectServer → GET /collect/project`
- `getDaDeviceServer → GET /collect/daDevice`
- `getDaServer → GET /collect/daServer`
- `getDaVariablesServer → GET /collect/daVariables`
- `getDeviceGroupServer → GET /collect/getGroupList`
- `getDeviceServer → GET /collect/devices`
- `getDevicesPropertyServer → GET /collect/getDevicesProperty`
- `getDriverListServer → GET /collect/getDriverList`
- `getDriverMapConfigServer → GET /collect/getDriverMapConfig`
- `getNetWorkPropertyServer → GET /collect/getNetWorkProperty`
- `getPointMappingListServer → GET /collect/getPointMapList`
- `getRegisterdatatypesServer → GET /collect/registerdatatypes`
- `getRegistersServer → GET /collect/registers`
- `getStorageListServer → GET /collect/getStorageList`
- `getTransDBConfigServer → GET /collect/getTransDBConfig`
- `getUaVarsListServer → GET /collect/getUaVarsList`
- `getVariableAttributeServer → GET /collect/getVarsProperty`
- `getVariableServer → GET /collect/variables`
- `importDevicesServer → POST /collect/importDevices`
- `importDriverDependencyServer → POST /collect/driverSettingUpload`
- `importPointMappingFileServer → POST /collect/updatePointMapping`
- `importProjectServer → POST /collect/importProjects`
- `importTagsServer → POST /collect/importTags`
- `installDriverServer → POST /collect/installDriver`
- `modifyNetworkConfigServer → POST /collect/modifyNetworkConfig`
- `moveDeviceServer → POST /collect/moveDevice`
- `moveVariableServer → POST /collect/moveVarToGroup`
- `shareUserServer → POST /collect/share`
- `uaAddDeviceServer → POST /collect/uaAddDevice`
- `uaAddVariablesServer → POST /collect/uaAddVariables`
- `uaConenctTestServer → POST /collect/uaConenctTest`
- `uaDelDevicesServer → DELETE /collect/uaDelDevices`
- `uaDelVarsServer → DELETE /collect/uaDelVars`
- `uaDevicesServer → GET /collect/uaDevices`
- `uaEditDeviceServer → PUT /collect/uaEditDevice`
- `uaEditVariablesServer → PUT /collect/uaEditVariables`
- `uaImportVarsServer → POST /collect/uaImportVars`
- `uaRootSourcesServer → GET /collect/uaRootSources`
- `uninstallDriverServer → DELETE /collect/uninstallDriver`
- `updateProjectDriverServer → POST /collect/updateProDriver`

</details>

<details><summary>dataSourceAPI.js（15）</summary>

[源码](../devFront/src/api/allRequest/dataSourceAPI.js)

- `createProjectServer → POST /dataSource/project`
- `deleteProjectServer → DELETE /dataSource/project`
- `deleteShareAllUserServer → DELETE /dataSource/share/all`
- `deleteShareUserServer → DELETE /dataSource/share`
- `exportProjectServer → POST /dataSource/exportProject`
- `getAlarmDbTestServer → POST /alarm/alarmHistorydbTest`
- `getAllDataSourceServer → GET /dataSource/getAllDataSource`
- `getAllProjectsServer → GET /alarm/allProjects`
- `getDataSourceOptionsServer → GET /dataSource/dataSourceOptions`
- `getDbTestServer → POST /dataSource/dbTest`
- `getProjectInfoServer → GET /dataSource/project`
- `getVariableServer → GET /dataSource/getTagList`
- `importProjectServer → POST /dataSource/importProject`
- `modifyProjectServer → PUT /dataSource/project`
- `shareUserServer → POST /dataSource/share`

</details>

<details><summary>logAPI.js（4）</summary>

[源码](../devFront/src/api/allRequest/logAPI.js)

- `getLogRetainTimeServer → GET /log/getRetainTime`
- `handleMaintenanceLogServer → POST /log/conditionQuery`
- `handleUserSelectionLogServer → POST /log/filterConditions`
- `saveLogRetainTimeServer → POST /log/saveRetainTime`

</details>

<details><summary>loginAPI.js（5）</summary>

[源码](../devFront/src/api/allRequest/loginAPI.js)

- `getPublicKeyServer → GET /user/getPublicKey`
- `loginSSOServer → GET /user/ssologin`
- `loginServer → POST /user/login`
- `logoutServer → POST /user/logout`
- `userTokenValidServer → GET /user/userTokenValid`

</details>

<details><summary>mainAPI.js（8）</summary>

[源码](../devFront/src/api/allRequest/mainAPI.js)

- `createProjectGroupServer → POST /projectGroup`
- `deleteProjectGroupServer → DELETE /projectGroup`
- `editProjectGroupServer → PUT /projectGroup`
- `getProjectGroupServer → GET /projectGroup`
- `isUserCreateProject → GET /isUserCreateProject`
- `publishServer → POST /ops/publish`
- `unPublishServer → DELETE /ops/publish`
- `updateServer → POST /ops/update`

</details>

<details><summary>rolesAPI.js（6）</summary>

[源码](../devFront/src/api/allRequest/rolesAPI.js)

- `createRoleServer → POST /user/createRole`
- `deleteRoleServer → DELETE /user/deleteRole`
- `deleteRoleToGroupServer → DELETE /projectRoles`
- `editRoleServer → PUT /user/editRole`
- `getRoleListServer → GET /user/roleList`
- `setRoleToGroupServer → POST /projectRoles`

</details>

<details><summary>systemConfigAPI.js（2）</summary>

[源码](../devFront/src/api/allRequest/systemConfigAPI.js)

- `getSystemConfig → GET /system/oemConfig`
- `updateSystemConfig → POST /system/setOEMConfig`

</details>

<details><summary>userManagerApi.js（19）</summary>

[源码](../devFront/src/api/allRequest/userManagerApi.js)

- `changeUserPassword → POST /user/changePassword`
- `changeUserPasswordForFirstLogin → POST /user/firstUserPassword`
- `createUserGroupServer → POST /user/createGroup`
- `createUserServer → POST /user/createUser`
- `deleteUserGroupServer → DELETE /user/deleteGroup`
- `deleteUserServer → DELETE /user/deleteUser`
- `editUserGroupServer → PUT /user/editGroup`
- `editUserServer → POST /user/updateUser`
- `getGroupListServer → GET /user/groupStruct`
- `getRoleUserListServer → GET /user/roleUserList`
- `getSecurity → GET /user/security`
- `getUserInfoByIdServer → GET /user/getUserInfoById`
- `getUserInfoServer → GET /user/userInfo`
- `getUserListServer → GET /user/userList`
- `refreshTokenServer → POST /user/tokenRefresh`
- `resetPasswordServer → POST /user/resetPassword`
- `saveSecurityServer → POST /user/saveSecurity`
- `setMultiChoiceServer → POST /user/setMultiChoice`
- `updateRolesServer → POST /user/updateRoles`

</details>


## 五类工程的服务端接口

按服务、登记文件、HTTP 方法和路径列出。此处用于定位产品能力；HTTP 方法不足以判断业务有无副作用，助手只开放自身明确允许的读取操作。

<details><summary>kingioserver / projectGroup_router_config.js（7）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingioserver/exe/lib/routers/api/v1/projectGroup_router_config.js)

- `DELETE /group`
- `DELETE /groupRoles`
- `GET /group`
- `GET /groupRoles`
- `POST /group`
- `POST /groupRoles`
- `PUT /group`

</details>

<details><summary>kingioserver / project_router_config.js（12）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingioserver/exe/lib/routers/api/v1/project_router_config.js)

- `DELETE /deleteProject`
- `DELETE /share`
- `DELETE /share/all`
- `GET /isUserCreateProject`
- `GET /projectById`
- `GET /projectList`
- `GET /share`
- `POST /createProject`
- `POST /exportProject`
- `POST /importProjects`
- `POST /share`
- `PUT /updateProject`

</details>

<details><summary>kingdbmanager / projectGroup_router_config.js（7）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingdbmanager/exe/lib/routers/api/v1/projectGroup_router_config.js)

- `DELETE /group`
- `DELETE /groupRoles`
- `GET /group`
- `GET /groupRoles`
- `POST /group`
- `POST /groupRoles`
- `PUT /group`

</details>

<details><summary>kingdbmanager / project_router_config.js（16）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingdbmanager/exe/lib/routers/api/v1/project_router_config.js)

- `DELETE /project`
- `DELETE /share`
- `DELETE /share/all`
- `GET /dataSourceOptions`
- `GET /getAllDataSource`
- `GET /getTagList`
- `GET /isUserCreateProject`
- `GET /project`
- `GET /projectById`
- `GET /share`
- `POST /dbtest`
- `POST /exportProject`
- `POST /importProjects`
- `POST /project`
- `POST /share`
- `PUT /project`

</details>

<details><summary>kingalarm / alarm_router_config.js（29）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingalarm/exe/lib/routers/api/v1/alarm_router_config.js)

- `DELETE /customConfig`
- `DELETE /customGroup`
- `DELETE /dataSource`
- `DELETE /tagGroup`
- `DELETE /tags`
- `GET /allTags`
- `GET /customConfig`
- `GET /customGroup`
- `GET /customScript`
- `GET /dataSource`
- `GET /systemConfig`
- `GET /tagGroup`
- `GET /tags`
- `POST /alarmConfig`
- `POST /alarmHistorydbTest`
- `POST /customConfig`
- `POST /customGroup`
- `POST /customScript`
- `POST /dataSource`
- `POST /exportTags`
- `POST /importTags`
- `POST /systemConfig`
- `POST /tagGroup`
- `POST /tags`
- `PUT /customConfig`
- `PUT /customGroup`
- `PUT /dataSource`
- `PUT /tagGroup`
- `PUT /tags`

</details>

<details><summary>kingalarm / projectGroup_router_config.js（7）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingalarm/exe/lib/routers/api/v1/projectGroup_router_config.js)

- `DELETE /group`
- `DELETE /groupRoles`
- `GET /group`
- `GET /groupRoles`
- `POST /group`
- `POST /groupRoles`
- `PUT /group`

</details>

<details><summary>kingalarm / project_router_config.js（13）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingalarm/exe/lib/routers/api/v1/project_router_config.js)

- `DELETE /project`
- `DELETE /share`
- `DELETE /share/all`
- `GET /allProjects`
- `GET /isUserCreateProject`
- `GET /project`
- `GET /projectById`
- `GET /share`
- `POST /exportProject`
- `POST /importProjects`
- `POST /project`
- `POST /share`
- `PUT /project`

</details>

<details><summary>kingcalculation / projectGroup_router_config.js（7）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingcalculation/exe/lib/routers/api/v1/projectGroup_router_config.js)

- `DELETE /group`
- `DELETE /groupRoles`
- `GET /group`
- `GET /groupRoles`
- `POST /group`
- `POST /groupRoles`
- `PUT /group`

</details>

<details><summary>kingcalculation / project_router_config.js（18）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingcalculation/exe/lib/routers/api/v1/project_router_config.js)

- `DELETE /deleteProject`
- `DELETE /deleteScripteGroup`
- `DELETE /share`
- `DELETE /share/all`
- `GET /isUserCreateProject`
- `GET /openProject`
- `GET /projectById`
- `GET /projectList`
- `GET /scriptGroup`
- `GET /share`
- `POST /addScriptGroup`
- `POST /createProject`
- `POST /exportProject`
- `POST /importProjects`
- `POST /moveScript`
- `POST /share`
- `PUT /modifyScriptGroup`
- `PUT /updateProject`

</details>

<details><summary>kingcalculation / script_router_config.js（19）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingcalculation/exe/lib/routers/api/v1/script_router_config.js)

- `DELETE /deleteDependence`
- `DELETE /deleteProjectJsonData`
- `DELETE /unInstallDependence`
- `GET /getDependenceslist`
- `GET /getProjectJsonData`
- `GET /getScriptData`
- `GET /getScriptLockInfo`
- `GET /lockerList`
- `GET /scriptSearch`
- `GET /serverDebug`
- `POST /addDependence`
- `POST /addProjectJsonData`
- `POST /installDependence`
- `POST /stopInstallDependence`
- `PUT /forceUnlockScript`
- `PUT /modifyProjectJsonData`
- `PUT /modifyScriptData`
- `PUT /modifyScriptInvalidStatus`
- `PUT /unlockScript`

</details>

<details><summary>kingclient / img_router_config.js（13）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingclient/exe/lib/routers/api/v1/img_router_config.js)

- `DELETE /delImg`
- `GET /GetSvgFile`
- `GET /batchDeleteModule`
- `GET /customCharts:group`
- `GET /downloadExportModule`
- `GET /get3dImg`
- `GET /img`
- `GET /tile`
- `POST /batchExportModule`
- `POST /batchUpdateModule`
- `POST /editModule`
- `POST /saveModuleImg`
- `POST /updateModuleImg`

</details>

<details><summary>kingclient / projectGroup_router_config.js（7）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingclient/exe/lib/routers/api/v1/projectGroup_router_config.js)

- `DELETE /group`
- `DELETE /groupRoles`
- `GET /group`
- `GET /groupRoles`
- `POST /group`
- `POST /groupRoles`
- `PUT /group`

</details>

<details><summary>kingclient / project_router_config.js（112）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingclient/exe/lib/routers/api/v1/project_router_config.js)

- `DELETE /delDataItem`
- `DELETE /delDataSet`
- `DELETE /delGroupById`
- `DELETE /delReportManagerServer`
- `DELETE /deleteCollection`
- `DELETE /deleteDataSource`
- `DELETE /deleteProject`
- `DELETE /deleteReportGroupServer`
- `DELETE /deleteRole`
- `DELETE /deleteScriptGroup`
- `DELETE /deleteVariableGroup`
- `DELETE /share`
- `DELETE /share/all`
- `GET /batchGetPageFile`
- `GET /batchGetReport`
- `GET /deleteProjectData`
- `GET /getAllResource`
- `GET /getAllSeat`
- `GET /getCollectInfo`
- `GET /getCopyPageName`
- `GET /getDataItem`
- `GET /getDataSet`
- `GET /getDataSetItem`
- `GET /getDataSourceInfo`
- `GET /getDataSourceList`
- `GET /getFirstPage`
- `GET /getGlobalScript`
- `GET /getGroupById`
- `GET /getGroupByParentId`
- `GET /getPageByPageName`
- `GET /getPageMngID`
- `GET /getPages`
- `GET /getPerantGroupByPageId`
- `GET /getProjectConfigureTree`
- `GET /getProjectFile`
- `GET /getReport`
- `GET /getReportManager`
- `GET /getResource`
- `GET /getRoleList`
- `GET /getSceneInfo`
- `GET /getScriptGroupServer`
- `GET /getTopGroupWithGroupId`
- `GET /getVariableList`
- `GET /getVariableListByGroup`
- `GET /getVariableTree`
- `GET /isExistGroupName`
- `GET /isExistPageName`
- `GET /isUserCreateProject`
- `GET /projectById`
- `GET /projectList`
- `GET /share`
- `GET /updatePageTagId`
- `POST /addCollection`
- `POST /addDataSource`
- `POST /addVariable`
- `POST /addVariableGroup`
- `POST /createDateItem`
- `POST /createDateSet`
- `POST /createGroup`
- `POST /createPage`
- `POST /createProject`
- `POST /createQuoteRelation`
- `POST /createReportGroupServer`
- `POST /createReportManager`
- `POST /createRole`
- `POST /createScriptGroup`
- `POST /deletePageBatch`
- `POST /deleteVariable`
- `POST /exportAppProject`
- `POST /extractResources`
- `POST /getMultiSeat`
- `POST /getPagesBatchByIds`
- `POST /getPagesByNames`
- `POST /handlePageRecordMng`
- `POST /handleProject`
- `POST /importPage`
- `POST /importPageBatch`
- `POST /importReport`
- `POST /importTranslateSource`
- `POST /importVariable`
- `POST /moveScriptGroupServer`
- `POST /pastePage`
- `POST /releaseMultiSeat`
- `POST /releaseMultiSeatByUserName`
- `POST /saveHtModel`
- `POST /saveProjectData`
- `POST /saveResource`
- `POST /setGlobalScript`
- `POST /setMultiSeat`
- `POST /setPervasionPages`
- `POST /setVariableFile`
- `POST /share`
- `POST /translateDecrypt`
- `POST /updateVariable`
- `POST /uploadLocalProject`
- `PUT /editDataItem`
- `PUT /editDataSet`
- `PUT /editDataSource`
- `PUT /editReport`
- `PUT /editReportManager`
- `PUT /editRole`
- `PUT /editVariable`
- `PUT /moveToGroup`
- `PUT /movesToGroup`
- `PUT /putCollection`
- `PUT /setAppName`
- `PUT /setDefaultName`
- `PUT /updateGroup`
- `PUT /updatePage`
- `PUT /updateProject`
- `PUT /updateReportGroupServer`
- `PUT /updateScriptGroup`

</details>

<details><summary>数采设备、变量与通信接口（91）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingioserver/exe/Routes/RestfulManage.js)

- `DELETE /daDelDeviceGroups`
- `DELETE /daDelDevices`
- `DELETE /daDelVars`
- `DELETE /deleteTransConfig`
- `DELETE /devices`
- `DELETE /drivers`
- `DELETE /projects`
- `DELETE /storages`
- `DELETE /uaDelDevices`
- `DELETE /uaDelVars`
- `DELETE /variables`
- `DELETE /wosDelConfig`
- `GET /daChildSources`
- `GET /daDeviceGroups`
- `GET /daDevices`
- `GET /daExportDevices`
- `GET /daImportDevices`
- `GET /daRootSources`
- `GET /daTagProperty`
- `GET /daTestConnect`
- `GET /daVars`
- `GET /devices`
- `GET /drivers`
- `GET /findExternalConfig`
- `GET /findOneTransConfig`
- `GET /findRedunceConfig`
- `GET /findTransConfigs`
- `GET /getDriverIni`
- `GET /projects`
- `GET /uaChildSources`
- `GET /uaDevices`
- `GET /uaRootSources`
- `GET /uaVars`
- `GET /variables`
- `GET /wosGetConfig`
- `POST /addDevices`
- `POST /addExternalConfig`
- `POST /addRedunceConfig`
- `POST /addStorageConfig`
- `POST /addTransConfig`
- `POST /addVars`
- `POST /daAddDevice`
- `POST /daAddDeviceGroup`
- `POST /daAddVariables`
- `POST /daExportVars`
- `POST /daImportVars`
- `POST /devices`
- `POST /drivers`
- `POST /editPropertyTable`
- `POST /editStorageConfig`
- `POST /exportDevs`
- `POST /exportPros`
- `POST /exportTags`
- `POST /getDBAPPpropety`
- `POST /getDataTypeByRegNameFromDriver`
- `POST /getRegisterNamesFromDriver`
- `POST /getRunProjectExam`
- `POST /getStorageList`
- `POST /importDevs`
- `POST /importPros`
- `POST /importTags`
- `POST /projects`
- `POST /publishProjectInfo`
- `POST /registerdatatypes`
- `POST /registers`
- `POST /saveDriverIni`
- `POST /submitCollectTagPropertyFromDriver`
- `POST /uaAddDevice`
- `POST /uaAddVariables`
- `POST /uaConnect`
- `POST /uaExportDevices`
- `POST /uaExportVars`
- `POST /uaImportDevices`
- `POST /uaImportVars`
- `POST /updateCATransConfig`
- `POST /updateProjectToApp`
- `POST /updateTransConfig`
- `POST /variables`
- `POST /wosAddConfig`
- `PUT /daEditDevice`
- `PUT /daEditDeviceGroup`
- `PUT /daEditVars`
- `PUT /devices`
- `PUT /drivers`
- `PUT /editDevices`
- `PUT /editVariables`
- `PUT /projects`
- `PUT /uaEditDevice`
- `PUT /uaEditVariables`
- `PUT /variables`
- `PUT /wosEditConfig`

</details>


## 原生编辑器、脚本与运行端

以下是选定的功能目录和运行入口。原生二维控件、动态绑定与脚本配置项按实现文件定位；三维只登记 KF 编辑入口，依赖库及美术资源不计作助手能力。

<details><summary>二维图元、控件及动态绑定（246）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingclient/exe/public/javascripts/Common/Graphic)

- `ChartComponent/AlarmEventWindow/AlarmWindow/km_alarmwindow.js`
- `ChartComponent/AlarmEventWindow/AlarmWindow/km_alarmwindow_list.js`
- `ChartComponent/AlarmEventWindow/EventWindow/km_eventwindow.js`
- `ChartComponent/AlarmEventWindow/EventWindow/km_eventwindow_list.js`
- `ChartComponent/AlarmEventWindow/km_aewindow_base.js`
- `ChartComponent/AlarmEventWindow/km_aewindow_datamanager.js`
- `ChartComponent/AlarmEventWindow/km_aewindow_list.js`
- `ChartComponent/AlarmEventWindow/km_aewindow_statusbar.js`
- `ChartComponent/AlarmEventWindow/km_aewindow_title.js`
- `ChartComponent/AlarmEventWindow/km_aewindow_toolbar.js`
- `ChartComponent/AlarmEventWindow/km_aewindow_tree.js`
- `ChartComponent/AlarmEventWindow/km_aewindowfilter_editor.js`
- `ChartComponent/AlarmEventWindow/km_aewinwoquery_editor.js`
- `ChartComponent/AlarmEventWindow/km_alarmwindow_list.js`
- `ChartComponent/AlarmEventWindow/km_confirmremark_editor.js`
- `ChartComponent/AlarmEventWindow/kmui_aewindow_datasource.js`
- `ChartComponent/CustomCharts/ECharts/km_chart_mng.js`
- `ChartComponent/CustomCharts/ECharts/kmui_chart.js`
- `ChartComponent/CustomCharts/Reports/kmui_grid.js`
- `ChartComponent/CustomCharts/km_custom_charts.js`
- `ChartComponent/CustomCharts/kmui_customcharts_base.js`
- `ChartComponent/EChart/BarChart/kmcc_barchart.js`
- `ChartComponent/EChart/BarChart/kmcc_barchart_area.js`
- `ChartComponent/EChart/BarChart/kmcc_barchart_axis.js`
- `ChartComponent/EChart/BarChart/kmcc_barchart_series.js`
- `ChartComponent/EChart/PieChart/kmcc_piechart.js`
- `ChartComponent/EChart/PieChart/kmcc_piechart_area.js`
- `ChartComponent/EChart/PieChart/kmcc_piechart_series.js`
- `ChartComponent/EChart/TrendChart/kmcc_trendchart.js`
- `ChartComponent/EChart/TrendChart/kmcc_trendchart_area.js`
- `ChartComponent/EChart/TrendChart/kmcc_trendchart_axis.js`
- `ChartComponent/EChart/TrendChart/kmcc_trendchart_series.js`
- `ChartComponent/EChart/XYChart/kmcc_xychart.js`
- `ChartComponent/EChart/XYChart/kmcc_xychart_area.js`
- `ChartComponent/EChart/XYChart/kmcc_xychart_axis.js`
- `ChartComponent/EChart/XYChart/kmcc_xychart_series.js`
- `ChartComponent/EChart/kmcc_area_base.js`
- `ChartComponent/EChart/kmcc_auxiliary.js`
- `ChartComponent/EChart/kmcc_axis_base.js`
- `ChartComponent/EChart/kmcc_chart_base.js`
- `ChartComponent/EChart/kmcc_data_zoom.js`
- `ChartComponent/EChart/kmcc_grid.js`
- `ChartComponent/EChart/kmcc_legend.js`
- `ChartComponent/EChart/kmcc_series_base.js`
- `ChartComponent/EChart/kmcc_title.js`
- `ChartComponent/EChart/kmcc_toolbox.js`
- `ChartComponent/EChart/kmcc_tooltip.js`
- `ChartComponent/km_chart_component_base.js`
- `ElementUI/kmui_elementui_base.js`
- `ElementUI/kmui_elementui_button.js`
- `ElementUI/kmui_elementui_cascader.js`
- `ElementUI/kmui_elementui_checkbox.js`
- `ElementUI/kmui_elementui_datetimepicker.js`
- `ElementUI/kmui_elementui_dropdown.js`
- `ElementUI/kmui_elementui_image.js`
- `ElementUI/kmui_elementui_input.js`
- `ElementUI/kmui_elementui_inputnumber.js`
- `ElementUI/kmui_elementui_map.js`
- `ElementUI/kmui_elementui_navmenu.js`
- `ElementUI/kmui_elementui_radio.js`
- `ElementUI/kmui_elementui_select.js`
- `ElementUI/kmui_elementui_steps.js`
- `ElementUI/kmui_elementui_switch.js`
- `ElementUI/kmui_elementui_table.js`
- `ElementUI/kmui_elementui_tabs.js`
- `ElementUI/kmui_elementui_tag.js`
- `ElementUI/kmui_elementui_timeline.js`
- `ElementUI/kmui_elementui_transfer.js`
- `ElementUI/kmui_elementui_tree.js`
- `ElementUI/kmui_elementui_upload.js`
- `FlowChart/km_arc.js`
- `FlowChart/km_bezier_close.js`
- `FlowChart/km_bezier_open.js`
- `FlowChart/km_bow.js`
- `FlowChart/km_canvas.js`
- `FlowChart/km_ellipse.js`
- `FlowChart/km_graphic_base.js`
- `FlowChart/km_graphic_group.js`
- `FlowChart/km_graphic_mng.js`
- `FlowChart/km_image.js`
- `FlowChart/km_line.js`
- `FlowChart/km_path.js`
- `FlowChart/km_percent_fill_style.js`
- `FlowChart/km_pie.js`
- `FlowChart/km_pipe.js`
- `FlowChart/km_polygon.js`
- `FlowChart/km_polyline.js`
- `FlowChart/km_rectangle.js`
- `FlowChart/km_round_rectangle.js`
- `FlowChart/km_select_manager.js`
- `FlowChart/km_spline_close.js`
- `FlowChart/km_spline_open.js`
- `FlowChart/km_text.js`
- `FlowChart/km_tile.js`
- `FlowChart/km_tile_calc.js`
- `Layout/kmui_accordion.js`
- `Layout/kmui_component_group.js`
- `Layout/kmui_componentbase.js`
- `Layout/kmui_form_layout.js`
- `Layout/kmui_grid_layout.js`
- `Layout/kmui_horizontal_layout.js`
- `Layout/kmui_ht_3d_layout/kmui_ht_3d_layout.js`
- `Layout/kmui_ht_3d_layout/kmui_ht_3d_layout_view.js`
- `Layout/kmui_ht_layout/kmui_ht_layout.js`
- `Layout/kmui_ht_layout/kmui_ht_layout_view.js`
- `Layout/kmui_layout.js`
- `Layout/kmui_layoutcomponentbase.js`
- `Layout/kmui_mobile_layout.js`
- `Layout/kmui_tab.js`
- `Layout/kmui_twodimensional_layout.js`
- `Layout/kmui_twodimensionalview.js`
- `Layout/kmui_vertical_layout.js`
- `Layout/kmui_windiag_layout.js`
- `Link/Expression/km_displaylink.js`
- `Link/Expression/km_displaylinkblink.js`
- `Link/Expression/km_displaylinkbrush.js`
- `Link/Expression/km_displaylinkenable.js`
- `Link/Expression/km_displaylinkfillblink.js`
- `Link/Expression/km_displaylinkfillpercent.js`
- `Link/Expression/km_displaylinkhorzfillpercent.js`
- `Link/Expression/km_displaylinkhorzscale.js`
- `Link/Expression/km_displaylinkhorzshift.js`
- `Link/Expression/km_displaylinkorientation.js`
- `Link/Expression/km_displaylinkpen.js`
- `Link/Expression/km_displaylinkpenblink.js`
- `Link/Expression/km_displaylinkpipeflow.js`
- `Link/Expression/km_displaylinkrotation.js`
- `Link/Expression/km_displaylinkscale.js`
- `Link/Expression/km_displaylinkshift.js`
- `Link/Expression/km_displaylinkshowhideblink.js`
- `Link/Expression/km_displaylinktextblink.js`
- `Link/Expression/km_displaylinktextbrush.js`
- `Link/Expression/km_displaylinkvertfillpercent.js`
- `Link/Expression/km_displaylinkvertscale.js`
- `Link/Expression/km_displaylinkvertshift.js`
- `Link/Expression/km_displaylinkvisibility.js`
- `Link/Expression/km_expressionlink.js`
- `Link/Expression/km_textoutputlink.js`
- `Link/Expression/km_textoutputlinkanalog.js`
- `Link/Expression/km_textoutputlinkdiscret.js`
- `Link/Expression/km_textoutputliskstring.js`
- `Link/Expression/km_valueinput.js`
- `Link/km_link.js`
- `Link/km_linkmanager.js`
- `Link/km_objectlink.js`
- `Link/trigger/km_alarmevent.js`
- `Link/trigger/km_customizelink.js`
- `Link/trigger/km_datachangelink.js`
- `Link/trigger/km_inputlink.js`
- `Link/trigger/km_inputlinkanalog.js`
- `Link/trigger/km_inputlinkdiscret.js`
- `Link/trigger/km_inputlinkstring.js`
- `Link/trigger/km_modellink.js`
- `Link/trigger/km_mouselink.js`
- `Link/trigger/km_mouselinkleftdoubleclick.js`
- `Link/trigger/km_mouselinkleftmousepressed.js`
- `Link/trigger/km_mouselinkover.js`
- `Link/trigger/km_mouselinkrightmousepressed.js`
- `Link/trigger/km_scripttrggerlink.js`
- `Link/trigger/km_showinglink.js`
- `Link/trigger/km_triggerlink.js`
- `Link/trigger/km_uilink.js`
- `Model/DataModel/km_datamodel.js`
- `Model/DataModel/km_datamodel_changelistener.js`
- `Model/DataModel/km_related_variable_item.js`
- `Model/HT3DModel/km_graphic_ht_3d.js`
- `Model/HT3DModel/km_ht_3d_model_variable_event.js`
- `Model/HTModel/km_graphic_ht.js`
- `Model/HTModel/km_htModel_event.js`
- `Model/HTModel/km_htModel_variable_event.js`
- `Model/PublicEvent/km_publicEvent.js`
- `Model/PublicEvent/km_publicEventAssociate.js`
- `Model/PublicEvent/km_publicEventAssociate_manager.js`
- `Model/PublicEvent/km_publicEvent_manager.js`
- `Model/PublicProperty/km_publicProperty.js`
- `Model/PublicProperty/km_publicProperty_manager.js`
- `Model/PublicProperty/km_related_variable_info.js`
- `Model/PublicProperty/km_variable_subscribe_item.js`
- `Model/indexdb.js`
- `Model/km_2d_container_backprop.js`
- `Model/km_associateGraphic_model.js`
- `Model/km_compositeGraphic_model.js`
- `Model/km_dependitem.js`
- `Model/km_diffusion_manager.js`
- `Model/km_graphic_model.js`
- `Model/km_layer.js`
- `Model/km_layermanager.js`
- `Model/km_model_base.js`
- `Model/km_modeldepender.js`
- `Model/km_page.js`
- `Model/km_page_base.js`
- `Model/km_page_datasource.js`
- `Model/km_page_property.js`
- `ReportUI/kmui_report_model.js`
- `TwoFlowChart/kmui_flowchart_base.js`
- `TwoFlowChart/kmui_twodimensionalflowchart.js`
- `UI/kmui_button_model.js`
- `UI/kmui_checkbox_model.js`
- `UI/kmui_combobox_model.js`
- `UI/kmui_custome_model.js`
- `UI/kmui_ext_calendar.js`
- `UI/kmui_ext_combobox.js`
- `UI/kmui_ext_combotree.js`
- `UI/kmui_ext_datagrid.js`
- `UI/kmui_ext_linkbutton.js`
- `UI/kmui_ext_numberbox.js`
- `UI/kmui_ext_numberspinner.js`
- `UI/kmui_ext_propergrid.js`
- `UI/kmui_ext_searchbox.js`
- `UI/kmui_ext_sidemenu.js`
- `UI/kmui_ext_slider.js`
- `UI/kmui_ext_spinner.js`
- `UI/kmui_ext_switchbutton.js`
- `UI/kmui_ext_tagbox.js`
- `UI/kmui_ext_textbox.js`
- `UI/kmui_ext_timespinner.js`
- `UI/kmui_extdatebox.js`
- `UI/kmui_extdatetimebox.js`
- `UI/kmui_extdialog.js`
- `UI/kmui_extfilebox.js`
- `UI/kmui_extmenubutton.js`
- `UI/kmui_extpagination.js`
- `UI/kmui_extprogressbar.js`
- `UI/kmui_exttooltip.js`
- `UI/kmui_exttree.js`
- `UI/kmui_exttreegird.js`
- `UI/kmui_extvalidatebox.js`
- `UI/kmui_extwindows.js`
- `UI/kmui_factorycalendar.js`
- `UI/kmui_gantt.js`
- `UI/kmui_horizontal_spacer.js`
- `UI/kmui_image_carsuel.js`
- `UI/kmui_image_sequence.js`
- `UI/kmui_list_model.js`
- `UI/kmui_modelbase.js`
- `UI/kmui_radio_model.js`
- `UI/kmui_richtext.js`
- `UI/kmui_scale.js`
- `UI/kmui_textbox.js`
- `UI/kmui_time.js`
- `UI/kmui_treeview.js`
- `UI/kmui_uibase.js`
- `UI/kmui_validatebox.js`
- `UI/kmui_vertical_spacer.js`
- `UI/kmui_webcontainer.js`
- `km_svg_convert.js`

</details>

<details><summary>原生编辑器与脚本配置（66）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingclient/exe/public/javascripts/DevelopClient/libs/editor)

- `2dprocessflowcharteditor/kmui_2Dflowchart_editor.js`
- `2dprocessflowcharteditor/kmui_2Dflowchart_toolkit.js`
- `2dprocessflowcharteditor/kmui_2Dflowchart_view.js`
- `chartscomponenteditor/kmui_customcharts_editor.js`
- `chartscomponenteditor/kmui_customcharts_view.js`
- `chartscomponenteditor/kmui_customchartstoolkit.js`
- `chartscomponenteditor/kmui_option_editor.js`
- `graphicmodeleditor/kmui_graphic_view.js`
- `graphicmodeleditor/kmui_graphicmodel_editor.js`
- `graphicmodeleditor/kmui_graphicmodeltoolkit.js`
- `ht3deditor/Pipe.js`
- `ht3deditor/kmui_ht_3d_editor.js`
- `ht3deditor/kmui_ht_3d_editor_container.js`
- `ht3deditor/kmui_ht_3d_toolkit.js`
- `ht3deditor/kmui_ht_3d_view.js`
- `hteditor/kmui_ht_editor.js`
- `hteditor/kmui_ht_toolkit.js`
- `hteditor/kmui_ht_view.js`
- `km_draggable.js`
- `km_name_manager.js`
- `kmui_editor_base.js`
- `kmui_multi_level_toolkit.js`
- `kmui_toolkit.js`
- `kmui_toolkit_accordion_panel.js`
- `kmui_uiscript_editor.js`
- `kmui_view_base.js`
- `pageeditor/kmui_page_editor.js`
- `pageeditor/kmui_page_view.js`
- `pageeditor/kmui_pagetoolkit.js`
- `scripteditor/km_basiccompositeflow.js`
- `scripteditor/km_basicpipeflow.js`
- `scripteditor/km_basicsingle.js`
- `scripteditor/km_configbasicbase.js`
- `scripteditor/km_configpropertybase.js`
- `scripteditor/km_configrotatebase.js`
- `scripteditor/km_configurebase.js`
- `scripteditor/km_configurebrushproperty.js`
- `scripteditor/km_configurefill.js`
- `scripteditor/km_configuremove.js`
- `scripteditor/km_configurepenproperty.js`
- `scripteditor/km_configuretextbrushproperty.js`
- `scripteditor/km_configuretwinkle.js`
- `scripteditor/km_configurevalinputbase.js`
- `scripteditor/km_configurevaloutbase.js`
- `scripteditor/km_configurezoom.js`
- `scripteditor/km_keyword.js`
- `scripteditor/km_memberevent.js`
- `scripteditor/km_rotate_axis_3d.js`
- `scripteditor/km_rotatecenter.js`
- `scripteditor/km_rotateself.js`
- `scripteditor/km_rotateself_3d.js`
- `scripteditor/km_scripteditor.js`
- `scripteditor/km_scriptfunconfig.js`
- `scripteditor/km_valinputanalog.js`
- `scripteditor/km_valinputdiscrete.js`
- `scripteditor/km_valinputstring.js`
- `scripteditor/km_valoutdiscrete.js`
- `scripteditor/km_valoutimitate.js`
- `scripteditor/km_valoutstring.js`
- `scripteditor/km_variableselector.js`
- `scripteditor/kmse_assistarea.js`
- `scripteditor/kmse_connect.js`
- `scripteditor/kmse_toolbar.js`
- `scripteditor/kmui_ht_scripteditor.js`
- `scripteditor/kmui_model_popup.js`
- `scripteditor/kmui_scripteditor.js`

</details>

<details><summary>原生三维入口（4）</summary>

[源码](../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingclient/exe/public/javascripts/HT3DEditor/client)

- `client.js`
- `client3d.js`
- `index.html`
- `index3d.html`

</details>

<details><summary>计算脚本宿主及保护逻辑（8）</summary>

[源码](../kf-reference/KingFusion3.6_Node/kingexedb/kingcalculation/exe/lib/service/globalScriptMng)

- `conditionEventScript/condition_script.js`
- `customEventScript/customEventScript.js`
- `customFunction/customFunction.js`
- `dataChangeEventScript/dataChangeScript.js`
- `onDemandCalcScript/onDemandCalcScript.js`
- `periodicScript/periodScript.js`
- `scriptGuard.js`
- `systemScript/systemScript.js`

</details>

<details><summary>运行报警规则、状态及事件（22）</summary>

[源码](../kf-reference/KingFusion3.6_Node/kingexedb/kingalarm/exe/lib/services/alarm)

- `alarm_config.js`
- `alarm_item.js`
- `alarm_mng.js`
- `api/confirm.js`
- `api/delete.js`
- `api/getAllConfig.js`
- `api/getConfigOfTag.js`
- `api/getConnectionInfo.js`
- `api/setConfigOfTag.js`
- `calculators/discrete.js`
- `calculators/restricted.js`
- `custom/depIndex.js`
- `custom/depIndex_bak.js`
- `custom/groupLoader.js`
- `custom/index.js`
- `custom/loader.js`
- `custom/runner.js`
- `custom/scheduler.js`
- `formatters/cache.js`
- `formatters/events.js`
- `state/upgradeScheduler.js`
- `utils.js`

</details>

<details><summary>运行数据源适配器源码（19）</summary>

[源码](../kf-reference/KingFusion3.6_Node/kingexedb/kingdbconnector/exe/lib/services/datasource/datasource_access)

- `datasource_alarm_server.js`
- `datasource_base.js`
- `datasource_dm.js`
- `datasource_emqx.js`
- `datasource_ioredis.js`
- `datasource_ioserver.js`
- `datasource_kh.js`
- `datasource_kh4.0.js`
- `datasource_ks.js`
- `datasource_ks_linux.js`
- `datasource_kv.js`
- `datasource_mongodb.js`
- `datasource_mysql.js`
- `datasource_oracle.js`
- `datasource_pg.js`
- `datasource_sqlserver.js`
- `datasource_tdengine.js`
- `datasource_uads.js`
- `index.js`

</details>

<details><summary>运行报表数据消费（1）</summary>

[源码](../kf-reference/KingFusion3.6_Node/kingexedb/kingclient/exe/lib/services/reportDataMng)

- `index.js`

</details>

<details><summary>客户端运行画面与取数（13）</summary>

[源码](../kf-reference/KingFusion3.6_Node/kingexedb/kingclient/exe/public/javascripts/RunClient/Frame/libs/runview)

- `km_datasourcemanagerapi.js`
- `km_object_convert.js`
- `km_pagemanager.js`
- `km_project_server.js`
- `km_stationdataserver.js`
- `km_stationdataserver_manager.js`
- `km_system_event.js`
- `km_system_interval.js`
- `km_system_request_mng.js`
- `km_ui_initial.js`
- `km_userauth_manager.js`
- `kmui_ht_3d_editor_container.js`
- `kmui_ht_3d_preview_container.js`

</details>

<details><summary>运维节点与 App 界面（4）</summary>

[源码](../front/src/views/Main/RunningNodesManagerView)

- `RunningNodesManagerDialogView/AppOverviewDialog.vue`
- `RunningNodesManagerDialogView/LoadBalancerInfoDialog.vue`
- `RunningNodesManagerDialogView/UpsertRunningNodesManagerDialog.vue`
- `RunningNodesManagerEngineer.vue`

</details>

<details><summary>节点部署处理（2）</summary>

[源码](../kf-reference/KingFusion3.6_Node/kingopsproxy/exe/kingopsagent/exe/lib/services/deploy)

- `deploy.js`
- `pm2Delegate.js`

</details>


## 助手实际入口与版本复核

登记表来自当前助手。配置读取、模型工具和浮窗实时监视的入口分别审阅。下列短指纹用于提醒维护者复核同名实现的内容变更。

<details><summary>queryTools（29）</summary>

[源码](../dev/agent/src/query-tools.ts)

- `check_script_drafts`
- `clarify_calculation_contract`
- `compile_calculation_formula`
- `explain_selected_script`
- `find_objects`
- `get_context`
- `inspect_alarm_rule`
- `inspect_calc_config`
- `inspect_calc_results`
- `inspect_calculation_io`
- `inspect_collection_setup`
- `inspect_control_binding`
- `inspect_project_overview`
- `inspect_report_dataset`
- `inspect_scene_binding`
- `inspect_script_environment`
- `inspect_solution_overview`
- `lookup_calc_runtime`
- `lookup_reference`
- `plan_solution`
- `prepare_calculation`
- `prepare_solution_script`
- `read_alarm_samples`
- `read_client_variables`
- `read_object`
- `read_runtime`
- `review_solution_script`
- `trace_refs`
- `validate_candidate`

</details>

<details><summary>skills（9）</summary>

[源码](../dev/agent/src/skills.ts)

- `alarm`
- `calculation`
- `collection`
- `datasource`
- `page`
- `report`
- `runtime`
- `scene`
- `solution`

</details>

<details><summary>steps（18）</summary>

[源码](../dev/agent/src/next-step.ts)

- `alarmRaise`
- `alarmRecover`
- `alarmRule`
- `alarmSource`
- `clientPoint`
- `clientRun`
- `clientSource`
- `datasource`
- `deployment`
- `device`
- `monitor`
- `pageBinding`
- `point`
- `project`
- `publish`
- `report`
- `scene`
- `script`

</details>

<details><summary>questions（11）</summary>

[源码](../dev/agent/src/next-step.ts)

- `app`
- `conditions`
- `connection`
- `control`
- `driver`
- `goal`
- `measurement`
- `pointName`
- `progress`
- `protocol`
- `source`

</details>

| 助手代码、模板及测试 | SHA-256 前 16 位 |
| --- | --- |
| [dev/agent/src/alarm-route.ts](../dev/agent/src/alarm-route.ts) | `a1ea1995cd718635` |
| [dev/agent/src/alarm-rule.ts](../dev/agent/src/alarm-rule.ts) | `2a7eaba28d4ec7bb` |
| [dev/agent/src/alarm-samples.ts](../dev/agent/src/alarm-samples.ts) | `f5730f2ecdff8a01` |
| [dev/agent/src/business-probe.ts](../dev/agent/src/business-probe.ts) | `6ecfe1ddbeb81d47` |
| [dev/agent/src/calc-config.ts](../dev/agent/src/calc-config.ts) | `066179b1f73e8c06` |
| [dev/agent/src/calc-function-knowledge.ts](../dev/agent/src/calc-function-knowledge.ts) | `6f36ffc237b673bd` |
| [dev/agent/src/calc-generation.ts](../dev/agent/src/calc-generation.ts) | `a29cb861aaa71e6b` |
| [dev/agent/src/calc-journal.ts](../dev/agent/src/calc-journal.ts) | `69fbb935db5ec837` |
| [dev/agent/src/calc-result.ts](../dev/agent/src/calc-result.ts) | `786ae9f1842cf004` |
| [dev/agent/src/calc-runtime.ts](../dev/agent/src/calc-runtime.ts) | `e48657e51f87bce9` |
| [dev/agent/src/calc-sources.ts](../dev/agent/src/calc-sources.ts) | `d62d676328a494dd` |
| [dev/agent/src/calendar.ts](../dev/agent/src/calendar.ts) | `0124468a9d507ef4` |
| [dev/agent/src/candidate.ts](../dev/agent/src/candidate.ts) | `5db430ce947f4291` |
| [dev/agent/src/catalog.ts](../dev/agent/src/catalog.ts) | `39db286c1180c0fb` |
| [dev/agent/src/center.ts](../dev/agent/src/center.ts) | `e84da9defa8495c0` |
| [dev/agent/src/client-points.ts](../dev/agent/src/client-points.ts) | `4f59d673f560d1e6` |
| [dev/agent/src/client-variables.ts](../dev/agent/src/client-variables.ts) | `f64edaaf1fde3e33` |
| [dev/agent/src/collection-setup.ts](../dev/agent/src/collection-setup.ts) | `a9109b26fee68515` |
| [dev/agent/src/condition-authoring.ts](../dev/agent/src/condition-authoring.ts) | `49f2737309d032bb` |
| [dev/agent/src/connection-receipts.ts](../dev/agent/src/connection-receipts.ts) | `f1a636abf5fd00c2` |
| [dev/agent/src/control-binding.ts](../dev/agent/src/control-binding.ts) | `59bc9a3be5bdf15b` |
| [dev/agent/src/custom-functions.ts](../dev/agent/src/custom-functions.ts) | `50f6f19579e30e62` |
| [dev/agent/src/dependency.ts](../dev/agent/src/dependency.ts) | `aeead3ab505bba4d` |
| [dev/agent/src/dictionary.ts](../dev/agent/src/dictionary.ts) | `1d3288cfb7685f6e` |
| [dev/agent/src/examples.ts](../dev/agent/src/examples.ts) | `a90dee2d89236f50` |
| [dev/agent/src/formula.ts](../dev/agent/src/formula.ts) | `0bba7fac5cfe7b1b` |
| [dev/agent/src/guidance.ts](../dev/agent/src/guidance.ts) | `e36b024d9edcf010` |
| [dev/agent/src/js-bindings.ts](../dev/agent/src/js-bindings.ts) | `6477d1858e368a98` |
| [dev/agent/src/kc-registrations.ts](../dev/agent/src/kc-registrations.ts) | `2d68f6381754a893` |
| [dev/agent/src/mcp.ts](../dev/agent/src/mcp.ts) | `080e4b077e307f97` |
| [dev/agent/src/model-answer.ts](../dev/agent/src/model-answer.ts) | `13f5658d9eaac889` |
| [dev/agent/src/next-step.ts](../dev/agent/src/next-step.ts) | `44213d0b4647f988` |
| [dev/agent/src/opencode.ts](../dev/agent/src/opencode.ts) | `10d65ebb7561f0c5` |
| [dev/agent/src/page-trace.ts](../dev/agent/src/page-trace.ts) | `ad490599a50126a9` |
| [dev/agent/src/project-overview.ts](../dev/agent/src/project-overview.ts) | `3487bd4a9f42c27e` |
| [dev/agent/src/quality-probe.ts](../dev/agent/src/quality-probe.ts) | `fcd0fd8cade027dd` |
| [dev/agent/src/query-activity.ts](../dev/agent/src/query-activity.ts) | `74ae2bf05f2604e7` |
| [dev/agent/src/query-tools.ts](../dev/agent/src/query-tools.ts) | `00db072f66e78d08` |
| [dev/agent/src/reference-names.ts](../dev/agent/src/reference-names.ts) | `89eb71f72962411b` |
| [dev/agent/src/report-journal.ts](../dev/agent/src/report-journal.ts) | `cb9c83da93396867` |
| [dev/agent/src/report-reference.ts](../dev/agent/src/report-reference.ts) | `27051c8e8dc9f8d0` |
| [dev/agent/src/review-constraints.ts](../dev/agent/src/review-constraints.ts) | `661585dabd55d03d` |
| [dev/agent/src/runtime-screen.ts](../dev/agent/src/runtime-screen.ts) | `8cddfe896d3b697d` |
| [dev/agent/src/runtime.ts](../dev/agent/src/runtime.ts) | `3d62d5c7b4b4f598` |
| [dev/agent/src/scene-appearance.ts](../dev/agent/src/scene-appearance.ts) | `bc1defe36fde7c78` |
| [dev/agent/src/scene-binding.ts](../dev/agent/src/scene-binding.ts) | `9d7903625d20449a` |
| [dev/agent/src/scene-journal.ts](../dev/agent/src/scene-journal.ts) | `57e46162a4c84637` |
| [dev/agent/src/scene-observation.ts](../dev/agent/src/scene-observation.ts) | `4e91897c65cc8041` |
| [dev/agent/src/scene-timing.ts](../dev/agent/src/scene-timing.ts) | `be964714f7554907` |
| [dev/agent/src/script-authoring.ts](../dev/agent/src/script-authoring.ts) | `aac774002ca738fb` |
| [dev/agent/src/selected-script.ts](../dev/agent/src/selected-script.ts) | `9cc4f401b1608044` |
| [dev/agent/src/server.ts](../dev/agent/src/server.ts) | `c65baf1723946601` |
| [dev/agent/src/shared.ts](../dev/agent/src/shared.ts) | `b8c6cfac8622e09b` |
| [dev/agent/src/skills.ts](../dev/agent/src/skills.ts) | `0e98ca07a5e73710` |
| [dev/agent/src/solution-overview.ts](../dev/agent/src/solution-overview.ts) | `6ab5a14eb996d6e0` |
| [dev/agent/src/solution-script.ts](../dev/agent/src/solution-script.ts) | `b0e4414bfd90a9c5` |
| [dev/agent/src/solution-start.ts](../dev/agent/src/solution-start.ts) | `cc1cc61cfbff800d` |
| [dev/agent/src/store.ts](../dev/agent/src/store.ts) | `9808a6c0048c3255` |
| [dev/agent/src/task-memory.ts](../dev/agent/src/task-memory.ts) | `16aa63ad7fdd6033` |
| [dev/agent/src/trace.ts](../dev/agent/src/trace.ts) | `e00f4045ebb87980` |
| [dev/agent/runtime-observer/page-definition.js](../dev/agent/runtime-observer/page-definition.js) | `a0faccc8fe4c6f46` |
| [dev/agent/runtime-observer/read-alarm.js](../dev/agent/runtime-observer/read-alarm.js) | `56dfca1ea032c50d` |
| [dev/agent/runtime-observer/read-control.js](../dev/agent/runtime-observer/read-control.js) | `558991baa7a327dc` |
| [dev/agent/runtime-observer/read-report.js](../dev/agent/runtime-observer/read-report.js) | `51714ac69d0e7f22` |
| [dev/agent/runtime-observer/read-scene.js](../dev/agent/runtime-observer/read-scene.js) | `347ae63e0d837570` |
| [dev/agent/runtime-observer/worker.js](../dev/agent/runtime-observer/worker.js) | `f1bc05873aea2396` |
| [devFront/src/assistant/AssistantCodeBlock.vue](../devFront/src/assistant/AssistantCodeBlock.vue) | `bc27afc73883e2cc` |
| [devFront/src/assistant/AssistantPanel.vue](../devFront/src/assistant/AssistantPanel.vue) | `b21a6d03867f0498` |
| [devFront/src/assistant/AssistantReply.vue](../devFront/src/assistant/AssistantReply.vue) | `7646e5e0ba739e91` |
| [devFront/src/assistant/AssistantSidebar.vue](../devFront/src/assistant/AssistantSidebar.vue) | `136f256a08a8b06f` |
| [devFront/src/assistant/CalcCapture.vue](../devFront/src/assistant/CalcCapture.vue) | `0c3d3da2836cc972` |
| [devFront/src/assistant/ContextTools.vue](../devFront/src/assistant/ContextTools.vue) | `8291ea753dee860d` |
| [devFront/src/assistant/QueryActivity.vue](../devFront/src/assistant/QueryActivity.vue) | `cf15b0cd24011e0b` |
| [devFront/src/assistant/ReportCapture.vue](../devFront/src/assistant/ReportCapture.vue) | `fac4a84d64aad1d2` |
| [devFront/src/assistant/SceneCapture.vue](../devFront/src/assistant/SceneCapture.vue) | `f16fef2888bb4e4f` |
| [devFront/src/assistant/TurnNavigator.vue](../devFront/src/assistant/TurnNavigator.vue) | `49d2f985d2456890` |
| [devFront/src/assistant/api.js](../devFront/src/assistant/api.js) | `f361487f03f9fd89` |
| [devFront/src/assistant/assistant-answer.js](../devFront/src/assistant/assistant-answer.js) | `15fb86df0ad9cfac` |
| [devFront/src/assistant/calc-har.js](../devFront/src/assistant/calc-har.js) | `0721d431da99f90f` |
| [devFront/src/assistant/connection-test.js](../devFront/src/assistant/connection-test.js) | `39d3b50b5702bab2` |
| [devFront/src/assistant/editor-context.js](../devFront/src/assistant/editor-context.js) | `d78be2c8be3fb5f0` |
| [devFront/src/assistant/editor-main.js](../devFront/src/assistant/editor-main.js) | `15382e547ac3207d` |
| [devFront/src/assistant/entry.js](../devFront/src/assistant/entry.js) | `c3fede436d42d1d2` |
| [devFront/src/assistant/monitor-point.js](../devFront/src/assistant/monitor-point.js) | `ef0e8e7750f76eee` |
| [devFront/src/assistant/report-har.js](../devFront/src/assistant/report-har.js) | `fc52141e0b136b47` |
| [devFront/src/assistant/runtime-observation.js](../devFront/src/assistant/runtime-observation.js) | `a423124470316f11` |
| [devFront/src/assistant/scene-editor.js](../devFront/src/assistant/scene-editor.js) | `0a915c04b358a6b3` |
| [devFront/src/assistant/useAssistantWindow.js](../devFront/src/assistant/useAssistantWindow.js) | `0abb65363b8f397c` |
| [dev/agent/examples/period-mean.js.txt](../dev/agent/examples/period-mean.js.txt) | `d0c00f978d6aa7b0` |
| [dev/agent/examples/report-mean.js.txt](../dev/agent/examples/report-mean.js.txt) | `fd386469c17c42ac` |
| [dev/agent/examples/request-mean.js.txt](../dev/agent/examples/request-mean.js.txt) | `103b1fba8f5ff7e9` |
| [dev/agent/test/access.test.ts](../dev/agent/test/access.test.ts) | `a4955bc3e458565c` |
| [dev/agent/test/alarm-rule.test.ts](../dev/agent/test/alarm-rule.test.ts) | `c8f23a88d06eef02` |
| [dev/agent/test/alarm-samples.test.ts](../dev/agent/test/alarm-samples.test.ts) | `966d60f32f2af670` |
| [dev/agent/test/assistant.test.ts](../dev/agent/test/assistant.test.ts) | `9fa81a6d71b43436` |
| [dev/agent/test/business-probe.test.ts](../dev/agent/test/business-probe.test.ts) | `3b2b6717b6418948` |
| [dev/agent/test/calc-config.test.ts](../dev/agent/test/calc-config.test.ts) | `53fd4c463a8f532c` |
| [dev/agent/test/calc-generation.test.ts](../dev/agent/test/calc-generation.test.ts) | `8d20764079546938` |
| [dev/agent/test/calc-menu-context.test.ts](../dev/agent/test/calc-menu-context.test.ts) | `7bd96dfc1a0e9fa4` |
| [dev/agent/test/calc-result.test.ts](../dev/agent/test/calc-result.test.ts) | `b79cd98b77629182` |
| [dev/agent/test/calc-runtime.test.ts](../dev/agent/test/calc-runtime.test.ts) | `d228fbbf7bde6b03` |
| [dev/agent/test/calc-sources.test.ts](../dev/agent/test/calc-sources.test.ts) | `3032ee3387750a21` |
| [dev/agent/test/calendar.test.ts](../dev/agent/test/calendar.test.ts) | `aaa32c328d142a74` |
| [dev/agent/test/client-points.test.ts](../dev/agent/test/client-points.test.ts) | `635c3d726fe04d0f` |
| [dev/agent/test/client-variables.test.ts](../dev/agent/test/client-variables.test.ts) | `7c2d3ebc0ac4f720` |
| [dev/agent/test/collection-setup.test.ts](../dev/agent/test/collection-setup.test.ts) | `026e0c0d85068063` |
| [dev/agent/test/condition-authoring.test.ts](../dev/agent/test/condition-authoring.test.ts) | `acefdf2daea8047a` |
| [dev/agent/test/connection-receipts.test.ts](../dev/agent/test/connection-receipts.test.ts) | `705463b6936a3697` |
| [dev/agent/test/control-binding.test.ts](../dev/agent/test/control-binding.test.ts) | `c5a05232a14de457` |
| [dev/agent/test/custom-functions.test.ts](../dev/agent/test/custom-functions.test.ts) | `1c10e038bfd625a2` |
| [dev/agent/test/data-change.test.ts](../dev/agent/test/data-change.test.ts) | `cb157f3fe39c7501` |
| [dev/agent/test/dependency.test.ts](../dev/agent/test/dependency.test.ts) | `8829bb53abaecde5` |
| [dev/agent/test/dictionary.test.ts](../dev/agent/test/dictionary.test.ts) | `d64d8e5e2202ec76` |
| [dev/agent/test/engineering.test.ts](../dev/agent/test/engineering.test.ts) | `308d7be7e7bd5704` |
| [dev/agent/test/field-evidence.test.ts](../dev/agent/test/field-evidence.test.ts) | `0827ea6504ed8548` |
| [dev/agent/test/formula.test.ts](../dev/agent/test/formula.test.ts) | `670e7733abb43645` |
| [dev/agent/test/js-bindings.test.ts](../dev/agent/test/js-bindings.test.ts) | `49f534cbe1dd5b42` |
| [dev/agent/test/model-answer.test.ts](../dev/agent/test/model-answer.test.ts) | `5308357c8d947c97` |
| [dev/agent/test/monitor.test.ts](../dev/agent/test/monitor.test.ts) | `638537bd5a06f8f5` |
| [dev/agent/test/next-step.test.ts](../dev/agent/test/next-step.test.ts) | `4302bd3254775243` |
| [dev/agent/test/project-overview.test.ts](../dev/agent/test/project-overview.test.ts) | `b8baa20c903e3893` |
| [dev/agent/test/report-dataset.test.ts](../dev/agent/test/report-dataset.test.ts) | `b10a1feb2dfb0428` |
| [dev/agent/test/runtime-screen.test.ts](../dev/agent/test/runtime-screen.test.ts) | `769a52db525746b3` |
| [dev/agent/test/scene-appearance.test.ts](../dev/agent/test/scene-appearance.test.ts) | `766a55236063482f` |
| [dev/agent/test/scene-binding.test.ts](../dev/agent/test/scene-binding.test.ts) | `ffce4fafa18bebeb` |
| [dev/agent/test/scene-timing.test.ts](../dev/agent/test/scene-timing.test.ts) | `b32953f633f44130` |
| [dev/agent/test/script-authoring.test.ts](../dev/agent/test/script-authoring.test.ts) | `14165e8d39ce9e3a` |
| [dev/agent/test/selected-script.test.ts](../dev/agent/test/selected-script.test.ts) | `ca278e847cd17cdb` |
| [dev/agent/test/solution-overview.test.ts](../dev/agent/test/solution-overview.test.ts) | `07834da0616a0371` |
| [dev/agent/test/solution-script.test.ts](../dev/agent/test/solution-script.test.ts) | `7c9bec9b689c6101` |
| [dev/agent/test/solution-start.test.ts](../dev/agent/test/solution-start.test.ts) | `3427f8a46456c96f` |
| [dev/agent/test/system-authoring.test.ts](../dev/agent/test/system-authoring.test.ts) | `c94d01aa548cfd90` |
| [dev/agent/test/task-memory.test.ts](../dev/agent/test/task-memory.test.ts) | `367f41d440bb995e` |
| [dev/agent/test/tool-budget.test.ts](../dev/agent/test/tool-budget.test.ts) | `867456de4c6fcdde` |

检查范围包括静态路由、菜单键、Vue 文件名、具名请求封装、所列服务的接口登记、原生功能目录内文件名及助手代码内容。现有产品文件内同名属性的语义、动态拼接的 API、插件现场安装状态、协议驱动的外部点表和未接入服务的内部变化仍需单独审阅。源码快照不能证明现场正在运行的版本。
<!-- end -->
