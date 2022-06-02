import {
  hasEditor,
  postEditorDraftContentSelector,
  hasFocus,
  untilElementAvailable
} from './selectors'
import { dispatchCustomEvents, POST_SHARE_TEXT } from '@soda/soda-core-ui'

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
export async function pasteTextToCompositionFacebook(text: string) {
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
  if ('value' in document.activeElement!) {
    dispatchCustomEvents(i.evaluate()!, 'input', text)
  } else {
    dispatchCustomEvents(i.evaluate()!, 'paste', text)
  }
}

export const pasteShareTextToEditor = async (str?: string) => {
  const text = str || POST_SHARE_TEXT
  await pasteTextToCompositionFacebook(text)
}
