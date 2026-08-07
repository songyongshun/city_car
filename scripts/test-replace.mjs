const line = '![img_p0_1](./《智能汽车实训》实验指导（python版）-V3.1-20240220-images/page-1-img-1.png)';
const result = line.replace(/!\[(.*?)\]\((\.\/.*?)\)/g, (match, alt, oldPath) => {
  const filenameMatch = oldPath.match(/page-(\d+)-img-(\d+)\.png/);
  if (filenameMatch) {
    const filename = filenameMatch[0];
    return `![${alt}](../assets/${filename})`;
  }
  return match;
});
console.log(result);
