output "default_hostname" {
  description = "Default hostname of the Static Web App (e.g. happy-hill-123.azurestaticapps.net)."
  value       = azurerm_static_web_app.main.default_host_name
}

output "deployment_token" {
  description = "Deployment token — add this as the AZURE_STATIC_WEB_APPS_API_TOKEN secret in GitHub."
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}
