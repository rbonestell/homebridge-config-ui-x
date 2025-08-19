import { inject, Injectable } from '@angular/core'
import { Observable, of } from 'rxjs'
import { catchError, map } from 'rxjs/operators'

import { ApiService } from '@/app/core/api.service'

export interface SecretResponse {
  success: boolean
  message?: string
  value?: string
}

@Injectable({
  providedIn: 'root',
})
export class SecretsService {
  private $api = inject(ApiService)

  constructor() {}

  /**
   * Set a secret value for a plugin
   * @param pluginName - The plugin name
   * @param secretName - The secret key name
   * @param value - The secret value
   * @returns Observable<boolean> - Success status
   */
  setSecret(pluginName: string, secretName: string, value: string): Observable<boolean> {
    const url = `/api/secrets/${encodeURIComponent(pluginName)}/${encodeURIComponent(secretName)}`
    return this.$api.post(url, { value }).pipe(
      map((response: SecretResponse) => response.success),
      catchError((error) => {
        console.error(`Failed to set secret ${secretName} for plugin ${pluginName}:`, error)
        return of(false)
      }),
    )
  }

  /**
   * Get a secret value for a plugin
   * @param pluginName - The plugin name
   * @param secretName - The secret key name
   * @returns Observable<string | null> - The secret value or null if not found
   */
  getSecret(pluginName: string, secretName: string): Observable<string | null> {
    const url = `/api/secrets/${encodeURIComponent(pluginName)}/${encodeURIComponent(secretName)}`
    return this.$api.get(url).pipe(
      map((response: SecretResponse) => {
        if (response.success && response.value !== undefined) {
          return response.value
        }
        return null
      }),
      catchError((error) => {
        console.error(`Failed to get secret ${secretName} for plugin ${pluginName}:`, error)
        return of(null)
      }),
    )
  }

  /**
   * Delete a secret value for a plugin
   * @param pluginName - The plugin name
   * @param secretName - The secret key name
   * @returns Observable<boolean> - Success status
   */
  deleteSecret(pluginName: string, secretName: string): Observable<boolean> {
    const url = `/api/secrets/${encodeURIComponent(pluginName)}/${encodeURIComponent(secretName)}`
    return this.$api.delete(url).pipe(
      map((response: SecretResponse) => response.success),
      catchError((error) => {
        console.error(`Failed to delete secret ${secretName} for plugin ${pluginName}:`, error)
        return of(false)
      }),
    )
  }

  /**
   * Set a homebridge-level secret
   * @param secretName - The secret key name
   * @param value - The secret value
   * @returns Observable<boolean> - Success status
   */
  setHomebridgeSecret(secretName: string, value: string): Observable<boolean> {
    const url = `/api/secrets/${encodeURIComponent(secretName)}`
    return this.$api.post(url, { value }).pipe(
      map((response: SecretResponse) => response.success),
      catchError((error) => {
        console.error(`Failed to set homebridge secret ${secretName}:`, error)
        return of(false)
      }),
    )
  }

  /**
   * Get a homebridge-level secret
   * @param secretName - The secret key name
   * @returns Observable<string | null> - The secret value or null if not found
   */
  getHomebridgeSecret(secretName: string): Observable<string | null> {
    const url = `/api/secrets/${encodeURIComponent(secretName)}`
    return this.$api.get(url).pipe(
      map((response: SecretResponse) => {
        if (response.success && response.value !== undefined) {
          return response.value
        }
        return null
      }),
      catchError((error) => {
        console.error(`Failed to get homebridge secret ${secretName}:`, error)
        return of(null)
      }),
    )
  }

  /**
   * Delete a homebridge-level secret
   * @param secretName - The secret key name
   * @returns Observable<boolean> - Success status
   */
  deleteHomebridgeSecret(secretName: string): Observable<boolean> {
    const url = `/api/secrets/${encodeURIComponent(secretName)}`
    return this.$api.delete(url).pipe(
      map((response: SecretResponse) => response.success),
      catchError((error) => {
        console.error(`Failed to delete homebridge secret ${secretName}:`, error)
        return of(false)
      }),
    )
  }

  /**
   * Check if a secret exists for a plugin
   * @param pluginName - The plugin name
   * @param secretName - The secret key name
   * @returns Observable<boolean> - Whether the secret exists
   */
  hasSecret(pluginName: string, secretName: string): Observable<boolean> {
    return this.getSecret(pluginName, secretName).pipe(
      map((value) => value !== null),
    )
  }

  /**
   * Check if a homebridge-level secret exists
   * @param secretName - The secret key name
   * @returns Observable<boolean> - Whether the secret exists
   */
  hasHomebridgeSecret(secretName: string): Observable<boolean> {
    return this.getHomebridgeSecret(secretName).pipe(
      map((value) => value !== null),
    )
  }
}