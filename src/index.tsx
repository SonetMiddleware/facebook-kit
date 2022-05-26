import React from 'react'
import './style.less'
import {
  DOMProxy,
  LiveSelector,
  MutationObserverWatcher
} from '@dimensiondev/holoflows-kit'
import { isMobileFacebook } from './utils/isMobile'
import * as ReactDOM from 'react-dom'
import {
  startWatch,
  ResourceDialog,
  ImgMask,
  BindTwitterIdBox,
  decodeQrcodeFromImgSrc,
  saveLocal,
  StorageKeys,
  getUserAccount,
  dispatchPaste,
  bindPost,
  PLATFORM,
  BINDING_CONTENT_TITLE,
  getTwitterBindResult,
  IBindResultData,
  CustomEventId,
  getFacebookId,
  removeTextInSharePost,
  decodeMetaData
} from '@soda/soda-core'

import * as Selectors from './utils/selectors'
import * as PubSub from 'pubsub-js'
import { getUserID } from './utils/getProfileIdentifier'

import { message } from 'antd'
import Logo from './assets/images/logo.png'
import postShareHandler, { pasteShareTextToEditor } from './utils/handleShare'

const posts = new LiveSelector().querySelectorAll<HTMLDivElement>(
  isMobileFacebook ? '.story_body_container > div' : '[role=article] '
)
console.log(posts)

function collectPostsFacebookInner() {
  startWatch(
    new MutationObserverWatcher(posts).useForeach((node, key, metadata) => {})
  )
  startWatch(
    new MutationObserverWatcher(posts).useForeach((node, key, metadata) => {
      const root = new LiveSelector()
        .replace(() => [metadata.realCurrent])
        .closest('[role=article]')
        .map((x) => x.parentElement?.parentElement?.parentElement)
      const rootProxy = DOMProxy({
        afterShadowRootInit: { mode: 'open' },
        beforeShadowRootInit: { mode: 'open' }
      })
      rootProxy.realCurrent = root.evaluate()[0]

      async function collectPostInfo() {
        rootProxy.realCurrent = root.evaluate()[0]
        removeTextInSharePost(rootProxy.realCurrent)
        await handleFacebookImg(metadata)
      }
      collectPostInfo()

      return {
        onNodeMutation: collectPostInfo,
        onTargetChanged: collectPostInfo,
        onRemove: () => {}
      }
    })
  )
}

collectPostsFacebookInner()
const spanStyles =
  'position:absolute;padding:10px;right:0;top:0;text-align:center;background:#fff;'
const className = 'plat-meta-span'

const handlePostImg = async (imgEle: HTMLImageElement, username: string) => {
  const imgSrc = imgEle.src
  // if (imgEle.getBoundingClientRect().width < 300) {
  //   return;
  // }
  let res
  if (imgSrc.includes('ipfs')) {
    return
  }
  try {
    res = await decodeQrcodeFromImgSrc(imgSrc)
  } catch (err) {
    console.log(err)
  } finally {
  }
  console.log('qrcode res: ', res)
  let metaData: any = await decodeMetaData(res || '')
  console.log('qrcode res metaData : ', metaData)

  if (res) {
    if (metaData && metaData.tokenId && metaData.source) {
      //TODO replace with storageService.loadFunc
      let ipfsOrigin = ''
      if (metaData.source.startsWith('http')) {
        ipfsOrigin = metaData.source
      } else {
        ipfsOrigin = `https://${metaData.source}.ipfs.dweb.link/`
      }
      // const ipfsOrigin = metaData.source
      // bgDiv.style.backgroundImage = `url(${ipfsOrigin})` // blocked by CSP
      imgEle.src = ipfsOrigin
    }
  }
  const dom: any = document.createElement('div')
  dom.style.cssText = spanStyles
  dom.className = className
  ReactDOM.render(
    <ImgMask meta={metaData} originImgSrc={imgSrc} username={username} />,
    dom
  )
  return dom
}

async function handleFacebookImg(node: DOMProxy) {
  const parent = node.current.parentElement
  if (!parent) return []
  console.log('post text: ', parent.innerText)
  // get author of the post
  const href = parent.querySelectorAll('a')[0]?.href || ''
  const url = href.substr(0, href.indexOf('?'))
  const arrs = url.split('/')
  const username = arrs[arrs.length - 1]
  // one post may have several imgs
  const imgDivs = []

  const imgNodes = isMobileFacebook
    ? parent.querySelectorAll<HTMLImageElement>('div>div>div>a>div>div>i.img')
    : parent.parentElement?.querySelectorAll('img') || []
  if (!imgNodes.length) return []
  for (let i = 0; i < imgNodes.length; i++) {
    if (imgNodes[i].closest('a')) {
      imgDivs.push(imgNodes[i].parentElement)
    }
  }
  console.log('imgDivs: ', imgDivs)
  for (let i = 0; i < imgDivs.length; i++) {
    const imgDiv = imgDivs[i]
    const img = imgDiv!.querySelector('img')!
    const linkEle = img.closest('a')!
    const divParent = linkEle?.parentElement!
    if (divParent && divParent.querySelector(`.${className}`)) {
      console.log('has appended')
      return
    }
    const dom = await handlePostImg(img, username)
    if (dom) {
      divParent.click() //make sure dom render normally
      divParent?.appendChild(dom)
      console.log('append here')
    }
  }
}

// watch fullscreen post image
const fullScreenImgWatcher = new MutationObserverWatcher(
  Selectors.tweetImageFullscreenSelector()
)
const handleFullscreenImgPost = async () => {
  const imgEle =
    fullScreenImgWatcher.firstDOMProxy.realCurrent?.querySelector('img')
  const divParent = imgEle?.parentElement
  if (imgEle && divParent) {
    if (divParent.querySelector(`.${className}`)) {
      return
    }
    // get the author's username
    const href = document
      .querySelectorAll('[role="complementary"]')[0]
      .querySelectorAll('a')[0].href

    const url = href.substr(0, href.indexOf('?'))
    const arrs = url.split('/')
    const username = arrs[arrs.length - 1]

    const dom = await handlePostImg(imgEle, username)
    if (dom) {
      divParent.click()
      divParent.appendChild(dom)
    }
  }
}

//@ts-ignore
fullScreenImgWatcher.on('onChange', handleFullscreenImgPost)
//@ts-ignore
fullScreenImgWatcher.on('onAdd', handleFullscreenImgPost)

export const PLAT_TWIN_OPEN = 'PLAT_TWIN_OPEN'

function App() {
  return (
    <div className="icon-open-plattwin">
      <img
        src={Logo}
        alt=""
        onClick={() => {
          PubSub.publish(PLAT_TWIN_OPEN)
        }}
      />
    </div>
  )
}
const postForm = new LiveSelector().querySelectorAll<HTMLDivElement>(
  '[role="dialog"] > form'
)
const postFormWatcher = new MutationObserverWatcher(postForm)
//@ts-ignore
postFormWatcher.on('onAdd', async () => {
  console.log('postForm: ')
  //TODO better way to find this div
  const emojiDiv =
    document.querySelector('[aria-label="Emoji"]') ||
    document.querySelector('[aria-label="表情"]')
  const divParent = emojiDiv?.parentElement?.parentElement
  //@ts-ignore
  const divParentStyles = 'position:relative;display:flex;align-items:center;'
  divParent!.style.cssText = divParentStyles
  const dom = document.createElement('span')
  dom.style.cssText = 'margin-left:10px;cursor:pointer;'
  ReactDOM.render(<App />, dom)
  divParent?.appendChild(dom)
})

//watch and add user id
const idWatcher = new MutationObserverWatcher(
  Selectors.myUsernameLiveSelectorPC
)

let userId = ''
//@ts-ignore
idWatcher.on('onAdd', async () => {
  // console.log(idWatcher.firstDOMProxy.current)
  const idDom =
    idWatcher.firstDOMProxy.current.parentElement?.querySelector('a')
  if (idDom) {
    //@ts-ignore
    const href = idDom.href
    console.log('href', href)
    const id = getUserID(href)
    console.log('id', id)
    userId = id || ''
    saveLocal(StorageKeys.FACEBOOK_ID, userId)
  }
})

const bindBoxId = 'plattwin-bind-box'
const mainWatcher = new MutationObserverWatcher(Selectors.mainContentSelector())
//@ts-ignore
mainWatcher.on('onAdd', () => {
  console.log('onAdd')
  // handle share on initial
  postShareHandler()
  console.log(mainWatcher.firstDOMProxy)
  const mainDiv: any = document.querySelector('[role=main]')
  // @ts-ignore
  mainDiv.style = 'position:relative'
  const dom: any = document.createElement('div')
  dom.id = bindBoxId
  dom.style = 'position:absolute;top:0;right:0;'
  ReactDOM.render(<BindTwitterIdBox platform={PLATFORM.Facebook} />, dom)
  mainDiv.click()
  mainDiv?.appendChild(dom)
  mainWatcher.stopWatch()
})

const handlePostBindingEvent = async (e: any) => {
  console.log('PostBinding: ', e.detail)
  const { contentId } = e.detail
  const _binding = await getBindingContent()
  console.log('handleBindPost', _binding)

  if (!_binding || (_binding && !_binding.content_id)) {
    const addr = await getUserAccount()
    const tid = await getFacebookId()

    console.log('handleBindPost')
    const bindRes = await bindPost({
      addr,
      tid,
      platform: PLATFORM.Facebook,
      content_id: contentId
    })
    console.log('bindPost: ', bindRes)
    message.success('Bind successful!')
  }
}

let binding: IBindResultData
async function getBindingContent() {
  if (binding) return binding
  const addr = await getUserAccount()
  const tid = await getFacebookId()
  const bindResult = await getTwitterBindResult({
    addr,
    tid
  })
  const _binding = bindResult.find(
    (item) => item.platform === PLATFORM.Facebook
  )
  if (_binding) {
    binding = _binding
    return binding
  }
}

function main() {
  collectPostsFacebookInner()
  startWatch(fullScreenImgWatcher)
  startWatch(postFormWatcher)

  const div = document.createElement('div')
  document.body.appendChild(div)
  ReactDOM.render(<ResourceDialog publishFunc={pasteShareTextToEditor} />, div)

  startWatch(idWatcher)
  startWatch(mainWatcher)

  document.addEventListener('PostBinding', handlePostBindingEvent)

  const { apply } = Reflect
  document.addEventListener(CustomEventId, (e) => {
    const ev = e as CustomEvent<string>
    const [eventName, param, selector]: [keyof any, any[], string] = JSON.parse(
      ev.detail
    )
    switch (eventName) {
      case 'paste':
        return apply(dispatchPaste, null, param)

      default:
        console.error(eventName, 'not handled')
    }
  })
}

export default main
