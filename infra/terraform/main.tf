terraform {
  required_version = ">= 1.6"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

provider "aws" {
  region = var.region
}

data "aws_availability_zones" "available" {
  state = "available"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name            = "${var.name}-${var.environment}"
  cidr            = "10.20.0.0/16"
  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  private_subnets = ["10.20.1.0/24", "10.20.2.0/24"]
  public_subnets  = ["10.20.101.0/24", "10.20.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "prod"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "${var.name}-${var.environment}"
  cluster_version = "1.30"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    default = {
      instance_types = [var.node_instance_type]
      min_size       = 2
      max_size       = 5
      desired_size   = 2
    }
  }
}

resource "aws_security_group" "db" {
  name   = "${var.name}-${var.environment}-db"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

resource "aws_db_subnet_group" "db" {
  name       = "${var.name}-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_instance" "postgres" {
  identifier             = "${var.name}-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  storage_encrypted      = true
  db_name                = "sentinel"
  username               = "sentinel"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  backup_retention_period = var.environment == "prod" ? 7 : 1
  multi_az               = var.environment == "prod"
  skip_final_snapshot    = var.environment != "prod"
  deletion_protection    = var.environment == "prod"
}

resource "aws_secretsmanager_secret" "db_url" {
  name = "${var.name}/${var.environment}/database-url"
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://sentinel:${random_password.db.result}@${aws_db_instance.postgres.address}:5432/sentinel"
}
