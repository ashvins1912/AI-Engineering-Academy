# Infrastructure as Code lab

The AWS example describes an HTTPS inference service with an internet-facing ALB, private Fargate tasks, private ECR/CloudWatch/Secrets Manager VPC endpoints, immutable ECR tags, digest-pinned image, non-root/read-only container, least-privilege task role and deployment circuit breaker.

## Safety boundary

This is a plan-and-review learning template only. No AWS credentials are required for formatting or static validation. Do not run `terraform apply` as part of this curriculum exercise. It describes billable resources (ALB, VPC endpoints, ECR, CloudWatch, Fargate and networking); applying it can incur charges. The ECS desired count defaults to zero as an additional safeguard, not as a guarantee of zero cost.

## Validate locally

```bash
cd examples/stage-09/iac/aws-inference
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform plan -var-file=terraform.tfvars.example -out=review.tfplan
terraform show review.tfplan
```

Plan requires AWS credentials and account access to refresh provider state. Use a dedicated sandbox account, budget alerts and explicit approval if you ever choose to plan against a real account. Do not apply this example.

## Design notes

- State backend and locking are deliberately not configured. Production state belongs in an encrypted remote backend with versioning, locking and narrowly scoped access.
- Secret values are never Terraform variables. Only an existing Secrets Manager ARN is passed to ECS; inject values at runtime.
- Environment parity comes from one module with explicit variables, version constraints and identical policy, not separate copied stacks.
- The private subnets have no NAT route. Interface endpoints cover ECR API/Docker, logs and Secrets Manager; an S3 gateway endpoint supports ECR layer retrieval.
- The example uses an existing ACM certificate and a pre-published ECR image digest. It does not create certificates, publish images or deploy.
- Restrict ALB ingress CIDRs for each environment; the example tfvars narrows it to a documentation-only TEST-NET address.
- Review IAM, endpoint policies, KMS, WAF, DNS, backups, observability, cost, region availability and disaster recovery before any production adaptation.
