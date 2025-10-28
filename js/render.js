// 创建画布并设置尺寸
GameGlobal.canvas = wx.createCanvas();
const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();

// 设置画布宽高为屏幕尺寸
canvas.width = windowInfo.screenWidth;
canvas.height = windowInfo.screenHeight;

// 导出屏幕尺寸供全局使用
export const SCREEN_WIDTH = windowInfo.screenWidth;
export const SCREEN_HEIGHT = windowInfo.screenHeight;