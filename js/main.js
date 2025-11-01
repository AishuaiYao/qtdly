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
    this.tempInput = ''; // 临时存储输入过程中的内容
    this.finalInput = ''; // 存储用户确认后的最终输入
    this.isInputting = false;
    this.inputCursor = '|';
    this.cursorTimer = 0;

    this.bindEvents();
    this.aniId = 0;
    this.start();
  }

  /** 绑定所有事件 */
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
        console.log('按钮被点击，显示对话框');
        this.button.pressed = true;
        this.showDialog = true;
        this.isInputting = true;
        this.tempInput = ''; // 清空临时输入
        this.showSystemKeyboard(); // 弹出键盘
        return;
      }

      // 对话框外部点击：关闭所有
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
          this.closeInput();
        }
      }
    });

    // 触摸结束：恢复按钮状态
    wx.onTouchEnd(() => {
      this.button.pressed = false;
    });

    // 监听键盘输入（只临时存储，不处理）
    wx.onKeyboardInput((res) => {
      if (this.isInputting) {
        // 处理退格键
        if (res.keyCode === 8) {
          this.tempInput = this.tempInput.slice(0, -1);
        }
        // 忽略回车键（单独处理确认事件）
        else if (res.keyCode !== 13) {
          if (this.tempInput.length < 20) {
            this.tempInput += res.value;
          }
        }
      }
    });

    // 监听键盘确认事件（用户点击确定/回车）
    wx.onKeyboardConfirm((res) => {
      if (this.isInputting) {
        // 确认后才保存并打印最终输入
        this.finalInput = res.value; // 直接使用键盘返回的完整值
        console.log('用户确认输入：', this.finalInput); // 只在确认后打印
        this.closeInput();
      }
    });

    // 监听键盘关闭（未确认的情况）
    wx.onKeyboardComplete(() => {
      if (this.isInputting) {
        console.log('键盘已关闭（未确认输入）');
        this.closeInput();
      }
    });
  }

  /** 弹出系统键盘 */
  showSystemKeyboard() {
    wx.showKeyboard({
      defaultValue: '',
      maxLength: 20,
      multiple: false,
      confirmText: '确定', // 键盘上的确认按钮文字
      placeholder: '请输入内容...',
      success: () => {
        console.log('键盘弹出成功');
      },
      fail: (err) => {
        console.error('键盘弹出失败：', err);
      }
    });
  }

  /** 关闭输入相关的所有状态 */
  closeInput() {
    this.showDialog = false;
    this.isInputting = false;
    this.tempInput = '';
    wx.hideKeyboard();
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

      // 显示临时输入内容+光标
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.fillText(this.tempInput + this.inputCursor, SCREEN_WIDTH / 2, 205);

      // 提示
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '12px Arial';
      ctx.fillText('输入完成后点击"确定"', SCREEN_WIDTH / 2, 260);
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