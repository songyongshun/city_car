import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsCoursesDir = path.join(__dirname, '..', 'docs', 'courses');

// Chapter Chinese numerals mapping
const chineseNumerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', 
                         '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

function processChapter(content) {
  const lines = content.split('\n');
  const result = [];
  const headings = []; // Collect headings for TOC
  let inFrontMatter = false;
  let frontMatterEnd = -1;
  
  // Step 1: Remove front matter
  if (lines.length > 0 && lines[0].trim() === '---') {
    inFrontMatter = true;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        frontMatterEnd = i;
        break;
      }
    }
  }
  
  let startIdx = frontMatterEnd + 1;
  if (startIdx < 0) startIdx = 0;
  
  // Step 2: Find first H1 title and remove duplicate chapter title
  let h1Title = '';
  let contentStart = startIdx;
  
  for (let i = startIdx; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('# ')) {
      h1Title = trimmed.slice(2).trim();
      contentStart = i + 1;
      break;
    }
  }
  
  // Add H1 title
  result.push('#' + (h1Title ? ' ' + h1Title : ''));
  result.push('');
  
  // Step 3: Process remaining lines
  let tocLines = [];
  let i = contentStart;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines at the beginning
    if (trimmed === '' && result.length <= 2) {
      i++;
      continue;
    }
    
    // Remove duplicate chapter title line (e.g., "一、智能汽车配置实验指导")
    const isChapterTitle = chineseNumerals.some(num => trimmed.startsWith(num + '、'));
    if (isChapterTitle) {
      i++;
      continue;
    }
    
    // Convert "1.实验描述" to "## 1.实验描述"
    // Only match section headings that are short and start with specific keywords
    const sectionMatch = trimmed.match(/^(\d+)\.(.+)$/);
    if (sectionMatch && trimmed.length < 30) {
      const title = sectionMatch[2].trim();
      // Only convert to heading if it starts with common section keywords
      const isSectionHeading = /^(实验|环岛|入环岛|环岛内|出环岛|车库|十字路口|坡道|减速区|农田|粮仓|维护区|锥桶|斑马线|拱桥|车辆|结束|检测|识别)/.test(title);
      if (isSectionHeading) {
        const newLine = `## ${sectionMatch[1]}.${title}`;
        result.push(newLine);
        result.push('');
        headings.push({ level: 2, text: `${sectionMatch[1]}.${title}`, line: newLine });
        i++;
        continue;
      }
    }
    
    // Convert "步骤 1：" to "### 步骤 1："
    const stepMatch = trimmed.match(/^(步骤\s*\d+[：:].+)$/);
    if (stepMatch && trimmed.length < 60) {
      const newLine = `### ${stepMatch[1]}`;
      result.push(newLine);
      result.push('');
      headings.push({ level: 3, text: stepMatch[1], line: newLine });
      i++;
      continue;
    }
    
    // Keep other lines as is
    result.push(line);
    i++;
  }
  
  // Step 4: Build TOC
  const toc = buildToc(headings);
  
  // Insert TOC after H1 title
  const finalContent = [result[0], '', ...toc, '', ...result.slice(1)].join('\n');
  
  return finalContent;
}

function buildToc(headings) {
  if (headings.length === 0) return [];
  
  const toc = [];
  toc.push('## 目录');
  toc.push('');
  
  for (const h of headings) {
    if (h.level === 2) {
      toc.push(`- [${h.text}](#${h.text.replace(/\s+/g, '')})`);
    } else if (h.level === 3) {
      toc.push(`  - [${h.text}](#${h.text.replace(/\s+/g, '')})`);
    }
  }
  
  return toc;
}

// Process all chapter files
const files = fs.readdirSync(docsCoursesDir).filter(f => f.endsWith('.md') && f !== 'index.md');

for (const file of files) {
  const filePath = path.join(docsCoursesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const processed = processChapter(content);
  fs.writeFileSync(filePath, processed, 'utf8');
  console.log(`Processed: ${file}`);
}

console.log('All chapters formatted!');