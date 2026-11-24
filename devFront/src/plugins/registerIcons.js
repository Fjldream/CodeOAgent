// modified by jinlong.feng at 2026-11-19 开发态前端本地启动
import iconSprite from '@/assets/icons.svg?raw';

if (!document.getElementById('__svg__icons__dom__')) {
  document.body.insertAdjacentHTML('afterbegin', iconSprite);
}
// end
