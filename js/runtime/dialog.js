import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

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

export default class Dialog {
  constructor() {
    this.visible = false; // 对话框是否可见
    this.callback = null; // 输入完成后的回调函数
  }

  /**
   * 显示对话框（使用微信模态框实现输入）
   * @param {Function} callback - 输入完成后的回调函数
   */
  show(callback) {
    this.visible = true;
    this.callback = callback;

    // 调用微信小游戏模态对话框，开启输入功能
    wx.showModal({
      title: '输入框',
      content: '请输入内容',
      editable: true, // 允许输入
      placeholderText: '请输入...',
      success: (res) => {
        this.visible = false;
        if (res.confirm && res.content.trim()) {
          // 用户确认且输入内容不为空时触发回调
          this.callback(res.content.trim());
        }
      },
      fail: () => {
        this.visible = false;
      }
    });
  }

  /**
   * 隐藏对话框
   */
  hide() {
    this.visible = false;
  }

  /**
   * 渲染对话框背景遮罩
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   */
  render(ctx) {
    if (!this.visible) return;

    // 绘制半透明遮罩（覆盖整个屏幕）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }
}