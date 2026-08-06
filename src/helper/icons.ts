import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faClock,
  faTriangleExclamation,
  faCircleExclamation,
  faWifi,
  faArrowLeft,
  faGaugeHigh,
  faChartLine,
  faTableList,
  faBoxArchive,
  faTrashCan,
  faBars,
  faAngleLeft,
  faAngleRight,
  faPlus,
  faPen,
  faTags,
  faLayerGroup,
  faCheck,
  faXmark,
  faChevronDown,
  faChevronRight,
  faArrowRotateLeft,
  faPencil,
} from '@fortawesome/free-solid-svg-icons'
import type { App } from 'vue'

/** 注册所有 FontAwesome 图标及全局 <FaIcon> 组件 */
export function registerIcons(app: App): void {
  library.add(
    faClock,
    faTriangleExclamation,
    faCircleExclamation,
    faWifi,
    faArrowLeft,
    faGaugeHigh,
    faChartLine,
    faTableList,
    faBoxArchive,
    faTrashCan,
    faBars,
    faAngleLeft,
    faAngleRight,
    faPlus,
    faPen,
    faTags,
    faLayerGroup,
    faCheck,
    faXmark,
    faChevronDown,
    faChevronRight,
    faArrowRotateLeft,
    faPencil,
  )
  app.component('FaIcon', FontAwesomeIcon)
}
