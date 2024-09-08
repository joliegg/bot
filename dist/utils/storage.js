"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
class Storage {
    client;
    domain;
    constructor(configuration, domain) {
        this.client = new client_s3_1.S3Client(configuration);
        this.domain = domain;
    }
    async store(content, path, contentType, acl = 'public-read') {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.SPACE_NAME,
            Key: path,
            Body: content,
            ContentType: contentType,
            ACL: acl,
        });
        await this.client.send(command);
        return `https://${this.domain}/${path}`;
    }
}
exports.default = Storage;
