<?php

namespace app\libraries;

use Yii;
use phpseclib3\Crypt\RSA;
use phpseclib3\Crypt\AES;
use phpseclib3\Crypt\Common\PrivateKey;
use phpseclib3\Crypt\Common\PublicKey;


class Crypto
{

    private PrivateKey $privateKey;
    private PublicKey $publicKey;
    private string $keyFile = 'private.pem';

    public function __construct()
    {
        $keyPath = Yii::getAlias('@webroot') . DIRECTORY_SEPARATOR . '../secure/';
        $keyFile = $keyPath . $this->keyFile;

        if (!is_file($keyFile)) {
            //generating new keys pair
            $this->generateKeys($keyFile);
            return;
        }

        $pemKey = file_get_contents($keyFile);
        $this->privateKey = RSA::loadPrivateKey($pemKey);
        $this->publicKey = $this->privateKey->getPublicKey();
    }

    public function getPrivateKey() : PrivateKey
    {
        return $this->privateKey;
    }

    public function getPublicKey(): PublicKey
    {
        return $this->publicKey;
    }

    private function generateKeys($keyFile): void
    {
        $this->privateKey = RSA::createKey();
        $this->publicKey = $this->privateKey->getPublicKey();

        file_put_contents($keyFile, $this->privateKey->toString('PKCS8'));
    }

    private function decrypt($dataStr)
    {
        return $this->getPrivateKey()->decrypt($dataStr);
    }

    public function decryptChunk($chunkArr): string
    {
        $resultStr = '';
        $parts = $chunkArr['data'];
        $parts = json_decode($parts);

        $decryptedAesKey = $this->decrypt(base64_decode($chunkArr['aesKeyEncrypted']));

        $aes = new AES('gcm');
        $aes->setKeyLength(256);
        $aes->setKey($decryptedAesKey);

        $tagLength = 16;

        foreach ($parts as $part){
            $data = base64_decode($part->ciphertext);
            $iv = base64_decode($part->iv);

            $tag = substr($data, -$tagLength);

            $ciphertext = substr($data, 0, -$tagLength);

            $aes->setNonce($iv);
            $aes->setTag($tag);
            $resultStr .= $aes->decrypt($ciphertext);
        }

        return base64_decode($resultStr);
    }
}
