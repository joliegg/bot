import { ObjectCannedACL, PutObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

class Storage {
  private client: S3Client;
  public domain: string;

  constructor(configuration: S3ClientConfig, domain: string) {
    this.client = new S3Client(configuration);
    this.domain = domain;
  }

  async store(content: string | Buffer, path: string, contentType: string, acl: ObjectCannedACL = 'public-read'): Promise<string> {
    const command = new PutObjectCommand({
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

export default Storage;
