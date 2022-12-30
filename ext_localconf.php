<?php
// TYPO3_MODE for TYPO3 v10 and below
defined('TYPO3_MODE') or defined('TYPO3') or die();

call_user_func(function ($extKey) {
    /**
     * XClass the inline container to add a new button "Add media" for each connected service (Shutterstock, Unsplash, etc.)
     */
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['Objects'][ \TYPO3\CMS\Backend\Form\Container\FilesControlContainer::class ] = array(
        'className' => \Ideative\IdStockPictures\XClass\FilesControlContainer::class,
    );

}, 'id_stock_pictures');
