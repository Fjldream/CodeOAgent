// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验

export type SceneObservation = {
  document: 'active' | 'unlocated' | 'untitled';
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
  path?: string;
// end
  count: number;
  selected: number;
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
  item?: { name: string; kind: string; position?: number[]; tag?: string };
// end
};
export function describeScene(scene?: SceneObservation) {
  if (!scene) return '';
  const file = {
    active: '当前已打开的场景',
    unlocated: '当前场景文件名待核对',
    untitled: '未命名画布，入口资源另列',
  }[scene.document];
  const lines = [
    '编辑器现场（提问时） · ' + file,
    '对象数 ' + scene.count + '，选中 ' + scene.selected + ' 个。',
  ];
  if (scene.document === 'untitled') lines.push('在左侧「场景」列表下方双击目标缩略图，再核对当前对象。');
  if (scene.item) {
    lines.push(
      '单选对象 ' + (scene.item.name || '未命名') + (scene.item.kind ? ' · ' + scene.item.kind : ''),
    );
    if (scene.item.position) lines.push('编辑坐标 X / Y / Z：' + scene.item.position.join(' / '));
  }
  return lines.join('\n');
}
// end
