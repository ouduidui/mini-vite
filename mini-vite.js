const fs = require('fs');
const path = require('path');

const compilerSfc = require("@vue/compiler-sfc");
const compilerDom = require("@vue/compiler-dom");

const koa = require('koa');
const app = new koa();

app.use(async ctx => {
    // 获取页面地址和参数
    const {request: {url, query}} = ctx;

    // 首页
    if (url === '/') {
        ctx.type = 'text/html';
        let content = fs.readFileSync("index.html", "utf-8");
        content = content.replace(
            "<script ",
            `
            <script>
                window.process = {env:{ NODE_ENV:'dev'}}
            </script>
            <script
           `
        );
        ctx.body = content;
    }

    // js文件
    else if(url.endsWith(".js")) {
        // 获取js文件的绝对路径
        const p = path.resolve(__dirname, url.slice(1));
        ctx.type = "application/javascript";
        const content = fs.readFileSync(p, "utf-8");
        // 修改js中的引入文件
        ctx.body = rewriteImport(content);

    }

    // node_modules中的模块文件
    else if(url.startsWith("/@modules/")) {
        // 获取模块目录的绝对路径
        const prefix = path.resolve(
            __dirname,
            "node_modules",
            url.replace("/@modules/", "")
        );
        // 从package.json中获取模块主函数的路径
        const module = require(prefix + '/package.json').module;
        const p = path.resolve(prefix, module);

        const ret = fs.readFileSync(p, "utf-8");
        ctx.type = "application/javascript";
        ctx.body = rewriteImport(ret);
    }

    // vue单文件组件
    else if(url.includes(".vue")) {
        // 获取vue文件的绝对路径
        const p = path.resolve(__dirname, url.split("?")[0].slice(1));
        // vue单文件解析为AST
        const { descriptor } = compilerSfc.parse(fs.readFileSync(p, "utf-8"));

        if(!query.type) {
            // 获取script的内容
            const scriptContent = descriptor.script ?
                descriptor.script.content :
                descriptor.scriptSetup.content;
            // 替换默认导出为一个常量
            const script = scriptContent.replace("export default ", "const __script = ");
            ctx.type = "application/javascript";
            ctx.body = `
            ${rewriteImport(script)}

            // 解析template
            import { render as __render } from "${url}?type=template"
            __script.render = __render
            export default __script
            `;
        }else if(query.type === "template") {
            // 模块内容
            const template = descriptor.template;
            // 使用vue提供的编译器将template编译为render函数
            const render = compilerDom.compile(template.content, {mode: "module"}).code;

            ctx.type = "application/javascript";
            ctx.body = rewriteImport(render);
        }
    }
});

// 将引入的第三方插件指向@modules路径
function rewriteImport (content) {
    return content.replace(/ from ['|"]([^'"]+)['|"]/g, (s0, s1) => {
        if (s1[0] !== "." && s1[1] !== "/") {
            return ` from '/@modules/${s1}'`;
        } else {
            return s0;
        }
    })
}

// 开启服务
app.listen(8080, () => {
    console.log(
        ` App running at:
  - Local:   http://localhost:8080/`
    )
})
