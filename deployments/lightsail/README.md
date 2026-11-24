# Lightsail에서 Plane 실행하기

`Publish Plane images to ECR` 워크플로는 `preview`에서 수동으로 실행합니다. 서울 리전의 비공개 ECR에 `linux/amd64` 이미지 6개를 올립니다. 모든 이미지의 태그는 동일한 40자리 커밋 SHA입니다. Lightsail에는 Compose 파일 두 개와 설정 생성 스크립트를 복사합니다.

## 1. AWS와 GitHub 설정

AWS 리소스를 설정할 권한이 있는 AWS CLI 세션에서 리포지토리를 만듭니다. 이미 만든 리포지토리는 태그 덮어쓰기를 막도록 `Immutable`인지 확인합니다.

```bash
aws_account_id=$(aws sts get-caller-identity --query Account --output text)
for service in api web admin space live proxy; do
  aws ecr create-repository \
    --region ap-northeast-2 \
    --repository-name "plane/$service" \
    --image-tag-mutability IMMUTABLE
done
printf 'ECR registry = %s.dkr.ecr.ap-northeast-2.amazonaws.com\n' "$aws_account_id"
```

IAM에서 `https://token.actions.githubusercontent.com`을 OIDC 공급자로 등록하고 Audience를 `sts.amazonaws.com`으로 설정합니다. 다음 신뢰 정책으로 역할을 만든 뒤 GitHub의 `beaubrain/plane → Settings → Secrets and variables → Actions → Variables`에 역할 ARN을 `PLANE_ECR_PUSH_ROLE_ARN`으로 등록합니다. 아래 예시의 `123456789012`를 AWS 계정 ID로 바꿉니다. [GitHub Actions의 AWS OIDC 설정](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:beaubrain/plane:ref:refs/heads/preview"
        }
      }
    }
  ]
}
```

발행 역할에는 아래 권한 정책을 연결합니다. 이미지가 이미 있는 태그는 워크플로가 확인하고 재사용합니다. [ECR 이미지 업로드 IAM 권한](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "ecr:GetAuthorizationToken", "Resource": "*" },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeImages",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "arn:aws:ecr:ap-northeast-2:123456789012:repository/plane/*"
    }
  ]
}
```

배포에 쓰는 별도 IAM 역할 또는 세션에는 `ecr:GetAuthorizationToken`을 `*`에 허용하고 `ecr:BatchCheckLayerAvailability`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer`를 위 `plane/*`에 허용합니다. 아래 예시에서는 이 세션의 로컬 AWS CLI 프로필 이름을 `plane-ecr-pull`로 사용합니다. [ECR 인증](https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html)

워크플로 파일이 `preview`에 올라가면 GitHub의 **Actions → Publish Plane images to ECR → Run workflow**에서 브랜치를 선택해 실행합니다. 여섯 작업이 모두 성공한 다음 표시되는 `PLANE_IMAGE_TAG`를 복사합니다.

## 2. Lightsail 서버 준비

서울 리전의 x86-64 Ubuntu 24.04 LTS, 4GB 인스턴스를 사용합니다. 고정 IPv4를 연결하고 `plane.beaubrain.bio` 같은 사용할 도메인의 A 레코드를 설정합니다. Docker Engine과 Compose 플러그인, `openssl`을 설치합니다. 방화벽에서 80을 열고 첫 관리자 설정 전까지 22와 443은 관리 IP로 제한합니다. 첫 관리자 설정 뒤 팀 접속을 위해 443을 허용합니다. [Lightsail 고정 IP](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-create-static-ip.html) · [Ubuntu Docker 설치](https://docs.docker.com/engine/install/ubuntu/) · [Caddy의 HTTPS 인증서 발급](https://caddyserver.com/docs/quick-starts/https)

맥북의 저장소 루트에서 아래를 실행합니다. `LIGHTSAIL_IP`, `AWS_ACCOUNT_ID`와 필요하면 `ubuntu`를 실제 값으로 바꿉니다. Lightsail에는 GitHub에서 소스를 받기 위한 키가 필요 없습니다.

```bash
ssh ubuntu@LIGHTSAIL_IP 'install -d -m 700 ~/plane'
scp docker-compose.yml deployments/lightsail/compose.ecr.yml \
  deployments/lightsail/init-env.sh ubuntu@LIGHTSAIL_IP:~/plane/

registry=AWS_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com
aws --profile plane-ecr-pull ecr get-login-password --region ap-northeast-2 |
  ssh ubuntu@LIGHTSAIL_IP "sudo -n docker login --username AWS --password-stdin '$registry'"
```

위 방식은 맥북에서 로그인 토큰을 발급해 SSH로 전달합니다. ECR 로그인은 12시간 동안 유효하므로 다음에 이미지를 받을 때 만료됐다면 다시 실행합니다. 서버의 Docker 명령도 같은 사용자 권한(`sudo`)으로 실행합니다. [ECR 로그인 토큰](https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html)

## 3. 첫 배포

Lightsail에서 `FULL_COMMIT_SHA`와 ECR 호스트를 실제 값으로 바꿔 실행합니다. `init-env.sh`는 새 설치에 필요한 비밀 값을 생성합니다. 이미 같은 서버에서 소스 빌드 방식으로 설치했다면 기존 `.env`의 DB 및 파일 저장소 비밀번호를 보존하고 `PLANE_ECR_REGISTRY`와 `PLANE_IMAGE_TAG`만 추가합니다. 이전에 Compose 프로젝트 이름을 `plane`으로 지정한 경우 같은 볼륨을 사용합니다.

```bash
cd ~/plane
bash init-env.sh plane.beaubrain.bio \
  AWS_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com FULL_COMMIT_SHA

dc() {
  sudo docker compose -f docker-compose.yml -f compose.ecr.yml "$@"
}

dc config --quiet &&
  dc pull &&
  dc up -d plane-db plane-redis plane-mq plane-minio &&
  dc run --rm --no-deps migrator &&
  dc up -d --no-build &&
  dc ps
```

`https://plane.beaubrain.bio/god-mode/`에서 첫 관리자를 만든 후 작업 항목 생성, 파일 업로드, 업무량 화면을 확인합니다. API와 Celery 워커는 각각 1개를 사용합니다. HTTPS 인증서, DB와 첨부파일은 Docker 볼륨에 저장됩니다.

웹 화면을 처음 불러올 때 정적 파일 요청이 몰려 발생하던 429를 줄이기 위해 Lightsail의 기본 정적 요청 한도를 분당 1,200회로 설정했습니다. 필요하면 `.env`의 `PLANE_STATIC_RATE_LIMIT_EVENTS`로 조정할 수 있습니다.

## 4. 업데이트

다음 릴리스의 워크플로가 전부 성공하면 서버의 `.env`에서 `PLANE_IMAGE_TAG`를 바꿉니다. 먼저 이미지를 받고, DB와 첨부파일의 백업을 확보한 다음 마이그레이션합니다. [Plane 백업과 복원](https://developers.plane.so/self-hosting/manage/backup-restore)

```bash
dc pull &&
  dc stop api worker beat-worker &&
  dc run --rm --no-deps migrator &&
  dc up -d --no-build &&
  dc ps
```

마이그레이션이 실패하면 `dc up`은 실행되지 않습니다. 실패한 마이그레이션의 로그와 DB 상태를 확인한 뒤 복구합니다. DB 스키마가 바뀐 배포를 되돌릴 때는 이전 이미지와 DB 백업을 함께 고려합니다.
