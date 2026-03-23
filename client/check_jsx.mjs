import { readFileSync } from 'fs';
import { transform } from 'esbuild';

const code = readFileSync('./src/components/AIGenerateModal.jsx', 'utf8');
try {
  await transform(code, { loader: 'jsx', jsx: 'automatic' });
  console.log('JSX PARSE OK - no syntax errors');
} catch (e) {
  console.log('JSX PARSE ERROR:');
  console.log(e.message);
}
