# S3 Static Web App

A static website deployed to AWS using a private S3 bucket fronted by a CloudFront distribution. All infrastructure is defined as code with CloudFormation, and a single shell script handles the full deployment pipeline.

## Architecture

```
End User ──HTTPS──▶ CloudFront Distribution ──OAC──▶ Private S3 Bucket
                    (edge caching, HTTPS,            (no public access)
                     custom error pages)
```

- **S3 bucket** is fully private — all public access is blocked
- **CloudFront** serves content over HTTPS with Origin Access Control (OAC)
- **OAC** authenticates CloudFront requests to S3 using SigV4 signing
- Requests to non-existent paths return a custom 404 error page

## Project Structure

```
├── index.html                  # Landing page
├── error.html                  # Custom 404 error page
├── css/
│   └── styles.css              # Stylesheet
├── js/
│   └── main.js                 # JavaScript (navigation, mobile menu)
├── images/                     # Image assets
│   └── .gitkeep
├── infrastructure/
│   └── template.yaml           # CloudFormation template
└── scripts/
    └── deploy.sh               # Deployment script
```

Only the application files (`index.html`, `error.html`, `css/`, `js/`, `images/`) are uploaded to S3. The `infrastructure/` and `scripts/` directories are excluded.

## Prerequisites

1. **AWS CLI v2** — Install from [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/)
2. **Python 3** — Required for parsing stack outputs (pre-installed on macOS and most Linux distributions)
3. **AWS credentials** — Configured via `aws configure`, environment variables, or an IAM role. The credentials need permissions for:
   - `cloudformation:*` (stack create/update/describe)
   - `s3:*` (bucket operations and file upload)
   - `cloudfront:*` (distribution and cache invalidation)

Verify your setup:

```bash
aws sts get-caller-identity
```

## Quick Start

Deploy with default settings (region: `us-east-1`, stack name: `s3-static-web-app`):

```bash
scripts/deploy.sh
```

The script will:

1. Validate prerequisites (AWS CLI, template file, required HTML files)
2. Create or update the CloudFormation stack
3. Upload all static files to S3 with correct Content-Type headers
4. Invalidate the CloudFront cache
5. Print the website URL

> **First deployment takes 5–15 minutes** while CloudFront provisions the distribution globally. Subsequent deployments are faster.

## Configuration

| Parameter      | Default              | Description                    |
|----------------|----------------------|--------------------------------|
| `--region`     | `us-east-1`         | AWS region for all resources   |
| `--stack-name` | `s3-static-web-app` | CloudFormation stack name      |

### Deploy to a different region

```bash
scripts/deploy.sh --region eu-west-1
```

### Deploy multiple environments

```bash
# Staging
scripts/deploy.sh --stack-name my-app-staging --region us-east-1

# Production
scripts/deploy.sh --stack-name my-app-prod --region us-east-1
```

Each stack creates its own S3 bucket and CloudFront distribution, so environments are fully isolated.

## What the Deployment Script Does

```
┌─────────────────────────────────────────────────┐
│  1. Validate prerequisites                      │
│     - AWS CLI installed?                        │
│     - template.yaml exists?                     │
│     - index.html and error.html exist?          │
├─────────────────────────────────────────────────┤
│  2. Deploy CloudFormation stack                 │
│     - Creates stack on first run                │
│     - Updates stack if template changed          │
│     - No-op if nothing changed                  │
├─────────────────────────────────────────────────┤
│  3. Retrieve stack outputs                      │
│     - BucketName, WebsiteURL, DistributionId    │
├─────────────────────────────────────────────────┤
│  4. Upload files to S3                          │
│     - HTML, CSS, JS with explicit Content-Type  │
│     - Images with per-extension MIME types       │
├─────────────────────────────────────────────────┤
│  5. Invalidate CloudFront cache                 │
│     - Clears all cached content (/**)           │
│     - Non-fatal if invalidation fails           │
├─────────────────────────────────────────────────┤
│  6. Print website URL                           │
└─────────────────────────────────────────────────┘
```

## Content-Type Mapping

The script sets explicit Content-Type headers for every uploaded file:

| Extension        | Content-Type             |
|------------------|--------------------------|
| `.html`          | `text/html`              |
| `.css`           | `text/css`               |
| `.js`            | `application/javascript` |
| `.png`           | `image/png`              |
| `.jpg`, `.jpeg`  | `image/jpeg`             |
| `.gif`           | `image/gif`              |
| `.svg`           | `image/svg+xml`          |
| `.webp`          | `image/webp`             |
| `.ico`           | `image/x-icon`           |

## Infrastructure Details

The CloudFormation template (`infrastructure/template.yaml`) creates four resources:

| Resource              | Type                                      | Purpose                                              |
|-----------------------|-------------------------------------------|------------------------------------------------------|
| `WebsiteBucket`       | `AWS::S3::Bucket`                         | Private bucket for static files                      |
| `CloudFrontOAC`       | `AWS::CloudFront::OriginAccessControl`    | Authenticates CloudFront → S3 requests via SigV4     |
| `WebsiteDistribution` | `AWS::CloudFront::Distribution`           | CDN with HTTPS, compression, and custom error pages  |
| `WebsiteBucketPolicy` | `AWS::S3::BucketPolicy`                   | Grants S3 read access only to this CloudFront distribution |

### Stack Outputs

| Output           | Description                                          |
|------------------|------------------------------------------------------|
| `BucketName`     | Auto-generated S3 bucket name                        |
| `WebsiteURL`     | CloudFront URL (e.g., `https://d111111abcdef8.cloudfront.net`) |
| `DistributionId` | CloudFront distribution ID (used for cache invalidation) |

Retrieve outputs manually:

```bash
aws cloudformation describe-stacks \
    --stack-name s3-static-web-app \
    --query "Stacks[0].Outputs" \
    --output table
```

## Error Handling

The script uses `set -euo pipefail` for strict error handling. Specific scenarios:

| Scenario                        | Behavior                                                    |
|---------------------------------|-------------------------------------------------------------|
| AWS CLI not installed           | Prints error with install URL, exits 1                      |
| Template file missing           | Prints error, exits 1                                       |
| `index.html` or `error.html` missing | Prints error, exits 1                                 |
| Stack deployment fails          | Prints failure reason, exits 1                              |
| No infrastructure changes       | Treated as success, proceeds to file upload                 |
| Stack output retrieval fails    | Prints error, exits 1                                       |
| File upload fails               | Prints error, exits 1                                       |
| Cache invalidation fails        | Prints warning to stderr, continues (non-fatal)             |

## Updating the Site

After making changes to your HTML, CSS, JS, or image files, re-run the deploy script:

```bash
scripts/deploy.sh
```

If only application files changed (no template changes), the script will report "No infrastructure changes detected" and proceed directly to uploading files and invalidating the cache.

## Verifying the Deployment

After deployment, verify everything is working:

```bash
# Check the site loads over HTTPS
curl -I "$(aws cloudformation describe-stacks \
    --stack-name s3-static-web-app \
    --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" \
    --output text)"

# Verify a non-existent path returns the error page with 404
curl -I "https://YOUR_CLOUDFRONT_DOMAIN/nonexistent"

# Verify the S3 bucket blocks direct access
aws s3api get-object \
    --bucket YOUR_BUCKET_NAME \
    --key index.html /dev/null 2>&1 || echo "Direct access blocked (expected)"

# Check Content-Type headers on uploaded objects
aws s3api head-object \
    --bucket YOUR_BUCKET_NAME \
    --key index.html \
    --query "ContentType" \
    --output text
```

## Tearing Down

To delete all resources created by the stack:

```bash
# Empty the S3 bucket first (required before stack deletion)
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name s3-static-web-app \
    --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
    --output text)

aws s3 rm "s3://${BUCKET_NAME}" --recursive

# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name s3-static-web-app

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name s3-static-web-app
```

> **Note:** CloudFront distribution deletion can take 15–30 minutes to propagate.

If you used a custom stack name, replace `s3-static-web-app` with your stack name in the commands above.

## Troubleshooting

**"Error: AWS CLI is not installed"**
Install the AWS CLI from [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/) and verify with `aws --version`.

**"Error: Stack deployment failed"**
Check the CloudFormation events for details:
```bash
aws cloudformation describe-stack-events \
    --stack-name s3-static-web-app \
    --query "StackEvents[?ResourceStatus=='CREATE_FAILED' || ResourceStatus=='UPDATE_FAILED']"
```

**Site not loading after first deploy**
CloudFront distributions take 5–15 minutes to deploy globally on first creation. Wait and try again.

**Changes not visible after redeployment**
The script invalidates the cache automatically, but propagation takes 1–2 minutes. If you still see stale content, check the invalidation status:
```bash
DIST_ID=$(aws cloudformation describe-stacks \
    --stack-name s3-static-web-app \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
    --output text)

aws cloudfront list-invalidations --distribution-id "$DIST_ID"
```

**"AccessDenied" when accessing the site**
Verify the bucket policy was created correctly and the CloudFront distribution is fully deployed. Check the stack status:
```bash
aws cloudformation describe-stacks \
    --stack-name s3-static-web-app \
    --query "Stacks[0].StackStatus"
```
