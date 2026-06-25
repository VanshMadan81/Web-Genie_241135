const esbuild = require('esbuild');
const fs = require('fs');

const inputFile = process.argv[2];
const code = fs.readFileSync(inputFile, 'utf8');

esbuild.build({
  stdin: {
    contents: code,
    resolveDir: process.cwd(),
    sourcefile: 'input.jsx',
    loader: 'jsx',
  },
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  globalName: 'GeneratedComponent',
  external: ['react', 'react-dom', 'react-router-dom'],
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.css': 'text'   // ✅ Fix to allow CSS import
  }
}).then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
