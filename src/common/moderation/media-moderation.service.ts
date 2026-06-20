import { Injectable, Logger } from '@nestjs/common';
import { Rekognition } from 'aws-sdk';
import { awsConfig } from 'src/config/aws.config';
import { getS3Bucket } from 'src/common/s3/s3.client';
import { Media } from 'src/modules/media/entities/media.entity';
import { MediaType } from 'src/modules/media/enums/media-type.enum';

export interface ModerationResult {
  passed: boolean;
  labels: Record<string, unknown>;
  rejectionReason?: string;
}

@Injectable()
export class MediaModerationService {
  private readonly logger = new Logger(MediaModerationService.name);
  private readonly rekognition = new Rekognition({
    region: awsConfig.region,
    accessKeyId: awsConfig.credentials.accessKeyId,
    secretAccessKey: awsConfig.credentials.secretAccessKey,
  });

  async moderate(media: Media): Promise<ModerationResult> {
    if (media.type === MediaType.IMAGE) {
      return this.moderateImage(media.sourceIdOrKey);
    }
    if (media.type === MediaType.VIDEO) {
      return this.moderateVideo(media.sourceIdOrKey);
    }
    return { passed: true, labels: { skipped: true, reason: 'unsupported_type' } };
  }

  private async moderateImage(key: string): Promise<ModerationResult> {
    const response = await this.rekognition
      .detectModerationLabels({
        Image: { S3Object: { Bucket: getS3Bucket(), Name: key } },
        MinConfidence: awsConfig.rekognition.minConfidence,
      })
      .promise();

    const labels = (response.ModerationLabels ?? []).map((label) => ({
      name: label.Name,
      parentName: label.ParentName,
      confidence: label.Confidence,
    }));

    const blocked = labels.find((label) =>
      awsConfig.rekognition.rejectLabels.some(
        (blockedLabel) =>
          label.name?.toLowerCase().includes(blockedLabel.toLowerCase()) &&
          (label.confidence ?? 0) >= awsConfig.rekognition.minConfidence,
      ),
    );

    if (blocked) {
      return {
        passed: false,
        labels: { labels },
        rejectionReason: `Blocked label: ${blocked.name}`,
      };
    }

    return { passed: true, labels: { labels } };
  }

  private async moderateVideo(key: string): Promise<ModerationResult> {
    const start = await this.rekognition
      .startContentModeration({
        Video: { S3Object: { Bucket: getS3Bucket(), Name: key } },
        MinConfidence: awsConfig.rekognition.minConfidence,
      })
      .promise();

    const jobId = start.JobId;
    if (!jobId) {
      throw new Error('Rekognition did not return a moderation job id');
    }

    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(5000);
      const result = await this.rekognition
        .getContentModeration({ JobId: jobId })
        .promise();

      if (result.JobStatus === 'FAILED') {
        throw new Error(
          result.StatusMessage ?? 'Video moderation job failed',
        );
      }

      if (result.JobStatus === 'SUCCEEDED') {
        const labels = (result.ModerationLabels ?? []).map((label) => ({
          name: label.ModerationLabel?.Name,
          parentName: label.ModerationLabel?.ParentName,
          confidence: label.ModerationLabel?.Confidence,
          timestamp: label.Timestamp,
        }));

        const blocked = labels.find((label) =>
          awsConfig.rekognition.rejectLabels.some(
            (blockedLabel) =>
              label.name?.toLowerCase().includes(blockedLabel.toLowerCase()) &&
              (label.confidence ?? 0) >= awsConfig.rekognition.minConfidence,
          ),
        );

        if (blocked) {
          return {
            passed: false,
            labels: { jobId, labels },
            rejectionReason: `Blocked label: ${blocked.name}`,
          };
        }

        return { passed: true, labels: { jobId, labels } };
      }
    }

    throw new Error('Video moderation timed out');
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
