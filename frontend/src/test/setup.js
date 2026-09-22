import '@testing-library/jest-dom';

// jsdom lacks matchMedia — stub for responsive hooks/components.
window.matchMedia = window.matchMedia || ((query) => ({
  matches: false, media: query, onchange: null,
  addListener: () => {}, removeListener: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
}));

// Leaflet needs real geometry APIs in tests.
window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };

global.fetch = global.fetch || (() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function scrollIntoView() {};
