const fs = require('fs');
const path = require('path');

// 生成月份列表的静态 JSON 文件
const dataDir = path.join(__dirname, '..', 'public', 'data', 'eval_reports');
const outputPath = path.join(__dirname, '..', 'public', 'data', 'months.json');

try {
  const filenames = fs.readdirSync(dataDir);
  
  const months = filenames
    .filter((name) => name.startsWith('models-') && name.endsWith('.json'))
    .map((name) => name.replace('models-', '').replace('.json', ''))
    .sort((a, b) => b.localeCompare(a)); // 降序排列，最新的在前

  fs.writeFileSync(outputPath, JSON.stringify({ months }, null, 2));
  
  console.log(`✓ Generated months.json with ${months.length} months:`, months);
} catch (error) {
  console.error('Error generating months.json:', error);
  process.exit(1);
}

