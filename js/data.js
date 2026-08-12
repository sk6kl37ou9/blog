/* ============================================
   本文件由 scripts/build.js 自动生成，请勿手改
   文章源文件在 posts/*.md，站点配置在 config.json
   修改后运行：node scripts/build.js
   ============================================ */

const SITE = {
  name: "拾光小筑",
  author: "阿星",
  tagline: "记录生活，沉淀思考",
  url: "https://baifeng.de5.net",
  repository: "https://github.com/sk6kl37ou9/blog",
  bio: "一个喜欢写代码也喜欢写文字的人。白天搬砖，晚上码字，相信慢就是快。",
  avatar: "🌿",
  social: [{"name":"GitHub","url":"https://github.com","icon":"🐙"},{"name":"知乎","url":"https://zhihu.com","icon":"💡"},{"name":"邮箱","url":"mailto:hi@example.com","icon":"📮"}],
  postsPerPage: 5,
  giscus: {"enabled":true,"repo":"sk6kl37ou9/blog","repoId":"","category":"Announcements","categoryId":"","mapping":"pathname"},
};

const POSTS = [
  {
    id: "markdown-upgrade-demo",
    title: "博客 Markdown 引擎升级：图片、表格、列表都支持了",
    date: "2026-08-12",
    tags: ["技术","公告"],
    excerpt: "这篇用来演示新的渲染能力：图片、表格、三级标题、有序列表、删除线、分隔线。",
    cover: "https://picsum.photos/seed/markdown-upgrade-demo/640/360",
    content: "## 图片\n\n![示例图片，来自 picsum](https://picsum.photos/seed/shiguang/800/450)\n\n图片支持懒加载，放在段落里即可。\n\n## 表格\n\n| 语法 | 支持 |\n| --- | --- |\n| **加粗** | ✅ |\n| ~~删除线~~ | ✅ |\n| 行内代码 | ✅ |\n\n## 三级标题\n\n### 这是三级标题\n\n上面是 ### 标题的示例，文章结构可以更清晰。\n\n## 有序列表\n\n1. 第一步：写内容\n2. 第二步：填到 posts 目录\n3. 第三步：运行构建脚本\n\n> 引用块依然可用。\n\n---\n\n以上就是全部演示，~~旧版渲染器~~ 已经退休了。",
  },
  {
    id: "slow-living-2026",
    title: "慢一点，比较快",
    date: "2026-08-10",
    tags: ["随笔","生活"],
    excerpt: "我们总在追赶什么，却忘了问自己要去哪里。这篇聊聊我最近的「慢生活」实验。",
    cover: "https://picsum.photos/seed/slow-living/640/360",
    content: "## 为什么想慢下来\n\n上个月连续加了三周班，某个深夜走出办公楼，发现晚风吹在脸上的感觉竟然很陌生。那一刻我意识到，自己已经很久没有**认真感受过**任何东西了。\n\n于是我们做了一个实验：每天留出一小时，不看手机，不回消息，就做一些「没用」的事。\n\n## 实验清单\n\n- 泡一壶茶，看着茶叶慢慢舒展\n- 在小区里散步，数一路上有几种鸟叫\n- 手写一页日记，哪怕只是流水账\n- 读二十页纸质书，用铅笔在旁边写批注\n\n> 所谓生活，不是等待风暴过去，而是学会在雨中跳舞。\n\n## 一些发现\n\n第一周很难受，手总忍不住去摸手机。第二周开始，睡眠变好了，白天写代码的思路也清晰了不少。\n\n**慢不是躺平**，而是把注意力从无意义的消耗里收回来，放在真正重要的事情上。\n\n如果你也觉得最近太赶了，不妨试试。从每天十分钟开始就好。",
  },
  {
    id: "js-closure-notes",
    title: "我如何理解 JavaScript 闭包",
    date: "2026-07-28",
    tags: ["技术","前端"],
    excerpt: "闭包不是黑魔法，它只是函数和它周围状态的组合。用三个例子讲清楚。",
    cover: "https://picsum.photos/seed/js-closure/640/360",
    content: "## 一句话版本\n\n闭包 = 函数 + 它能访问的外部变量。哪怕外部函数已经执行完，这些变量依然活着。\n\n## 例子一：计数器\n\n```javascript\nfunction createCounter() {\n  let count = 0;\n  return function () {\n    return ++count;\n  };\n}\n\nconst counter = createCounter();\ncounter(); // 1\ncounter(); // 2\n```\n\n`count` 没有被回收，因为返回的函数还「记得」它。\n\n## 例子二：循环里的经典坑\n\n```javascript\nfor (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i)); // 3, 3, 3\n}\n```\n\n用 `let` 替代 `var`，每次循环都会创建新的绑定，问题就解决了。\n\n## 什么时候会用到\n\n- **数据私有化**：模块模式的基础\n- **函数柯里化**：预先绑定部分参数\n- **回调与事件**：记住创建时的上下文\n\n闭包不需要背概念，多写几次就内化了。",
  },
  {
    id: "city-walk-guangzhou",
    title: "广州 City Walk：从沙面走到东山口",
    date: "2026-07-15",
    tags: ["旅行","生活"],
    excerpt: "一条适合周末慢慢走的路线，老建筑、咖啡店和树荫一样都不缺。",
    cover: "https://picsum.photos/seed/guangzhou/640/360",
    content: "## 路线概览\n\n沙面岛 → 沿江西路 → 爱群大厦 → 北京路（午饭）→ 东山口，全程大约 **8 公里**，走走停停一个下午刚好。\n\n## 沙面：欧陆风情开场\n\n早上的沙面人不多，阳光透过榕树洒在石板路上。随便找家咖啡馆坐一会儿，看老人打太极，节奏一下子就慢下来了。\n\n## 沿江西路：老广州的江风\n\n> 珠江的风是有味道的——一点点潮气，混着远处船笛的声音。\n\n从沙面出来沿江往东走，会路过粤海关旧址和爱群大厦。这些老建筑的外立面保存得很好，适合拍照。\n\n## 东山口：文艺收尾\n\n东山口的小洋楼现在大多改成了买手店和咖啡馆。推荐在庙前西街一带逛逛，累了就找家店坐下来点杯手冲。\n\n## 小贴士\n\n- 夏天务必带伞，广州的阵雨说来就来\n- 全程树荫覆盖率不错，但防蚊水建议备上\n- 北京路午饭选择多，错峰去吃不用排队",
  },
  {
    id: "reading-list-2026-h1",
    title: "2026 上半年读过的书",
    date: "2026-06-30",
    tags: ["读书"],
    excerpt: "半年读了十一本，挑出五本真正值得推荐的，附一句话点评。",
    cover: "https://picsum.photos/seed/reading-list/640/360",
    content: "## 上半年阅读小结\n\n年初定了读 20 本的目标，半年过去读完 11 本，进度勉强及格。比起数量，更开心的是遇到了几本真正打动我的书。\n\n## 五星推荐\n\n**《人类简史》** —— 宏大叙事但不空洞，读完看世界的眼光会变。\n\n**《夜晚的潜水艇》** —— 陈春成的想象力像深海里的光，中文原来可以这么美。\n\n**《代码整洁之道》** —— 工作第三年重读，比刚毕业时看懂了十倍。\n\n**《东京八平米》** —— 原来一个人需要的空间可以这么小，生活可以这么轻。\n\n**《纳瓦尔宝典》** —— 关于财富和幸福的思考，值得每隔半年翻一次。\n\n## 一点方法\n\n今年开始用「三本书轮换法」：一本难读的、一本轻松的、一本工具书，按当天状态切换，阅读中断率明显下降。",
  },
  {
    id: "hello-blog",
    title: "你好，这是我的博客",
    date: "2026-06-01",
    tags: ["随笔"],
    excerpt: "第一篇。写写为什么要在 2026 年还坚持拥有一个自己的博客。",
    cover: "https://picsum.photos/seed/hello-blog/640/360",
    content: "## 为什么要写博客\n\n在算法推荐的时代，拥有一个自己的博客像是一种小小的坚持：**不被信息流定义，按自己的节奏表达。**\n\n这里会写些什么呢？\n\n- 技术上踩过的坑和一些思考\n- 读过的书、走过的路\n- 偶尔的碎碎念\n\n## 关于更新频率\n\n不立 flag，写得出就写，写不出就好好生活。毕竟博客的意义是记录，而不是负担。\n\n> 写作是思维的健身。\n\n那么，就从这篇开始吧。",
  }
];
