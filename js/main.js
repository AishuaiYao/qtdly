import './render';
import Background from './runtime/background';
import Sprite from './base/sprite';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render';

const ctx = canvas.getContext('2d');

export default class Main {
  constructor() {
    // 初始化背景
    this.bg = new Background();

    // 初始化左右按键（统一配置）
    this.buttons = {
      right: new Sprite(
        'images/right.png',
        80, 80,
        SCREEN_WIDTH - 90,  // 右侧边距10px
        SCREEN_HEIGHT - 90  // 底部边距10px
      ),
      left: new Sprite(
        'images/left.png',  // 左按键图片
        80, 80,
        10,  // 左侧边距10px
        SCREEN_HEIGHT - 90  // 底部边距10px（与右按键同高度）
      )
    };
    // 初始化按键状态
    Object.keys(this.buttons).forEach(key => {
      this.buttons[key].pressed = false;
    });

    // 状态管理（新增当前激活按键标识）
    this.state = {
      showDialog: false,
      activeButton: null,  // 记录当前激活的按键（'left'/'right'）
      isInputting: false,
      finalInput: '',
      apiResult: '',
      isRequesting: false,
      requestStatus: '',
      lastInput: '',
      scrollY: 0,
      startY: 0,
      isScrolling: false,
      inputLinesCache: [],
      resultLinesCache: [],
      cacheKey: ''
    };

    // 音频初始化
    this.audio = {
      bgm: wx.createInnerAudioContext(),
      button: wx.createInnerAudioContext()
    };
    this.audio.bgm.src = 'audio/bgm.mp3';
    this.audio.bgm.loop = true;
    this.audio.bgm.volume = 0.5;
    this.audio.button.src = 'audio/button.mp3';
    this.audio.button.volume = 0.8;

    this.bindEvents();
    this.aniId = 0;
    this.start();
  }

  /** 绑定所有事件 */
  bindEvents() {
    // 音频事件监听
    ['bgm', 'button'].forEach(type => {
      this.audio[type].onCanplay(() => console.log(`${type}音频加载完成`));
      this.audio[type].onError(err => console.error(`${type}音频错误:`, err.errMsg));
    });

    // 触摸开始
    wx.onTouchStart(res => {
      const { clientX, clientY } = res.touches[0];

      // 检测是否点击了任何按键
      const pressedButton = Object.entries(this.buttons).find(([_, btn]) =>
        this.isPointInButton(clientX, clientY, btn)
      );

      if (pressedButton) {
        const [key, btn] = pressedButton;
        this.audio.button.play();
        btn.pressed = true;
        // 更新状态并记录当前激活的按键
        this.state = {
          ...this.state,
          showDialog: true,
          activeButton: key,
          isInputting: true,
          finalInput: '',
          apiResult: '',
          requestStatus: '',
          scrollY: 0
        };
        this.showSystemKeyboard();
        return;
      }

      // 对话框交互（保持原有逻辑）
      if (this.state.showDialog) {
        const { dialogLeft, dialogRight, dialogTop, dialogBottom } = this.getDialogRect();
        const isInDialog = clientX >= dialogLeft && clientX <= dialogRight &&
                          clientY >= dialogTop && clientY <= dialogBottom;

        if (!isInDialog) {
          this.closeDialog();
        } else {
          this.state.startY = clientY;
          this.state.isScrolling = true;
        }
      }
    });

    // 触摸移动（保持原有逻辑）
    wx.onTouchMove(res => {
      const { showDialog, isInputting, isScrolling, scrollY, startY } = this.state;
      if (!showDialog || isInputting || !isScrolling) return;

      const { clientY } = res.touches[0];
      const deltaY = clientY - startY;
      const totalHeight = this.state.resultLinesCache.length * 20;
      const inputLineHeight = this.state.inputLinesCache.length * 20;
      const replyTitleY = 150 + inputLineHeight + 20;
      const visibleHeight = 380 - replyTitleY - 30;
      const maxScrollY = Math.max(0, totalHeight - visibleHeight);

      this.state.scrollY = Math.max(0, Math.min(scrollY - deltaY, maxScrollY));
      this.state.startY = clientY;
    });

    // 触摸结束（重置所有按键状态）
    wx.onTouchEnd(() => {
      Object.values(this.buttons).forEach(btn => btn.pressed = false);
      this.state.isScrolling = false;
    });

    // 键盘事件（保持原有逻辑）
    wx.onKeyboardConfirm(res => {
      if (this.state.isInputting) {
        const value = res.value.trim();
        if (!value) {
          wx.showToast({ title: '请输入内容', icon: 'none', duration: 1500 });
          return;
        }

        this.state = {
          ...this.state,
          finalInput: value,
          scrollY: 0,
          isInputting: false
        };
        // 可根据activeButton区分不同按键的API调用逻辑
        this.callAliyunApi(value, this.state.activeButton);
        wx.hideKeyboard();
      }
    });

    wx.onKeyboardComplete(() => {
      if (this.state.isInputting) this.closeDialog();
    });
  }

  /** 工具方法：检测点是否在按钮内（适配多按键） */
  isPointInButton(x, y, button) {
    return x >= button.x && x <= button.x + button.width &&
           y >= button.y && y <= button.y + button.height;
  }

  /** 工具方法：获取对话框矩形区域 */
  getDialogRect() {
    return {
      dialogLeft: 50,
      dialogRight: SCREEN_WIDTH - 50,
      dialogTop: 80,
      dialogBottom: 400  // 80 + 320
    };
  }

  /** 弹出系统键盘 */
  showSystemKeyboard() {
    wx.showKeyboard({
      defaultValue: '',
      maxLength: 50,
      multiple: false,
      confirmText: '发送',
      placeholder: `请输入要问的内容...`,  // 可根据activeButton修改提示文字
      success: () => console.log('键盘弹出成功'),
      fail: err => {
        console.error('键盘弹出失败:', err);
        this.closeDialog();
      }
    });
  }

  /** 调用阿里云百炼API（增加按键标识参数） */
  callAliyunApi(inputText, buttonType) {
    if (!inputText) {
      this.state = { ...this.state, requestStatus: 'fail', apiResult: '请输入有效内容' };
      return;
    }

    this.state = {
      ...this.state,
      isRequesting: true,
      requestStatus: 'loading',
      apiResult: 'AI正在思考...'
    };

    // 可根据按键类型修改API参数（如不同的system prompt）
    const systemPrompt = '你现在假扮古代的包拯大人，你说话的口气也是带有古风的，然后我们处理的问题一般都是小两口或者家里面大人或者小朋友之间的小矛盾，你作为包大人收集到他们对某件事各自的观点后，对他们进行正面的积极的劝解，缓解他们之间的矛盾或者不同观点。劝解要简洁，分点论述，每个论点换行显示';

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inputText }
        ]
      },
      success: res => {
        this.state.isRequesting = false;
        if (res.statusCode === 200 && res.data.choices?.length) {
          this.state = {
            ...this.state,
            requestStatus: 'success',
            apiResult: res.data.choices[0].message.content.trim() || '未获取到回复'
          };
        } else {
          this.state = {
            ...this.state,
            requestStatus: 'fail',
            apiResult: `API错误: ${res.data.error?.message || '未知错误'}`
          };
        }
      },
      fail: err => {
        this.state.isRequesting = false;
        let errorMsg = '请求失败: ' + err.errMsg;
        if (err.errMsg.includes('network')) errorMsg = '网络错误，请检查网络连接';
        else if (err.errMsg.includes('timeout')) errorMsg = '请求超时，请稍后重试';

        this.state = { ...this.state, requestStatus: 'fail', apiResult: errorMsg };
      }
    });
  }

  /** 关闭对话框（重置激活按键） */
  closeDialog() {
    this.state = {
      ...this.state,
      showDialog: false,
      activeButton: null,  // 重置激活状态
      isInputting: false,
      isRequesting: false,
      scrollY: 0
    };
    wx.hideKeyboard();
  }

  /** 文本换行处理 */
  wrapText(text, maxWidth, fontSize) {
    const lines = [];
    let currentLine = '';
    ctx.font = `${fontSize}px Arial`;

    for (const char of text) {
      const testLine = currentLine + char;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /** 带缓存的文本换行 */
  getWrappedText(text, maxWidth, fontSize) {
    const key = `${text}_${maxWidth}_${fontSize}`;
    if (this.state.cacheKey === key && this.state.resultLinesCache.length) {
      return this.state.resultLinesCache;
    }

    this.state.cacheKey = key;
    this.state.resultLinesCache = this.wrapText(text, maxWidth, fontSize);
    return this.state.resultLinesCache;
  }

  /** 更新游戏状态 */
  update() {
    this.bg.update();
  }

  /** 渲染画面（增加左按键渲染） */
  render() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染背景
    this.bg.render(ctx);

    // 渲染所有按键（统一处理）
    Object.values(this.buttons).forEach(button => {
      const scale = button.pressed ? 0.9 : 1;
      const renderWidth = button.width * scale;
      const renderHeight = button.height * scale;
      ctx.drawImage(
        button.img,
        button.x + (button.width - renderWidth) / 2,
        button.y + (button.height - renderHeight) / 2,
        renderWidth,
        renderHeight
      );
    });

    // 渲染对话框
    if (this.state.showDialog) {
      this.renderDialog();
    }
  }

  /** 渲染对话框内容（可根据激活按键修改标题） */
  renderDialog() {
    const { finalInput, lastInput, inputLinesCache, apiResult, scrollY, isInputting, activeButton } = this.state;
    const dialogX = 50;
    const dialogY = 80;
    const dialogWidth = SCREEN_WIDTH - 100;
    const dialogHeight = 320;

    // 1. 绘制对话框背景
    ctx.beginPath();
    ctx.moveTo(dialogX + 10, dialogY);
    ctx.arcTo(dialogX + dialogWidth, dialogY, dialogX + dialogWidth, dialogY + dialogHeight, 10);
    ctx.arcTo(dialogX + dialogWidth, dialogY + dialogHeight, dialogX, dialogY + dialogHeight, 10);
    ctx.arcTo(dialogX, dialogY + dialogHeight, dialogX, dialogY, 10);
    ctx.arcTo(dialogX, dialogY, dialogX + dialogWidth, dialogY, 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. 渲染用户输入（根据激活按键显示不同标题）
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    const dialogTitle = activeButton === 'left' ? '正方问答：' : '反方问答：';
    ctx.fillText(dialogTitle, 70, 130);

    // 更新输入缓存
    if (finalInput !== lastInput) {
      this.state.inputLinesCache = this.wrapText(finalInput || '请输入内容...', SCREEN_WIDTH - 120, 14);
      this.state.lastInput = finalInput;
    }

    // 绘制输入内容
    const showInputLines = inputLinesCache.slice(0, 2);
    const inputLineHeight = showInputLines.length * 20;
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '14px Arial';
    showInputLines.forEach((line, i) => ctx.fillText(line, 70, 150 + i * 20));

    // 3. 渲染AI回复（保持原有逻辑）
    const replyTitleY = 150 + inputLineHeight + 20;
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('包大人回复：', 70, replyTitleY);

    const resultLines = this.getWrappedText(apiResult || '', SCREEN_WIDTH - 120, 14);
    const totalHeight = resultLines.length * 20;
    const resultY = replyTitleY + 30;
    const visibleHeight = 380 - replyTitleY - 30;
    const maxScrollY = Math.max(0, totalHeight - visibleHeight);

    // 计算可见行
    const startIndex = Math.floor(scrollY / 20);
    const endIndex = Math.ceil((scrollY + visibleHeight) / 20) + 1;
    const visibleLines = resultLines.slice(startIndex, endIndex);

    // 绘制回复内容
    ctx.fillStyle = this.state.requestStatus === 'fail' ? '#ff6b6b' : '#ffffff';
    ctx.font = '14px Arial';
    visibleLines.forEach((line, i) => {
      ctx.fillText(line, 70, resultY + (startIndex + i) * 20 - scrollY);
    });

    // 4. 渲染滚动条
    if (maxScrollY > 0) {
      const scrollBarHeight = Math.max(20, (visibleHeight / totalHeight) * visibleHeight);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(
        SCREEN_WIDTH - 60,
        resultY + (scrollY / maxScrollY) * (visibleHeight - scrollBarHeight),
        3,
        scrollBarHeight
      );
    }

    // 5. 操作提示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      isInputting ? '输入后点击"发送"' : (maxScrollY > 0 ? '向上滑动查看更多' : '点击外部关闭'),
      SCREEN_WIDTH / 2,
      380
    );
  }

  /** 启动游戏 */
  start() {
    this.loop();
    this.playBgm();
  }

  /** 播放背景音乐 */
  playBgm() {
    try {
      this.audio.bgm.play();
      console.log('背景音乐开始播放');
    } catch (err) {
      console.log('背景音乐需用户交互，点击屏幕播放:', err);
      wx.onTouchStart(() => this.playBgm(), { once: true });
    }
  }

  /** 游戏主循环 */
  loop() {
    this.update();
    this.render();
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }
}