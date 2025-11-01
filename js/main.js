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

    // 对话框及输入相关状态
    this.showDialog = false;    // 是否显示对话框
    this.userInput = '';        // 存储用户输入
    this.isInputting = false;   // 是否处于输入状态
    this.inputCursor = '|';     // 光标
    this.cursorTimer = 0;       // 光标闪烁计时器

    this.bindButtonEvent();
    this.aniId = 0;
    this.start();
  }

  /** 绑定按钮和输入事件 */
  bindButtonEvent() {
    // 触摸开始事件
    wx.onTouchStart((res) => {
      if (!this.button) return;
      const { clientX, clientY } = res.touches[0];

      // 1. 按钮点击判断
      const isInButtonArea = clientX >= this.button.x
        && clientX <= this.button.x + this.button.width
        && clientY >= this.button.y
        && clientY <= this.button.y + this.button.height;

      if (isInButtonArea) {
        console.log('按钮被点击');
        this.button.pressed = true;
        this.showDialog = true;    // 显示对话框
        this.isInputting = true;   // 开启输入模式
        return;
      }

      // 2. 对话框交互（仅当对话框显示时）
      if (this.showDialog) {
        const dialogLeft = 50;
        const dialogRight = SCREEN_WIDTH - 50;
        const dialogTop = 100;
        const dialogBottom = 300;

        // 判断是否点击对话框内部
        const isInDialogArea = clientX >= dialogLeft
          && clientX <= dialogRight
          && clientY >= dialogTop
          && clientY <= dialogBottom;

        if (isInDialogArea) {
          this.isInputting = !this.isInputting; // 切换输入状态
        } else {
          // 点击对话框外部关闭
          this.showDialog = false;
          this.isInputting = false;
        }
      }
    });

    // 触摸结束事件（恢复按钮状态）
    wx.onTouchEnd(() => {
      this.button.pressed = false;
    });

    // 键盘输入监听（获取用户输入内容）
    wx.onKeyboardInput((res) => {
      if (this.isInputting) {
        // 处理退格键（删除最后一个字符）
        if (res.keyCode === 8) {
          this.userInput = this.userInput.slice(0, -1);
        }
        // 忽略回车键（可自定义处理）
        else if (res.keyCode !== 13) {
          // 限制最大输入长度为20
          if (this.userInput.length < 20) {
            this.userInput += res.value;
          }
        }
      }
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

    // 光标闪烁逻辑（每30帧切换一次，约500ms）
    if (this.showDialog) {
      this.cursorTimer++;
      if (this.cursorTimer % 30 === 0) {
        this.inputCursor = this.inputCursor === '|' ? '' : '|';
      }
    }
  }

  /** 渲染游戏画面 */
  render() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染背景
    this.bg.render(ctx);

    // 渲染按钮（按下时缩小）
    const scale = this.button.pressed ? 0.9 : 1;
    const renderWidth = this.button.width * scale;
    const renderHeight = this.button.height * scale;
    const renderX = this.button.x + (this.button.width - renderWidth) / 2;
    const renderY = this.button.y + (this.button.height - renderHeight) / 2;
    ctx.drawImage(
      this.button.img,
      renderX,
      renderY,
      renderWidth,
      renderHeight
    );

    // 渲染对话框（如果需要显示）
    if (this.showDialog) {
      // 1. 对话框背景（半透明黑）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(50, 100, SCREEN_WIDTH - 100, 200);

      // 2. 对话框标题
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('请输入内容:', SCREEN_WIDTH / 2, 160);

      // 3. 输入框背景（白色）
      ctx.fillStyle = 'white';
      ctx.fillRect(70, 180, SCREEN_WIDTH - 140, 40);

      // 4. 显示输入内容和光标
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.fillText(
        this.userInput + this.inputCursor,  // 内容+光标
        SCREEN_WIDTH / 2,
        205  // 垂直居中位置
      );

      // 5. 操作提示
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '12px Arial';
      ctx.fillText('点击输入框编辑，点击外部关闭', SCREEN_WIDTH / 2, 260);
    }
  }

  /** 启动游戏 */
  start() {
    this.loop();
  }
}