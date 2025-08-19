import { Component, inject, Input, OnInit, output } from '@angular/core'
import { JsonSchemaFormModule } from '@ng-formworks/core'
import { firstValueFrom } from 'rxjs'

import { JsonSchemaFormPatchDirective } from '@/app/core/directives/json-schema-form-patch.directive'
import { SecretsService } from '@/app/core/secrets.service'
import { SettingsService } from '@/app/core/settings.service'

@Component({
  selector: 'app-schema-form',
  templateUrl: './schema-form.component.html',
  standalone: true,
  imports: [
    JsonSchemaFormModule,
    JsonSchemaFormPatchDirective,
  ],
})
export class SchemaFormComponent implements OnInit {
  private $settings = inject(SettingsService)
  private $secrets = inject(SecretsService)

  @Input() configSchema: any
  @Input() data: any
  @Input() pluginName: string = ''
  readonly dataChange = output()
  readonly dataChanged = output()
  readonly isValid = output()

  public currentData: any
  public language: string = 'en'
  private availableLanguages = ['de', 'en', 'es', 'fr', 'it', 'pt', 'zh']
  private secretFields: Set<string> = new Set()
  private processedSchema: any

  public jsonFormOptions = {
    addSubmit: false,
    loadExternalAssets: false,
    returnEmptyFields: false,
    setSchemaDefaults: true,
    autocomplete: false,
  }

  constructor() {}

  async ngOnInit(): Promise<void> {
    // Use 'en' by default, unless the user's language is available
    const userLanguage = this.$settings.env.lang.split('-')[0]
    if (this.availableLanguages.includes(userLanguage)) {
      this.language = userLanguage
    }
    
    // Process schema to identify secret fields and load existing secret values
    await this.processSchemaForSecrets()
    this.currentData = this.data
  }

  async onChanges(data: any): Promise<void> {
    // Handle secret fields specially
    await this.handleSecretFields(data)
    this.dataChange.emit(data)
    this.dataChanged.emit(data)
  }

  validChange(data: any) {
    this.isValid.emit(data)
  }

  validationErrors(errors: any[] | null) {
    if (errors) {
      errors.forEach(error => console.error(error.instancePath, error.message))
    }
  }

  /**
   * Process schema to identify secret fields and modify form layout
   */
  private async processSchemaForSecrets(): Promise<void> {
    if (!this.configSchema?.schema?.properties) {
      return
    }

    this.processedSchema = JSON.parse(JSON.stringify(this.configSchema.schema))
    this.secretFields.clear()

    // Recursively find secret fields
    await this.findSecretFields(this.processedSchema.properties, '')

    // Load existing secret values
    await this.loadExistingSecrets()

    // Modify form layout for secret fields
    this.modifyFormForSecrets()
  }

  /**
   * Recursively find fields marked as secret in the schema
   */
  private findSecretFields(properties: any, prefix: string): void {
    for (const [key, property] of Object.entries(properties)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key
      
      if ((property as any)?.secret === true) {
        this.secretFields.add(fieldPath)
        // Modify schema to show as password field
        ;(property as any).format = 'password'
      }

      // Recursively check nested objects
      if ((property as any)?.properties) {
        this.findSecretFields((property as any).properties, fieldPath)
      }

      // Check array items
      if ((property as any)?.items?.properties) {
        this.findSecretFields((property as any).items.properties, `${fieldPath}[]`)
      }
    }
  }

  /**
   * Load existing secret values from the backend
   */
  private async loadExistingSecrets(): Promise<void> {
    if (!this.pluginName || this.secretFields.size === 0) {
      return
    }

    for (const fieldPath of this.secretFields) {
      try {
        const secretValue = await firstValueFrom(this.$secrets.getSecret(this.pluginName, fieldPath))
        if (secretValue) {
          // Set the value in the data object
          this.setNestedValue(this.data, fieldPath, secretValue)
        }
      } catch (error) {
        console.warn(`Failed to load secret for field ${fieldPath}:`, error)
      }
    }
  }

  /**
   * Modify form layout to add secret field indicators and controls
   */
  private modifyFormForSecrets(): void {
    if (!this.configSchema.form || this.secretFields.size === 0) {
      return
    }

    // Add custom layout modifications for secret fields
    for (const fieldPath of this.secretFields) {
      const formField = this.findFormField(this.configSchema.form, fieldPath)
      if (formField) {
        formField.fieldClass = (formField.fieldClass || '') + ' secret-field'
        formField.description = (formField.description || '') + ' (Securely stored)'
        
        // Add show/hide toggle button
        formField.htmlClass = (formField.htmlClass || '') + ' secret-field-container'
      }
    }
  }

  /**
   * Find form field configuration by path
   */
  private findFormField(form: any[], fieldPath: string): any {
    for (const field of form) {
      if (field.key === fieldPath || field.key?.includes?.(fieldPath)) {
        return field
      }
      if (field.items) {
        const found = this.findFormField(field.items, fieldPath)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Handle secret fields during form changes
   */
  private async handleSecretFields(data: any): Promise<void> {
    if (!this.pluginName || this.secretFields.size === 0) {
      return
    }

    for (const fieldPath of this.secretFields) {
      const value = this.getNestedValue(data, fieldPath)
      
      if (value && value.trim() !== '') {
        try {
          // Store secret value
          await firstValueFrom(this.$secrets.setSecret(this.pluginName, fieldPath, value))
          
          // Remove the actual value from the form data (it will be stored securely)
          this.setNestedValue(data, fieldPath, '***SECRET_STORED***')
        } catch (error) {
          console.error(`Failed to store secret for field ${fieldPath}:`, error)
        }
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {}
      }
      return current[key]
    }, obj)
    target[lastKey] = value
  }
}
