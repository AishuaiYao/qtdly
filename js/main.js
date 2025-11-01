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
    this.showDialog = false;       // 是否显示对话框
    this.isInputting = false;      // 是否正在输入中（键盘弹出状态）
    this.finalInput = '';          // 仅存储用户确认后的最终文本
    this.inputPrompt = '点击按钮输入内容'; // 初始提示文字

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

      // 按钮点击：弹出键盘（不直接显示输入内容，仅在确认后显示）
      const isInButton = clientX >= this.button.x
        && clientX <= this.button.x + this.button.width
        && clientY >= this.button.y
        && clientY <= this.button.y + this.button.height;

      if (isInButton) {
        console.log('按钮被点击，弹出键盘');
        this.button.pressed = true;
        this.showDialog = true;    // 显示对话框（初始显示提示文字）
        this.isInputting = true;
        this.showSystemKeyboard(); // 弹出键盘
        return;
      }

      // 对话框外部点击：关闭对话框
      if (this.showDialog) {
        const dialogLeft = 50;
        const dialogRight = SCREEN_WIDTH - 50;
        const dialogTop = 100;
        const dialogBottom = 200; // 缩短对话框高度（无需显示输入过程）

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

    // 监听键盘确认事件（仅在确认后获取并显示内容）
    wx.onKeyboardConfirm((res) => {
      if (this.isInputting) {
        // 只在确认后保存最终内容
        this.finalInput = res.value || '未输入内容';
        console.log('用户确认输入：', this.finalInput); // 打印最终内容
        this.isInputting = false; // 结束输入状态
        wx.hideKeyboard();
        // 保持对话框显示，展示最终输入内容
      }
    });

    // 监听键盘关闭（未确认输入）
    wx.onKeyboardComplete(() => {
      if (this.isInputting) {
        console.log('未确认输入，关闭对话框');
        this.closeInput(); // 直接关闭对话框
      }
    });
  }

  /** 弹出系统键盘 */
  showSystemKeyboard() {
    wx.showKeyboard({
      defaultValue: '',
      maxLength: 20,
      multiple: false,
      confirmText: '确定',
      placeholder: '请输入内容...',
      success: () => {
        console.log('键盘弹出成功');
      },
      fail: (err) => {
        console.error('键盘弹出失败：', err);
      }
    });
  }

  /** 关闭输入相关状态 */
  closeInput() {
    this.showDialog = false;
    this.isInputting = false;
    // 保留最终输入内容（可选：如需清空可加 this.finalInput = ''）
    wx.hideKeyboard();
  }

  /** 更新游戏状态 */
  update() {
    this.bg.update();
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
      ctx.fillRect(50, 100, SCREEN_WIDTH - 100, 100); // 高度缩短为100

      // 标题
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('输入结果：', SCREEN_WIDTH / 2, 140);

      // 显示内容（确认前显示提示，确认后显示最终内容）
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      const displayText = this.isInputting ? '输入中...' : this.finalInput;
      ctx.fillText(displayText, SCREEN_WIDTH / 2, 170);

      // 操作提示
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '12px Arial';
      ctx.fillText(
        this.isInputting ? '请输入并点击确定' : '点击外部关闭',
        SCREEN_WIDTH / 2,
        190
      );
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