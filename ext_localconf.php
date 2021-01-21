<?php
defined('TYPO3_MODE') || die();

call_user_func(function ($extKey) {
    /**
     * XClass the inline container to add a new button "Add media" for each connected service (Shutterstock, Unsplash, etc.)
     */
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['Objects'][ \TYPO3\CMS\Backend\Form\Container\InlineControlContainer::class ] = array(
        'className' => \Ideative\IdStockPictures\XClass\InlineControlContainer::class,
    );

}, 'id_stock_pictures');
