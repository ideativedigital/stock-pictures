var __importDefault = this && this.__importDefault || function (e) {return e && e.__esModule ? e : { default: e }}

define([
        'require',
        'exports',
        'jquery',
        'TYPO3/CMS/Backend/Utility/MessageUtility',
        'TYPO3/CMS/Backend/Enum/KeyTypes',
        'nprogress',
        'TYPO3/CMS/Core/Ajax/AjaxRequest',
        'TYPO3/CMS/Core/SecurityUtility',
        'TYPO3/CMS/Backend/Modal',
        'TYPO3/CMS/Backend/Severity',
        'TYPO3/CMS/Backend/Icons',
        'masonry',
        'imagesLoaded'
    ],
    (function (e, exports, $, messageUtility, n, nprogress, ajaxRequest, o, modal, severity, icons, masonry, imagesLoaded) {
        'use strict'
        $ = __importDefault($)
        return new class {
            currentPage = 1
            isLoading = false
            debounceTimeout = 500
            infiniteScrollThreshold = 1200
            reachedPaginationEnd = false

            constructor () {
                this.securityUtility = new o, $.default(() => {this.registerEvents()})
            }

            /**
             * Initialize event to show modal when user clicks on "Add media from XXX"
             */
            registerEvents () {
                const self = this
                // When clicking on the "Add media from XXX" button, show the search modal
                $.default(document).on('click', '.t3js-stockpicture-media-add-btn', t => {
                    self.triggerModal($.default(t.currentTarget))
                })
            }

            /**
             * Renders a single result item (image from the stock picture service)
             * @param item
             * @returns {*}
             */
            renderItem (item) {
                // Create items hidden by default. We'll display them once they are loaded using imagesLoaded plugin
                var $container = $.default('<div class="col-lg-4 result-item" style="display: none;" data-id="' + item.id + '"></div>')
                $container.append('<img src="' + item.preview + '" class="img-fluid" />')

                // Select the image when the user clicks on it                
                $container.on('click', function () {
                    // First deselect any other image
                    modal.currentModal.find('.result-item').removeClass('active')
                    // Activate this one
                    $.default(this).addClass('active')
                })

                return $container
            }

            renderList (items) {
                const self = this
                const $resultsList = modal.currentModal.find('.stock-pictures-results')
                // Add each result item
                for (let index in items) {
                    let item = items[index]
                    $resultsList.append(self.renderItem(item))
                }

                // Trigger masonry everytime a new image is loaded
                const grid = $resultsList[0]
                imagesLoaded(grid, function () {
                    self.toggleLoading(false)
                    // Display the new loaded images gracefully
                    $.default(grid).find('.result-item').fadeIn()
                    
                    // init Isotope after all images have loaded
                    let msnry = new masonry(grid, {
                        itemSelector: '.result-item'
                    })
                })
            }
            
            toggleLoading(status) {
                const self = this
                const $loadingContainer = modal.currentModal.find('.loading-container')
                self.isLoading = status
                if (status) {
                    icons.getIcon('spinner-circle', icons.sizes.large).then((icon) => {
                        $loadingContainer.html(icon)
                    })
                }
                else {
                    $loadingContainer.html('')
                }
            }

            search (page = 1) {
                const self = this
                const $resultsList = modal.currentModal.find('.stock-pictures-results')
                const $searchSummary = modal.currentModal.find('.search-summary')
                
                // Convert the form data into a JSON object
                const form = modal.currentModal.find('form')[0]
                var searchData = {};
                (new FormData(form)).forEach(function (value, key) {
                    searchData[key] = value
                })

                self.toggleLoading(true)
                
                // Make the "page" parameter available in the query params we'll be sending
                searchData.page = self.currentPage

                new ajaxRequest(TYPO3.settings.ajaxUrls.id_stock_pictures_search)
                    .withQueryArguments(searchData)
                    .get()
                    .then(async function (response) {
                        const data = await response.resolve()

                        if (data.result) {
                            if (data.result.data) {
                                self.reachedPaginationEnd = (data.result.data.length === 0)
                                
                                // Clear the results area, only if we started a new search
                                // Else this is the infinite scroll so keep the previous items
                                if (page == 1) {
                                    $searchSummary.html('Found ' + data.result.totalCount + ' results for keywords <em>"' + searchData.q + '"</em>')
                                    $resultsList.html('')
                                    $resultsList.css({height: 'auto'})
                                }
                                self.renderList(data.result.data)
                            }
                            else if (data.result.message) {
                                $searchSummary.html('<p class="text-danger">' + data.result.message + '</p>')
                                self.toggleLoading(false)
                            }
                        } else {
                            $resultsList.html('')
                            $searchSummary.html('')
                            self.toggleLoading(false)
                        }
                    })
            }

            /**
             * Build the search form based on the JSON object passed in "data-available-filters" of the "Add media" button
             * @param $target
             * @returns {*}
             */
            generateSearchForm ($target) {
                const self = this
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
                        .on('keyup', self.debounce((e) => {
                            self.currentPage = 1
                            self.search(1)
                        }, self.debounceTimeout))
                )
                $searchContainer.append($searchInput)

                const $filtersContainer = self.generateSearchFilters(availableFilters)
                $searchContainer.append($filtersContainer)

                return $searchContainer
            }

            /**
             * Generates all of the select filters
             * @returns {*}
             */
            generateSearchFilters (availableFilters) {
                const self = this
                const $filtersContainer = $.default('<div class="row"></div>')
                // Add select filters
                for (let filterType in availableFilters) {
                    let filterData = availableFilters[filterType]
                    let $formGroup = $.default('<div class="form-group col-md-3"><label>' + filterData.label + '</label></div>')

                    // Trigger the search when changing a select
                    let $select = $.default('<select name="' + filterType + '" class="form-control"></select>')
                        .on('change', (e) => {
                            self.currentPage = 1
                            self.search(1)
                        })

                    for (let index in filterData.options) {
                        let optionValue = filterData.options[index].value
                        let optionLabel = filterData.options[index].label
                        $select.append('<option value="' + optionValue + '">' + optionLabel + '</option>')
                    }
                    $formGroup.append($select)
                    $filtersContainer.append($formGroup)
                }
                return $filtersContainer
            }

            generateResultsContainer () {
                const $resultsContainer = $.default('<div id="stockpictures-search-results" class="mt-3"></div>')
                $resultsContainer.append('<div class="search-summary mb-5"></div>')
                $resultsContainer.append('<div class="row stock-pictures-results"></div>')
                $resultsContainer.append('<div class="loading-container text-center"></div>')
                return $resultsContainer
            }

            submit (connector, targetFolder, fileIrreObject) {
                const $selectedImage = modal.currentModal.find('.result-item.active')
                const $submitButton = modal.currentModal.find('.btn.btn-primary')

                // Set a loading state on the submit button
                icons.getIcon('spinner-circle', icons.sizes.small).then((icon) => {
                    $submitButton.prepend(icon)
                    $submitButton.attr('disabled', 'disabled')
                })
                
                nprogress.start()

                new ajaxRequest(TYPO3.settings.ajaxUrls.id_stock_pictures_download)
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
                        messageUtility.MessageUtility.send(e)
                        // ... and hide the search box
                        modal.currentModal.modal('hide')
                    } else {
                        const confirm = modal.confirm(
                            'ERROR',
                            data.error,
                            severity.error,
                            [
                                {
                                    text: TYPO3.lang['button.ok'] || 'OK',
                                    btnClass: 'btn-' + severity.getCssClass(severity.error),
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
                    nprogress.done()
                })
            }

            /**
             * Opens the modal search box
             * @param $target
             */
            triggerModal ($target) {
                const self = this
                let title = $target.data('btn-submit')
                let targetFolder = $target.data('target-folder')
                let fileIrreObject = $target.data('file-irre-object')
                let cancel = $target.data('btn-cancel')
                let connector = $target.data('connector')

                const $searchForm = self.generateSearchForm($target)
                const $resultsContainer = self.generateResultsContainer()

                let modalContent = $.default('<div>').attr('class', 'form-control-wrap')
                    .append($searchForm)
                    .append($resultsContainer)

                modal.advanced({
                        title: $target.attr('title'),
                        content: modalContent,
                        severity: severity.notice,
                        size: modal.sizes.full,
                        buttons: [
                            {
                                btnClass: 'btn btn-default',
                                text: cancel,
                                name: 'cancel',
                                trigger: () => {
                                    modal.currentModal.trigger('modal-dismiss')
                                }
                            },
                            {
                                btnClass: 'btn btn-primary',
                                text: title,
                                name: 'ok',
                                trigger: () => {
                                    self.submit(connector, targetFolder, fileIrreObject)
                                }
                            }
                        ]
                    })
                    .on('shown.bs.modal', e => {
                        // Focus on the search input when opening the modal
                        $.default(e.currentTarget).find('input[name="q"]').first().focus()
                    })

                self.initInfiniteScroll()
            }

            /**
             * Initializes the loading of a new results page when we reach the bottom end of the results scroll area
             */
            initInfiniteScroll () {
                const self = this
                modal.currentModal.find('.modal-body').on('scroll', self.debounce((e) => {
                    if (!self.isLoading && !self.reachedPaginationEnd) {
                        var bottomScrollPosition = $.default(e.target).scrollTop() + $.default(e.target).height()
                        var totalHeight = $.default(e.target).prop('scrollHeight')
                        if ((totalHeight - bottomScrollPosition < self.infiniteScrollThreshold) && !self.isLoading) {
                            self.currentPage += 1
                            console.log('Moving to page ' + self.currentPage)
                            self.search(self.currentPage)
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
            debounce (func, wait, immediate) {
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

        }
    }))