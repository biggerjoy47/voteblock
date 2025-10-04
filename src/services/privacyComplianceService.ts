import { ConsentData } from '../types/voter';
import { AuditSecurityService } from './auditSecurityService';

export class PrivacyComplianceService {
  private static readonly CURRENT_CONSENT_VERSION = '2024.1';
  private static readonly REQUIRED_CONSENTS = [
    'dataProcessingConsent',
    'biometricConsent',
    'storageConsent'
  ];

  /**
   * NDPR Compliance - Validate user consent
   */
  static validateConsent(consentData: ConsentData): boolean {
    // Check all required consents are given
    const requiredConsents = [
      consentData.dataProcessingConsent,
      consentData.biometricConsent,
      consentData.storageConsent
    ];

    if (!requiredConsents.every(consent => consent === true)) {
      return false;
    }

    // Check consent version is current
    if (consentData.consentVersion !== this.CURRENT_CONSENT_VERSION) {
      return false;
    }

    // Check consent date is recent (within last 24 hours for registration)
    const consentAge = Date.now() - consentData.consentDate.getTime();
    const maxConsentAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (consentAge > maxConsentAge) {
      return false;
    }

    return true;
  }

  /**
   * Generate NDPR compliant consent form data
   */
  static generateConsentForm(): {
    version: string;
    notices: ConsentNotice[];
    requiredConsents: string[];
  } {
    return {
      version: this.CURRENT_CONSENT_VERSION,
      notices: this.getConsentNotices(),
      requiredConsents: this.REQUIRED_CONSENTS
    };
  }

  /**
   * Record consent withdrawal
   */
  static async recordConsentWithdrawal(
    voterId: string,
    withdrawalReason: string,
    sessionId: string
  ): Promise<void> {
    await AuditSecurityService.logEvent({
      eventType: 'consent_given', // Using existing type, but with withdrawal metadata
      userId: voterId,
      result: 'success',
      details: 'Consent withdrawn by user',
      sessionId,
      metadata: {
        action: 'withdrawal',
        reason: withdrawalReason,
        withdrawal_date: new Date(),
        previous_consent_version: this.CURRENT_CONSENT_VERSION
      }
    });
  }

  /**
   * Get data processing notices for NDPR compliance
   */
  private static getConsentNotices(): ConsentNotice[] {
    return [
      {
        id: 'data_processing',
        title: 'Data Processing Consent',
        content: `We will process your personal data including your National Identification Number (NIN), 
                 biometric data, and demographic information for the purpose of voter registration and 
                 authentication in accordance with the Nigeria Data Protection Regulation (NDPR) 2019.`,
        required: true,
        category: 'essential'
      },
      {
        id: 'biometric_consent',
        title: 'Biometric Data Consent',
        content: `We will capture and securely store your facial biometric data in encrypted form. 
                 This data will be used solely for voter authentication and will never be shared 
                 with third parties. You have the right to withdraw this consent at any time.`,
        required: true,
        category: 'biometric'
      },
      {
        id: 'storage_consent',
        title: 'Data Storage Consent',
        content: `Your data will be stored securely using end-to-end encryption and will be retained 
                 for the duration required by electoral law. You have the right to request data 
                 deletion after the legal retention period expires.`,
        required: true,
        category: 'storage'
      },
      {
        id: 'audit_consent',
        title: 'Audit Trail Consent',
        content: `We will maintain audit logs of your interactions with the system for security and 
                 compliance purposes. These logs are anonymized and used only for system integrity 
                 verification.`,
        required: false,
        category: 'audit'
      }
    ];
  }

  /**
   * Generate privacy policy text
   */
  static getPrivacyPolicy(): string {
    return `
NIGERIA E-VOTING SYSTEM PRIVACY POLICY

1. DATA CONTROLLER
Independent National Electoral Commission (INEC)
Plot 436, Zambezi Street, Maitama, Abuja, Nigeria

2. DATA PROCESSING PURPOSES
- Voter registration and verification
- Electoral process administration
- System security and audit
- Compliance with electoral laws

3. LEGAL BASIS
Processing is necessary for:
- Performance of a task carried out in the public interest (Electoral Act 2022)
- Compliance with legal obligations under Nigerian electoral law
- Legitimate interests in ensuring electoral integrity

4. DATA CATEGORIES
- Identity data (NIN, name, date of birth)
- Biometric data (facial recognition embeddings)
- Contact data (email, phone - optional)
- Location data (state, LGA, ward, polling unit)
- Technical data (audit logs, system interactions)

5. DATA RETENTION
- Voter registration data: Retained for duration of voter eligibility
- Biometric data: Retained until voter deregistration or death
- Audit logs: Retained for 7 years as required by law
- Consent records: Retained for 7 years after withdrawal

6. YOUR RIGHTS UNDER NDPR
- Right to access your personal data
- Right to rectification of inaccurate data
- Right to erasure (after legal retention period)
- Right to restrict processing
- Right to data portability
- Right to object to processing
- Right to withdraw consent

7. DATA SECURITY
- End-to-end encryption for all sensitive data
- Biometric data stored as encrypted embeddings only
- Tamper-evident audit trails
- Regular security assessments and updates

8. CONTACT INFORMATION
Data Protection Officer: dpo@inec.gov.ng
Phone: +234-9-8734-4444
Address: Plot 436, Zambezi Street, Maitama, Abuja

Last Updated: ${new Date().toLocaleDateString()}
Version: ${this.CURRENT_CONSENT_VERSION}
    `;
  }
}

interface ConsentNotice {
  id: string;
  title: string;
  content: string;
  required: boolean;
  category: 'essential' | 'biometric' | 'storage' | 'audit';
}