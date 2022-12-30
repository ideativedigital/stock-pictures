var __importDefault = this && this.__importDefault || function (e) {return e && e.__esModule ? e : {default: e}}

import Sortable from "sortablejs";
import documentService from "@typo3/core/document-service.js";
import Utility from "@typo3/backend/utility.js";

var f = new Sortable(document.querySelector('.t3js-ideative-addon-inline-controls'))

export class InlineControlContainerStockPictures {
  constructor(e) {
    this.container = null
    documentService.ready().then(t => {
      this.container = t.getElementById(e)
      this.registerEvents()
      this.toggleContainerControls(this.isBelowMax())
    })
  }

  registerEvents() {
    document.addEventListener('change', (e) => {
      this.toggleContainerControls(this.isBelowMax())
    })
  }

  isBelowMax() {
    const e = this.getFormFieldForElements();
    if (null === e) return !0;
    if (void 0 !== TYPO3.settings.FormEngineInline.config[this.container.dataset.objectGroup]) {
      if (Utility.trimExplode(",", e.value).length >= TYPO3.settings.FormEngineInline.config[this.container.dataset.objectGroup].max) return false;
      if (this.hasObjectGroupDefinedUniqueConstraints()) {
        const e = TYPO3.settings.FormEngineInline.unique[this.container.dataset.objectGroup];
        if (e.used.length >= e.max && e.max >= 0) return false
      }
    }
    return true
  }

  getFormFieldForElements() {
    const e = document.getElementsByName(this.container.dataset.formField);
    return e.length > 0 ? e[0] : null
  }

  hasObjectGroupDefinedUniqueConstraints() {
    return void 0 !== TYPO3.settings.FormEngineInline.unique && void 0 !== TYPO3.settings.FormEngineInline.unique[this.container.dataset.objectGroup]
  }

  toggleContainerControls(e) {
    const t = this.container.querySelector(f.controlContainer);
    if (null === t) return;
    t.querySelectorAll("button, a").forEach(t => {
      t.style.display = e ? null : "none"
    })
  }
}

