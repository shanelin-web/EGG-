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
