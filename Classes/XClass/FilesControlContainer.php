<?php

declare(strict_types=1);

namespace Ideative\IdStockPictures\XClass;

use AllowDynamicProperties;
use Ideative\IdStockPictures\ConnectorInterface;
use Psr\EventDispatcher\EventDispatcherInterface;
use TYPO3\CMS\Backend\Form\InlineStackProcessor;
use TYPO3\CMS\Backend\Form\NodeFactory;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Crypto\HashService;
use TYPO3\CMS\Core\Imaging\IconFactory;
use TYPO3\CMS\Core\Resource\DefaultUploadFolderResolver;
use TYPO3\CMS\Core\Resource\Filter\FileExtensionFilter;
use TYPO3\CMS\Core\Resource\Folder;
use TYPO3\CMS\Core\Resource\OnlineMedia\Helpers\OnlineMediaHelperRegistry;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Page\JavaScriptModuleInstruction;

/**
 * XClass the inline container to add a new button "Add media" for each connected service (Shutterstock, Unsplash, etc.)
 * Class FilesControlContainer
 * @package Ideative\IdStockPictures\XClass
 */

class FilesControlContainer extends \TYPO3\CMS\Backend\Form\Container\FilesControlContainer {
    public const EXT_KEY = 'stock-pictures';
    public function __construct(
        IconFactory $iconFactory,
        protected readonly InlineStackProcessor $inlineStackProcessor,
        EventDispatcherInterface $eventDispatcher,
        OnlineMediaHelperRegistry $onlineMediaHelperRegistry,
        protected readonly DefaultUploadFolderResolver $defaultUploadFolderResolver,
        HashService $hashService,
        TcaSchemaFactory $tcaSchemaFactory
    )
    {
        parent::__construct(
            $iconFactory,
            $inlineStackProcessor,
            $eventDispatcher,
            $onlineMediaHelperRegistry,
            $defaultUploadFolderResolver,
            $hashService,
            $tcaSchemaFactory
        );
    }

    protected function getFileSelectors(array $inlineStructure, array $inlineConfiguration, FileExtensionFilter $fileExtensionFilter): array
    {
        $controls = parent::getFileSelectors($inlineStructure, $inlineConfiguration, $fileExtensionFilter);

        // Prepare some variables that should be passed so the "Add media from XXX" button can be properly generated
        $currentStructureDomObjectIdPrefix = $this->inlineStackProcessor->getDomObjectIdPrefixFromStructure($inlineStructure, $this->data['inlineFirstPid']);
        $foreign_table = $inlineConfiguration['foreign_table'];
        $objectPrefix = $currentStructureDomObjectIdPrefix . '-' . $foreign_table;
        $backendUser = $this->getBackendUserAuthentication();
        $folder = $this->defaultUploadFolderResolver->resolve(
            $backendUser,
            $this->data['tableName'] === 'pages' ? $this->data['vanillaUid'] : ($this->data['parentPageRow']['uid'] ?? 0),
            $this->data['tableName'],
            $this->data['fieldName']
        );

        $buttons = '';
        if (
            $folder instanceof Folder
            && $folder->getStorage()->checkUserActionPermission('add', 'File')
        ) {

            // Browse each service connector and add its corresponding button
            $registeredConnectors = $GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS'][self::EXT_KEY]['connectors'] ?? [];

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
        }

        $controls[] .= '<div class="form-group t3js-ideative-addon-inline-controls">' . $buttons . '</div>';

        $this->includeAdditionalRequireJsModules($inlineStructure);

        return $controls;
    }

    /**
     * Check if the given connector is enabled for the current table/field
     * Each connector can be manually disabled using TSConfig in TCEFORM. See README for more info
     * @param string $connectorName
     * @return bool
     */
    public function isConnectorEnabled(string $connectorName): bool
    {
        $isConnectorEnabled = false;
        if($currentPageId = $this->getCurrentPageUid()) {
            $pagesTSconfig = BackendUtility::getPagesTSconfig($currentPageId);
            $isConnectorEnabled = $pagesTSconfig['TCEFORM.'][$this->data['tableName'] . '.'][$this->data['fieldName'] . '.']['tx_idstockpictures.']['connectors.'][$connectorName . '.']['enabled'] ?? true;
        }
        return (bool)$isConnectorEnabled;
    }

    protected function getCurrentPageUid(): ?int
    {
        $tableName = $this->data['tableName'] ?? '';
        if ($tableName === 'pages') {
            if ($vanillaUid = $this->data['vanillaUid'] ?? 0) {
                return (int)$vanillaUid;
            }
        } else {
            if ($parentRow = $this->data['parentPageRow'] ?? []) {
                if(is_array($parentRow) && isset($parentRow['uid'])) {
                    return (int)$parentRow['uid'];
                }
            }
        }
        return null;
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
    public function includeAdditionalRequireJsModules($inlineStructure): void
    {
        $this->javaScriptModules[] = JavaScriptModuleInstruction::create('@ideative/stock-pictures/AddStockPictureMedia.js');
        $nameObject = $this->inlineStackProcessor->getDomObjectIdPrefixFromStructure($inlineStructure,$this->data['inlineFirstPid']);
        $this->javaScriptModules[] = JavaScriptModuleInstruction::create('@ideative/stock-pictures/InlineControlContainerStockPictures.js')->instance($nameObject);
    }
}
