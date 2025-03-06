import { LOADER_COLOR } from './constants';

export function createSuggestionElement(text: string): HTMLElement {
  const element = document.createElement('span');
  element.textContent = text;
  element.style.color = LOADER_COLOR;
  element.style.position = 'fixed';
  element.style.pointerEvents = 'none';
  element.style.whiteSpace = 'pre-wrap';
  element.style.zIndex = '10000';
  element.style.backgroundColor = 'transparent';
  element.style.padding = '0 2px';
  element.style.font = 'inherit';
  return element;
}

export function createLoaderElement(): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '10000';
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.padding = '0 2px';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 45 45');
  svg.style.stroke = LOADER_COLOR;

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('fill', 'none');
  g.setAttribute('fillRule', 'evenodd');
  g.setAttribute('transform', 'translate(1 1)');
  g.setAttribute('stroke-width', '2');

  // Create the three circles with their animations
  const circles = [
    { begin: '1.5s', r: '6' },
    { begin: '3s', r: '6' },
    { begin: '0s', r: '8', noOpacity: true }
  ].map((config, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '22');
    circle.setAttribute('cy', '22');
    circle.setAttribute('r', config.r);
    
    if (!config.noOpacity) {
      circle.setAttribute('stroke-opacity', '0');
      
      // Radius animation
      const animateR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animateR.setAttribute('attributeName', 'r');
      animateR.setAttribute('begin', config.begin);
      animateR.setAttribute('dur', '3s');
      animateR.setAttribute('values', '6;22');
      animateR.setAttribute('calcMode', 'linear');
      animateR.setAttribute('repeatCount', 'indefinite');
      circle.appendChild(animateR);

      // Opacity animation
      const animateOpacity = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animateOpacity.setAttribute('attributeName', 'stroke-opacity');
      animateOpacity.setAttribute('begin', config.begin);
      animateOpacity.setAttribute('dur', '3s');
      animateOpacity.setAttribute('values', '1;0');
      animateOpacity.setAttribute('calcMode', 'linear');
      animateOpacity.setAttribute('repeatCount', 'indefinite');
      circle.appendChild(animateOpacity);

      // Width animation
      const animateWidth = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animateWidth.setAttribute('attributeName', 'stroke-width');
      animateWidth.setAttribute('begin', config.begin);
      animateWidth.setAttribute('dur', '3s');
      animateWidth.setAttribute('values', '2;0');
      animateWidth.setAttribute('calcMode', 'linear');
      animateWidth.setAttribute('repeatCount', 'indefinite');
      circle.appendChild(animateWidth);
    } else {
      // Center circle animation
      const animateR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animateR.setAttribute('attributeName', 'r');
      animateR.setAttribute('begin', '0s');
      animateR.setAttribute('dur', '1.5s');
      animateR.setAttribute('values', '6;1;2;3;4;5;6');
      animateR.setAttribute('calcMode', 'linear');
      animateR.setAttribute('repeatCount', 'indefinite');
      circle.appendChild(animateR);
    }

    return circle;
  });

  circles.forEach(circle => g.appendChild(circle));
  svg.appendChild(g);
  container.appendChild(svg);

  return container;
} 