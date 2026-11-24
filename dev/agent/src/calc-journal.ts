// modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
import { randomUUID } from 'node:crypto';
import { type Center } from './center.ts';
import { type Store } from './store.ts';
import {
  captureRoute,
  captureResult,
  scriptEntry,
  type Dependency,
  type CaptureRoute,
} from './calc-result.ts';
import { HttpError, type Context, type Evidence } from './shared.ts';

// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
import { dictionaryBinding, dictionaryEndpoints, dictionaryReading, probeMatches, type DictionaryBinding } from './dictionary.ts';
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
import {dependencyDefinition, dependencyList, dependencyKind, dependencyProbe, checkedDependency} from './dependency.ts';
import {sectionForMenu} from './calc-config.ts';
import {createHash} from 'node:crypto';
type Pending = {
  dependency?:{context:Context;definition:ReturnType<typeof dependencyDefinition>};
// end
  dictionary?: {context:Context;binding:DictionaryBinding;endpoints:Awaited<ReturnType<typeof dictionaryEndpoints>>};
// end
  owner: string;
  chat: string;
  start: number;
  route: CaptureRoute;
};
export class CalcJournal {
  private pending = new Map<string, Pending>();
  private store: Store;
  private center: Center;
  constructor(store: Store, center: Center) {
    this.store = store;
    this.center = center;
  }
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
  async begin(owner: string, token: string, chat: string, context: Context, appId?: string, probe?: string, target?: {name:string;member?:string}) {
// end
// end
    this.store.chat(owner, chat);
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
    let dependency:Pending['dependency'];
    let dictionary: Pending['dictionary'];
// end
    if(context.kind==='calculation'){
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
      const kind=sectionForMenu(context.calcMenu);
      if(dependencyKind(kind)){
        const matches=(await dependencyList(this.center,token,context,kind)).filter(r=>r.name===target?.name);
        if(matches.length!==1)throw new HttpError(409,'请填写完整且唯一的登记名称。');
        dependency={context,definition:dependencyDefinition(kind,matches[0],target?.member)};
      }else{
        const binding=await dictionaryBinding(this.center,token,context);
        dictionary={binding,context,endpoints:await dictionaryEndpoints(this.center,token,binding)};
      }
// end
      if(!probe || probe.length>200) throw new HttpError(400,'请填已部署的只读请求脚本名称。');
      const scripts=await this.center.call(token,'/calculation/projectJsonData',{projectId:context.projectId,type:'APIs',groupId:'-1'});
      const matches=scripts.filter((s:any)=>s.name===probe && s.functionName===probe && !['否',false].includes(s.whetherenable));
      if(matches.length!==1) throw new HttpError(409,'未找到唯一启用的同名请求入口，请核对脚本名和函数名。');
      context={kind:'request',object:matches[0].GUID,projectId:context.projectId,dirty:false};
    }
    const route = await captureRoute(this.center, token, context, appId);
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
    if(dependency){
      const saved=await this.center.call(token,'/calculation/scriptData',{projectId:context.projectId,type:'APIs',scriptId:context.object});
      if(typeof saved.context!=='string' || createHash('sha256').update(saved.context).digest('hex')!==route.digest || saved.context.replace(/\r\n/g,'\n').trimEnd()!==dependencyProbe(dependency.definition))throw new HttpError(409,'目标请求脚本与当前依赖核对正文不一致。');
    }
    if(dictionary){
// end
      const saved=await this.center.call(token,'/calculation/scriptData',{projectId:context.projectId,type:'APIs',scriptId:context.object});
      if(!probeMatches(dictionary.binding,saved.context,route.digest)) throw new HttpError(409,'请求脚本与选中变量的只读取证正文不一致。');
    }
// end
    const start = Date.now();
    for (const [id, p] of this.pending)
      if (
        start - p.start > 600000 ||
        (p.owner === owner && p.chat === chat && p.route.entry.object === context.object)
      )
        this.pending.delete(id);
    if (this.pending.size >= 128) throw new HttpError(429, '当前取证窗口已满。');
    const ticket = randomUUID();
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
    this.pending.set(ticket, { owner, chat, start, route, dictionary, dependency });
// end
// end
    return {
      ticket,
      start,
      app: route.appName,
      urls: route.urls,
      monitors: route.monitors,
    };
  }
  async finish(owner: string, token: string, chat: string, ticket: string, raw: unknown) {
    this.store.chat(owner, chat);
    const p = this.pending.get(ticket);
    if (!p || p.owner !== owner || p.chat !== chat) throw new HttpError(404, '本次取证窗口不存在。');
    this.pending.delete(ticket);
    const end = Date.now();
    if (end - p.start > 600000) throw new HttpError(409, '取证已过期，请重新开始。');
    const fresh = await captureRoute(this.center, token, p.route.entry, p.route.dependencies[0].runtimeApp);
    if (fresh.signature !== p.route.signature)
      throw new HttpError(409, '取证期间脚本、连接或实例发生变化，请重新采集。');
    const result = captureResult(fresh, raw, p.start, end, process.env.KF_AGENT_SOURCE_UTC_OFFSET || '');
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
    let dependency;
    if(p.dependency){
      const {definition:d,context}=p.dependency;
      const rows=(await dependencyList(this.center,token,context,d.kind)).filter(r=>r.name===d.name);
      if(rows.length!==1 || dependencyDefinition(d.kind,rows[0],d.kind==='npm'?'':d.member).signature!==d.signature) throw new HttpError(409,'取证期间依赖登记已变更。');
      const observation=raw as {at:string;output:{dependency:unknown};input:unknown};
      dependency={kind:d.kind,name:d.name,member:d.member,signature:d.signature,at:observation.at,reading:checkedDependency(d,observation.output.dependency,observation.input)};
    }
    let dictionary;
// end
    if(p.dictionary){
      const binding=await dictionaryBinding(this.center,token,p.dictionary.context);
      const endpoints=await dictionaryEndpoints(this.center,token,binding);
      if(binding.signature!==p.dictionary.binding.signature || JSON.stringify(endpoints)!==JSON.stringify(p.dictionary.endpoints)) throw new HttpError(409,'词典或点映射已变更，请重新取证。');
      const observation=raw as {at:string;output:{dictionary:unknown}};
      dictionary={row:p.dictionary.context.object,signature:binding.signature,route:fresh.signature,
        app:fresh.dependencies[0].runtimeApp,at:observation.at,reading:dictionaryReading(binding,observation.output.dictionary)};
    }
    const entry = fresh.entry,
// end
      context = JSON.stringify({
        kind: entry.kind,
        projectId: entry.projectId,
        object: entry.object,
        dirty: false,
      });
    const id = randomUUID();
    this.store.transaction(() => {
      this.store.db
        .prepare(
          'INSERT INTO calc_captures(id,chat,kind,project,script,context,dependencies,result) VALUES(?,?,?,?,?,?,?,?)',
        )
        .run(
          id,
          chat,
          entry.kind,
          entry.projectId,
          entry.object,
          context,
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
          JSON.stringify([...fresh.dependencies,...(p.dictionary?.endpoints??[])]),
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
          JSON.stringify({...result,...(dictionary && {dictionary}),...(dependency && {dependency})}),
// end
// end
        );
      this.store.db
        .prepare(
          'DELETE FROM calc_captures WHERE chat=? AND rowid NOT IN (SELECT rowid FROM calc_captures WHERE chat=? ORDER BY rowid DESC LIMIT 32)',
        )
        .run(chat, chat);
    });
    return { id, lines: result.lines };
  }
  // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
  async overviewReceipts(owner:string,chat:string,projectId:string,hashes:Map<string,string>,permitted:(row:any)=>Promise<boolean>) {
    this.store.chat(owner,chat);
    const rows=this.store.db.prepare('SELECT * FROM calc_captures WHERE project=? AND chat=? ORDER BY rowid DESC').all(projectId,chat);
    const lines:string[]=[], dependencies:Dependency[]=[];
    for(const row of rows){
      if(!await permitted(row))continue;
      const result=JSON.parse(String(row.result));
      const key=(row.kind==='period'?'periods:':'APIs:')+row.script;
      const version=hashes.get(key)===result.digest?'采样时的保存正文与本次一致':'历史回执，当前正文不同或无法核对';
      lines.push('- '+result.title+' · '+result.appName+' · '+result.at+' · '+version+
        (result.qualified?'':' · 样本有限'), ...result.lines);
      dependencies.push(...JSON.parse(String(row.dependencies)));
    }
    if(lines.length)lines.push('回执仅对应上列实例和采样时刻；当前接口未提供进程加载正文指纹。');
    return {lines,dependencies};
  }
// end
  async recentCalculation(owner: string, chat: string, permitted: (row: any) => Promise<boolean>) {
    this.store.chat(owner, chat);
    const row = this.store.db
      .prepare('SELECT context,dependencies FROM calc_captures WHERE chat=? ORDER BY rowid DESC LIMIT 1')
      .get(chat);
    if (!row || !(await permitted(row)))
      throw new HttpError(409, '没有可核对的最近计算回执，请打开目标计算工程。');
    return {
      entry: JSON.parse(String(row.context)) as Context,
      dependencies: JSON.parse(String(row.dependencies)) as Dependency[],
    };
  }
  // end
  async report(
    owner: string,
    token: string,
    chat: string,
    entry: Context,
    permitted: (row: any) => Promise<boolean>,
  ) {
    this.store.chat(owner, chat);
    await this.center.require(token, entry);
    const selected = scriptEntry(entry);
    const dependencies: Dependency[] = [];
    const lines: string[] = [];
    const saved = new Map<string, Evidence | null>();
    const read = async (ctx: Context) => {
      const key = JSON.stringify([ctx.projectId, ctx.kind, ctx.object]);
      if (!saved.has(key)) {
        const e = await this.center.evidence(token, ctx);
        saved.set(key, e);
        if (e)
          lines.push(
            e.title + ' · Center 已保存正文 ' + e.digest?.slice(0, 12),
            ...e.facts.map((f) => f.label + ' · ' + f.value),
            ...e.gaps.filter((g) => !g.includes('目标 App')),
          );
      }
      return saved.get(key);
    };
    const current = selected ? await read(entry) : null;
    let periods = 0,
      requests = 0,
      prior = 0,
      uncertain = 0;
    const rows = this.store.db
      .prepare('SELECT * FROM calc_captures WHERE chat=? ORDER BY rowid DESC LIMIT 32')
      .all(chat);
    for (const row of rows) {
      if (
        ((selected || entry.kind === 'calculation') && row.project !== entry.projectId) ||
        (selected && (row.kind !== entry.kind || row.script !== entry.object))
      )
        continue;
      if (row.kind === 'period' ? periods >= 4 : requests >= 4) continue;
      if (!(await permitted(row))) continue;
      const ctx = JSON.parse(String(row.context)) as Context;
      let evidence;
      try {
        evidence = await read(ctx);
      } catch (e) {
        if (e instanceof HttpError && [403, 404].includes(e.status)) continue;
        throw e;
      }
      if (!evidence?.digest) continue;
      const result = JSON.parse(String(row.result));
      const same = evidence.digest === result.digest;
      if (!same) prior++;
      if (!result.qualified) uncertain++;
      if (ctx.kind === 'period') periods++;
      else requests++;
      dependencies.push(...JSON.parse(String(row.dependencies)));
      lines.push(
        result.title +
          ' · ' +
          result.appName +
          ' · ' +
          result.at +
          ' · ' +
          (same ? '采样时保存正文与当前一致' : '历史回执，采样后保存正文已变更') +
          '（' +
          result.digest.slice(0, 12) +
          '）',
        ...result.lines,
      );
    }
    if (!periods && !requests)
      lines.push(
        '本段对话没有可展示的匹配运行回执。请在目标脚本的「工程工具 → 计算脚本回读」采集周期点值或关联一次请求回包。',
      );
    else lines.push('回执证明所列时刻的业务结果。当前 KF 接口未提供进程加载正文的指纹。');
    return {
      lines,
      dependencies,
      current,
      projection: {
        periods,
        requests,
        prior,
        uncertain,
        inputs: current?.facts.filter((f) => f.label === '读取点').length || 0,
        outputs: current?.facts.filter((f) => f.label === '写回点').length || 0,
      },
    };
  }
}
// end
