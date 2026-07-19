variable "location" {
  description = "Azure region. Static Web Apps is only available in: westus2, centralus, eastus2, westeurope, eastasia."
  type        = string
  default     = "eastus2"
}

variable "resource_group_name" {
  description = "Name of the resource group to create."
  type        = string
  default     = "rg-box-of-tools"
}

variable "app_name" {
  description = "Name of the Static Web App resource."
  type        = string
  default     = "swa-box-of-tools"
}

variable "sku_tier" {
  description = "Static Web App SKU (Free or Standard)."
  type        = string
  default     = "Free"

  validation {
    condition     = contains(["Free", "Standard"], var.sku_tier)
    error_message = "sku_tier must be \"Free\" or \"Standard\"."
  }
}
