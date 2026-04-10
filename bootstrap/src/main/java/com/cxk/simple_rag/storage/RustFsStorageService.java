package com.cxk.simple_rag.storage;

import com.cxk.simple_rag.config.RustFsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.*;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.util.UUID;

/**
 * RustFS 文件存储服务
 *
 * @author wangxin
 */
@Slf4j
@Service
//@RequiredArgsConstructor
public class RustFsStorageService {

    private final RustFsConfig rustFsConfig;
    private final S3Client s3Client;

    @Autowired
    public RustFsStorageService(RustFsConfig rustFsConfig) {
        this.rustFsConfig = rustFsConfig;
        this.s3Client = createS3Client();
        initBucket();
    }

    private S3Client createS3Client() {
        try {
            URI endpointUri = new URI(rustFsConfig.getEndpoint());
            AwsBasicCredentials credentials = AwsBasicCredentials.create(
                    rustFsConfig.getAccessKey(),
                    rustFsConfig.getSecretKey()
            );

            return S3Client.builder()
                    .endpointOverride(endpointUri)
                    .credentialsProvider(StaticCredentialsProvider.create(credentials))
                    .region(Region.of("us-east-1"))
                    .forcePathStyle(true)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to create S3 client", e);
        }
    }

    private void initBucket() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(rustFsConfig.getBucket()).build());
            log.info("RustFS bucket already exists: {}", rustFsConfig.getBucket());
        } catch (NoSuchBucketException e) {
            s3Client.createBucket(CreateBucketRequest.builder().bucket(rustFsConfig.getBucket()).build());
            log.info("RustFS bucket created: {}", rustFsConfig.getBucket());
        } catch (Exception e) {
            log.warn("Failed to check/create bucket, will retry on next operation", e);
        }
    }

    /**
     * 上传文件
     *
     * @param file 文件
     * @param directory 目录路径
     * @return 文件访问路径
     */
    public String uploadFile(MultipartFile file, String directory) {
        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String objectKey = directory + "/" + UUID.randomUUID() + "." + extension;

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(rustFsConfig.getBucket())
                    .key(objectKey)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(
                    file.getInputStream(),
                    file.getSize()
            ));

            log.info("File uploaded to RustFS: bucket={}, key={}, size={}",
                    rustFsConfig.getBucket(), objectKey, file.getSize());

            return objectKey;
        } catch (Exception e) {
            log.error("Failed to upload file to RustFS: key={}", objectKey, e);
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    /**
     * 下载文件
     *
     * @param objectKey 对象键
     * @return 文件输入流
     */
    public InputStream downloadFile(String objectKey) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(rustFsConfig.getBucket())
                    .key(objectKey)
                    .build();

            return s3Client.getObject(getObjectRequest, ResponseTransformer.toInputStream());
        } catch (Exception e) {
            log.error("Failed to download file from RustFS: key={}", objectKey, e);
            throw new RuntimeException("Failed to download file", e);
        }
    }

    /**
     * 删除文件
     *
     * @param objectKey 对象键
     */
    public void deleteFile(String objectKey) {
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(rustFsConfig.getBucket())
                    .key(objectKey)
                    .build();

            s3Client.deleteObject(deleteRequest);
            log.info("File deleted from RustFS: key={}", objectKey);
        } catch (Exception e) {
            log.error("Failed to delete file from RustFS: key={}", objectKey, e);
            throw new RuntimeException("Failed to delete file", e);
        }
    }

    /**
     * 检查文件是否存在
     *
     * @param objectKey 对象键
     * @return 是否存在
     */
    public boolean exists(String objectKey) {
        try {
            s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(rustFsConfig.getBucket())
                    .key(objectKey)
                    .build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            log.error("Failed to check file existence: key={}", objectKey, e);
            return false;
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "bin";
        }
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1) : "bin";
    }
}
