// Each level-two heading starts a project; its first image is the cover.
export function setupProjectDisclosure(root) {
  const children = [...root.children];
  const headings = children.filter(node => node.tagName === 'H2');

  headings.forEach((heading, index) => {
    const start = children.indexOf(heading);
    const end = index + 1 < headings.length ? children.indexOf(headings[index + 1]) : children.length;
    const content = children.slice(start + 1, end);
    const cover = content.find(node => node.tagName === 'P' && node.querySelector('img'));
    const title = heading.textContent.trim();
    const details = document.createElement('div');
    details.className = 'project-details';
    details.id = `project-details-${index + 1}`;
    details.hidden = true;
    (cover || heading).after(details);
    for (const node of content) if (node !== cover) details.append(node);

    // Consecutive images marked as presentation pages form one editable gallery.
    const slides = [...details.querySelectorAll('p > img[alt^="簡報頁 "]')];
    if (slides.length) {
      const gallery = document.createElement('details');
      gallery.className = 'presentation-gallery';
      const heading = document.createElement('summary');
      heading.textContent = '作品簡報';
      const note = document.createElement('p');
      note.textContent = '左右切換簡報，點擊圖片可放大。';
      slides[0].parentElement.before(gallery);
      gallery.append(heading, note);
      const viewer = document.createElement('div');
      viewer.className = 'presentation-viewer';
      const previous = document.createElement('button');
      previous.type = 'button';
      previous.className = 'presentation-arrow presentation-prev';
      previous.setAttribute('aria-label', '上一頁簡報');
      previous.textContent = '‹';
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'presentation-arrow presentation-next';
      next.setAttribute('aria-label', '下一頁簡報');
      next.textContent = '›';
      const counter = document.createElement('p');
      counter.className = 'presentation-counter';
      counter.setAttribute('aria-live', 'polite');
      let current = 0, touchStart = null, suppressClick = false;
      const pages = slides.map(img => {
        const paragraph = img.parentElement;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'presentation-slide';
        button.setAttribute('aria-label', `放大${img.alt}`);
        button.addEventListener('click', event => {
          if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
        });
        img.replaceWith(button);
        button.append(img);
        viewer.append(paragraph);
        return paragraph;
      });
      viewer.append(previous, next);
      gallery.append(viewer, counter);
      const showPage = index => {
        current = Math.max(0, Math.min(pages.length - 1, index));
        pages.forEach((page, i) => { page.hidden = i !== current; });
        previous.disabled = current === 0;
        next.disabled = current === pages.length - 1;
        counter.textContent = `${current + 1} / ${pages.length}`;
      };
      previous.addEventListener('click', () => showPage(current - 1));
      next.addEventListener('click', () => showPage(current + 1));
      viewer.addEventListener('touchstart', event => {
        if (event.touches.length === 1) touchStart = {x: event.touches[0].clientX, y: event.touches[0].clientY};
      }, {passive: true});
      viewer.addEventListener('touchend', event => {
        if (!touchStart || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          suppressClick = true;
          showPage(current + (dx < 0 ? 1 : -1));
          setTimeout(() => { suppressClick = false; }, 500);
        }
      }, {passive: true});
      viewer.addEventListener('touchcancel', () => { touchStart = null; });
      showPage(0);
    }

    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.className = 'project-title-button';
    while (heading.firstChild) titleButton.append(heading.firstChild);
    heading.append(titleButton);

    const controls = [titleButton];
    if (cover) {
      const img = cover.querySelector('img');
      const coverButton = document.createElement('button');
      coverButton.type = 'button';
      coverButton.className = 'project-cover-button';
      img.replaceWith(coverButton);
      coverButton.append(img);
      const secondCover = cover.querySelector(':scope > img');
      if (secondCover) {
        coverButton.append(secondCover);
        coverButton.classList.add('project-cover-pair');
        cover.querySelectorAll('br').forEach(br => br.remove());
      }
      controls.push(coverButton);
    }
    const refresh = () => {
      const open = !details.hidden;
      for (const control of controls) {
        control.setAttribute('aria-expanded', String(open));
        control.setAttribute('aria-controls', details.id);
      }
      if (controls[1]) controls[1].setAttribute('aria-label', `${open ? '收合' : '展開'} ${title} 的說明`);
    };
    for (const control of controls) control.addEventListener('click', () => {
      details.hidden = !details.hidden;
      refresh();
    });
    refresh();
  });
}
