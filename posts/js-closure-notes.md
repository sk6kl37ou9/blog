---
title: 我如何理解 JavaScript 闭包
date: 2026-07-28
tags: 技术, 前端
cover: https://picsum.photos/seed/js-closure/640/360
excerpt: 闭包不是黑魔法，它只是函数和它周围状态的组合。用三个例子讲清楚。
---

## 一句话版本

闭包 = 函数 + 它能访问的外部变量。哪怕外部函数已经执行完，这些变量依然活着。

## 例子一：计数器

```javascript
function createCounter() {
  let count = 0;
  return function () {
    return ++count;
  };
}

const counter = createCounter();
counter(); // 1
counter(); // 2
```

`count` 没有被回收，因为返回的函数还「记得」它。

## 例子二：循环里的经典坑

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i)); // 3, 3, 3
}
```

用 `let` 替代 `var`，每次循环都会创建新的绑定，问题就解决了。

## 什么时候会用到

- **数据私有化**：模块模式的基础
- **函数柯里化**：预先绑定部分参数
- **回调与事件**：记住创建时的上下文

闭包不需要背概念，多写几次就内化了。