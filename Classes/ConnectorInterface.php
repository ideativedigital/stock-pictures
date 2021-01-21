<?php

namespace Ideative\IdStockPictures;

use TYPO3\CMS\Core\Resource\Folder;

interface ConnectorInterface {
    /**
     * Searches through the service's API with the given params
     * @param array $params
     * @return array
     */
    public function search(array $params);

    /**
     * Downloads the HD file from the service
     * Should return the download URL
     * @param string $id
     * @return array
     */
    public function getFileUrlAndExtension(string $id): array;
    
    /**
     * Returns the additional attributes added to the "Add media button", so they can be used in Javascript later
     * @return array
     */
    public function getAddButtonAttributes();

    /**
     * Returns the markup for the icon of the "Add media" button
     * @return string
     */
    public function getAddButtonIcon();
    
    /**
     * Returns the label of the "Add media" button
     * @return string|null
     */
    public function getAddButtonLabel();

    /**
     * Returns a list of available filters in the search form
     * @return string[]
     */
    public function getAvailableFilters(): array;
}