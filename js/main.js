import './render';  // 初始化画布
import Background from './runtime/background';  // 导入背景类

// 获取画布上下文
const ctx = canvas.getContext('2d');

export default class Main {
  constructor() {
    this.bg = new Background();  // 创建背景实例
    this.aniId = 0;              // 动画帧ID
    this.start();                // 开始游戏循环
  }

  /**
   * 游戏主循环
   */
  loop() {
    this.update();  // 更新游戏状态
    this.render();  // 渲染画面
    this.aniId = requestAnimationFrame(this.loop.bind(this));  // 循环调用
  }

  /**
   * 更新游戏元素状态
   */
  update() {
    this.bg.update();
  }

  /**
   * 渲染画面
   */
  render() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 绘制背景
    this.bg.render(ctx);
  }

  /**
   * 开始游戏
   */
  start() {
    this.loop();
  }
}