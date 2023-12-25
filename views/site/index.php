<?php

/** @var yii\web\View $this */

$this->title = 'Partial file upload';
?>

<div class="site-index">
    <div class="jumbotron text-center bg-transparent mt-5 mb-5">
        <h1 class="display-4">Select file to upload</h1>
        <br/>
        <p class="lead">
            <input type="file" id="upload_file">
        </p>
        <br/>
        <p><a class="btn btn-lg btn-success" href="#" id="upload_btn">Upload</a></p>
        <br/>
        <p id="status"></p>
    </div>
</div>