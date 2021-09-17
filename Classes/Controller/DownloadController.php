<?php

namespace Ideative\IdStockPictures\Controller;

use Ideative\IdStockPictures\ConnectorInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Symfony\Component\Mime\MimeTypes;
use TYPO3\CMS\Core\Http\ResponseFactory;
use TYPO3\CMS\Core\Log\LogManager;
use TYPO3\CMS\Core\Resource\File;
use TYPO3\CMS\Core\Resource\ResourceFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;

class DownloadController implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /** @var ResourceFactory $resourceFactory */
    protected ResourceFactory $resourceFactory;

    /**
     * List of GET/POST params that should be ignored
     * @var string[]
     */
    protected array $paramsBlackList = [ 'route', 'token', 'connector' ];



    public function __construct()
    {
        $this->resourceFactory = GeneralUtility::makeInstance(ResourceFactory::class);
        $this->setLogger(GeneralUtility::makeInstance(LogManager::class)->getLogger(__CLASS__));
    }

    /**
     *
     * @param ServerRequestInterface $request
     * @return ResponseInterface
     * @throws \TYPO3\CMS\Extbase\Object\Exception
     */
    public function process(ServerRequestInterface $request): ResponseInterface
    {
        $requestConnector = $request->getParsedBody()['connector'] ?? null;
        // List of GET params that should not be transmitted to the search function

        $result = [];
        if ($requestConnector) {
	        $connectorClassName = $GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['id_stock_pictures']['connectors'][$requestConnector] ?? '';
	        if ($connectorClassName) {
		        $params = $this->getFilteredParams($request->getParsedBody());
				$connector = GeneralUtility::makeInstance($connectorClassName);
		        if ($connector instanceof ConnectorInterface) {
			        $id = $params['id'] ?? $request->getQueryParams()['id'];
			        if ($id) {
				        $fileInfo = $connector->getFileUrlAndExtension($id);
				        $file = $this->downloadFile($fileInfo, $params['targetFolder'], $id, $requestConnector);
				        if ($file) {
					        $result = [
						        'file' => $file->getUid()
					        ];
				        } else {
					        $result['error'] = LocalizationUtility::translate(
						        'error.file_download_failed',
						        'id_stock_pictures',
						        [ucfirst($requestConnector)]
					        );
				        }
			        } else {
				        $result['error'] = LocalizationUtility::translate('error.no_file_given', 'id_stock_pictures');
			        }
		        }
	        }
        } else {
            $result['error'] = LocalizationUtility::translate('error.invalid_connector_given', 'id_stock_pictures');
        }

        $response = GeneralUtility::makeInstance(ResponseFactory::class)->createResponse()
            ->withHeader('Content-Type', 'application/json; charset=utf-8');
        $response->getBody()->write(json_encode($result, JSON_THROW_ON_ERROR));
        return $response;
    }

    /**
     * Returns only the parameters that are not blacklisted
     * @param array $params
     * @return array|bool
     */
    public function getFilteredParams(array $params)
    {
        $paramsBlackList = $this->paramsBlackList;
        return array_filter($params, function ($param) use ($paramsBlackList) {
            return !in_array($param, $paramsBlackList, true);
        }, ARRAY_FILTER_USE_KEY);
    }

    /**
     * @param $mimeType
     * @return mixed|string|null
     */
    public function mimeTypeToExtension($mimeType)
    {
        $mimes = (new MimeTypes())->getExtensions($mimeType);
        return !empty($mimes[0]) ? $mimes[0] : '';
    }

    /**
     * Downloads the file from the given URL and stores it in the given target folder
     * @param array $fileInfo
     * @param string $targetFolder
     * @param string $id
     * @param string $connectorName
     * @return File
     */
    public function downloadFile(array $fileInfo, string $targetFolder, string $id, string $connectorName): File
    {
        if (!$targetFolder) {
            $this->logger->critical(sprintf(
                'No target folder specified',
            ));
            return null;
        }

        $folder = $this->getResourceFactory()->getFolderObjectFromCombinedIdentifier($targetFolder);

        $file = null;
        $fileName = $connectorName . '_' . $id . '.' . $fileInfo['extension'];
        
        if (!$folder->hasFile($fileName)) {
            try {
                $fileData = $this->getUrl($fileInfo['url']);
                if ($fileData) {
                    // Download the remote file and store it into a tmp file
                    $tmpFile = tmpfile();
                    $path = stream_get_meta_data($tmpFile)['uri'];
                    fwrite($tmpFile, $fileData);
                    
                    // Add the downloaded file to FAL with its remote name
                    $file = $folder->addFile($path, $fileName);
                    fclose($tmpFile);
                } else {
                    $this->logger->critical(sprintf(
                        'Got empty data while trying to download file from URL "%s"',
                        $fileInfo['url']
                    ));
                }
            } catch (\Exception $e) {
                $this->logger->critical(sprintf(
                    'An exception occured while trying to download file from "%s". Exception : %s',
	                $fileName,
                    $e->getMessage()
                ));
            }
        } else {
            // If file already existed in this folder, use the existing one
            $file = $this->resourceFactory->getFileObjectFromCombinedIdentifier($targetFolder . $fileName);
        }


        return $file;
    }

    /**
     * @return ResourceFactory
     */
    public function getResourceFactory(): ResourceFactory
    {
        return $this->resourceFactory;
    }

    /**
     * Wrapper for unit testing
     * @param $url
     * @return false|mixed|string
     */
    public function getUrl($url)
    {
        return GeneralUtility::getUrl($url);
    }

    /**
     * @return string[]
     */
    public function getParamsBlackList(): array
    {
        return $this->paramsBlackList;
    }
}