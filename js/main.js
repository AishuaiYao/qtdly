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
    this.lastInput = '';           // 记录上次输入（用于缓存判断）

    // 滚动相关变量
    this.scrollY = 0;              // 滚动偏移量
    this.startY = 0;               // 触摸起始y坐标
    this.isScrolling = false;      // 是否正在滚动

    // 文本缓存变量（优化滚动卡顿核心）
    this.inputLinesCache = [];    // 缓存用户输入换行结果
    this.resultLinesCache = [];   // 缓存AI回复换行结果
    this.cacheKey = '';           // 缓存key（文本+宽度+字体大小）

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
    // 背景音乐加载完成监听
    this.bgm.onCanplay(() => {
      console.log('背景音乐加载完成');
    });

    // 按钮音效加载完成监听
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
        this.buttonSound.play();
        this.button.pressed = true;
        this.showDialog = true;
        this.isInputting = true;
        this.finalInput = '';
        this.apiResult = '';
        this.requestStatus = '';
        this.scrollY = 0;
        this.showSystemKeyboard();
        return;
      }

      // 对话框外部点击：关闭对话框
      if (this.showDialog) {
        const dialogLeft = 50;
        const dialogRight = SCREEN_WIDTH - 50;
        const dialogTop = 80;
        const dialogBottom = 80 + 320;

        const isInDialog = clientX >= dialogLeft
          && clientX <= dialogRight
          && clientY >= dialogTop
          && clientY <= dialogBottom;

        if (!isInDialog) {
          this.closeDialog();
        } else {
          this.startY = clientY;
          this.isScrolling = true;
        }
      }
    });

    // 触摸移动事件（优化滚动计算）
    wx.onTouchMove((res) => {
      if (!this.showDialog || this.isInputting || !this.isScrolling) return;

      const { clientY } = res.touches[0];
      const deltaY = clientY - this.startY;

      // 直接使用缓存高度，减少计算
      const totalHeight = this.resultLinesCache.length * 20;
      const inputLineHeight = this.inputLinesCache.length * 20;
      const replyTitleY = 150 + inputLineHeight + 20;
      const visibleHeight = 380 - replyTitleY - 30;
      const maxScrollY = Math.max(0, totalHeight - visibleHeight);

      // 简化滚动偏移计算
      this.scrollY = Math.max(0, Math.min(this.scrollY - deltaY, maxScrollY));
      this.startY = clientY;
    });

    // 触摸结束：恢复状态
    wx.onTouchEnd(() => {
      this.button.pressed = false;
      this.isScrolling = false;
    });

    // 键盘确认事件
    wx.onKeyboardConfirm((res) => {
      if (this.isInputting) {
        if (!res.value || res.value.trim() === '') {
          wx.showToast({
            title: '请输入内容',
            icon: 'none',
            duration: 1500
          });
          return;
        }

        this.finalInput = res.value.trim();
        console.log('用户输入:', this.finalInput);
        this.scrollY = 0;
        this.callAliyunApi(this.finalInput);
        this.isInputting = false;
        wx.hideKeyboard();
      }
    });

    // 键盘关闭事件
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
    if (!inputText.trim()) {
      this.requestStatus = 'fail';
      this.apiResult = '请输入有效内容';
      return;
    }

    this.isRequesting = true;
    this.requestStatus = 'loading';
    this.apiResult = 'AI正在思考...';

    const API_KEY = 'sk-943f95da67d04893b70c02be400e2935';
    const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: '你是一个 helpful 的助手，回答简洁明了。' },
          { role: 'user', content: inputText }
        ]
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
    this.scrollY = 0;
    wx.hideKeyboard();
  }

  /** 文本换行处理（基础方法） */
  wrapText(text, maxWidth, fontSize) {
    const lines = [];
    let currentLine = '';
    ctx.font = `${fontSize}px Arial`;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /** 带缓存的文本换行（优化重复计算） */
  getWrappedText(text, maxWidth, fontSize) {
    const key = `${text}_${maxWidth}_${fontSize}`;
    if (this.cacheKey === key && this.resultLinesCache.length > 0) {
      return this.resultLinesCache;
    }
    this.cacheKey = key;
    this.resultLinesCache = this.wrapText(text, maxWidth, fontSize);
    return this.resultLinesCache;
  }

  /** 更新游戏状态 */
  update() {
    this.bg.update();
  }

  /** 渲染画面（优化滚动卡顿） */
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
      // 1. 对话框背景
      const dialogX = 50;
      const dialogY = 80;
      const dialogWidth = SCREEN_WIDTH - 100;
      const dialogHeight = 320;
      const radius = 10;

      ctx.beginPath();
      ctx.moveTo(dialogX + radius, dialogY);
      ctx.arcTo(dialogX + dialogWidth, dialogY, dialogX + dialogWidth, dialogY + dialogHeight, radius);
      ctx.arcTo(dialogX + dialogWidth, dialogY + dialogHeight, dialogX, dialogY + dialogHeight, radius);
      ctx.arcTo(dialogX, dialogY + dialogHeight, dialogX, dialogY, radius);
      ctx.arcTo(dialogX, dialogY, dialogX + dialogWidth, dialogY, radius);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. 渲染用户输入（缓存优化）
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('你的问题：', 70, 130);

      if (this.finalInput !== this.lastInput) {
        this.inputLinesCache = this.wrapText(this.finalInput || '请输入内容...', SCREEN_WIDTH - 120, 14);
        this.lastInput = this.finalInput;
      }
      const showInputLines = this.inputLinesCache.slice(0, 2);
      const inputLineHeight = showInputLines.length * 20;
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '14px Arial';
      showInputLines.forEach((line, i) => {
        ctx.fillText(line, 70, 150 + i * 20);
      });

      // 3. 渲染AI回复（可见区域优化）
      const replyTitleY = 150 + inputLineHeight + 20;
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText('AI回复：', 70, replyTitleY);

      const resultLines = this.getWrappedText(this.apiResult || '', SCREEN_WIDTH - 120, 14);
      const totalHeight = resultLines.length * 20;
      const resultY = replyTitleY + 30;
      const visibleHeight = 380 - replyTitleY - 30;
      const maxScrollY = Math.max(0, totalHeight - visibleHeight);

      // 计算可见行范围，减少绘制次数
      const startIndex = Math.floor(this.scrollY / 20);
      const endIndex = Math.ceil((this.scrollY + visibleHeight) / 20) + 1;
      const visibleLines = resultLines.slice(startIndex, endIndex);

      // 渲染可见文本
      ctx.fillStyle = this.requestStatus === 'fail' ? '#ff6b6b' : '#ffffff';
      ctx.font = '14px Arial';
      visibleLines.forEach((line, i) => {
        const drawY = resultY + (startIndex + i) * 20 - this.scrollY;
        ctx.fillText(line, 70, drawY);
      });

      // 4. 渲染滚动条
      if (maxScrollY > 0) {
        const scrollBarWidth = 3;
        const scrollBarHeight = Math.max(20, (visibleHeight / totalHeight) * visibleHeight);
        const scrollBarX = SCREEN_WIDTH - 60;
        const scrollBarY = resultY + (this.scrollY / maxScrollY) * (visibleHeight - scrollBarHeight);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(scrollBarX, scrollBarY, scrollBarWidth, scrollBarHeight);
      }

      // 5. 操作提示
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
    // 背景音乐播放逻辑
    const playBgm = () => {
      try {
        this.bgm.play();
        console.log('背景音乐开始播放');
      } catch (err) {
        console.log('背景音乐需用户交互，点击屏幕播放:', err);
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