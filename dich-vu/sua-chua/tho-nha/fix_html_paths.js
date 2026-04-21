const fs = require('fs');
const path = require('path');

const platRoot = path.resolve('c:/xampp/htdocs/dichvuquanhta');
const projRoot = path.resolve('c:/xampp/htdocs/dichvuquanhta/dich-vu/sua-chua/tho-nha');

function getRelPath(fromDir, toDir) {
    let rel = path.relative(fromDir, toDir).replace(/\\/g, '/');
    return rel === '' ? '' : rel + '/';
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const origContent = content;
    const dir = path.dirname(filePath);
    const relPlat = getRelPath(dir, platRoot);
    const relProj = getRelPath(dir, projRoot);

    // 1. Platform Links
    content = content.replace(/(\.\.\/)+public\/(asset|dang-nhap|dang-ky|trang-ca-nhan|image|uploads)/g, relPlat + 'public/$2');

    // 2. Index.html links
    content = content.replace(/(\.\.\/)+index\.html/g, (match) => {
        const upCount = match.split('../').length - 1;
        if (upCount >= 4) {
            return relPlat + 'index.html';
        } else {
            return relProj + 'index.html';
        }
    });

    // 3. Project Assets (CSS, JS, Images)
    content = content.replace(/(?<!public\/)(\.\.\/)*assets\/(css|js|images|image)/g, relProj + 'public/assets/$2');

    // 4. Project Pages
    content = content.replace(/(\.\.\/)*pages\/public\/([a-zA-Z0-9\-_]+\.html)/g, relProj + '$2');
    content = content.replace(/(\.\.\/)*pages\/(khachhang|customer)\/([a-zA-Z0-9\-_]+\.html)/g, relProj + 'khachhang/$3');
    content = content.replace(/(\.\.\/)*pages\/(nhacungcap|provider)\/([a-zA-Z0-9\-_]+\.html)/g, relProj + 'nhacungcap/$3');
    content = content.replace(/(\.\.\/)*pages\/admin_thonha\/([a-zA-Z0-9\-_]+\.html)/g, relProj + 'admin_thonha/$2');
    
    // 5. Partials
    content = content.replace(/(\.\.\/)*partials\/(dau-trang\.html|chan-trang\.html)/g, relProj + '$2');
    
    // 6. Fix specific dynamic JS in index.html
    if (path.basename(filePath) === 'index.html') {
        content = content.replace(/fixPartialPaths\(data\)/g, "data");
        content = content.replace(/\/\/ index\.html nằm ở tho-nha root nên cần chuyển \.\.\/.*?\n.*?\n.*?} \n/s, "");
        content = content.replace(/function fixPartialPaths[\s\S]*?\}\s*fetch/g, "fetch");
    }
    
    if (content !== origContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated HTML: ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f.startsWith('.')) continue; // ignore hidden like .git, .env
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            walk(full);
        } else {
            if (full.endsWith('.html')) {
                processFile(full);
            }
        }
    }
}

walk(projRoot);
console.log("Done HTML updates");
