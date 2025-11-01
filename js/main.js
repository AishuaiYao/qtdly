import './render';
import Background from './runtime/background';
import Sprite from './base/sprite';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render';

const ctx = canvas.getContext('2d');

export default class Main {
  constructor() {
    this.bg = new Background();

    // 按钮初始化
    this.button = new Sprite(
      'images/btn_right.png',
      80, 80,
      SCREEN_WIDTH - 80 - 10,
      SCREEN_HEIGHT - 80 - 10
    );
    this.button.pressed = false;

    // 对话框及输入状态
    this.showDialog = false;
    this.userInput = '';
    this.isInputting = false;
    this.inputCursor = '|';
    this.cursorTimer = 0;

    this.bindEvents();
    this.aniId = 0;
    this.start();
  }

  /** 绑定所有事件（按钮+键盘） */
  bindEvents() {
    // 触摸开始事件
    wx.onTouchStart((res) => {
      if (!this.button) return;
      const { clientX, clientY } = res.touches[0];

      // 按钮点击：显示对话框并弹出键盘
      const isInButton = clientX >= this.button.x
        && clientX <= this.button.x + this.button.width
        && clientY >= this.button.y
        && clientY <= this.button.y + this.button.height;

      if (isInButton) {
        console.log('按钮被点击，显示对话框并弹出键盘');
        this.button.pressed = true;
        this.showDialog = true;
        this.isInputting = true;
        this.userInput = ''; // 清空历史输入
        this.showSystemKeyboard(); // 主动弹出键盘
        return;
      }

      // 对话框交互
      if (this.showDialog) {
        const dialogLeft = 50;
        const dialogRight = SCREEN_WIDTH - 50;
        const dialogTop = 100;
        const dialogBottom = 300;

        const isInDialog = clientX >= dialogLeft
          && clientX <= dialogRight
          && clientY >= dialogTop
          && clientY <= dialogBottom;

        if (!isInDialog) {
          // 点击外部：关闭对话框和键盘
          console.log('点击对话框外部，关闭输入');
          this.showDialog = false;
          this.isInputting = false;
          wx.hideKeyboard(); // 隐藏键盘
        }
      }
    });

    // 触摸结束：恢复按钮状态
    wx.onTouchEnd(() => {
      this.button.pressed = false;
    });

    // 监听键盘输入
    wx.onKeyboardInput((res) => {
      if (this.isInputting) {
        // 处理退格键
        if (res.keyCode === 8) {
          this.userInput = this.userInput.slice(0, -1);
        }
        // 处理回车键（结束输入）
        else if (res.keyCode === 13) {
          console.log('用户输入完成：', this.userInput); // 打印输入内容
          this.isInputting = false;
          wx.hideKeyboard(); // 隐藏键盘
        }
        // 普通字符输入
        else {
          if (this.userInput.length < 20) { // 限制长度
            this.userInput += res.value;
            console.log('当前输入：', this.userInput); // 实时打印输入
          }
        }
      }
    });

    // 监听键盘隐藏事件
    wx.onKeyboardComplete(() => {
      console.log('键盘已关闭');
      this.isInputting = false;
    });
  }

  /** 主动弹出系统键盘 */
  showSystemKeyboard() {
    wx.showKeyboard({
      defaultValue: '', // 初始值为空
      maxLength: 20, // 最大输入长度
      multiple: false, // 不允许多行输入
      confirmHold: true, // 长按确认
      placeholder: '请输入内容...', // 提示文字
      success: () => {
        console.log('键盘弹出成功');
      },
      fail: (err) => {
        console.error('键盘弹出失败：', err);
      }
    });
  }

  /** 更新游戏状态 */
  update() {
    this.bg.update();

    // 光标闪烁逻辑
    if (this.showDialog) {
      this.cursorTimer++;
      if (this.cursorTimer % 30 === 0) {
        this.inputCursor = this.inputCursor === '|' ? '' : '|';
      }
    }
  }

  /** 渲染画面 */
  render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.bg.render(ctx);

    // 渲染按钮
    const scale = this.button.pressed ? 0.9 : 1;
    const renderWidth = this.button.width * scale;
    const renderHeight = this.button.height * scale;
    const renderX = this.button.x + (this.button.width - renderWidth) / 2;
    const renderY = this.button.y + (this.button.height - renderHeight) / 2;
    ctx.drawImage(this.button.img, renderX, renderY, renderWidth, renderHeight);

    // 渲染对话框
    if (this.showDialog) {
      // 对话框背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(50, 100, SCREEN_WIDTH - 100, 200);

      // 标题
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('请输入内容:', SCREEN_WIDTH / 2, 160);

      // 输入框
      ctx.fillStyle = 'white';
      ctx.fillRect(70, 180, SCREEN_WIDTH - 140, 40);

      // 输入内容+光标
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.fillText(this.userInput + this.inputCursor, SCREEN_WIDTH / 2, 205);

      // 提示
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '12px Arial';
      ctx.fillText('按回车完成输入，点击外部取消', SCREEN_WIDTH / 2, 260);
    }
  }

  start() {
    this.loop();
  }

  loop() {
    this.update();
    this.render();
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }
}