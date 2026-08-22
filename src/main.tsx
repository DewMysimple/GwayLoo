import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './app/boot-loader.css';
import './styles/tokens.css';
import './styles/global.css';
import './features/experience/experience-compat.css';

const rootElement = document.getElementById('verminoble-app');

if (!rootElement) {
  throw new Error('Verminoble 缺少 React 根节点。');
}

// 显式 legacy 回退仍无法安全处理 StrictMode 的重复挂载。
createRoot(rootElement).render(<App />);
