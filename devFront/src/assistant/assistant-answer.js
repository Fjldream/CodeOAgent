// modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗
// Saved KF replies can contain original scripts verbatim, without Markdown fences.
const legacyStart = /^\/\/ modified by jinlong\.feng at \d{4}-\d{2}-\d{2}\b/;
const candidateTitle =
  /^(?:period|request|system|dataChange|condition|customFunction) · 完整 JS 候选（静态检查）$/;
const candidateNote =
  /^(?:自定义函数形参或自由变量 |global 动态或未映射成员|模块依赖和目标节点版本|同名局部声明，|核对 SQLQuery |[\w.]+ (?:返回 Promise|已核对登记)|动态点列表须核对|回包次数、异常分支)/;

export function splitAssistantAnswer(text) {
  const parts = [];
  const rows = text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) || [];
  if (rows.at(-1) === '') rows.pop();
  let prose = '';
  let code = '';
  let language = '';
  let fence = '';
  let depth = 0;
  let candidate = false;

  function finishText() {
    if (prose.trim()) parts.push({ text: prose.replace(/(?:\r\n|\n|\r)$/, '') });
    prose = '';
  }
  function finishCode() {
    parts.push({ language, code: code.replace(/(?:\r\n|\n|\r)$/, '') });
    code = '';
    fence = '';
    depth = 0;
    candidate = false;
  }

  for (const row of rows) {
    const line = row.replace(/(?:\r\n|\n|\r)$/, '');
    if (fence) {
      const close = /^ {0,3}([~\x60]+)[ \t]*$/.exec(line)?.[1];
      if (close?.startsWith(fence) && [...close].every((char) => char === fence[0])) finishCode();
      else code += row;
      continue;
    }
    if (depth) {
      code += row;
      if (legacyStart.test(line)) depth++;
      if (/^\/\/ end\s*$/.test(line) && --depth === 0) finishCode();
      continue;
    }
    if (candidate) {
      if (candidateTitle.test(line) || candidateNote.test(line)) finishCode();
      else {
        code += row;
        continue;
      }
    }
    const opening = /^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(line);
    if (opening) {
      finishText();
      fence = opening[1];
      language = opening[2].trim().split(/\s+/)[0] || '代码';
    } else if (legacyStart.test(line)) {
      finishText();
      depth = 1;
      language = 'JavaScript';
      code = row;
    } else {
      prose += row;
      if (candidateTitle.test(line)) {
        finishText();
        language = 'JavaScript';
        candidate = true;
      }
    }
  }
  if (fence || depth || candidate) finishCode();
  finishText();
  return parts;
}
// end

// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
// Only build text nodes. Saved replies, KF names and model output are untrusted markup.
export function inlineAnswer(text) {
  return String(text).split(/(\x60[^\x60\n]+\x60|\*\*[^*\n]+\*\*)/g).filter(Boolean).map(value => {
    if (value.startsWith('\x60') && value.endsWith('\x60') && value.length>2) return {tag:'code',text:value.slice(1,-1)};
    if (value.startsWith('**') && value.endsWith('**') && value.length>4) return {tag:'strong',text:value.slice(2,-2)};
    return {tag:'span',text:value};
  });
}
export function replyBlocks(answer) {
  const blocks=[];
  // modified by jinlong.feng at 2026-11-23 KF对话文档格式适配
  const parts = splitAssistantAnswer(answer);
  const escapedMarker = /^( {0,3})\\(#{1,6}|[-+*])(?=[ \t])/;
  const proseLines = parts.flatMap(part => part.text?.split(/\r\n?|\n/) || []);
  const markers = proseLines.filter(line => escapedMarker.test(line));
  const copiedDocument = markers.length >= 2 || markers.some(line => line.endsWith('\\'));
  for(const part of parts){
  // end
    if(part.code!==undefined){blocks.push(part);continue;}
    let group;
    // modified by jinlong.feng at 2026-11-23 KF对话文档格式适配
    const lines = part.text.split(/\r\n?|\n/).map(line => copiedDocument
      ? line.replace(escapedMarker, '$1$2').replace(/(?<!\\)\\[ \t]*$/, '')
      : line);
    // end
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(!line.trim()){group=undefined;continue;}
      if(/^\s*\|.+\|\s*$/.test(line)&&/^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[i+1]||'')){
        const cells=s=>s.trim().slice(1,-1).split('|').map(t=>t.trim());
        const table={kind:'table',headers:cells(line),rows:[]};i++;
        while(/^\s*\|.+\|\s*$/.test(lines[i+1]||''))table.rows.push(cells(lines[++i]));
        blocks.push(table);group=undefined;continue;
      }
      const heading=/^\s{0,3}(#{1,6})\s+(.+)$/.exec(line);
      if(heading){blocks.push({kind:heading[1].length<=2?'h4':'h5',text:heading[2]});group=undefined;continue;}
      // modified by jinlong.feng at 2026-11-23 KF对话文档格式适配
      const bullet=/^\s{0,3}([-*+]\s+|(\d+)[.)、](?!\d)\s*)(.+)$/.exec(line);
      // end
      const kind=bullet?(bullet[2]?'ol':'ul'):'p';
      if(!group||group.kind!==kind||(kind==='ol'&&Number(bullet[2])!==group.start+group.lines.length)){
        group={kind,lines:[],...(kind==='ol'&&{start:Number(bullet[2])})};blocks.push(group);
      }
      group.lines.push(bullet?bullet[3]:line);
    }
  }
  return blocks;
}
// end
