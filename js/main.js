import './render';
import Background from './runtime/background';
import Sprite from './base/sprite';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render';

// 获取canvas上下文
const ctx = canvas.getContext('2d');

export default class Main {
  constructor() {
    // 初始化背景
    this.bg = new Background();

    // 初始化右下角按钮
    this.button = new Sprite(
      'images/btn_right.png',
      80, 80,
      SCREEN_WIDTH - 80 - 10,  // 右侧边距10px
      SCREEN_HEIGHT - 80 - 10  // 底部边距10px
    );
    this.button.pressed = false;

    this.bindButtonEvent();
    this.aniId = 0;
    this.start();
  }

  /** 绑定按钮触摸事件 */
  bindButtonEvent() {
    // 触摸开始 - 标记按钮按下状态
    wx.onTouchStart((res) => {
      if (!this.button) return;

      const { clientX, clientY } = res.touches[0];
      // 判断触摸点是否在按钮区域内
      const isInButtonArea = clientX >= this.button.x
        && clientX <= this.button.x + this.button.width
        && clientY >= this.button.y
        && clientY <= this.button.y + this.button.height;

      if (isInButtonArea) {
        console.log('按钮被点击了');
        this.button.pressed = true;
      }
    });

    // 触摸结束 - 恢复按钮状态
    wx.onTouchEnd(() => {
      this.button.pressed = false;
    });
  }

  /** 游戏主循环 */
  loop() {
    this.update();
    this.render();
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }

  /** 更新游戏状态 */
  update() {
    this.bg.update();
  }

  /** 渲染游戏画面 */
  render() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染背景
    this.bg.render(ctx);

    // 计算按钮渲染属性（按下时缩小）
    const scale = this.button.pressed ? 0.9 : 1;
    const renderWidth = this.button.width * scale;
    const renderHeight = this.button.height * scale;
    const renderX = this.button.x + (this.button.width - renderWidth) / 2;
    const renderY = this.button.y + (this.button.height - renderHeight) / 2;

    // 渲染按钮
    ctx.drawImage(
      this.button.img,
      renderX,
      renderY,
      renderWidth,
      renderHeight
    );
  }

  /** 启动游戏 */
  start() {
    this.loop();
  }
}