<?php

return [
    'id_stock_pictures_search' => [
        'path' => '/stock_pictures_search',
        'target' => \Ideative\IdStockPictures\Controller\SearchController::class . '::process',
    ],
    'id_stock_pictures_download' => [
        'path' => '/id_stock_pictures_download',
        'target' => \Ideative\IdStockPictures\Controller\DownloadController::class . '::process',
    ],
];