<?php

namespace app\models;

use Yii;

class FileStatuses
{

    public static int $FILE_NOT_EXIST = 0;
    public static int $FILE_EXIST = 1;
    public static int $FILE_UPLOADED = 10;

    public static int $FILE_READY_FOR_NEXT = 11;

}