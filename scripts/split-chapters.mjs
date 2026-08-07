import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputFile = path.join(__dirname, '..', 'input', '《智能汽车实训》实验指导（python版）-V3.1-20240220.md');
const docsCoursesDir = path.join(__dirname, '..', 'docs', 'courses');
const docsAssetsDir = path.join(__dirname, '..', 'docs', 'assets');

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

// Chapter boundaries
const chapterNames = [
  '一、智能汽车配置实验指导',
  '二、智能汽车图像感知实验指导',
  '三、图像采集实验指导',
  '四、相机标定与图像校正实验指导',
  '五、赛道图像的透视变换实验指导',
  '六、赛道图像预处理实验指导',
  '七、赛道元素识别模型训练实验',
  '八、赛道与环岛识别实验指导',
  '九、十字路口与车库识别实验指导',
  '十、智能汽车 AI 模型部署实验指导',
  '十一、基于 AI 的赛道元素检测与识别实验 1',
  '十二、基于 AI 的赛道元素检测与识别实验 2',
  '十三、基于 AI 的赛道元素检测与识别实验 3',
  '十四、智能汽车控制与决策实验指导'
];

const chapterTitles = [
  '智能汽车配置实验指导',
  '智能汽车图像感知实验指导',
  '图像采集实验指导',
  '相机标定与图像校正实验指导',
  '赛道图像的透视变换实验指导',
  '赛道图像预处理实验指导',
  '赛道元素识别模型训练实验指导',
  '赛道与环岛识别实验指导',
  '十字路口与车库识别实验指导',
  '智能汽车 AI 模型部署实验指导',
  '基于 AI 的赛道元素检测与识别实验 1——农田检测',
  '基于 AI 的赛道元素检测与识别实验 2——粮仓与维护区检测',
  '基于 AI 的赛道元素检测与识别实验 3——坡道与减速区检测',
  '智能汽车控制与决策实验指导'
];

// Find start and end lines for each chapter
const chapterRanges = [];
for (let i = 0; i < chapterNames.length; i++) {
  const name = chapterNames[i];
  let start = -1;
  let end = lines.length;
  
  // Find the line that matches the chapter name in the body (not in the table of contents)
  // Body content starts after ## Page 3
  let bodyStart = 0;
  for (let j = 0; j < lines.length; j++) {
    if (lines[j].startsWith('## Page 3')) {
      bodyStart = j;
      break;
    }
  }
  
  for (let j = bodyStart; j < lines.length; j++) {
    if (lines[j].startsWith(name)) {
      const rest = lines[j].slice(name.length).trim();
      // If the rest starts with dots, it's still a TOC line; skip and continue
      if (rest.startsWith('.')) {
        continue;
      }
      // Otherwise it's the body line
      start = j;
      break;
    }
  }
  
  if (start === -1) {
    console.warn(`Chapter "${name}" not found`);
    continue;
  }
  
  for (let j = start + 1; j < lines.length; j++) {
    if (chapterNames.some(n => {
      if (n === name || !lines[j].startsWith(n)) return false;
      const rest = lines[j].slice(n.length).trim();
      return !rest.startsWith('.');
    })) {
      // Found next chapter title. Back up to the previous ## Page separator.
      let pageHeaderEnd = j;
      for (let k = j - 1; k > start; k--) {
        if (lines[k].startsWith('## Page')) {
          pageHeaderEnd = k;
          break;
        }
      }
      end = pageHeaderEnd;
      break;
    }
  }
  
  chapterRanges.push({ start, end, name });
}

// Create assets directory
if (!fs.existsSync(docsAssetsDir)) {
  fs.mkdirSync(docsAssetsDir, { recursive: true });
}

// Function to replace image paths in a single line
function replaceImagePaths(line) {
  return line.replace(/!\[(.*?)\]\((\.\/.*?)\)/g, (match, alt, oldPath) => {
    const filenameMatch = oldPath.match(/page-(\d+)-img-(\d+)\.png/);
    if (filenameMatch) {
      const filename = filenameMatch[0];
      const srcPath = path.join(path.dirname(inputFile), '《智能汽车实训》实验指导（python版）-V3.1-20240220-images', filename);
      const destPath = path.join(docsAssetsDir, filename);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        console.warn(`Image not found: ${srcPath}`);
      }
      
      return `![${alt}](../assets/${filename})`;
    }
    return match;
  });
}

// Extract images and process chapters
chapterRanges.forEach((range, idx) => {
  const chapterContent = lines.slice(range.start, range.end);
  
  const newLines = chapterContent.map(replaceImagePaths);
  
  // Remove Page separator lines and clean up
  const filteredLines = newLines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('## Page') && /^\d+$/.test(trimmed.replace('## Page ', ''))) {
      return false;
    }
    return true;
  });
  
  // Remove leading/trailing blank lines and multiple consecutive blank lines
  const cleaned = [];
  let lastBlank = false;
  filteredLines.forEach(line => {
    const isBlank = line.trim() === '';
    if (isBlank && lastBlank) return;
    if (isBlank) lastBlank = true;
    else lastBlank = false;
    cleaned.push(line);
  });
  
  // Remove trailing blank lines
  while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === '') {
    cleaned.pop();
  }
  
  // Add frontmatter
  const frontmatter = `---
title: "${chapterTitles[idx]}"
collection: teaching
type: "Undergraduate course"
permalink: /teaching/2025-autumn-teaching/intelligentcar-chapter-${idx + 1}
venue: "常州工业职业技术学院, 信息工程学院"
date: 2025-09-${String(idx + 1).padStart(2, '0')}
location: "Changzhou, China"
---

# ${chapterTitles[idx]}

`;
  
  const output = frontmatter + cleaned.join('\n');
  
  const outputFile = path.join(docsCoursesDir, `chapter-${String(idx + 1).padStart(2, '0')}.md`);
  fs.writeFileSync(outputFile, output, 'utf8');
  console.log(`Written: ${outputFile}`);
});

console.log('Done splitting chapters!');
