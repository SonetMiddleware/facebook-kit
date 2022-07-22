import {
  hasEditor,
  postEditorDraftContentSelector,
  hasFocus,
  untilElementAvailable
} from './selectors'
import { message } from 'antd'

export const delay = async (time: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(null)
    }, time)
  })
}

export const newPostTrigger = () => {
  //TODO update for different language
  const div =
    document.querySelector('[aria-label="创建帖子"]') ||
    document.querySelector('[aria-label="Create a post"]') ||
    document.querySelector('[data-pagelet="ProfileComposer"]')
  if (div) {
    div.querySelector('span')!.click()
  }
}

export const postEditorSelector = () => {}

export function untilDocumentReady() {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise<void>((resolve) => {
    const callback = () => {
      if (document.readyState === 'complete') {
        resolve()
        document.removeEventListener('readystatechange', callback)
      }
    }
    document.addEventListener('readystatechange', callback, { passive: true })
  })
}
export const shareToEditor = async (content?: Array<string | Blob>) => {
  if (!content) return

  const interval = 500
  if (!hasEditor()) {
    await delay(300)
  }
  await untilDocumentReady()

  const i = postEditorDraftContentSelector()
  await untilElementAvailable(i, 10000)
  console.debug('[facebook-hook] postEditor: ', i)

  while (!hasFocus(i)) {
    i.evaluate()!.focus()
    await delay(interval)
  }
  console.debug('[facebook-hook] dispatch paste event.....')
  let copied = false
  for (const c of content) {
    if (!c) continue
    if (typeof c === 'string') {
      //@ts-ignore
      await navigator.clipboard.writeText(c)
      copied = true
    } else {
      const clipboardData = []
      //@ts-ignore
      clipboardData.push(new ClipboardItem({ 'image/png': c }))
      //@ts-ignore
      await navigator.clipboard.write(clipboardData)
      copied = true
    }
  }
  if (copied) {
    // trigger document focus
    // ref.current?.click();
    document.body.click()
    message.success(
      'Your message has been saved to the clipboard. Please paste into the new post dialog.',
      5
    )
  }
}
