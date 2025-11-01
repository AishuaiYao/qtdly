/**
 * 基础精灵类，用于绘制图片到画布
 */
export default class Sprite {
    constructor(imgSrc, width, height, x = 0, y = 0) {
      this.img = wx.createImage();  // 创建图片对象
      this.img.src = imgSrc;        // 图片路径
      this.width = width;           // 图片宽度
      this.height = height;         // 图片高度
      this.x = x;                   // 绘制x坐标
      this.y = y;                   // 绘制y坐标
      this.visible = true;          // 是否可见
    }

    /**
     * 绘制图片到画布
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     */
    render(ctx) {
      if (!this.visible) return;

      // 绘制图片（参数：图片对象，目标x，目标y，目标宽度，目标高度）
      ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
  }