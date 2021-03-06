<?php

namespace Ideative\IdStockPictures\XClass;

use Ideative\IdStockPictures\ConnectorInterface;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Core\Resource\Folder;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Object\ObjectManager;

/**
 * XClass the inline container to add a new button "Add media" for each connected service (Shutterstock, Unsplash, etc.)
 * Class InlineControlContainer
 * @package Ideative\IdStockPictures\XClass
 */
class InlineControlContainer extends \TYPO3\CMS\Backend\Form\Container\InlineControlContainer {
    const EXT_KEY = 'id_stock_pictures';
    
    /**
     * Generate a button that opens an element browser in a new window.
     * For group/db there is no way to use a "selector" like a <select>|</select>-box.
     *
     * @param array $inlineConfiguration TCA inline configuration of the parent(!) field
     * @return string A HTML button that opens an element browser in a new window
     */
    protected function renderPossibleRecordsSelectorTypeGroupDB(array $inlineConfiguration)
    {
        // Generate the complete inline container using the parent
        $output = parent::renderPossibleRecordsSelectorTypeGroupDB($inlineConfiguration);
        
        // Prepare some variables that should be passed so the "Add media from XXX" button can be properly generated
        $currentStructureDomObjectIdPrefix = $this->inlineStackProcessor->getCurrentStructureDomObjectIdPrefix($this->data['inlineFirstPid']);
        $foreign_table = $inlineConfiguration['foreign_table'];
        $objectPrefix = $currentStructureDomObjectIdPrefix . '-' . $foreign_table;
        $backendUser = $this->getBackendUserAuthentication();
        $folder = $backendUser->getDefaultUploadFolder(
            $this->data['tableName'] === 'pages' ? $this->data['vanillaUid'] : $this->data['parentPageRow']['uid'],
            $this->data['tableName'],
            $this->data['fieldName']
        );
        
        if (
            $folder instanceof Folder
            && $folder->getStorage()->checkUserActionPermission('add', 'File')
        ) {
            // Browse each service connector and add its corresponding button
            $registeredConnectors = $GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS'][self::EXT_KEY]['connectors'];
            $objectManager = GeneralUtility::makeInstance(ObjectManager::class);

            $buttons = '';
            foreach ($registeredConnectors as $connectorName => $connectorClassName) {
                $connector = $objectManager->get($connectorClassName);
                if (is_subclass_of($connector, ConnectorInterface::class)) {
                    $buttons .= $this->getAddButton(
                        $objectPrefix, 
                        $folder,
                        $connector,
                        $connectorName
                    );
                }
            }
            $output .= '<div class="form-group">' . $buttons . '</div>';
        }
        
        $this->includeAdditionalRequireJsModules();
        
        return $output;
    }

    /**
     * Returns the HTML markup for the "Add media from XXX" button
     * @param string $objectPrefix
     * @param Folder $folder
     * @param ConnectorInterface $connector
     * @param string $connectorName
     * @return string
     */
    public function getAddButton(string $objectPrefix, Folder $folder, ConnectorInterface $connector, string $connectorName)
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
    public function includeAdditionalRequireJsModules() {
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
    }

}