import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/index.css';

// Resolve GitHub Pages "?p=" SPA fallback (see public/404.html)
(function handleGhPagesRedirect() {
  const url = new URL(window.location.href);
  const p = url.searchParams.get('p');
  if (p !== null) {
    const q = url.searchParams.get('q');
    url.searchParams.delete('p');
    url.searchParams.delete('q');
    const newSearch =
      (q ? '?' + q : '') + (url.searchParams.toString() ? '&' + url.searchParams.toString() : '');
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    const target = basePath + p + newSearch + url.hash;
    window.history.replaceState(null, '', target);
  }
})();

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
