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

    // 滚动相关变量
    this.scrollY = 0;              // 滚动偏移量
    this.startY = 0;               // 触摸起始y坐标
    this.isScrolling = false;      // 是否正在滚动

    // 初始化音频
    this.bgm = wx.createInnerAudioContext();
    this.bgm.src = 'audio/bgm.mp3';
    this.bgm.loop = true; // 背景音乐循环
    this.bgm.volume = 0.5; // 音量50%

    this.buttonSound = wx.createInnerAudioContext();
    this.buttonSound.src = 'audio/button.mp3';
    this.buttonSound.volume = 0.8; // 按钮音效音量80%

    this.bindEvents();
    this.aniId = 0;
    this.start();
  }

  /** 绑定所有事件 */
  bindEvents() {
    // 可选：背景音乐加载完成监听
    this.bgm.onCanplay(() => {
      console.log('背景音乐加载完成');
    });

    // 可选：按钮音效加载完成监听
    this.buttonSound.onCanplay(() => {
      console.log('按钮音效加载完成');
    });

    // 背景音乐错误监听
    this.bgm.onError((err) => {
      console.error('背景音乐播放失败:', err.errMsg);
    });

    // 按钮音效错误监听
    this.buttonSound.onError((err) => {
      console.error('按钮音效播放失败:', err.errMsg);
    });

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
        this.buttonSound.play(); // 直接播放，无返回值处理
        this.button.pressed = true;
        this.showDialog = true;
        this.isInputting = true;
        this.finalInput = '';      // 清空历史输入
        this.apiResult = '';       // 清空历史结果
        this.requestStatus = '';   // 重置请求状态
        this.scrollY = 0;          // 重置滚动
        this.showSystemKeyboard(); // 弹出系统键盘
        return;
      }

      // 对话框外部点击：关闭对话框
      if (this.showDialog) {
        const dialogLeft = 50;
        const dialogRight = SCREEN_WIDTH - 50;
        const dialogTop = 80;      // 对应对话框Y坐标
        const dialogBottom = 80 + 320;  // 对话框Y + 高度

        const isInDialog = clientX >= dialogLeft
          && clientX <= dialogRight
          && clientY >= dialogTop
          && clientY <= dialogBottom;

        if (!isInDialog) {
          this.closeDialog();
        } else {
          // 如果点击对话框内部，准备滚动
          this.startY = clientY;
          this.isScrolling = true;
        }
      }
    });

    // 触摸移动事件（处理滚动）
    wx.onTouchMove((res) => {
      if (!this.showDialog || this.isInputting || !this.isScrolling) return;

      const { clientY } = res.touches[0];
      const deltaY = clientY - this.startY;

      // 计算回复文本总高度
      const resultLines = this.wrapText(this.apiResult || '', SCREEN_WIDTH - 120, 14);
      const totalHeight = resultLines.length * 20;

      // 计算输入区域占用高度
      const inputLines = this.wrapText(this.finalInput || '', SCREEN_WIDTH - 120, 14);
      const showInputLines = inputLines.slice(0, 2);
      const inputLineHeight = showInputLines.length * 20;
      const replyTitleY = 150 + inputLineHeight + 20;

      // 计算可滚动区域高度
      const visibleHeight = 380 - replyTitleY - 30; // 对话框底部 - 回复标题Y - 底部边距
      const maxScrollY = Math.max(0, totalHeight - visibleHeight); // 最大滚动距离

      // 更新滚动偏移量（限制在0到maxScrollY之间）
      this.scrollY = Math.max(0, Math.min(this.scrollY - deltaY, maxScrollY));
      this.startY = clientY;
    });

    // 触摸结束：恢复按钮状态和滚动状态
    wx.onTouchEnd(() => {
      this.button.pressed = false;
      this.isScrolling = false;
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

        // 调用API，重置滚动
        this.scrollY = 0;
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
    this.scrollY = 0; // 重置滚动
    wx.hideKeyboard();
  }

  /** 文本换行处理（优化版） */
  wrapText(text, maxWidth, fontSize) {
    const lines = [];
    let currentLine = '';
    ctx.font = `${fontSize}px Arial`; // 确保测量字体一致

    // 处理无空格的长文本（逐个字符判断）
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      // 如果当前行加上新字符超过最大宽度，换行
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    // 添加最后一行
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
      // 1. 对话框背景（带圆角和边框，增大高度）
      const dialogX = 50;
      const dialogY = 80; // 向上移动，增加空间
      const dialogWidth = SCREEN_WIDTH - 100;
      const dialogHeight = 320; // 增大高度到320px
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

      // 2. 输入内容标题（左对齐）
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('你的问题：', 70, 130);

      // 3. 显示用户输入（最多2行）
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      const inputLines = this.wrapText(this.finalInput || '请输入内容...', SCREEN_WIDTH - 120, 14);
      const showInputLines = inputLines.slice(0, 2); // 最多显示2行
      showInputLines.forEach((line, i) => {
        ctx.fillText(line, 70, 150 + i * 20); // 从150px开始
      });

      // 4. AI回复标题（根据输入行数动态定位）
      const inputLineHeight = showInputLines.length * 20;
      const replyTitleY = 150 + inputLineHeight + 20; // 输入文本下方20px
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('AI回复：', 70, replyTitleY);

      // 5. 显示API结果（带滚动功能）
      ctx.fillStyle = this.requestStatus === 'fail' ? '#ff6b6b' : '#ffffff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      const resultLines = this.wrapText(this.apiResult || '', SCREEN_WIDTH - 120, 14);
      const resultY = replyTitleY + 30; // 标题下方30px开始

      // 计算可滚动区域高度
      const visibleHeight = 380 - replyTitleY - 30; // 可见区域高度
      const totalHeight = resultLines.length * 20; // 文本总高度
      const maxScrollY = Math.max(0, totalHeight - visibleHeight); // 最大滚动距离

      // 绘制可见的回复文本（应用滚动偏移）
      resultLines.forEach((line, i) => {
        const drawY = resultY + i * 20 - this.scrollY;
        // 只绘制可见区域内的文本
        if (drawY > replyTitleY && drawY < 380 - 20) {
          ctx.fillText(line, 70, drawY);
        }
      });

      // 6. 绘制滚动条（当内容过长时）
      if (maxScrollY > 0) {
        const scrollBarWidth = 3;
        const scrollBarHeight = Math.max(20, (visibleHeight / totalHeight) * visibleHeight); // 滚动条高度
        const scrollBarX = SCREEN_WIDTH - 60; // 右侧边距
        // 滚动条Y坐标（根据滚动进度计算）
        const scrollBarY = resultY + (this.scrollY / maxScrollY) * (visibleHeight - scrollBarHeight);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(scrollBarX, scrollBarY, scrollBarWidth, scrollBarHeight);
      }

      // 7. 操作提示
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      const tipText = this.isInputting
        ? '输入后点击"发送"'
        : (maxScrollY > 0 ? '向上滑动查看更多' : '点击外部关闭');
      ctx.fillText(tipText, SCREEN_WIDTH / 2, 380);
    }
  }

  /** 启动游戏循环 */
  start() {
    this.loop();
    // 修复播放异常：移除.then()，直接调用play()
    const playBgm = () => {
      try {
        this.bgm.play();
        console.log('背景音乐开始播放');
      } catch (err) {
        console.log('背景音乐需用户交互，点击屏幕播放:', err);
        // 监听一次触摸事件，用户点击后重试
        wx.onTouchStart(() => {
          playBgm();
        }, { once: true });
      }
    };
    playBgm();
  }

  /** 游戏主循环 */
  loop() {
    this.update();
    this.render();
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }
}