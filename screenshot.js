const puppeteer = require('puppeteer');

async function takeScreenshot() {
  console.log('开始执行截图程序...');
  
  // 启动浏览器
  console.log('正在启动浏览器...');
  const browser = await puppeteer.launch({
    headless: "new", // 使用新的无头模式
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('浏览器已启动');
  
  try {
    // 创建新页面
    console.log('正在创建新页面...');
    const page = await browser.newPage();
    console.log('新页面已创建');
    
    // 设置视口大小为1920x1080
    console.log('正在设置视口大小...');
    await page.setViewport({
      width: 3840,
      height: 2160,
      deviceScaleFactor: 1,
    });
    console.log('视口大小已设置为1920x1080');
    
    // 导航到目标URL
    console.log('正在导航到 http://localhost:5173...');
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle2', // 等待网络请求完成
      timeout: 30000 // 30秒超时
    });
    console.log('成功导航到目标URL');
    
    // 应用80%缩放
    console.log('正在应用80%缩放...');
    await page.evaluate(() => {
      document.body.style.zoom = "80%";
      document.body.style.transform = "scale(0.8)";
      document.body.style.transformOrigin = "0 0";
    });
    console.log('缩放已应用');
    
    // 等待一秒确保页面完全渲染
    console.log('等待1秒确保页面渲染...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('等待完成');
    
    // 截图并保存为PNG
    console.log('正在截图并保存为PNG...');
    await page.screenshot({ path: 'screenshot.png', fullPage: true });
    console.log('截图已保存为 screenshot.png');
    
    // 截图并保存为PDF
    console.log('正在保存为PDF...');
    await page.pdf({ 
      path: 'screenshot.pdf',
      width: 3840,
      height: 2160,
      printBackground: true
    });
    console.log('PDF已保存为 screenshot.pdf');
    
  } catch (error) {
    console.error('截图过程中出错:', error);
  } finally {
    // 关闭浏览器
    console.log('正在关闭浏览器...');
    await browser.close();
    console.log('浏览器已关闭');
    console.log('截图程序执行完毕');
  }
}

takeScreenshot().catch(err => {
  console.error('程序执行失败:', err);
}); 