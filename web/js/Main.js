$(document).ready(async function () {

    const crypto = window.crypto || window.msCrypto;
    let chunkSize = 1024 * 1024;
    let partSize = 512;
    let keysLen = 2048;
    let useCrypt = true;
    let pubKey = null;

    $('body').on('click', '#upload_btn', async function () {
        //Generate keys and out to console for tests
        //await genKeys(keysLen);
        //return;

        await uploadFile();
    });

    async function getPublicKey() {

        return new Promise((resolve) => {
            $.get('/site/getkey')
                .done(function (resp) {
                    resp = JSON.parse(resp);
                    resolve(resp.KEY);
                })
                .fail(function () {
                    reconnect();
                });
        });

    }
    
    async function uploadFile() {
        let fileInput = $('#upload_file');
        //Check if we are under https and Crypto is available
        useCrypt = (crypto) ? true : false;

        if (!fileInput.val()) {
            window.alert('Select file first!');
            return;
        }

        //!! disable using Crypto
        // Somethings goes wrong while a`ll try to use Crypto.
        // Steps and keyBuff and.... something get wrong.

        //TODO : fix chunk? sizes!
        useCrypt = false;

        //First run?
        if (!pubKey && useCrypt) {
            pubKey = await getPublicKey();
            pubKey = await Encoder.importRsaKey(pubKey);
        }

        let file = fileInput.get(0).files.item(0);

        let fileHash = await Hasher.getFileHash(file);
        let csrfToken = $('meta[name="csrf-token"]').attr("content");

        showStatus('Connecting...');

        let fileInfo = {
            name: file.name,
            size: file.size,
            type: file.type,
            hash: fileHash
        }

        $.post('/site/check', {
            info: fileInfo,
            _csrf: csrfToken
        })
            .done(async function (resp) {
                resp = JSON.parse(resp);

                //Returned statuses:
                //0     : file not exist
                //1     : file exist
                //10    : file uploaded
                //11    : ready for next chunk
                //1001  : decryption error
                //9999  : raw error (php error)

                switch (resp.STATUS) {
                    case 0 : {
                        showStatus('Start uploading...');
                        await uploadChunk(file, 0, chunkSize);
                    }
                        break;
                    case 10 : {
                        showStatus('File already uploaded.');
                    }
                        break;
                    case 1001 : {
                        showStatus('Data decryption error!');
                    }
                        break;
                    case 9999 : {
                        showStatus(resp.MESSAGE);
                    }
                    default : {
                        showStatus('Unknown error while uploading file!');
                    }
                }
            })
            .fail(function () {
                reconnect();
            });

    }

    async function uploadChunk(file, start, size) {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = async function () {
            let fileData = reader.result;

            //remove Base64 encode heading if exist
            let haveHeading = fileData.indexOf(',');
            if (haveHeading > 0) {
                fileData = fileData.substring(haveHeading + 1);
            }

            //get chunk
            let chunk = fileData.substring(start, start + size);

            //use Crypt?
            if (useCrypt) {
                chunk = await Encoder.encryptChunk(chunk, pubKey, partSize);
            }
            
            $.post('/site/upload', {
                name: file.name,
                size: file.size,
                chunk: chunk,
                hash: MD5(fileData),
                crypt: (useCrypt) ? true : false
            })
                .done(function (resp) {
                    resp = JSON.parse(resp);

                    switch (resp.STATUS) {
                        case 10 : {
                            showStatus('File uploaded');
                        }
                            break;
                        case 11 : {
                            let partsCount = Math.round(file.size / chunkSize);
                            let currentPart = Math.round(resp.SIZE / chunkSize);
                            showStatus('Uploading part ' + currentPart + '/' + partsCount);
                            uploadChunk(file, resp.SIZE, chunkSize);
                        }
                            break;
                        case 1001 : {
                            showStatus('Data decryption error!');
                        }
                            break;
                        case 9999 : {
                            showStatus(resp.MESSAGE);
                        }
                            break;
                        default : {
                            showStatus('Unknown error while uploading file!');
                            return;
                        }
                    }
                })
                .fail(function () {
                    reconnect();
                });

        };

        reader.onerror = function () {
            showStatus('Error reading file data :' + reader.error);
        };

    }

    function reconnect() {
        showStatus('Connection error. Trying to reconnect...');
        setTimeout(uploadFile, 1000);
    }

    function showStatus(text) {
        let $status = $('#status');
        //$status.show();

        //status like a log
        //$status.html($status.html() + '<br/>' + text);

        //simple status
        $status.html(text);
    }
});