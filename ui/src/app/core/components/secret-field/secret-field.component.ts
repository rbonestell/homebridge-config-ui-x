import { CommonModule } from '@angular/common'
import { Component, ElementRef, inject, Input, OnInit, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
  selector: 'app-secret-field',
  templateUrl: './secret-field.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltip,
    TranslatePipe,
  ],
})
export class SecretFieldComponent implements OnInit {
  @ViewChild('secretInput', { static: false }) secretInput!: ElementRef<HTMLInputElement>

  @Input() value: string = ''
  @Input() placeholder: string = ''
  @Input() disabled: boolean = false
  @Input() required: boolean = false
  @Input() fieldName: string = ''
  @Input() hasExistingValue: boolean = false

  public showPassword: boolean = false
  public fieldType: string = 'password'
  public displayValue: string = ''

  constructor() {}

  ngOnInit(): void {
    this.updateDisplayValue()
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword
    this.fieldType = this.showPassword ? 'text' : 'password'
    
    // Focus the input after toggle to maintain user experience
    setTimeout(() => {
      if (this.secretInput?.nativeElement) {
        this.secretInput.nativeElement.focus()
      }
    }, 0)
  }

  /**
   * Update display value based on state
   */
  private updateDisplayValue(): void {
    if (this.hasExistingValue && !this.value) {
      this.displayValue = ''
      this.placeholder = 'Value is securely stored (leave empty to keep current value)'
    } else {
      this.displayValue = this.value
    }
  }

  /**
   * Handle input changes
   */
  onInputChange(event: any): void {
    this.value = event.target.value
    this.updateDisplayValue()
  }

  /**
   * Handle input focus
   */
  onInputFocus(): void {
    if (this.hasExistingValue && !this.value) {
      this.placeholder = 'Enter new value to replace existing secret'
    }
  }

  /**
   * Handle input blur
   */
  onInputBlur(): void {
    this.updateDisplayValue()
  }
}