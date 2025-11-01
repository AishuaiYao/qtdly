import './render';
import Background from './runtime/background';
import Sprite from './base/sprite';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render';

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

    // 状态变量
    this.showDialog = false;       // 是否显示对话框
    this.isInputting = false;      // 是否正在输入
    this.finalInput = '';          // 用户最终输入内容
    this.apiResult = '';           // API返回结果
    this.isRequesting = false;     // API请求中状态
    this.requestStatus = '';       // 请求状态（loading/success/fail）

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

      // 按钮点击逻辑
      const isInButton = clientX >= this.button.x
        && clientX <= this.button.x + this.button.width
        && clientY >= this.button.y
        && clientY <= this.button.y + this.button.height;

      if (isInButton) {
        console.log('按钮被点击，弹出键盘');
        this.button.pressed = true;
        this.showDialog = true;
        this.isInputting = true;
        this.finalInput = '';      // 清空历史输入
        this.apiResult = '';       // 清空历史结果
        this.requestStatus = '';   // 重置请求状态
        this.showSystemKeyboard(); // 弹出系统键盘
        return;
      }

      // 对话框外部点击：关闭对话框
      if (this.showDialog) {
        const dialogLeft = 50;
        const dialogRight = SCREEN_WIDTH - 50;
        const dialogTop = 100;
        const dialogBottom = 350;  // 对话框底部坐标

        const isInDialog = clientX >= dialogLeft
          && clientX <= dialogRight
          && clientY >= dialogTop
          && clientY <= dialogBottom;

        if (!isInDialog) {
          this.closeDialog();
        }
      }
    });

    // 触摸结束：恢复按钮状态
    wx.onTouchEnd(() => {
      this.button.pressed = false;
    });

    // 键盘确认事件（用户点击确定）
    wx.onKeyboardConfirm((res) => {
      if (this.isInputting) {
        // 验证输入是否为空
        if (!res.value || res.value.trim() === '') {
          wx.showToast({
            title: '请输入内容',
            icon: 'none',
            duration: 1500
          });
          return; // 不关闭键盘，让用户继续输入
        }

        this.finalInput = res.value.trim(); // 去除首尾空格
        console.log('用户输入:', this.finalInput);

        // 调用API
        this.callAliyunApi(this.finalInput);

        this.isInputting = false;
        wx.hideKeyboard();
      }
    });

    // 键盘关闭事件（未确认输入）
    wx.onKeyboardComplete(() => {
      if (this.isInputting) {
        console.log('未确认输入，关闭对话框');
        this.closeDialog();
      }
    });
  }

  /** 弹出系统键盘 */
  showSystemKeyboard() {
    wx.showKeyboard({
      defaultValue: '',
      maxLength: 50,
      multiple: false,
      confirmText: '发送',
      placeholder: '请输入要问的内容...',
      success: () => {
        console.log('键盘弹出成功');
      },
      fail: (err) => {
        console.error('键盘弹出失败:', err);
        this.closeDialog();
      }
    });
  }

  /** 调用阿里云百炼API */
  callAliyunApi(inputText) {
    // 校验输入
    if (!inputText.trim()) {
      this.requestStatus = 'fail';
      this.apiResult = '请输入有效内容';
      return;
    }

    // 开始请求
    this.isRequesting = true;
    this.requestStatus = 'loading';
    this.apiResult = 'AI正在思考...';

    // 配置API参数（替换为你的API Key）
    const API_KEY = 'sk-943f95da67d04893b70c02be400e2935'; // 替换成实际API Key
    const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: 'qwen-plus', // 模型名称（可替换为其他模型）
        messages: [
          { role: 'system', content: '你是一个 helpful 的助手，回答简洁明了。' },
          { role: 'user', content: inputText }
        ]
        // 若使用Qwen3开源版，添加：extra_body: { enable_thinking: false }
      },
      success: (res) => {
        this.isRequesting = false;
        if (res.statusCode === 200 && res.data.choices && res.data.choices.length > 0) {
          this.requestStatus = 'success';
          this.apiResult = res.data.choices[0].message.content.trim() || '未获取到回复';
          console.log('API返回成功:', this.apiResult);
        } else {
          this.requestStatus = 'fail';
          this.apiResult = `API错误: ${res.data.error?.message || '未知错误'}`;
          console.error('API响应异常:', res.data);
        }
      },
      fail: (err) => {
        this.isRequesting = false;
        this.requestStatus = 'fail';

        // 更详细的错误分类提示
        if (err.errMsg.includes('network')) {
          this.apiResult = '网络错误，请检查网络连接';
        } else if (err.errMsg.includes('timeout')) {
          this.apiResult = '请求超时，请稍后重试';
        } else {
          this.apiResult = `请求失败: ${err.errMsg}`;
        }
        console.error('API请求失败:', err);
      }
    });
  }

  /** 关闭对话框及相关状态 */
  closeDialog() {
    this.showDialog = false;
    this.isInputting = false;
    this.isRequesting = false;
    wx.hideKeyboard();
  }

  /** 文本换行处理（避免超出对话框） */
  wrapText(text, maxWidth, fontSize) {
    const lines = [];
    let currentLine = '';
    const words = text.split(/\s+/); // 按空格拆分

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /** 更新游戏状态 */
  update() {
    this.bg.update();
  }

  /** 渲染画面 */
  render() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染背景
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
      // 1. 对话框背景（带圆角和边框）
      const dialogX = 50;
      const dialogY = 100;
      const dialogWidth = SCREEN_WIDTH - 100;
      const dialogHeight = 250;
      const radius = 10; // 圆角半径

      // 绘制带圆角的矩形
      ctx.beginPath();
      ctx.moveTo(dialogX + radius, dialogY);
      ctx.arcTo(dialogX + dialogWidth, dialogY, dialogX + dialogWidth, dialogY + dialogHeight, radius);
      ctx.arcTo(dialogX + dialogWidth, dialogY + dialogHeight, dialogX, dialogY + dialogHeight, radius);
      ctx.arcTo(dialogX, dialogY + dialogHeight, dialogX, dialogY, radius);
      ctx.arcTo(dialogX, dialogY, dialogX + dialogWidth, dialogY, radius);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fill();

      // 添加边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. 输入内容标题
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('你的问题：', SCREEN_WIDTH / 2, 140);

      // 3. 显示用户输入
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '14px Arial';
      const inputLines = this.wrapText(this.finalInput || '请输入内容...', SCREEN_WIDTH - 120, 14);
      inputLines.slice(0, 2).forEach((line, i) => { // 最多显示2行
        ctx.fillText(line, SCREEN_WIDTH / 2, 170 + i * 20);
      });

      // 4. AI回复标题
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText('AI回复：', SCREEN_WIDTH / 2, 210 + (inputLines.length > 1 ? 20 : 0));

      // 5. 显示API结果
      const resultY = 240 + (inputLines.length > 1 ? 20 : 0);
      ctx.fillStyle = this.requestStatus === 'fail' ? '#ff6b6b' : '#ffffff';
      ctx.font = '14px Arial';
      const resultLines = this.wrapText(this.apiResult || '', SCREEN_WIDTH - 120, 14);
      resultLines.slice(0, 3).forEach((line, i) => { // 最多显示3行
        ctx.fillText(line, SCREEN_WIDTH / 2, resultY + i * 20);
      });

      // 6. 操作提示
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '12px Arial';
      const tipText = this.isInputting ? '输入后点击"发送"' : '点击外部关闭';
      ctx.fillText(tipText, SCREEN_WIDTH / 2, 320);
    }
  }

  /** 启动游戏循环 */
  start() {
    this.loop();
  }

  /** 游戏主循环 */
  loop() {
    this.update();
    this.render();
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }
}