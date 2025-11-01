import './render';
import Background from './runtime/background';
import Sprite from './base/sprite'; // 导入基础精灵类
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render'; // 导入屏幕尺寸

const ctx = canvas.getContext('2d');

export default class Main {
  constructor() {
    this.bg = new Background();
    // 创建右下角按钮（使用Sprite基类）
    this.button = new Sprite(
      'images/btn_right.png', // 按钮图片路径
      80, 80, // 按钮宽高
      SCREEN_WIDTH - 80 - 10, // 右下角x坐标（留出20px边距）
      SCREEN_HEIGHT - 80 - 10 // 右下角y坐标
    );
    this.button.pressed = false; // 新增：标记按钮是否被按下

    this.bindButtonEvent(); // 绑定按钮事件
    this.aniId = 0;
    this.start();
  }

    bindButtonEvent() {
      wx.onTouchStart((res) => {
        if (!this.button) return;
        // 2. 获取触摸坐标（注意：小程序中需区分canvas坐标系和屏幕坐标系）
        const { clientX, clientY } = res.touches[0];
        // 3. 区域判断（直接使用按钮的x/y/宽高）
        const isClick = clientX >= this.button.x
                      && clientX <= this.button.x + this.button.width
                      && clientY >= this.button.y
                      && clientY <= this.button.y + this.button.height;
        if (isClick) {
          console.log('按钮被点击了');
          this.button.pressed = true; // 按下时标记状态

        }
      });
        // 新增：触摸结束时（松开按钮）
      wx.onTouchEnd(() => {
        this.button.pressed = false; // 松开时恢复状态
        });
    }

  loop() {
    this.update();
    this.render();
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }

  update() {
    this.bg.update();
  }

  render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.bg.render(ctx);
//    this.button.render(ctx); // 渲染按钮
    // 新增：根据pressed状态调整按钮大小
  let renderWidth = this.button.width;
  let renderHeight = this.button.height;
  let renderX = this.button.x;
  let renderY = this.button.y;

  if (this.button.pressed) {
    // 按下时缩小到90%，并微调位置保持居中
    renderWidth = this.button.width * 0.9;
    renderHeight = this.button.height * 0.9;
    renderX = this.button.x + (this.button.width - renderWidth) / 2; // 水平居中
    renderY = this.button.y + (this.button.height - renderHeight) / 2; // 垂直居中
  }

  // 绘制按钮（使用调整后的尺寸和位置）
  ctx.drawImage(
    this.button.img,
    renderX,
    renderY,
    renderWidth,
    renderHeight
  );
  }

  start() {
    this.loop();
  }
}