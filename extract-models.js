const fs = require('fs');

// 读取models.json文件
try {
  const data = fs.readFileSync('models.json', 'utf8');
  const modelsData = JSON.parse(data);

  // 提取所有模型的id
  const modelIds = modelsData.data.map(model => model.id);

  // 格式化为TypeScript静态数组格式
  const formattedOutput = `static availableChatModels = ${JSON.stringify(modelIds, null, 2)}`;

  // 输出到文件
  fs.writeFileSync('available-models.txt', formattedOutput);

  console.log(`成功提取 ${modelIds.length} 个模型ID到 available-models.txt 文件`);
  console.log('文件内容已准备就绪，可以直接复制到代码中使用');

} catch (error) {
  console.error('处理文件时出错:', error.message);
}