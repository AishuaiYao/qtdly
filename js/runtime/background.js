import Sprite from '../base/sprite';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

// 背景图片路径（对应images目录下的bg.png）
const BACKGROUND_IMAGE_SRC = 'images/bg.png';

export default class Background extends Sprite {
  constructor() {
    // 调用父类构造函数，传入图片路径和尺寸（与屏幕尺寸一致）
    super(BACKGROUND_IMAGE_SRC, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  /**
   * 背景不需要动态更新，仅需渲染
   */
  update() {
    // 后续若需要滚动效果可在此添加逻辑
  }
}