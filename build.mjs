import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/index.js',
  external: ['discord.js', '@supabase/supabase-js'],
  sourcemap: true,
  minify: false,
});

console.log('Build complete');
