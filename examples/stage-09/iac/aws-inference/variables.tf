variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "project_name" {
  type    = string
  default = "academy-inference"
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging or production"
  }
}

variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.42.1.0/24", "10.42.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.42.11.0/24", "10.42.12.0/24"]
}

variable "allowed_ingress_cidrs" {
  type        = list(string)
  description = "Restrict to approved client ranges in production; the example default is public HTTPS."
  default     = ["0.0.0.0/0"]
}

variable "certificate_arn" {
  type        = string
  description = "Existing ACM certificate ARN for the ALB HTTPS listener."
}

variable "image_digest" {
  type        = string
  description = "Immutable sha256 digest of the approved ECR image; never a mutable tag."
  validation {
    condition     = can(regex("^sha256:[0-9a-f]{64}$", var.image_digest))
    error_message = "image_digest must be sha256 followed by 64 lowercase hex characters"
  }
}

variable "app_secret_arn" {
  type        = string
  description = "ARN of an existing Secrets Manager secret. Secret value must not be passed through Terraform variables."
}

variable "task_cpu" {
  type    = number
  default = 512
}

variable "task_memory" {
  type    = number
  default = 1024
}

variable "desired_count" {
  type        = number
  default     = 0
  description = "Zero by default to avoid accidentally starting billable tasks in this learning template."
}

variable "container_port" {
  type    = number
  default = 8080
}
