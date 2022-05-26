import { IntervalWatcher, LiveSelector } from '@dimensiondev/holoflows-kit'
import { isMobileFacebook } from './isMobile'

type E = HTMLElement

const querySelector = <T extends E, SingleMode extends boolean = true>(
  selector: string,
  singleMode: boolean = true
) => {
  const ls = new LiveSelector<T, SingleMode>().querySelector<T>(selector)
  return (singleMode ? ls.enableSingleMode() : ls) as LiveSelector<
    T,
    SingleMode
  >
}
export const tweetImageFullscreenSelector: () => LiveSelector<E, true> = () =>
  querySelector<E>('[data-pagelet="MediaViewerPhoto"]')

export const myUsernameLiveSelectorPC = new LiveSelector()
  .querySelectorAll<HTMLAnchorElement>('div[role="main"] span[id="ssrb_composer_start"]')

  .filter((x) => x.innerText)
export const myUsernameLiveSelectorMobile =
  new LiveSelector().querySelector<HTMLAnchorElement>(
    '#bookmarks_flyout .mSideMenu > div > ul > li:first-child a, #MComposer a'
  )

export const mainContentSelector: () => LiveSelector<E, true> = () =>
  querySelector<E>('[role=main]')

export const postEditorDraftContentSelector: () => LiveSelector<
  E,
  true
> = () => {
  return querySelector<HTMLDivElement>(
    `[class="notranslate _5rpu"][contenteditable][aria-label][spellcheck]`
  )
}

export const hasEditor = () => !!postEditorDraftContentSelector().evaluate()

export const newPostTriggerSelector = () => {
  const div =
    querySelector('[aria-label="创建帖子"]') ||
    querySelector('[aria-label="Create a post"]') ||
    querySelector('[data-pagelet="ProfileComposer"]')
  if (div) {
    return div.querySelector<E>('span')
  }
}

export const hasFocus = (x: LiveSelector<HTMLElement, true>) =>
  x.evaluate() === document.activeElement

export const untilElementAvailable = async (
  ls: LiveSelector<HTMLElement, boolean>,
  timeout = 5000
) => {
  const w = new IntervalWatcher(ls)
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => reject(), timeout)
    w.useForeach(() => {
      w.stopWatch()
      resolve()
    }).startWatch(500)
  })
}
