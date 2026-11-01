// Each level-two heading in 蛋2.md begins an independently expandable experience.
export function setupExperienceDisclosure(root) {
  const children = [...root.children];
  const headings = children.filter(node => node.tagName === 'H2');
  headings.forEach((heading, index) => {
    const start = children.indexOf(heading);
    const end = index + 1 < headings.length ? children.indexOf(headings[index + 1]) : children.length;
    const content = children.slice(start + 1, end);
    const date = content[0]?.tagName === 'P' ? content.shift() : null;
    const details = document.createElement('details');
    details.className = 'experience';
    const summary = document.createElement('summary');
    const labels = document.createElement('div');
    labels.className = 'experience-labels';
    const indicator = document.createElement('span');
    indicator.className = 'experience-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    heading.before(details);
    labels.append(heading);
    if (date) {date.classList.add('experience-date');labels.append(date)}
    summary.append(labels,indicator);
    const body = document.createElement('div');
    body.className = 'experience-body';
    for (const node of content) body.append(node);
    details.append(summary,body);
  });
}
