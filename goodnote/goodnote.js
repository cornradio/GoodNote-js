// ==UserScript==
// @name         GoodNote - 网页笔记助手
// @namespace    http://tampermonkey.net/
// @version      0.5b4
// @description  在任何网页添加笔记功能
// @author       kasusa
// @license MIT
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=greasyfork.org
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL https://update.greasyfork.org/scripts/526070/GoodNote%20-%20%E7%BD%91%E9%A1%B5%E7%AC%94%E8%AE%B0%E5%8A%A9%E6%89%8B.user.js
// @updateURL https://update.greasyfork.org/scripts/526070/GoodNote%20-%20%E7%BD%91%E9%A1%B5%E7%AC%94%E8%AE%B0%E5%8A%A9%E6%89%8B.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
        .note-icon {
            /* 背景颜色 */
            backdrop-filter: blur(10px);
            background-color: #ffffff00;
            border: 1px solid #ffffff8f;
            /* 圆角 */
            border-radius: 3px;
            /* 固定位置 */
            position: fixed;
            /* 默认位置 */
            top: 20px;
            right: 20px;
            /* 大小 */
            width: 20px;
            height: 20px;
            cursor: move;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: 0.1s ease;
            user-select: none;
            will-change: transform;
            transform: translate3d(0, 0, 0);
            opacity: 1;
            pointer-events: auto;
        }

        .note-icon:hover {
            transform: scale(1);
        }
        .note-icon:active {
            transform: scale(0.9);
        }

        .note-icon svg {
            width: 24px;
            height: 24px;
			fill: #409eff;
        }

        .note-container {
            border: 1px solid #fff;
            position: fixed;
            backdrop-filter: blur(10px);
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 9998;
            padding: 10px;
            transition: all 0.3s ease;
            opacity: 0;
            transform-origin: center;
            pointer-events: auto;
            display: none;
        }

        .note-container.active {
            opacity: 1;
            transform: scale(1);
        }

        .note-textarea {
            margin-bottom: 0 !important;
            background: #fff;
            color:#000;
            min-height: 250px;
            min-width: 350px;
            height: 250px;
            width: 350px;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 12px;
            font-size: 14px;
            resize: both;
            overflow: auto;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            line-height: 1.5;
            word-break: break-all;
            text-align: left;
        }

        .note-textarea:focus {
            outline: none;
        }

        .note-icon::after {
            content: 'Ctrl+Shift+M';
            position: absolute;
            background: rgba(255, 255, 255, 0.61);
            backdrop-filter: blur(15px);
            color: #000;
            padding: 5px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-right: 10px;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .note-icon:hover::after {
            opacity: 1;
        }

        .goodnote-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
        }

        .note-textarea a {
            color: #409EFF;
            text-decoration: underline;
            cursor: pointer;
        }

        .note-textarea a:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);

    // 创建笔记图标
    const noteIcon = document.createElement('div');
    noteIcon.className = 'note-icon';

    // 根据平台设置不同的快捷键提示
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    noteIcon.setAttribute('data-shortcut', isMac ? '⌘+Shift+M' : 'Ctrl+Shift+M');

    // 修改样式内容，使用动态快捷键文本
    const shortcutText = isMac ? '⌘+Shift+M' : 'Ctrl+Shift+M';
    style.textContent = style.textContent.replace(
        '.note-icon::after { content: \'Ctrl+Shift+M\';',
        `.note-icon::after { content: '${shortcutText}';`
    );

    noteIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M14,10H19.5L14,4.5V10M5,3H15L21,9V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3M5,12V14H19V12H5M5,16V18H14V16H5Z"/>
        </svg>
    `;

    // 创建笔记容器
    const noteContainer = document.createElement('div');
    noteContainer.className = 'note-container';

    // 创建文本框
    const textarea = document.createElement('div');
    textarea.className = 'note-textarea';
    textarea.contentEditable = true;
    textarea.placeholder = '在这里输入你的笔记...';

    noteContainer.appendChild(textarea);

    // 创建一个包装器元素
    const wrapper = document.createElement('div');
    wrapper.className = 'goodnote-wrapper';
    document.body.appendChild(wrapper);

    // 将笔记图标和容器添加到包装器中，而不是直接添加到 body
    wrapper.appendChild(noteIcon);
    wrapper.appendChild(noteContainer);

    // 获取当前域名作为存储键
    const storageKey = `goodnote_${window.location.hostname}`;
    const positionKey = `goodnote_position_${window.location.hostname}`;

    // 在创建textarea的部分后添加以下函数
    function linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        // 处理换行符，将其替换为 <br> 标签
        const withLineBreaks = text.replace(/\n/g, '<br>');
        return withLineBreaks.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank" class="note-link">${url}</a>`;
        });
    }

    // 添加链接点击处理
    textarea.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            window.open(e.target.href, '_blank');
        }
    });

    // 防止链接编辑时被触发
    textarea.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'A') {
            if (e.detail >= 2) { // 双击或更多次点击时允许编辑
                e.preventDefault();
            }
        }
    });

    // 修改input事件监听器
    textarea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const content = textarea.innerHTML;
            localStorage.setItem(storageKey, content);
        }, 500);
    });

    // 修改加载保存的笔记的部分
    const savedNote = localStorage.getItem(storageKey);
    if (savedNote) {
        textarea.innerHTML = savedNote;
    }

    // 添加一个函数来获取网页标题
    async function fetchPageTitle(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');
            return doc.querySelector('title').innerText;
        } catch (error) {
            console.error('Error fetching page title:', error);
            return null;
        }
    }

    // 修改粘贴事件处理
    textarea.addEventListener('paste', async (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const processed_text = linkify(text);
        document.execCommand('insertHTML', false, processed_text);

        // 获取并处理标题
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = urlRegex.exec(text);
        if (match) {
            const url = match[0];
            const title = await fetchPageTitle(url);
            if (title) {
                // 只保留标题的第一个部分
                const [mainTitle] = title.split(' - ');
                // 在链接的下一行插入标题
                const titleHTML = `<div> 「${mainTitle}」 </div>`;
                document.execCommand('insertHTML', false, titleHTML);
            }
        }
    });

    // 实现拖拽功能
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    let rafId = null;

    noteIcon.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target === noteIcon || noteIcon.contains(e.target)) {
            isDragging = true;
            const rect = noteIcon.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
                const newX = e.clientX - initialX;
                const newY = e.clientY - initialY;

                currentX = Math.min(Math.max(0, newX), window.innerWidth - noteIcon.offsetWidth);
                currentY = Math.min(Math.max(0, newY), window.innerHeight - noteIcon.offsetHeight);

                setTranslate(currentX, currentY);
            });
        }
    }

    function setTranslate(xPos, yPos) {
        const iconWidth = noteIcon.offsetWidth;
        const iconHeight = noteIcon.offsetHeight;

        // 计算图标中心点到边缘的距离
        const distanceToLeft = xPos;
        const distanceToRight = window.innerWidth - (xPos + iconWidth);
        const distanceToTop = yPos;
        const distanceToBottom = window.innerHeight - (yPos + iconHeight);

        // 设置初始透明度
        noteIcon.style.opacity = '1';

        // 只有完全接触边缘时才贴入
        if (distanceToLeft <= 0) {
            xPos = -iconWidth * 0.8;
        } else if (distanceToRight <= 0) {
            xPos = window.innerWidth - iconWidth * 0.2;
        }

        if (distanceToTop <= 0) {
            yPos = -iconHeight * 0.8;
        } else if (distanceToBottom <= 0) {
            yPos = window.innerHeight - iconHeight * 0.2;
        }

        noteIcon.style.left = `${xPos}px`;
        noteIcon.style.top = `${yPos}px`;
        noteIcon.style.right = 'auto';
        noteIcon.style.bottom = 'auto';
    }

    function dragEnd(e) {
        if (isDragging) {
            isDragging = false;

            // 使用 GM_setValue 保存全局位置
            GM_setValue('goodnote_global_position', {
                top: noteIcon.style.top,
                left: noteIcon.style.left
            });

            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        }
    }

    // 修改加载保存位置的逻辑
    const savedPosition = GM_getValue('goodnote_global_position', null);
    if (savedPosition) {
        try {
            const { top, left } = savedPosition;
            setTranslate(parseInt(left), parseInt(top));
        } catch (e) {
            console.error('Failed to load saved position');
        }
    }

    // 修改笔记显示逻辑
    noteContainer.style.position = 'fixed';
    let isVisible = false;

    // 添加切换笔记显示的函数
    function toggleNote() {
        isVisible = !isVisible;

        if (isVisible) {
            // 每次显示笔记时重新从 localStorage 加载数据
            let savedNote = localStorage.getItem(storageKey);
            if (savedNote) {
                textarea.innerHTML = savedNote;
            }

            // 计算位置
            const iconRect = noteIcon.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const padding = 10;
            const textareaWidth = 400; // textarea的宽度

            let left = iconRect.right + padding; // 改为向右偏移
            let top = Math.max(padding, iconRect.top);

            // 动态计算 max-height
            const maxHeight = windowHeight - top - padding - 30;
            textarea.style.maxHeight = `${maxHeight}px`;

            // 检查水平方向是否超出
            if (left + textareaWidth > windowWidth) {
                // 如果右侧空间不足，则显示在左侧
                left = iconRect.left - textareaWidth - padding;
            }

            // 确保left不会小于padding
            left = Math.max(padding, left);

            // 确保容器完全在可视区域内
            if (top + maxHeight > windowHeight) {
                top = windowHeight - maxHeight - padding;
            }

            // 确保top不会小于padding
            top = Math.max(padding, top);

            // 先设置位置和display
            noteContainer.style.top = `${top}px`;
            noteContainer.style.left = `${left}px`;
            noteContainer.style.display = 'block';

            // 使用 requestAnimationFrame 确保 display: block 生效后再添加动画
            requestAnimationFrame(() => {
                noteContainer.classList.add('active');
                setTimeout(() => {
                    textarea.focus();
                }, 50);
            });
        } else {
            // 先移除动画类
            noteContainer.classList.remove('active');
            // 等待动画完成后再完全隐藏元素
            setTimeout(() => {
                noteContainer.style.display = 'none';
            }, 300); // 300ms 是过渡动画的持续时间
        }
    }

    // 添加快捷键监听
    document.addEventListener('keydown', (e) => {
        // 检查是否是 Mac
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

        if ((isMac && e.metaKey || !isMac && e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
            e.preventDefault(); // 阻止默认行为
            toggleNote();
        }
    });

    noteIcon.addEventListener('click', (e) => {
        if (!isDragging) {
            toggleNote();
        }
    });

    // 修改点击其他地方关闭笔记的逻辑
    document.addEventListener('click', (e) => {
        if (!noteContainer.contains(e.target) && !noteIcon.contains(e.target) && isVisible) {
            toggleNote(); // 使用 toggleNote 函数来确保正确的隐藏行为
        }
    });

    // 自动保存功能
    let saveTimeout;

    // 在页面加载时重置状态
    window.addEventListener('load', () => {
        GM_setValue('goodNoteIconInserted', false);
    });
})();

