// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
import { HttpError, type Context, type Fact, type ReportMember } from './shared.ts';
// end

type Read = (path: string, query?: Record<string, string>) => Promise<any>;
function rows(data: any): any[] {
  if (!Array.isArray(data)) throw new HttpError(502, '当前构建返回的清单格式未适配');
  return data;
}
function one(data: any[], key: string, value: string) {
  const matches = data.filter((row) => row?.[key] === value);
  if (matches.length !== 1) throw new HttpError(404, '当前工程未找到唯一的已保存对象，请重新选择');
  return matches[0];
}
export function cellAddress(row: number, column: number) {
  let letters = '';
  for (let n = column + 1; n > 0; n = Math.floor((n - 1) / 26))
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters + (row + 1);
}
export async function catalog(context: Context, read: Read) {
  const facts: Fact[] = [],
    gaps: string[] = [];
  // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
  let reportMember: ReportMember | undefined;
  let title = '',
    source = '';
  // end
  function listing(items: any[], label: string, name: string, extra?: string) {
    for (const item of items.slice(0, 24)) {
      if (typeof item?.[name] !== 'string') throw new HttpError(502, '当前对象的名称字段未适配');
      facts.push({ label, value: item[name] + (extra && item[extra] ? ' → ' + item[extra] : '') });
    }
    if (!items.length) gaps.push('该查询范围内的清单为空。');
    if (items.length > 24) gaps.push('仅展示前 24 项。');
  }
  switch (context.kind) {
    case 'client':
      title = '客户端工程 · 页面';
      source = 'client/getPages';
      listing(rows((await read('/' + source)).message?.Pages), '页面', 'name');
      break;
    case 'calculation':
      title = '计算工程 · 周期性脚本';
      source = 'calculation/projectJsonData';
      listing(rows(await read('/' + source, { type: 'periods', groupId: '-1' })), '周期脚本', 'name');
      break;
    case 'collection':
      title = '数采工程 · 设备';
      source = 'collect/devices';
      listing(rows(await read('/' + source)), '设备 / 驱动', 'deviceName', 'driverName');
      break;
    case 'alarm': {
      title = '报警工程 · 数据源';
      source = 'alarm/dataSource';
      const data = await read('/' + source, { guid: context.projectId });
      if (!data || typeof data !== 'object') throw new HttpError(502, '报警数据源清单格式未适配');
      listing(Object.values(data), '别名 / 数据源', 'name', 'dm_name');
      break;
    }
    case 'datasource': {
      source = 'dataSource/project';
      const item = one(
        rows(await read('/' + source, { projectGroupId: context.group! })),
        'guid',
        context.projectId,
      );
      title = '数据源 / ' + item.name;
      const type = item.projectData?.type ?? item.type;
      if (typeof type === 'string') facts.push({ label: '数据源类型', value: type });
      else gaps.push('本构建未提供可识别的类型。');
      break;
    }
    case 'scene': {
      source = 'client/getSceneInfo';
      title = '3D 场景 / ' + context.object;
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
      const sceneRows = rows(await read('/' + source));
      const relativePath = context.sceneView?.path;
      if (relativePath) {
        const paths = (items: any[]): string[] => items.flatMap(item => item.isDirectory ? paths(rows(item.childrenFile)) : [String(item.filePath || '/' + item.filename).replace(/^\//,'')]);
        if (relativePath.split('/').at(-1)!==context.object || paths(sceneRows).filter(path=>path===relativePath).length!==1)
          throw new HttpError(404,'当前工程未找到唯一的已保存场景路径。');
      } else one(sceneRows, 'filename', context.object);
// end
      facts.push({ label: '场景文件', value: context.object });
      // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
      gaps.push(
        context.sceneView
          ? '场景登记来自 Center。下方编辑器现场来自本标签页，实际运行画面另行核对。'
          : '已核实场景登记，当前未取得原生编辑器选区。',
      );
      // end
      break;
    }
    case 'report': {
      source = 'client/getReport';
      const item = one(rows(await read('/client/getReportManager')), 'id', context.object);
      title = '报表 / ' + item.name;
      const raw = await read('/' + source, { id: context.object });
      let report;
      try {
        report = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        throw new HttpError(502, '报表格式未适配');
      }
      if (!report?.workbookData?.sheets) {
        gaps.push('Center 未返回可识别的工作表。');
        break;
      }
      if (!context.cell) {
        gaps.push('请在当前工作表选中一个单元格。');
        break;
      }
      const { sheet, row, column } = context.cell,
        sheets = report.workbookData.sheets;
      if (!Object.hasOwn(sheets, sheet)) {
        gaps.push('当前工作表未在已保存版本中找到。');
        break;
      }
      facts.push({
        label: '工作表 / 单元格',
        value: String(sheets[sheet].name || sheet) + ' / ' + cellAddress(row, column),
      });
      const binding = report.dataSet?.[sheet]?.[row]?.[column];
      // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
      if (typeof binding?.name === 'string' && binding.name)
        facts.push({ label: binding.type === 'dataItem' ? '数据项' : '数据集', value: binding.name });
      if (binding?.type !== 'dataItem' && typeof binding?.tag === 'string' && binding.tag) {
        facts.push({ label: '绑定字段', value: binding.tag });
        if (binding.type === 'dataSet' && typeof binding.id === 'string' && typeof binding.name === 'string')
          reportMember = {
            datasetId: binding.id,
            name: binding.name,
            member: binding.tag,
            address: String(sheets[sheet].name || sheet) + ' / ' + cellAddress(row, column),
          };
      }
      // end
      if (!binding) gaps.push('该单元格在已保存报表中没有数据集绑定。');
      break;
    }
    default:
      throw new HttpError(400, '当前入口不支持清单读取');
  }
  // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
  return { title, facts, gaps, source, reportMember };
  // end
}
// end
