<?php

namespace Ideative\IdStockPictures\XClass;

use Ideative\IdStockPictures\ConnectorInterface;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Resource\Folder;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Page\JavaScriptModuleInstruction;

/**
 * XClass the inline container to add a new button "Add media" for each connected service (Shutterstock, Unsplash, etc.)
 * Class InlineControlContainer
 * @package Ideative\IdStockPictures\XClass
 */
class InlineControlContainer extends \TYPO3\CMS\Backend\Form\Container\InlineControlContainer {
    public const EXT_KEY = 'id_stock_pictures';
    
    /**
     * Generate a button that opens an element browser in a new window.
     * For group/db there is no way to use a "selector" like a <select>|</select>-box.
     *
     * @param array $inlineConfiguration TCA inline configuration of the parent(!) field
     * @return string A HTML button that opens an element browser in a new window
     */
    protected function renderPossibleRecordsSelectorTypeGroupDB(array $inlineConfiguration): string
    {
        // Generate the complete inline container using the parent
        $output = parent::renderPossibleRecordsSelectorTypeGroupDB($inlineConfiguration);
        
        // Prepare some variables that should be passed so the "Add media from XXX" button can be properly generated
        $currentStructureDomObjectIdPrefix = $this->inlineStackProcessor->getCurrentStructureDomObjectIdPrefix($this->data['inlineFirstPid']);
        $foreign_table = $inlineConfiguration['foreign_table'];
        $objectPrefix = $currentStructureDomObjectIdPrefix . '-' . $foreign_table;
        $backendUser = $this->getBackendUserAuthentication();
        $currentPageId = $this->data['tableName'] === 'pages' ? $this->data['vanillaUid'] : $this->data['parentPageRow']['uid'];
        $folder = $backendUser->getDefaultUploadFolder(
            $currentPageId,
            $this->data['tableName'],
            $this->data['fieldName']
        );
        
        if (
            $folder instanceof Folder
            && $folder->getStorage()->checkUserActionPermission('add', 'File')
        ) {
            // Browse each service connector and add its corresponding button
            $registeredConnectors = $GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS'][self::EXT_KEY]['connectors'];

            $buttons = '';
            foreach ($registeredConnectors as $connectorName => $connectorClassName) {
                $connector = GeneralUtility::makeInstance($connectorClassName);
                if ($this->isConnectorEnabled($connectorName) && is_subclass_of($connector, ConnectorInterface::class)) {
                    $buttons .= $this->getAddButton(
                        $objectPrefix, 
                        $folder,
                        $connector,
                        $connectorName
                    );
                }
            }
            $output .= '<div class="form-group t3js-ideative-addon-inline-controls">' . $buttons . '</div>';
        }
        
        $this->includeAdditionalRequireJsModules();
        
        return $output;
    }

    /**
     * Check if the given connector is enabled for the current table/field
     * Each connector can be manually disabled using TSConfig in TCEFORM. See README for more info
     * @param string $connectorName
     * @return bool
     */
    public function isConnectorEnabled(string $connectorName): bool {
        $currentPageId = $this->data['tableName'] === 'pages' ? $this->data['vanillaUid'] : $this->data['parentPageRow']['uid'];
        $pagesTSconfig = BackendUtility::getPagesTSconfig($currentPageId);
        $isConnectorEnabled = $pagesTSconfig['TCEFORM.'][$this->data['tableName'] . '.'][$this->data['fieldName'] . '.']['tx_idstockpictures.']['connectors.'][$connectorName . '.']['enabled'] ?? true;
        return (bool)$isConnectorEnabled;
    }

    /**
     * Returns the HTML markup for the "Add media from XXX" button
     * @param string $objectPrefix
     * @param Folder $folder
     * @param ConnectorInterface $connector
     * @param string $connectorName
     * @return string
     */
    public function getAddButton(string $objectPrefix, Folder $folder, ConnectorInterface $connector, string $connectorName): string
    {
        $buttonAttributes = [
            'data-file-irre-object' => htmlspecialchars($objectPrefix),
            'data-target-folder' => htmlspecialchars($folder->getCombinedIdentifier()),
            'data-connector' => $connectorName,
            'data-available-filters' => GeneralUtility::jsonEncodeForHtmlAttribute($connector->getAvailableFilters())
        ];
        $buttonAttributes = array_merge($buttonAttributes, $connector->getAddButtonAttributes());
        
        $additionalAttributes = '';
        foreach ($buttonAttributes as $property => $value) {
            $additionalAttributes .= sprintf(' %s="%s" ', $property, $value);
        }
        
        return '<button type="button" class="btn btn-default t3js-stockpicture-media-add-btn"
                        ' . $additionalAttributes . '
                    >
                    ' . $connector->getAddButtonIcon() . '
                    ' . $connector->getAddButtonLabel() .
                '</button>
               ';
    }

	/**
	 * Add Masonry JS library
	 */
    public function includeAdditionalRequireJsModules(): void
    {
        $this->requireJsModules[] = 'TYPO3/CMS/IdStockPictures/AddStockPictureMedia';
        
        $pageRenderer = \TYPO3\CMS\Core\Utility\GeneralUtility::makeInstance(\TYPO3\CMS\Core\Page\PageRenderer::class);
        $pageRenderer->addRequireJsConfiguration(
            [
                'paths' => [
                    'masonry' => '../typo3conf/ext/' . self::EXT_KEY . '/Resources/Public/Contrib/masonry.pkgd.min',
                    'imagesLoaded' => '../typo3conf/ext/' . self::EXT_KEY . '/Resources/Public/Contrib/imagesloaded.pkgd.min',
                ],
                'shim' => [
                    'masonry' => ['exports' => 'masonry'],
                    'imagesLoaded' => ['exports' => 'imagesLoaded'],
                ],
            ]
        );

        $nameObject = $this->inlineStackProcessor->getCurrentStructureDomObjectIdPrefix($this->data['inlineFirstPid']);

        $this->requireJsModules[] = JavaScriptModuleInstruction::forRequireJS(
            'TYPO3/CMS/IdStockPictures/InlineControlContainerStockPictures'
        )->instance($nameObject);

    }

}