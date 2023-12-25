$(document).ready(function (){

    //Returnef statuses:
    //0     : file not exist
    //1     : file exist
    //10    : file uploaded
    //11    : ready for next chunk

    let chunkSize = 1024 * 1024; //1Mb

    $('body').on('click', '#upload_btn', function (){
        
        let file = $('#upload_file');
        
        if (!file.val()){
            window.alert('Select file first!');
            return;
        }
        
        uploadFile(file);
    });

    function uploadFile(fileInput)
    {
        let file = fileInput.get(0).files.item(0);

        let csrfToken = $('meta[name="csrf-token"]').attr("content");

        let fileInfo = {
            name : file.name,
            size : file.size,
            type : file.type
        }

        $.post('/site/check',{
            info : fileInfo,
            _csrf : csrfToken
        }, function (resp){
            resp = JSON.parse(resp);

            switch (resp.STATUS){
                case 0 : {
                    showStatus('Start uploading');
                    uploadChunk(file, 0, chunkSize);
                } break;
                case 1 : {
                    uploadChunk(file, resp.SIZE, chunkSize);
                } break;
                case 10 : {
                    showStatus('File already uploaded')
                } break;
                default : {
                    showStatus('Unknown error while uploading file!');
                    return;
                }
            }

        });

    }

    function uploadChunk(file, start, end)
    {
        let reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = function() {

            let data = reader.result;

            //remove Base64 encode heading if exist
            let haveHeading = data.indexOf(',');
            if (haveHeading > 0) {
                data = data.substring(haveHeading + 1);
            }

            $.post('/site/upload', {
                name : file.name,
                size : file.size,
                chunk : data.substring(start, start + end)
            }, function (resp){
                resp = JSON.parse(resp);
                if (resp.STATUS == 10){
                    showStatus('File uploaded');
                    return;
                }

                if (resp.STATUS == 11){
                    let partsCount = Math.round(file.size / chunkSize);
                    let currentPart = Math.round(resp.SIZE / chunkSize);
                    showStatus('Uploading part ' + currentPart + '/' + partsCount);
                    uploadChunk(file, resp.SIZE, chunkSize);
                }
            });

        };

        reader.onerror = function() {
            showStatus('Error reading file data :' + reader.error);
        };

    }

    function showStatus(text){
        let $status = $('#status');
        //$status.show();

        //status like a log
        //$status.html($status.html() + '<br/>' + text);

        //simple status
        $status.html(text);
    }
});