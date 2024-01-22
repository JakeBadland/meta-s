<?php

namespace app\models;

class ResponseStatuses
{

    public static int $FILE_NOT_EXIST = 0;
    public static int $FILE_EXIST = 1;
    public static int $FILE_UPLOADED = 10;

    public static int $FILE_READY_FOR_NEXT = 11;

    public static int $DECRYPTION_ERROR = 1001;

    public static int $PHP_ERROR = 9999;
}