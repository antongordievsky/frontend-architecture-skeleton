// D-14: Playwright's story gallery, to its gallery spec. The `mount` fixture calls window.mount with a story id;
// this page finds the story among src/**/*.story.tsx, renders it into #root, and reuses the root so that
// update() keeps the story's state. An unknown story or a render error rejects, and the test's mount() fails.
// Only the dev server serves it: vite build reads index.html alone and never sees this page.
import { type ComponentType, StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import '@/ui/tokens.css'
import '@/ui/base.css'
import './gallery.css'

type Story = ComponentType<Record<string, unknown>>
type MountParams = { readonly story: string; readonly props?: Record<string, unknown> }

// Vite reads the glob statically, relative to this file, which is why the gallery is ours to own.
const stories = import.meta.glob<Record<string, Story | undefined>>('../../src/**/*.story.tsx')
// A part lives in a folder of its own name (D-16), so `ui/Button/Button.story.tsx` is `ui/Button`, not
// `ui/Button/Button`.
const idOf = (file: string) =>
  file
    .replace(/^(\.\.\/)+src\//, '')
    .replace(/\.story\.tsx$/, '')
    .replace(/([^/]+)\/\1$/, '$1')

// A story id is the file's path under src without `.story.tsx`, then the export: `ui/Button/Primary`.
// Any unique trailing part of the path works too: `Button/Primary`.
const resolve = async (storyId: string) => {
  const cut = storyId.lastIndexOf('/')
  const path = storyId.slice(0, cut)
  const name = storyId.slice(cut + 1)
  const file = Object.keys(stories).find((f) => idOf(f) === path || idOf(f).endsWith(`/${path}`))
  const load = file === undefined ? undefined : stories[file]
  return load === undefined ? undefined : (await load())[name]
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('the gallery is missing its #root element')
let root: Root | undefined

const mount = async ({ story, props = {} }: MountParams) => {
  const Story = await resolve(story)
  if (Story === undefined) throw new Error(`unknown story: ${story}`)
  root ??= createRoot(rootElement)
  const current = root
  // flushSync, so that a render error rejects this call rather than surfacing after it resolves.
  flushSync(() =>
    current.render(
      <StrictMode>
        <Story {...props} />
      </StrictMode>,
    ),
  )
}

const unmount = async () => {
  root?.unmount()
  root = undefined
}

Object.assign(window, { mount, unmount })
