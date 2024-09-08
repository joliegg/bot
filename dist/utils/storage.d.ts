import { ObjectCannedACL, S3ClientConfig } from '@aws-sdk/client-s3';
declare class Storage {
    private client;
    domain: string;
    constructor(configuration: S3ClientConfig, domain: string);
    store(content: string | Buffer, path: string, contentType: string, acl?: ObjectCannedACL): Promise<string>;
}
export default Storage;
