output "cluster_name" {
  value = module.eks.cluster_name
}

output "db_endpoint" {
  value = aws_db_instance.postgres.address
}

output "database_url_secret_arn" {
  value = aws_secretsmanager_secret.db_url.arn
}
