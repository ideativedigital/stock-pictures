<?php

namespace Ideative\IdStockPictures\Domain\Model;

class SearchResult {
    /**
     * @var SearchResultItem[] Contains the search summary
     */
    public $search = [];

    /** @var int */
    public $page;
    
    /** @var int  */
    public $totalCount = 0;
    
    /** @var array  */
    public $data = [];
    
    /** @var bool  */
    public $success = false;

    public $message = '';
}