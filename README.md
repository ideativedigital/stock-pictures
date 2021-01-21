# Idéative - Stock pictures
This extension provides a base for connecting Stock picture services to the TYPO3 backend.
For each connected service, a "Add media from XXX" button will be added in Media files.

To get started quickly, you can use one of the following extensions :
- id_shutterstock_connector
- id_unsplash_connector

### Installation
Install this extension via `composer require ideative/stock-pictures` or download it from the TYPO3 Extension Repository and activate the extension in the Extension Manager of your TYPO3 installation.

### Registering a new stock picture service
```$GLOBALS['TYPO3_CONF_VARS']['SC_OPTIONS']['id_stock_pictures'['connectors']['myservice'] = \Acme\MyExtension\Connector\MyServiceConnector::class```

Your connector class must implement the Ideative\IdStockPictures\ConnectorInterface interface. Checkout the class documentation to understand the purpose of each interface method. 

Take the ShutterStockConnector from `EXT:id_shutterstock_connector` as a kickstart.