import * as $ from 'jquery';
import {MessageUtility} from "@typo3/backend/utility/message-utility.js";
import NProgress from "nprogress";
import AjaxRequest from "@typo3/core/ajax/ajax-request.js";
import SecurityUtility from "@typo3/core/security-utility.js";
import Modal from "@typo3/backend/modal.js";
import Severity from "@typo3/backend/severity.js";
import Icons from "@typo3/backend/icons.js";
import * as masonry from '@ideative/id_stock_pictures/masonry.pkgd.min.js';
import * as imagesLoaded from '@ideative/id_stock_pictures/imagesLoaded.pkgd.min.js';

var currentPage = 1
var isLoading = false
var debounceTimeout = 500
var infiniteScrollThreshold = 1200
var reachedPaginationEnd = false
var securityUtility = new SecurityUtility()

// When clicking on the "Add media from XXX" button, show the search modal
$.default(document).on('click', '.t3js-stockpicture-media-add-btn', t => {
  triggerModal($.default(t.currentTarget))
})

/**
 * Renders a single result item (image from the stock picture service)
 * @param item
 * @returns {*}
 */
function renderItem (item) {
  // Create items hidden by default. We'll display them once they are loaded using imagesLoaded plugin
  var $container = $.default('<div class="col-lg-4 result-item" style="display: none;" data-id="' + item.id + '"></div>')
  $container.append('<img src="' + item.preview + '" class="img-fluid" />')

  // Select the image when the user clicks on it
  $container.on('click', function () {
    // First deselect any other image
    Modal.currentModal.find('.result-item').removeClass('active')
    // Activate this one
    $.default(this).addClass('active')
  })

  return $container
}

function renderList (items) {
  const $resultsList = Modal.currentModal.find('.stock-pictures-results')
  // Add each result item
  for (let index in items) {
    let item = items[index]
    $resultsList.append(renderItem(item))
  }

  // Trigger masonry everytime a new image is loaded
  const grid = $resultsList[0]
  imagesLoaded(grid, function () {
    toggleLoading(false)
    // Display the new loaded images gracefully
    $.default(grid).find('.result-item').fadeIn()

    // init Isotope after all images have loaded
    let msnry = new masonry(grid, {
      itemSelector: '.result-item'
    })
  })
}

function toggleLoading(status) {
  const $loadingContainer = Modal.currentModal.find('.loading-container')
  isLoading = status
  if (status) {
    Icons.getIcon('spinner-circle', Icons.sizes.large).then((icon) => {
      $loadingContainer.html(icon)
    })
  }
  else {
    $loadingContainer.html('')
  }
}

function search (page = 1) {
  const $resultsList = Modal.currentModal.find('.stock-pictures-results')
  const $searchSummary = Modal.currentModal.find('.search-summary')

  // Convert the form data into a JSON object
  const form = Modal.currentModal.find('form')[0]
  var searchData = {};
  (new FormData(form)).forEach(function (value, key) {
    searchData[key] = value
  })

  toggleLoading(true)

  // Enable all filters
  $.default('[name="stockpictures-form"]')
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
            $searchSummary.html('Found ' + data.result.totalCount + ' results' + keywordsLabel)
            $resultsList.html('')
            $resultsList.css({height: 'auto'})
          }
          renderList(data.result.data)
          toggleFilters(data.result)
        }
        else if (data.result.message) {
          $searchSummary.html('<p class="text-danger">' + data.result.message + '</p>')
          toggleLoading(false)
        }
      } else {
        $resultsList.html('')
        $searchSummary.html('')
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
      let $filterInput = $.default('[name="' + result.disabledFilters[i] + '"]');
      $filterInput
        .val('')
        .prop('disabled', 'disabled')
    }
  }
}

/**
 * Build the search form based on the JSON object passed in "data-available-filters" of the "Add media" button
 * @param $target
 * @returns {*}
 */
function generateSearchForm ($target) {
  let availableFilters = $target.data('available-filters')
  let placeholder = $target.data('placeholder')
  let connector = $target.data('connector')

  const $searchContainer = $.default('<form name="stockpictures-form"></form>')

  // Add a hidden input containing the connector name : that means the AJAX call will search in this service's API
  const $connectorInput = $.default('<input type="hidden" name="connector">').val(connector)
  $searchContainer.append($connectorInput)

  // Add the text search input
  const $searchInput = $.default('<div class="form-group"></div>').append(
    $.default('<input name="q" id="search-term">')
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
  $searchContainer.append($searchInput)

  const $filtersContainer = generateSearchFilters(availableFilters)
  $searchContainer.append($filtersContainer)

  return $searchContainer
}

/**
 * Generates all of the select filters
 * @returns {*}
 */
function generateSearchFilters (availableFilters) {
  const $filtersContainer = $.default('<div class="row"></div>')
  // Add select filters
  for (let filterType in availableFilters) {
    let filterData = availableFilters[filterType]
    let $formGroup = $.default('<div class="form-group col-md-3"><label>' + filterData.label + '</label></div>')

    if (filterData.tag && filterData.tag === 'checkbox') {
      // Trigger the search when changing a checkbox
      for (let index in filterData.options) {
        const optionValue = filterData.options[index].value
        const optionLabel = filterData.options[index].label
        let $element = $.default('<div class="form-check form-switch">')
        let $input = $.default('<input type="checkbox" name="' + filterType + '[' + index + ']" class="form-check-input" value="' + optionValue + '">')
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
      let $select = $.default('<select name="' + filterType + '" class="form-control"></select>')
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
    $filtersContainer.append($formGroup)
  }
  return $filtersContainer
}

function generateResultsContainer () {
  const $resultsContainer = $.default('<div id="stockpictures-search-results" class="mt-3"></div>')
  $resultsContainer.append('<div class="search-summary mb-5"></div>')
  $resultsContainer.append('<div class="row stock-pictures-results"></div>')
  $resultsContainer.append('<div class="loading-container text-center"></div>')
  return $resultsContainer
}

function submit (connector, targetFolder, fileIrreObject) {
  const $selectedImage = Modal.currentModal.find('.result-item.active')
  const $submitButton = Modal.currentModal.find('.btn.btn-primary')

  // Set a loading state on the submit button
  Icons.getIcon('spinner-circle', Icons.sizes.small).then((icon) => {
    $submitButton.prepend(icon)
    $submitButton.attr('disabled', 'disabled')
  })

  NProgress.start()

  new AjaxRequest(TYPO3.settings.ajaxUrls.id_stock_pictures_download)
    .post({
      connector: connector,
      id: $selectedImage.data('id'),
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
        .on('confirm.button.ok', () => {
          confirm.modal('hide')
        })
    }
    $submitButton.find('.icon').remove()
    $submitButton.removeAttr('disabled')
    NProgress.done()
  })
    .catch(e => {
      console.error(e)
      $submitButton.find('.icon').remove()
      $submitButton.removeAttr('disabled')
      NProgress.done()
    })
}

/**
 * Opens the modal search box
 * @param $target
 */
function triggerModal ($target) {
  let title = $target.data('btn-submit')
  let targetFolder = $target.data('target-folder')
  let fileIrreObject = $target.data('file-irre-object')
  let cancel = $target.data('btn-cancel')
  let connector = $target.data('connector')

  const $searchForm = generateSearchForm($target)
  const $resultsContainer = generateResultsContainer()

  let modalContent = $.default('<div>').attr('class', 'form-control-wrap')
    .append($searchForm)
    .append($resultsContainer)

  Modal.advanced({
    title: $target.attr('title'),
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
    .on('shown.bs.modal', e => {
      // Focus on the search input when opening the modal
      $.default(e.currentTarget).find('input[name="q"]').first().focus()
    })

  initInfiniteScroll()
}

/**
 * Initializes the loading of a new results page when we reach the bottom end of the results scroll area
 */
function initInfiniteScroll () {
  Modal.currentModal.find('.modal-body').on('scroll', debounce((e) => {
    if (!isLoading && !reachedPaginationEnd) {
      var bottomScrollPosition = $.default(e.target).scrollTop() + $.default(e.target).height()
      var totalHeight = $.default(e.target).prop('scrollHeight')
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
