<?php

/*
 * This file is part of the "Ideative Favicons" Extension for TYPO3 CMS.
 *
 *  (c) 2019 Idéative <typo3@ideative.ch>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * For the full license information, please read the LICENSE file that
 * was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

$EM_CONF[$_EXTKEY] = [
    'title' => 'Stock Pictures library',
    'description' => 'Allows backend users to select assets from as stock pictures library from the TYPO3 backend',
    'category' => 'templates',
    'author' => 'Julien Henchoz',
    'author_email' => 'typo3@ideative.ch',
    'author_company' => 'Idéative',
    'shy' => '',
    'priority' => '',
    'module' => '',
    'state' => 'stable',
    'internal' => '',
    'uploadfolder' => '0',
    'createDirs' => '',
    'modify_tables' => '',
    'clearCacheOnLoad' => 1,
    'lockType' => '',
    'version' => '11.0.1',
    'constraints' => [
        'depends' => [
            'typo3' => '11.0.0-11.9.99'
        ],
        'conflicts' => [
        ],
        'suggests' => [
        ],
    ],
];
