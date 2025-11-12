const fs = require('fs');
const path = require('path');

// 网站基础URL
const BASE_URL = 'https://sql-llm-leaderboard.com';

// 生成sitemap.xml的函数
function generateSitemap() {
    const urls = [];

    // 添加首页
    urls.push({
        loc: BASE_URL,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '1.0'
    });

    try {
        // 读取数据目录
        const dataDir = path.join(__dirname, '../public/data/eval_reports');
        const files = fs.readdirSync(dataDir);

        // 获取所有可用的月份
        const months = files
            .filter(file => file.startsWith('models-') && file.endsWith('.json'))
            .map(file => file.replace('models-', '').replace('.json', ''))
            .sort((a, b) => b.localeCompare(a)); // 降序排列

        console.log('找到的月份:', months);

        // 为每个月份添加页面
        months.forEach((month, index) => {
            // 判断是否为最新月份
            const isLatestMonth = index === 0;

            // 排名页面
            urls.push({
                loc: `${BASE_URL}/ranking/${month}`,
                lastmod: new Date().toISOString().split('T')[0],
                changefreq: isLatestMonth ? 'weekly' : 'yearly',
                priority: isLatestMonth ? '0.9' : '0.8'
            });

            // 指标排名页面和模型对比页面需要参数才能正常显示
            // 考虑到SEO最佳实践，不在sitemap中包含参数化URL
            // 这些功能页面通过网站内部导航和链接被发现即可

            // 读取该月份的模型数据
            try {
                const filePath = path.join(dataDir, `models-${month}.json`);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(fileContent);

                if (data.models && Array.isArray(data.models)) {
                    // 只为每个模型添加详情页面（核心内容页面）
                    data.models.forEach(model => {
                        urls.push({
                            loc: `${BASE_URL}/models/${model.id}/${month}`,
                            lastmod: new Date().toISOString().split('T')[0],
                            changefreq: isLatestMonth ? 'weekly' : 'yearly',
                            priority: isLatestMonth ? '0.8' : '0.7'
                        });
                    });

                    console.log(`月份 ${month}: 找到 ${data.models.length} 个模型`);
                }
            } catch (error) {
                console.error(`读取月份 ${month} 的数据时出错:`, error.message);
            }
        });

        console.log(`总共生成 ${urls.length} 个URL`);

        // 生成XML内容
        const xmlContent = generateXML(urls);

        // 写入sitemap.xml文件
        const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
        fs.writeFileSync(sitemapPath, xmlContent, 'utf-8');

        console.log('✅ sitemap.xml 生成成功!');
        console.log(`📍 文件位置: ${sitemapPath}`);
        console.log(`🔗 包含 ${urls.length} 个页面`);

        return true;
    } catch (error) {
        console.error('❌ 生成sitemap时出错:', error);
        return false;
    }
}

// 生成XML格式的sitemap内容
function generateXML(urls) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    urls.forEach(url => {
        xml += '  <url>\n';
        xml += `    <loc>${url.loc}</loc>\n`;
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
}

// 执行生成
if (require.main === module) {
    console.log('🚀 开始生成sitemap.xml...');
    generateSitemap();
}

module.exports = { generateSitemap };


// ## 页面优先级和更新频率策略
//
// 优先级 (Priority):
// - 首页: 1.0 (最高优先级)
// - 当月排名页面: 0.9 (最新的核心功能页面)
// - 当月模型详情页面: 0.8 (最新的重要内容页面)
// - 历史月份排名页面: 0.8 (历史核心功能页面)
// - 历史月份模型详情页面: 0.7 (历史内容页面)
//
// 更新频率 (Change Frequency):
// - 首页: weekly (定期更新，重定向到最新月份)
// - 最新月份所有页面: weekly (可能会有新模型加入或内容更新)
// - 历史月份所有页面: yearly (内容基本固定，很少变更)
//
// ## URL生成策略
//
// 只包含核心内容页面，符合SEO最佳实践：
// - 首页: 网站入口
// - 排名页面: 核心功能页面，展示模型排行榜
// - 模型详情页面: 重要内容页面，每个模型的详细信息
//
// 不包含功能性页面（需要参数的页面）：
// - 指标排名页面: 需要dimension和modelId参数
// - 模型对比页面: 需要models参数
// 这些页面通过网站内部导航和链接被搜索引擎发现
//
// ## 使用方法
//
// ### 方法一：使用 npm 脚本
// ```bash
// cd leaderboard
// npm run generate-sitemap
// ```
//
// ### 方法二：直接运行脚本
// ```bash
// cd leaderboard
// node scripts/generate-sitemap.js
// ```