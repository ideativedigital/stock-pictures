<?php

namespace Ideative\IdStockPictures\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Psr7\Request;
use Ideative\IdStockPictures\ConnectorInterface;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Http\Response;
use TYPO3\CMS\Core\Http\ResponseFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Object\ObjectManager;

class SearchController
{
	/**
	 * @param ServerRequestInterface $request
	 * @return ResponseInterface
	 */
    public function process(ServerRequestInterface $request): ResponseInterface
    {
        $requestConnector = $request->getQueryParams()['connector'] ?? null;
        // List of GET params that should not be transmitted to the search function
        $paramsBlackList = ['route', 'token', 'connector'];
        
        $result = null;
        if ($requestConnector) {
	        $connectorClassName = $GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['id_stock_pictures']['connectors'][$requestConnector] ?? '';
	        if ($connectorClassName) {
		        $params = array_filter($request->getQueryParams(), static function ($param) use ($paramsBlackList) {
			        return !in_array($param, $paramsBlackList, true);
		        }, ARRAY_FILTER_USE_KEY);

		        $connector = GeneralUtility::makeInstance($connectorClassName);
		        if ($connector instanceof ConnectorInterface) {
			        $result = $connector->search($params);
		        }
	        }
        }
        
        $data = ['result' => $result];
        $response = GeneralUtility::makeInstance(ResponseFactory::class)->createResponse()
            ->withHeader('Content-Type', 'application/json; charset=utf-8');
        $response->getBody()->write(json_encode($data, JSON_THROW_ON_ERROR));
        return $response;
    }

}