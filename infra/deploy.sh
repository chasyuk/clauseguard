#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
INFRA_DIR="$ROOT_DIR/infra"
LAMBDA_BUILD_DIR="$BACKEND_DIR/.lambda-build"

STACK_NAME="${STACK_NAME:-clauseguard-mvp}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BEDROCK_MODEL_ID="${BEDROCK_MODEL_ID:-amazon.nova-lite-v1:0}"
DAILY_AUDIT_CAP="${DAILY_AUDIT_CAP:-50}"
BUDGET_ALERT_EMAIL="${BUDGET_ALERT_EMAIL:-adolfvlasiuk@gmail.com}"
MONOBANK_JAR_URL="${MONOBANK_JAR_URL:-https://send.monobank.ua/jar/your-jar-id}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
JWT_SECRET="${JWT_SECRET:-$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
DEPLOY_BUCKET="${DEPLOY_BUCKET:-clauseguard-deploy-${ACCOUNT_ID}-${AWS_REGION}}"

echo "==> 1/6 Building backend TypeScript..."
npm --prefix "$BACKEND_DIR" run build

echo "==> 2/6 Preparing Lambda deployment bundle in $LAMBDA_BUILD_DIR..."
rm -rf "$LAMBDA_BUILD_DIR"
mkdir -p "$LAMBDA_BUILD_DIR"
cp -a "$BACKEND_DIR/dist" "$LAMBDA_BUILD_DIR/"
cp -a "$BACKEND_DIR/assets" "$LAMBDA_BUILD_DIR/"
cp -a "$ROOT_DIR/samples" "$LAMBDA_BUILD_DIR/"
cp "$BACKEND_DIR/package.json" "$LAMBDA_BUILD_DIR/"
if [ -f "$BACKEND_DIR/package-lock.json" ]; then
  cp "$BACKEND_DIR/package-lock.json" "$LAMBDA_BUILD_DIR/"
fi
cp -a "$BACKEND_DIR/node_modules" "$LAMBDA_BUILD_DIR/"
npm --prefix "$LAMBDA_BUILD_DIR" prune --omit=dev --no-audit --no-fund >/dev/null
rm -f "$LAMBDA_BUILD_DIR/package-lock.json"

echo "==> 3/6 Ensuring artifact S3 bucket s3://$DEPLOY_BUCKET exists..."
if ! aws s3api head-bucket --bucket "$DEPLOY_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
  aws s3 mb "s3://$DEPLOY_BUCKET" --region "$AWS_REGION"
fi

echo "==> 4/6 Packaging CloudFormation/SAM template..."
aws cloudformation package \
  --template-file "$INFRA_DIR/template.yaml" \
  --s3-bucket "$DEPLOY_BUCKET" \
  --output-template-file "$INFRA_DIR/packaged.yaml" \
  --region "$AWS_REGION"

echo "==> 5/6 Deploying stack $STACK_NAME in $AWS_REGION..."
aws cloudformation deploy \
  --template-file "$INFRA_DIR/packaged.yaml" \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "BedrockModelId=$BEDROCK_MODEL_ID" \
    "DailyAuditCap=$DAILY_AUDIT_CAP" \
    "BudgetAlertEmail=$BUDGET_ALERT_EMAIL" \
    "MonobankJarUrl=$MONOBANK_JAR_URL" \
    "GoogleClientId=$GOOGLE_CLIENT_ID" \
    "JwtSecret=$JWT_SECRET"

get_output() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text
}

API_ENDPOINT="$(get_output ApiEndpoint)"
FRONTEND_BUCKET="$(get_output FrontendBucketName)"
FRONTEND_DIST_ID="$(get_output FrontendDistributionId)"
FRONTEND_URL="$(get_output FrontendUrl)"
UPLOADS_BUCKET="$(get_output UploadsBucketName)"
DYNAMO_TABLE="$(get_output DynamoTableName)"

echo "==> 6/6 Building & uploading frontend to s3://$FRONTEND_BUCKET/..."
VITE_API_URL="$API_ENDPOINT" \
VITE_MONOBANK_JAR_URL="$MONOBANK_JAR_URL" \
VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  npm --prefix "$FRONTEND_DIR" run build

aws s3 sync "$FRONTEND_DIR/dist/" "s3://$FRONTEND_BUCKET/" --delete --region "$AWS_REGION"

if [ -n "$FRONTEND_DIST_ID" ] && [ "$FRONTEND_DIST_ID" != "None" ]; then
  echo "==> Invalidating CloudFront cache ($FRONTEND_DIST_ID)..."
  aws cloudfront create-invalidation \
    --distribution-id "$FRONTEND_DIST_ID" \
    --paths "/*" >/dev/null
fi

echo ""
echo "===================================================="
echo "ClauseGuard AWS Deployment Complete!"
echo "Frontend HTTPS URL : $FRONTEND_URL"
echo "API Endpoint       : $API_ENDPOINT"
echo "Frontend Bucket    : $FRONTEND_BUCKET"
echo "Uploads Bucket     : $UPLOADS_BUCKET"
echo "DynamoDB Table     : $DYNAMO_TABLE"
echo "Budget Alert Email : $BUDGET_ALERT_EMAIL"
echo "===================================================="
