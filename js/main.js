import './render';  // 初始化画布
import Background from './runtime/background';  // 导入背景类
import Dialog from './runtime/dialog';  // 导入对话框类
// 从render.js导入屏幕尺寸常量
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render';

// 获取画布上下文
const ctx = canvas.getContext('2d');

// 定义按钮位置和尺寸（示例：右上角按钮）
const inputButton = {
  x: SCREEN_WIDTH - 120,  // 右对齐，距离右边120px
  y: 20,                  // 距离顶部20px
  width: 100,             // 宽度100px
  height: 40,             // 高度40px
  radius: 5               // 圆角半径
};

// 绘制带圆角矩形的工具函数
function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

export default class Main {
  constructor() {
    this.bg = new Background();  // 创建背景实例
    this.dialog = new Dialog();  // 创建对话框实例
    this.aniId = 0;              // 动画帧ID
    this.bindEvents();           // 绑定触摸事件
    this.start();                // 开始游戏循环
  }

  /**
   * 绑定触摸事件（用于点击按钮）
   */
  bindEvents() {
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;

      // 判断是否点击输入按钮
      if (x >= inputButton.x && x <= inputButton.x + inputButton.width &&
          y >= inputButton.y && y <= inputButton.y + inputButton.height) {
        this.dialog.show(this.handleInputSubmit.bind(this));
      }
    });
  }

  /**
   * 处理输入提交
   * @param {string} inputText - 用户输入的内容
   */
  handleInputSubmit(inputText) {
    console.log('用户输入:', inputText);
    // 这里可以添加输入内容的处理逻辑
    wx.showToast({
      title: '输入成功',
      icon: 'success',
      duration: 2000
    });
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
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    // 绘制背景
    this.bg.render(ctx);
    // 绘制输入按钮
    this.renderInputButton();
    // 渲染对话框遮罩（如果显示的话）
    this.dialog.render(ctx);
  }

  /**
   * 渲染输入按钮
   */
  renderInputButton() {
    // 绘制按钮背景（红色）
    ctx.fillStyle = '#f44336';
    drawRoundRect(ctx, inputButton.x, inputButton.y, inputButton.width, inputButton.height, inputButton.radius);
    ctx.fill();

    // 绘制按钮文字（白色）
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击输入', inputButton.x + inputButton.width / 2, inputButton.y + inputButton.height / 2);
  }

  /**
   * 开始游戏
   */
  start() {
    this.loop();
  }
}