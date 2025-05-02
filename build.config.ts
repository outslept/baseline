import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'index.ts',
  ],
  declaration: 'node20',
  clean: true,
})
