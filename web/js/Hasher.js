Hasher = {

    getFileHash : async function(file){

        return new Promise((resolve, reject) => {
            let reader = new FileReader();

            reader.onload = async (event) => {
                let data = event.target.result;
                resolve(MD5(data));
            };

            reader.onerror = (error) => reject(error);

            reader.readAsDataURL(file);
        });

    }

}