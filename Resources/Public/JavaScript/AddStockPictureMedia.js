import $ from "jquery";
import {MessageUtility} from "@typo3/backend/utility/message-utility.js";
import NProgress from "nprogress";
import AjaxRequest from "@typo3/core/ajax/ajax-request.js";
import Modal from "@typo3/backend/modal.js";
import Severity from "@typo3/backend/severity.js";
import Icons from "@typo3/backend/icons.js";
import '@ideative/id_stock_pictures/masonry.pkgd.min.js';
import * as imagesLoaded from '@ideative/id_stock_pictures/imagesLoaded.pkgd.min.js';

let currentPage = 1
let isLoading = false
const debounceTimeout = 500
const infiniteScrollThreshold = 1200
let reachedPaginationEnd = false

// When clicking on the "Add media from XXX" button, show the search modal
document.addEventListener('click', e => {
  if (!e.target.closest('.t3js-stockpicture-media-add-btn')) {
    // add button has not been clicked
    return
  }
  triggerModal(e.target)
})

/**
 * Renders a single result item (image from the stock picture service)
 * @param item
 * @returns {*}
 */
function renderItem (item) {
  // Create items hidden by default. We'll display them once they are loaded using imagesLoaded plugin
  var container = document.createElement('div')
  container.className = 'col-lg-4 result-item'
  container.setAttribute('data-id', item.id)
  container.style.display = 'none'
  const img = document.createElement('img')
  img.src = item.preview
  img.class = 'img-fluid'
  container.append(img)

  // Select the image when the user clicks on it
  container.addEventListener('click', function () {
    // First deselect any other image
    Modal.currentModal.querySelector('.result-item').classList.remove('active')
    // Activate this one
    container.classList.add('active')
  })

  return container
}

function renderList (items) {
  const resultsList = Modal.currentModal.querySelector('.stock-pictures-results')
  // Add each result item
  for (let index in items) {
    let item = items[index]
    resultsList.append(renderItem(item))
  }

  // Trigger masonry everytime a new image is loaded
  window.imagesLoaded(resultsList, function () {
    toggleLoading(false)
    // Display the new loaded images gracefully
    for (const item of resultsList.querySelectorAll('.result-item')) {
      $(item).fadeIn()
    }

    // init Isotope after all images have loaded
    let msnry = new Masonry(resultsList, {
      itemSelector: '.result-item'
    })
  })
}

function toggleLoading(status) {
  const loadingContainer = Modal.currentModal.querySelector('.loading-container')
  isLoading = status
  if (status) {
    Icons.getIcon('spinner-circle', Icons.sizes.large).then((icon) => {
      loadingContainer.innerHTML = icon
    })
  }
  else {
    loadingContainer.innerHTML = ''
  }
}

function search (page = 1) {
  const resultsList = Modal.currentModal.querySelector('.stock-pictures-results')
  const searchSummary = Modal.currentModal.querySelector('.search-summary')

  // Convert the form data into a JSON object
  const form = Modal.currentModal.querySelector('form')
  var searchData = {};
  (new FormData(form)).forEach(function (value, key) {
    searchData[key] = value
  })

  toggleLoading(true)

  // Enable all filters
  $('[name="stockpictures-form"]')
    .find('input, select')
    .prop('disabled', '')

  // Make the "page" parameter available in the query params we'll be sending
  searchData.page = currentPage

  new AjaxRequest(TYPO3.settings.ajaxUrls.id_stock_pictures_search)
    .withQueryArguments(searchData)
    .get()
    .then(async function (response) {
      const data = await response.resolve()

      if (data.result) {
        if (data.result.data) {
          reachedPaginationEnd = (data.result.data.length === 0)

          // Clear the results area, only if we started a new search
          // Else this is the infinite scroll so keep the previous items
          if (page == 1) {
            const keywordsLabel = typeof(searchData.q) !== 'undefined' && searchData.q ? ' for keywords <em>' + searchData.q + '</em>' : '';
            searchSummary.innerHTML = 'Found ' + data.result.totalCount + ' results' + keywordsLabel
            resultsList.innerHTML = ''
            resultsList.style.height = 'auto'
          }
          renderList(data.result.data)
          toggleFilters(data.result)
        }
        else if (data.result.message) {
          searchSummary.innerHTML = '<p class="text-danger">' + data.result.message + '</p>'
          toggleLoading(false)
        }
      } else {
        resultsList.innerHTML = ''
        searchSummary.innerHTML = ''
        toggleLoading(false)
      }
    })
}

/**
 * If the results ask us to disable some filters, do it
 * @param result
 */
function toggleFilters(result) {
  if (result.disabledFilters && result.disabledFilters.length > 0) {
    // Disable each filter based on the AJAX response
    for (let i in result.disabledFilters) {
      let $filterInput = $('[name="' + result.disabledFilters[i] + '"]');
      $filterInput
        .val('')
        .prop('disabled', 'disabled')
    }
  }
}

/**
 * Build the search form based on the JSON object passed in "data-available-filters" of the "Add media" button
 * @param target
 * @returns {*}
 */
function generateSearchForm (target) {
  let availableFilters = JSON.parse(target.getAttribute('data-available-filters'))
  let placeholder = target.getAttribute('data-placeholder')
  let connector = target.getAttribute('data-connector')

  const searchContainer = document.createElement('form')
  searchContainer.name = 'stockpictures-form'

  // Add a hidden input containing the connector name : that means the AJAX call will search in this service's API
  const connectorInput = document.createElement('input')
  connectorInput.type = 'hidden'
  connectorInput.name = 'connector'
  connectorInput.value = connector
  searchContainer.append(connectorInput)

  // Add the text search input
  const $searchInput = $('<div class="form-group"></div>').append(
    $('<input name="q" id="search-term">')
      .attr('type', 'text')
      .attr('class', 'form-control stockpictures-media-url')
      .attr('placeholder', placeholder)
      .on('keypress', (e) => {
        // Prevent submitting the form with enter
        if (e.keyCode === 13) {
          e.preventDefault()
        }
      })
      // Bind search event to the text input
      .on('keyup', debounce((e) => {
        currentPage = 1
        search(1)
      }, debounceTimeout))
  )
  searchContainer.append($searchInput[0])

  const filtersContainer = generateSearchFilters(availableFilters)
  searchContainer.append(filtersContainer)

  return searchContainer
}

/**
 * Generates all of the select filters
 * @returns {*}
 */
function generateSearchFilters (availableFilters) {
  const filtersContainer = document.createElement('div')
  filtersContainer.className = 'row'
  // Add select filters
  for (let filterType of Object.keys(availableFilters)) {
    let filterData = availableFilters[filterType]
    let $formGroup = $('<div class="form-group col-md-3"><label>' + filterData.label + '</label></div>')

    if (filterData.tag && filterData.tag === 'checkbox') {
      // Trigger the search when changing a checkbox
      for (let index in filterData.options) {
        const optionValue = filterData.options[index].value
        const optionLabel = filterData.options[index].label
        let $element = $('<div class="form-check form-switch">')
        let $input = $('<input type="checkbox" name="' + filterType + '[' + index + ']" class="form-check-input" value="' + optionValue + '">')
          .on('change', (e) => {
            currentPage = 1
            search(1)
          })
        $element.append($input)
        $element.append('<label class="form-check-label">' + optionLabel + '</label>')
        $element.append('</div>')
        $formGroup.append($element)
      }
    } else {
      // Trigger the search when changing a select
      let $select = $('<select name="' + filterType + '" class="form-control"></select>')
        .on('change', (e) => {
          currentPage = 1
          search(1)
        })

      for (let index in filterData.options) {
        let optionValue = filterData.options[index].value
        let optionLabel = filterData.options[index].label
        $select.append('<option value="' + optionValue + '">' + optionLabel + '</option>')
      }
      $formGroup.append($select)
    }
    filtersContainer.append($formGroup[0])
  }
  return filtersContainer
}

function generateResultsContainer () {
  const $resultsContainer = $('<div id="stockpictures-search-results" class="mt-3"></div>')
  $resultsContainer.append('<div class="search-summary mb-5"></div>')
  $resultsContainer.append('<div class="row stock-pictures-results"></div>')
  $resultsContainer.append('<div class="loading-container text-center"></div>')
  return $resultsContainer
}

function submit (connector, targetFolder, fileIrreObject) {
  const selectedImage = Modal.currentModal.querySelector('.result-item.active')
  const submitButton = Modal.currentModal.querySelector('.btn.btn-primary')

  if (selectedImage) {
    // Set a loading state on the submit button
    Icons.getIcon('spinner-circle', Icons.sizes.small).then((icon) => {
      submitButton.innerHTML = icon + ' ' + submitButton.innerHTML
      submitButton.setAttribute('disabled', 'disabled')
    })

    NProgress.start()

    new AjaxRequest(TYPO3.settings.ajaxUrls.id_stock_pictures_download)
        .post({
          connector: connector,
          id: selectedImage.getAttribute('data-id'),
          targetFolder: targetFolder
        }).then(async e => {
      const data = await e.resolve()
      if (data.file) {
        // If file was successfully downloaded and added to the FAL, trigger the creation of the file reference
        const e = {
          actionName: 'typo3:foreignRelation:insert',
          objectGroup: fileIrreObject,
          table: 'sys_file',
          uid: data.file
        }
        NProgress.done()
        MessageUtility.send(e)
        // ... and hide the search box
        Modal.dismiss()
      } else {
        const confirm = Modal.confirm(
            'ERROR',
            data.error,
            Severity.error,
            [
              {
                text: TYPO3.lang['button.ok'] || 'OK',
                btnClass: 'btn-' + Severity.getCssClass(Severity.error),
                name: 'ok',
                active: !0
              }
            ])
            .addEventListener('confirm.button.ok', () => {
              confirm.modal('hide')
            })
      }
      submitButton.querySelector('.icon').remove()
      submitButton.removeAttribute('disabled')
      NProgress.done()
    })
        .catch(e => {
          console.error(e)
          submitButton.querySelector('.icon').remove()
          submitButton.removeAttribute('disabled')
          NProgress.done()
        })
  }
}

/**
 * Opens the modal search box
 * @param target
 */
function triggerModal (target) {
  let title = target.getAttribute('data-btn-submit')
  let targetFolder = target.getAttribute('data-target-folder')
  let fileIrreObject = target.getAttribute('data-file-irre-object')
  let cancel = target.getAttribute('data-btn-cancel')
  let connector = target.getAttribute('data-connector')

  const $searchForm = generateSearchForm(target)
  const $resultsContainer = generateResultsContainer()

  let modalContent = $('<div>').attr('class', 'form-control-wrap')
    .append($searchForm)
    .append($resultsContainer)

  Modal.advanced({
    title: target.getAttribute('title'),
    content: modalContent,
    severity: Severity.notice,
    size: Modal.sizes.full,
    buttons: [
      {
        btnClass: 'btn btn-default',
        text: cancel,
        name: 'cancel',
        trigger: () => {
          Modal.dismiss()
        }
      },
      {
        btnClass: 'btn btn-primary',
        text: title,
        name: 'ok',
        trigger: () => {
          submit(connector, targetFolder, fileIrreObject)
        }
      }
    ]
  })
    .addEventListener('shown.bs.modal', e => {
      // Focus on the search input when opening the modal
      $(e.currentTarget).find('input[name="q"]').first().focus()
      initInfiniteScroll()
    })
}

/**
 * Initializes the loading of a new results page when we reach the bottom end of the results scroll area
 */
function initInfiniteScroll () {
  Modal.currentModal.querySelector('.modal-body').addEventListener('scroll', debounce((e) => {
    if (!isLoading && !reachedPaginationEnd) {
      var bottomScrollPosition = $(e.target).scrollTop() + $(e.target).height()
      var totalHeight = $(e.target).prop('scrollHeight')
      if ((totalHeight - bottomScrollPosition < infiniteScrollThreshold) && !isLoading) {
        currentPage += 1
        console.log('Moving to page ' + currentPage)
        search(currentPage)
      }
    }
  }, 500))
}

/**
 * Execute a function given a delay time
 *
 * @param {type} func
 * @param {type} wait
 * @param {type} immediate
 * @returns {Function}
 */
function debounce (func, wait, immediate) {
  var timeout
  return function () {
    var context = this, args = arguments
    var later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}
