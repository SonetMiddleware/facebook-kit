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
  BindInfo,
  getAddress,
  renderTokenFromCacheMedia,
  bind2WithWeb2Proof,
  getBindResult,
  registerApplication
} from '@soda/soda-core'
import {
  startWatch,
  ResourceDialog,
  InlineTokenToolbar,
  InlineApplicationBindBox,
  saveLocal,
  postShareHandler,
  removeTextInSharePost
} from '@soda/soda-core-ui'
import * as Selectors from './utils/selectors'
import * as PubSub from 'pubsub-js'
import { getUserID } from './utils/getProfileIdentifier'

import { message } from 'antd'
import Logo from './assets/images/logo.png'
import { newPostTrigger, shareToEditor } from './utils/handleShare'
import { getFacebookId, StorageKeys } from './utils/utils'

const APP_NAME = 'Facebook'
const posts = new LiveSelector().querySelectorAll<HTMLDivElement>(
  isMobileFacebook ? '.story_body_container > div' : '[role=article] '
)

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

const spanStyles =
  'position:absolute;padding:10px;right:0;top:0;text-align:center;background:#fff;'
const className = 'plat-meta-span'

const handlePostImg = async (imgEle: HTMLImageElement, username: string) => {
  const imgSrc = imgEle.src
  // if (imgEle.getBoundingClientRect().width < 300) {
  //   return;
  // }
  if (imgSrc.includes('ipfs')) {
    return
  }
  const res = await renderTokenFromCacheMedia(imgSrc, {
    dom: imgEle,
    config: { replace: true }
  })
  if (res && res.result) {
    const dom: any = document.createElement('div')
    dom.style.cssText = spanStyles
    dom.className = className
    ReactDOM.render(
      <InlineTokenToolbar
        token={res.token}
        originMediaSrc={imgSrc}
        username={username}
        app={APP_NAME}
      />,
      dom
    )
    return dom
  }
  return null
}

async function handleFacebookImg(node: DOMProxy) {
  const parent = node.current.parentElement
  if (!parent) return []
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
  for (let i = 0; i < imgDivs.length; i++) {
    const imgDiv = imgDivs[i]
    const img = imgDiv!.querySelector('img')!
    const linkEle = img.closest('a')!
    const divParent = linkEle?.parentElement!
    if (divParent && divParent.querySelector(`.${className}`)) {
      console.debug('[facebook-hook] handleFacebookImg platwin/soda appended')
      return
    }
    const dom = await handlePostImg(img, username)
    if (dom) {
      divParent.click() //make sure dom render normally
      divParent?.appendChild(dom)
    }
  }
}

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

const handlePostBindingEvent = async (e: any) => {
  const { contentId } = e.detail
  const _binding = await getBindingContent()
  if (_binding && _binding.contentId === contentId) {
    // already binded post
    return
  } else if (_binding && !_binding.contentId) {
    const address = await getAddress()
    const appid = await getFacebookId()
    const bindRes = await bind2WithWeb2Proof({
      address,
      appid,
      application: APP_NAME,
      contentId: contentId
    })
    if (bindRes) message.success('Bind successful!')
  }
}

let binding: BindInfo
async function getBindingContent() {
  if (binding) return binding
  const address = await getAddress()
  const appid = await getFacebookId()
  const bindResult = await getBindResult({
    address,
    application: APP_NAME,
    appid
  })
  const _binding = bindResult.find((item) => item.application === APP_NAME)
  if (_binding) {
    binding = _binding
    return binding
  }
}

let userId = ''
// apply watchers
let fullScreenImgWatcher: any = null,
  postFormWatcher: any = null,
  idWatcher: any = null,
  mainWatcher: any = null

const initWatchers = () => {
  fullScreenImgWatcher = new MutationObserverWatcher(
    Selectors.imageFullscreenSelector()
  )
  const postForm = new LiveSelector().querySelectorAll<HTMLDivElement>(
    '[role="dialog"] > form'
  )
  postFormWatcher = new MutationObserverWatcher(postForm)
  idWatcher = new MutationObserverWatcher(Selectors.myUsernameLiveSelectorPC())
  mainWatcher = new MutationObserverWatcher(Selectors.mainContentSelector())

  //@ts-ignore
  fullScreenImgWatcher.on('onChange', handleFullscreenImgPost)
  //@ts-ignore
  fullScreenImgWatcher.on('onAdd', handleFullscreenImgPost)

  //@ts-ignore
  postFormWatcher.on('onAdd', async () => {
    console.debug('[facebook-hook] postFormWatcher onAdd ...')
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

  //@ts-ignore
  idWatcher.on('onAdd', async () => {
    const idDom =
      idWatcher.firstDOMProxy.current.parentElement?.querySelector('a')
    if (idDom) {
      //@ts-ignore
      const href = idDom.href
      const id = getUserID(href)
      userId = id || ''
      console.debug('[facebook-hook] app account: ', userId)
      saveLocal(StorageKeys.FACEBOOK_ID, userId)
    }
  })

  const bindBoxId = 'plattwin-bind-box'
  //@ts-ignore
  mainWatcher.on('onAdd', () => {
    // handle share on initial
    postShareHandler(APP_NAME)
    console.debug(
      '[facebook-hook] mainWatcher onAdd: ',
      mainWatcher.firstDOMProxy
    )
    const mainDiv: any = document.querySelector('[role=main]')
    // @ts-ignore
    mainDiv.style = 'position:relative'
    const dom: any = document.createElement('div')
    dom.id = bindBoxId
    dom.style = 'position:absolute;top:0;right:0;'
    ReactDOM.render(<InlineApplicationBindBox app={APP_NAME} />, dom)
    mainDiv.click()
    mainDiv?.appendChild(dom)
    mainWatcher.stopWatch()
  })
}

function main() {
  initWatchers()
  collectPostsFacebookInner()
  startWatch(fullScreenImgWatcher)
  startWatch(postFormWatcher)

  const div = document.createElement('div')
  document.body.appendChild(div)
  ReactDOM.render(<ResourceDialog shareCallback={shareToEditor} />, div)

  startWatch(idWatcher)
  startWatch(mainWatcher)

  document.addEventListener('PostBinding', handlePostBindingEvent)
}

export default main

function getUserPage(meta: { appid?: string }) {
  const { appid } = meta
  const host = getConfig().hostLeadingUrl
  return `${host}/${appid ? appid : ''}`
}
export function getConfig() {
  return {
    hostIdentifier: 'facebook.com',
    hostLeadingUrl: 'https://www.facebook.com',
    hostLeadingUrlMobile: 'https://m.facebook.com',
    icon: 'images/facebook.png'
  }
}

export const init = () => {
  registerApplication({
    name: APP_NAME,
    meta: {
      getAccount: getFacebookId,
      getUserPage,
      getConfig,
      newPostTrigger,
      shareToEditor
    }
  })
}
