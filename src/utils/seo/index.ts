// SEO 工具：按路由动态更新文档标题与 meta 描述（无需额外依赖）。
// 单页应用（SPA）无 SSR，故在路由切换后于客户端同步更新 <head> 中的关键 meta。

const SITE_NAME = 'EXP-TRACK'
const TITLE_SUFFIX = ' · EXP-TRACK'

interface SeoMeta {
  title?: string
  description?: string
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 更新当前页面的 SEO 信息。
 * @param meta.title 页面标题（会自动追加站点后缀）；缺省使用站点名
 * @param meta.description 页面描述（同步更新 description / og:description / twitter:description）
 */
export function updateSeo(meta: SeoMeta): void {
  const title = meta.title ? `${meta.title}${TITLE_SUFFIX}` : SITE_NAME
  document.title = title

  if (meta.description) {
    upsertMeta('meta[name="description"]', 'name', 'description', meta.description)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', meta.description)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description)
  }

  upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
}
