# 合成大西瓜手感参考

基于 liyupi/daxigua (⭐1.4k, Cocos Creator + Box2D) 源码分析及其他实现对比。

---

## 一、原版核心参数

原版用 Cocos Creator (Box2D)，关键配置：

| 参数 | 作用 | 说明 |
|------|------|------|
| Collision Groups | `fruit` / `wall` / `downwall` | 水果之间碰撞，水果碰墙不穿模，底部有独立碰撞组 |
| PhysicsCircleCollider | `restitution=0.2, friction=0.5, density=1.0` | 圆碰撞体的弹性和摩擦（来自 extraSettings.js 注释） |
| RigidBody | `gravityScale=1, linearDamping=3` | 重力缩放和线性阻尼（下落速度控制关键） |
| 水果半径 | 随等级递增，约 25px → 100px+ | 11级的大小差很明显 |

## 二、手感核心 —— 4 个关键技巧

### 1. 高阻尼（Damping）
- Box2D `linearDamping=3`，对应 Matter.js `frictionAir=0.03-0.05`
- **效果：球下落有"阻力感"，不会加速砸到底，像在糖浆里下落**

### 2. 低弹性（Restitution）
- 原版 restitution ≈ 0.15~0.2
- **效果：球落地不弹飞，沉闷地"啵"一下**

### 3. 子步进（Sub-stepping）
- 每帧跑 2-3 步物理，而不是 1 步
- **效果：高速碰撞不穿模，堆叠稳定不抖动**

### 4. 渲染插值
- 在物理位置和显示位置之间 lerp（0.3 系数）
- **效果：视觉 120fps 般丝滑**

## 三、视觉技巧

| 技巧 | 实现 | 效果 |
|------|------|------|
| **高光点** | 球上 1/3 处半透明白色椭圆 | 立体感，像果冻 |
| **白边描边** | 2px rgba(255,255,255,0.4) | 球体分隔清晰 |
| **合成缩放** | scale 0.5→1.1→1.0 (300ms) | "被捏的软球回弹" |
| **落地挤压** | 碰到东西时短暂 scale 0.85 | "压了一下" |
| **粒子爆发** | 8-12 个同色粒子飞出 500ms | 合成爽感 |

## 四、原版音频
```
music/合成.mp3   — 合成时播放
music/炸.mp3     — 大水果合成？
music/success.mp3 — 合成出大西瓜？
music/1.mp3      — 掉落音效
music/2.mp3      — 另一种音效
```

## 五、Matter.js 等效参数推演

根据原版 Box2D 参数反推：

| Box2D 参数 | Matter.js 等效 | 值 |
|-----------|---------------|-----|
| gravityScale=1, gravity=10 | gravity.y + scale | 1.0, scale=0.001 |
| linearDamping=3 | frictionAir | 0.04 |
| restitution=0.2 | restitution | 0.15 |
| friction=0.5 | friction | 0.4 |
| density=1 | density | 0.001 |

---

**总结：原版"丝滑感"来自高阻尼 + 低弹性 + 子步进物理 + 渲染插值 + 视觉反馈，五个缺一不可。**
