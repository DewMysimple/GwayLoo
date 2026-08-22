import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { startBootLoader } from './app/boot-loader';
import './styles/tokens.css';
import './styles/global.css';
import './features/experience/experience-compat.css';
import './features/experience/r3f/r3f-runtime.css';

const rootElement = document.getElementById('verminoble-app');

if (!rootElement) {
  throw new Error('Verminoble 缺少 React 根节点。');
}

// 旧 WebGL 运行时无法安全处理 StrictMode 的重复挂载。
startBootLoader();
createRoot(rootElement).render(<App />);
