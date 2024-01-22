<?php

namespace app\controllers;

use app\libraries\Crypto;
use Yii;
use yii\filters\AccessControl;
use yii\web\Controller;
use yii\web\Response;
use yii\filters\VerbFilter;
use app\models\LoginForm;
use app\models\ContactForm;
use app\models\ResponseStatuses;

class SiteController extends Controller
{
    /**
     * {@inheritdoc}
     */
    public function behaviors() : array
    {
        return [
            'access' => [
                'class' => AccessControl::class,
                'only' => ['logout'],
                'rules' => [
                    [
                        'actions' => ['logout'],
                        'allow' => true,
                        'roles' => ['@'],
                    ],
                ],
            ],
            'verbs' => [
                'class' => VerbFilter::class,
                'actions' => [
                    'logout' => ['post'],
                ],
            ],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function actions(): array
    {
        return [
            'error' => [
                'class' => 'yii\web\ErrorAction',
            ],
            'captcha' => [
                'class' => 'yii\captcha\CaptchaAction',
                'fixedVerifyCode' => YII_ENV_TEST ? 'testme' : null,
            ],
        ];
    }

    /**
     * Displays homepage.
     *
     * @return string
     */
    public function actionIndex() : string
    {
        return $this->render('index');
    }

    /**
     * Check file state.
     *
     * @return void
     */
    public function actionCheck() : void
    {
        $uploadDir = Yii::getAlias('@webroot') . '/uploads/';

        if (!is_dir($uploadDir)){
            mkdir($uploadDir);
        }

        $request = Yii::$app->request;

        if ( $request->isPost && isset($request->post()['info']) ){
            $fileInfo = $request->post()['info'];

            $fileName = $uploadDir . $fileInfo['hash']. '.tmp';

            if (!is_file($fileName)){
                $this->sendResp(['STATUS' => ResponseStatuses::$FILE_NOT_EXIST]);
            }

            $fileSize = filesize($fileName);
            if ($fileSize >= $fileInfo['size']){
                $this->sendResp(['STATUS' => ResponseStatuses::$FILE_UPLOADED]);
            }

            $this->sendResp([
                'STATUS' => ResponseStatuses::$FILE_EXIST,
                'SIZE' => filesize($fileName)
            ]);

        }
    }

    /**
     * Upload file.
     *
     * @return void
     */
    public function actionUpload() : void
    {
        $crypto = new Crypto();
        $request = Yii::$app->request;
        $data = $request->post();

        $data['crypt'] = ($data['crypt'] === 'true');

        if ( $request->isPost && isset($data['name']) ){
            $fileName = Yii::getAlias('@webroot') . '/uploads/' . $data['hash']. '.tmp';
            $originalFileName = Yii::getAlias('@webroot') . '/uploads/' . $data['name'];

            if ($data['crypt']){
                $chunk = $crypto->decryptChunk($data['chunk']);
            } else {
                $chunk = base64_decode($data['chunk']);
            }

            if (!file_exists($fileName)){
                file_put_contents($fileName, $chunk);

                //file uploaded totally? for files where file size <= chunk size
                if (filesize($fileName) >= $data['size']){
                    rename($fileName, $originalFileName);
                    $this->sendResp(['STATUS' => ResponseStatuses::$FILE_UPLOADED]);
                }

                //file created
                $this->sendResp([
                    'STATUS' => ResponseStatuses::$FILE_READY_FOR_NEXT,
                    'SIZE' => filesize($fileName)
                ]);
            }

            //adding chunk
            file_put_contents($fileName, $chunk, FILE_APPEND);

            //check if file totally uploaded
            if (filesize($fileName) >= $data['size']){
                rename($fileName, $originalFileName);
                $this->sendResp(['STATUS' => ResponseStatuses::$FILE_UPLOADED]);
            }

            $this->sendResp([
                'STATUS' => ResponseStatuses::$FILE_READY_FOR_NEXT,
                'SIZE' => filesize($fileName)
            ]);

        }
    }

    public function actionGetkey()
    {
        $crypto = new Crypto();
        $pemKey = $crypto->getPublicKey()->toString('PKCS8');

        $pemKey = str_replace('-----BEGIN PUBLIC KEY-----', '', $pemKey);
        $pemKey = str_replace('-----END PUBLIC KEY-----', '', $pemKey);
        $pemKey = str_replace("\r\n", '', $pemKey);

        //$pemKey = base64_encode($pemKey);

        $this->sendResp(['KEY' => $pemKey]);
    }

    /**
     * Sending resp
     *
     * Data for sending
     * @param array $data
     *
     * @return void
     */
    private function sendResp(array $data) : void
    {
        echo json_encode($data);
        die;
    }

    /**
     * Login action.
     *
     * @return Response|string
     */
    public function actionLogin()
    {
        if (!Yii::$app->user->isGuest) {
            return $this->goHome();
        }

        $model = new LoginForm();
        if ($model->load(Yii::$app->request->post()) && $model->login()) {
            return $this->goBack();
        }

        $model->password = '';
        return $this->render('login', [
            'model' => $model,
        ]);
    }

    /**
     * Logout action.
     *
     * @return Response
     */
    public function actionLogout()
    {
        Yii::$app->user->logout();

        return $this->goHome();
    }

    /**
     * Displays contact page.
     *
     * @return Response|string
     */
    public function actionContact()
    {
        $model = new ContactForm();
        if ($model->load(Yii::$app->request->post()) && $model->contact(Yii::$app->params['adminEmail'])) {
            Yii::$app->session->setFlash('contactFormSubmitted');

            return $this->refresh();
        }
        return $this->render('contact', [
            'model' => $model,
        ]);
    }

    /**
     * Displays about page.
     *
     * @return string
     */
    public function actionAbout()
    {
        return $this->render('about');
    }
}
