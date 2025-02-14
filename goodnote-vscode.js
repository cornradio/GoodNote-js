// 加载Monaco Editor
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs/loader.js';
script.onload = function() {
    require.config({ 
        paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs' }
    });
    // 添加source map
    const sourceMapScript = document.createElement('script');
    sourceMapScript.textContent = '//# sourceMappingURL=https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min-maps/vs/loader.js.map';
    document.head.appendChild(sourceMapScript);
};
document.body.appendChild(script);
})(); 