// A small, safe Markdown reader for the owner's six content files.
// The supported format is documented in 網站內容/使用說明.md.
export function renderMarkdown(source, baseURL, documentRef = document, options = {}) {
  const fragment = documentRef.createDocumentFragment();
  const lines = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  let title = '', paragraph = [], list = null;
  const safeURL = (value, image) => {
    try {
      const url = new URL(value.trim(), baseURL);
      if (!['http:', 'https:', ...(image ? [] : ['mailto:'])].includes(url.protocol)) return null;
      return url.href;
    } catch { return null; }
  };
  const inline = (parent, input) => {
    const pattern = /(!?\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/g;
    let last = 0, match;
    while ((match = pattern.exec(input))) {
      parent.append(documentRef.createTextNode(input.slice(last, match.index)));
      if (match[4]) {
        const strong = documentRef.createElement('strong'); strong.textContent = match[4]; parent.append(strong);
      } else {
        const isImage = match[1].startsWith('!'), url = safeURL(match[3], isImage);
        if (!url) parent.append(documentRef.createTextNode(match[2]));
        else {
          const element = documentRef.createElement(isImage ? 'img' : 'a');
          if (isImage) { element.src = url; element.alt = match[2]; element.loading = 'lazy'; }
          else { element.href = url; element.textContent = match[2]; element.target = '_blank'; element.rel = 'noopener noreferrer'; }
          parent.append(element);
        }
      }
      last = pattern.lastIndex;
    }
    parent.append(documentRef.createTextNode(input.slice(last)));
  };
  const flush = () => {
    if (!paragraph.length) return;
    const p = documentRef.createElement('p');
    paragraph.forEach((line, i) => { if (i) p.append(documentRef.createElement('br')); inline(p, line); });
    fragment.append(p); paragraph = [];
  };
  const photoLine = line => /^\s*!\[([^\]]+)\]\(([^)]+)\)\s*$/.exec(line || '');
  const photoCard = (group, match) => {
    const url = safeURL(match[2], true);
    if (!url) return;
    const button = documentRef.createElement('button'); button.type = 'button'; button.className = 'work-photo';
    const img = documentRef.createElement('img'); img.src = url; img.alt = match[1]; img.loading = 'lazy';
    const caption = documentRef.createElement('span'); caption.textContent = match[1];
    button.append(img, caption); group.append(button);
  };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const photo = options.workPhotos && photoLine(line);
    if (photo) {
      flush(); list = null;
      const group = documentRef.createElement('div'); group.className = 'work-photos';
      photoCard(group, photo);
      let next = index + 1; while (next < lines.length && !lines[next].trim()) next++;
      const after = photoLine(lines[next]);
      if (photo[1] === '施工前' && after && after[1] === '施工後') {photoCard(group, after); group.className += ' is-pair'; index = next;}
      fragment.append(group); continue;
    }
    if (!line.trim()) { flush(); list = null; continue; }
    const heading = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush(); list = null;
      if (!title && heading[1] === '#') { title = heading[2]; continue; }
      const h = documentRef.createElement(heading[1].length === 1 ? 'h2' : `h${heading[1].length}`);
      inline(h, heading[2]); fragment.append(h); continue;
    }
    const item = /^\s*[-*]\s+(.+)$/.exec(line);
    if (item) {
      flush();
      if (!list) { list = documentRef.createElement('ul'); fragment.append(list); }
      const li = documentRef.createElement('li'); inline(li, item[1]); list.append(li); continue;
    }
    list = null; paragraph.push(line);
  }
  flush();
  return {title, fragment};
}
