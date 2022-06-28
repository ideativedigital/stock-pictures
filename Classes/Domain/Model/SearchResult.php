<?php

namespace Ideative\IdStockPictures\Domain\Model;

class SearchResult {
    /** @var array SearchResultItem[] Contains the search summary */
    public array $search = [];

    /** @var int */
    public int $page;
    
    /** @var int  */
    public int $totalCount = 0;
    
    /** @var array  */
    public array $data = [];
    
    /** @var bool  */
    public bool $success = false;

    /** @var string  */
    public string $message = '';
    
    /** @var array  */
    public array $disabledFilters = [];
}