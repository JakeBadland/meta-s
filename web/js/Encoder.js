Encoder = {

    algorithm : 'AES-GCM',

    encryptChunk : async function (chunk, rsaKey, partSize) {
        let resultArr = [];

        const aesKey = await this.generateAesKey()
        const encryptedAesKey = await this.encryptAesKeyWithPublicRSAKey(aesKey, rsaKey)

        let partsCount = Math.ceil(chunk.length / partSize);

        for (let i = 0; i < partsCount; i++) {
            let start = i * partSize;
            let end = Math.min((i + 1) * partSize, chunk.length);
            let buff = chunk.substring(start, end);
            
            if (buff) {
                let { ciphertext, iv } = await this.aesEncrypt(buff, aesKey)

                resultArr.push({
                    ciphertext : this.arrayBufferToBase64(ciphertext),
                    iv:  this.arrayBufferToBase64(iv)
                });
            }
        }
        
        return {
            data: JSON.stringify(resultArr),
            aesKeyEncrypted: this.arrayBufferToBase64(encryptedAesKey)
        }
    },

    importRsaKey: function (pem) {

        return crypto.subtle.importKey(
            'spki',
            this.base64ToArrayBuffer(pem),
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            true,
            ['encrypt', 'wrapKey']
        )
    },

    generateAesKey: async function (length = 256, extractable = true) {

        return crypto.subtle.generateKey(
            {
                name: this.algorithm,
                length: length,
            },
            extractable,
            ['encrypt', 'decrypt']
        )
    },

    encryptAesKeyWithPublicRSAKey: async function (aesKey, rsaKey) {

        return await crypto.subtle.wrapKey(
            'raw',
            aesKey,
            rsaKey,
            {
                name: 'RSA-OAEP'
            }
        )
    },

    aesEncrypt : async function (plaintext, aesKey, ivLength = 12) {
        const iv = crypto.getRandomValues(new Uint8Array(ivLength))
        const ciphertext = await crypto.subtle.encrypt(
            { name: this.algorithm, iv },
            aesKey,
            new TextEncoder().encode(plaintext)
        )

        return { ciphertext, aesKey, iv }
    },

    arrayBufferToBase64 : function (buffer) {
        let binary = ''
        const bytes = new Uint8Array(buffer)
        const len = bytes.byteLength
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
        }

        return btoa(binary)
    },

    base64ToArrayBuffer : function (base64) {
        const binaryString = atob(base64)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        return bytes.buffer
    }
}