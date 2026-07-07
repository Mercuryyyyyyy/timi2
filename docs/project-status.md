# 合成大timi — 项目状态文档

> 用于对话压缩后继续开发。记录所有已完成工作、关键配置、待办事项。

---

## 项目概况

浏览器端物理合成游戏，王者荣耀英雄主题。玩家拖拽英雄头像球到容器中，两个相同英雄碰撞后合成下一级。

- **路径**: `/home/mercury/timi2`
- **框架**: Vite + TypeScript + Matter.js + Canvas 2D
- **运行**: `npx vite --host 0.0.0.0 --port 5173`
- **构建**: `npm run build` → `dist/`

---

## 合成链（11 级）

| 等级 | 英雄 | 英文名 | ID | 半径 | 分数 | 头像文件 |
|------|------|--------|-----|------|------|----------|
| 1 | 马可波罗 | marco_polo | 132 | 24px | 0 | 01-marcopolo.png |
| 2 | 不知火舞 | buzhihuowu | 157 | 25px | 10 | 02-buzhihuowu.jpg |
| 3 | 干将莫邪 | gan_jiang_mo_xie | 182 | 27px | 20 | 03-ganjiangmoxie.jpg |
| 4 | 铠 | kai | 193 | 30px | 40 | 04-kai.jpg |
| 5 | 甄姬 | zhen_ji | 127 | 33px | 80 | 05-zhenji.jpg |
| 6 | 云缨 | yun_ying | 538 | 38px | 160 | 06-yunying.jpg |
| 7 | 海诺 | hai_nuo | 563 | 43px | 320 | 07-hainuo.jpg |
| 8 | 虞姬 | yu_ji | 174 | 49px | 640 | 08-yuji.jpg |
| 9 | 小乔 | xiao_qiao | 106 | 56px | 1280 | 09-xiaoqiao.jpg |
| 10 | 蔡文姬 | cai_wen_ji | 184 | 64px | 2560 | 10-caiwenji.jpg |
| 11 | 瑶 | yao | 505 | 72px | 5120 | 11-yao.jpg |

**瑶+瑶合成**: 双方消失 → 10000分 + 蝴蝶绽放特效 + 那艺娜音频 `wow.wav` + 底部随机掉落3个tier 1-3小球

---

## 物理参数

```ts
GRAVITY = 1.2          // 重力
RESTITUTION = 0.3      // 弹性（软碰撞）
FRICTION = 0.45        // 表面摩擦
FRICTION_AIR = 0.03    // 空气阻力
CONTAINER_WIDTH = 360  // 容器宽
CONTAINER_HEIGHT = 520 // 容器高
DEATH_LINE_Y = 35      // 死亡线（球超过此线1秒游戏结束）
```

---

## 文件结构

```
timi2/
├── index.html                    # 入口
├── package.json                  # Vite + Matter.js + Vitest
├── tsconfig.json
├── vite.config.ts
├── extract-audio.html            # 浏览器端视频→音频提取工具
├── hero-voice-selection.md       # 用户勾选的语音清单
├── .gitignore                    # 排除 public/audio/* public/heroes/*
├── public/
│   ├── heroes/                   # 11个头像图片（用户提供，git忽略）
│   └── audio/                    # 语音文件（下载+用户提供，git忽略）
│       ├── voices.json           # 语音清单（已提交）
│       ├── makeboluo/  (4条)
│       ├── buzhihuowu/ (5条)
│       ├── ganjiangmoxie/ (3条)
│       ├── kai/        (2条)
│       ├── zhenji/     (3条 + betray.wav 甄姬BGM)
│       ├── yunying/    (7条)
│       ├── hainuo/     (1条, 用户提供)
│       ├── yuji/       (3条)
│       ├── xiaoqiao/   (5条)
│       ├── caiwenji/   (4条)
│       └── yao/        (4条 + wow.wav 那艺娜)
├── src/
│   ├── main.ts                   # 入口：场景管理、输入处理、游戏循环
│   ├── constants.ts              # 英雄链、物理参数、配色、类型定义
│   ├── engine/
│   │   ├── physics.ts            # Matter.js 引擎创建、碰撞事件、身体工厂
│   │   ├── merger.ts             # 碰撞事件驱动的合成逻辑（瑶+瑶=清场刷新）
│   │   ├── spawner.ts            # 加权随机生成（tier 1-4: 40/30/20/10）
│   │   ├── physics.test.ts
│   │   ├── merger.test.ts
│   │   └── spawner.test.ts
│   ├── rendering/
│   │   ├── canvas.ts             # Canvas 渲染：背景、容器、英雄气泡、HUD、粒子、蝴蝶、分数飘字
│   │   ├── animations.ts         # 粒子特效、弹出动画
│   │   └── hud.ts                # 下一个英雄预览缓存、静音按钮检测
│   ├── audio/
│   │   └── audio.ts              # Web Audio API：语音播放、BGM、甄姬特殊、瑶特殊
│   ├── leaderboard/
│   │   └── storage.ts            # localStorage 排行榜读写
│   └── ui/
│       ├── menu.ts               # 开始菜单（含合成规则）
│       ├── gameover.ts           # 游戏结束面板：浅蓝色不透明 + 排行榜
│       └── settings.ts           # 设置面板：音效开关
├── scripts/
│   └── download-audio.ts         # 下载语音脚本：解析 hero-voice-selection.md，CDN下载，生成 voices.json
└── docs/
    ├── superpowers/specs/2026-07-06-timi-merge-game-design.md
    ├── superpowers/plans/2026-07-06-timi-merge-game.md
    └── game-feel-reference.md    # 合成大西瓜手感参考
```

---

## 已实现功能

### 游戏核心
- Matter.js 物理引擎，碰撞事件驱动合成
- 11 级英雄合成链
- 拖拽定位 + 虚线引导预览（长按半透明，松手掉落）
- 渲染插值（消除跳帧）
- 游戏结束检测（球超过死亡线1秒）
- 容器360×520，竖屏适配

### 视觉效果
- DPR 高清渲染
- 英雄头像气泡（含白边描边）
- 合成弹跳动画（缩小→放大→回弹）
- 粒子爆发特效
- 🦋 蝴蝶绽放特效（瑶合成专属）
- 分数飘字（+1280 金色浮动）
- 游戏结束球体抖动 600ms

### 音频
- 掉落/合成时随机播放该英雄语音（从多选池中随机）
- 甄姬合成有40%概率触发 `betray.wav` BGM
- 瑶合成触发那艺娜 `wow.wav` + 蝴蝶特效
- 语音下载脚本：`npm run download-audio`

### UI
- 开始菜单（含合成规则和瑶特殊规则）
- HUD：分数、⏸暂停、🔄重开、⚙设置、🔊静音
- 暂停覆盖层
- 设置面板（音效开关）
- 游戏结束面板：浅蓝色全覆盖 + 分数 + 排行榜 + 再来一局/返回首页

### 排行榜
- localStorage 存储 Top 5
- 记录：分数、日期、是否合出过瑶

### 测试
- 35 个单元测试全部通过（5个测试文件）
- `npx vitest run`

---

## 开发者快捷键

| 键 | 效果 |
|----|------|
| `1`-`9` | 直接掉落对应等级英雄 |
| `0` | 掉落两个瑶测试蝴蝶特效 |
| `G` | 填满容器触发游戏结束 |
| `S` | +1000 分 |
| `R` | 重新开始 |

---

## 用户还需要提供的文件

| 文件 | 说明 | 状态 |
|------|------|------|
| `public/heroes/` 11个头像 | 已提供，已重命名为编号格式 | ✅ |
| `public/audio/hainuo/` 海诺语音 | 已提供 1.wav | ✅ |
| `public/audio/zhenji/betray.wav` | 甄姬BGM | ✅ |
| `public/audio/yao/wow.wav` | 那艺娜音频 | ✅ |
| 其他9个英雄语音 | 通过 `npm run download-audio` 自动下载 | ✅ |

---

## Git 提交记录（最近10条）

```
a3e2a03 fix: opaque game over panel, shake the balls not the overlay
651885a feat: light blue gradient game over panel + shake animation
58ca69a feat: dev shortcuts - keys 1-9 spawn heroes, 0 test yao, G game over, S score, R restart
4aa3153 chore: remove 'highest tier' from HUD
8467c95 fix: larger HUD buttons (18px radius, 6px gap)
38407da fix: clarify yao merge rule text
ce6468f feat: pause, settings panel, restart, merge counter, score pop animations
ea1fc84 chore: remove unused import
d8daaa8 chore: remove merge chain text from menu, keep rules
f77fb38 fix: start button hit area matches new Y position
```

（共计 30+ 次提交）

---

## 启动方式

```bash
cd /home/mercury/timi2

# 开发
nohup npx vite --host 0.0.0.0 --port 5173 > /tmp/vite.log 2>&1 &

# 生产构建
npm run build

# 下载/更新语音
npm run download-audio

# 运行测试
npx vitest run
```

---

## 已知注意事项

1. **服务器**: 开发服务器在 bash 超时后会被杀，需要用 `nohup ... &` 启动
2. **网络**: 国内环境访问 GitHub 需要梯子
3. **gitignore**: `public/audio/*` 和 `public/heroes/*` 被忽略（仅 `.gitkeep` 和 `voices.json` 提交）
4. **干将莫邪 nameEn 修复**: 之前是 `gan_jiang_mo_ye`，改成 `gan_jiang_mo_xie` 才匹配文件名
5. **图片加载**: Canvas 用惰性加载，先试 `.jpg` 再 `.png`
