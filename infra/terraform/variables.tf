variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "name" {
  type    = string
  default = "asset-sentinel"
}

variable "environment" {
  type        = string
  description = "stage or prod"
  validation {
    condition     = contains(["stage", "prod"], var.environment)
    error_message = "environment must be stage or prod."
  }
}

variable "node_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}
