import {
  hasEditor,
  newPostTriggerSelector,
  postEditorDraftContentSelector,
  hasFocus,
  untilElementAvailable
} from './selectors'
import {
  getLocal,
  removeLocal,
  StorageKeys,
  mixWatermarkImg,
  generateQrCodeBase64,
  dispatchCustomEvents,
  POST_SHARE_TEXT,
  decodeMetaData
} from '@soda/soda-core'

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
export async function pasteTextToCompositionFacebook(text: string) {
  const interval = 500
  if (!hasEditor()) {
    await delay(300)
  }
  await untilDocumentReady()

  const i = postEditorDraftContentSelector()
  await untilElementAvailable(i, 10000)
  console.log('postEditor: ', i)

  while (!hasFocus(i)) {
    i.evaluate()!.focus()
    await delay(interval)
  }

  debugger
  console.log('dispatch paste event.....')
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

const shareHandler = async () => {
  try {
    const meta = await getLocal(StorageKeys.SHARING_NFT_META)
    if (!meta) return
    const metaData = await decodeMetaData(meta)
    console.log('shareHandler: ', metaData.source, metaData.tokenId)
    const imgUrl = metaData.source
    const qrcode = await generateQrCodeBase64(meta)
    if (meta && metaData.tokenId) {
      const [imgDataUrl, imgDataBlob] = await mixWatermarkImg(imgUrl!, qrcode)
      const clipboardData = []
      newPostTrigger()
      message.success(
        'The resource has been saved to the clipboard. Paste to proceed share.'
      )
      // 触发document focus
      document.body.click()

      await pasteShareTextToEditor()
      // clear clipboard
      navigator.clipboard.writeText('')
      //@ts-ignore
      clipboardData.push(new ClipboardItem({ 'image/png': imgDataBlob }))

      //@ts-ignore
      await navigator.clipboard.write(clipboardData)

      await removeLocal(StorageKeys.SHARING_NFT_META)
    }
  } catch (err) {
    console.log(err)
  }
}

export default shareHandler
