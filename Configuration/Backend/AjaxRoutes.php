<?php

return [
    'stock_pictures_search' => [
        'path' => '/stock_pictures_search',
        'target' => \Ideative\IdStockPictures\Controller\SearchController::class . '::process',
    ],
    'stock_pictures_download' => [
        'path' => '/stock_pictures_download',
        'target' => \Ideative\IdStockPictures\Controller\DownloadController::class . '::process',
    ],
];
