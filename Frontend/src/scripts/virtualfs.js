// virtualPlugin.js
export default function createVirtualFsPlugin(files) {
  return {
    name: 'virtual-fs',
    setup(build) {
      // 1. Resolve import paths to fully qualified virtual paths
      build.onResolve({ filter: /.*/ }, (args) => {
        // Try the path as-is
        if (args.path in files) {
          return { path: args.path, namespace: 'virtual' };
        }

        // Remove './' if present
        let noDotSlash = args.path.startsWith('./') ? args.path.slice(2) : args.path;
        if (noDotSlash in files) {
          return { path: noDotSlash, namespace: 'virtual' };
        }

        // Add .js if missing
        if (!args.path.endsWith('.js')) {
          let withJs = args.path + '.js';
          if (withJs in files) {
            return { path: withJs, namespace: 'virtual' };
          }
          let noDotSlashWithJs = noDotSlash + '.js';
          if (noDotSlashWithJs in files) {
            return { path: noDotSlashWithJs, namespace: 'virtual' };
          }
        }

        // Try with leading slash
        let withSlash = '/' + noDotSlash;
        if (withSlash in files) {
          return { path: withSlash, namespace: 'virtual' };
        }
        if (!withSlash.endsWith('.js')) {
          let withSlashJs = withSlash + '.js';
          if (withSlashJs in files) {
            return { path: withSlashJs, namespace: 'virtual' };
          }
        }

        return { path: args.path, external: true }; // fallback for react etc.
      });

      // 2. Load content from virtual file system
      build.onLoad({ filter: /.*/, namespace: 'virtual' }, async (args) => {
        const code = files[args.path];
        if (!code) throw new Error(`File not found: ${args.path}`);
        return {
          contents: code,
          loader: 'jsx',
        };
      });
    },
  };
}
