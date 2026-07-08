// Dropdown lists and checklist template, lifted from the TCS Nexus OMS
// spreadsheet "Settings" sheet and Source Data columns.

export const STAGES = [
  'Intake',
  'Investigation',
  'Records',
  'Treatment',
  'Claims',
  'Demand Prep',
  'Attorney Review',
  'Negotiation',
  'Lien Resolution',
  'Disbursement',
  'Closed',
] as const;

export const STATUSES = [
  'New',
  'In Progress',
  'Waiting on Client',
  'Waiting on Provider',
  'Waiting on 1P',
  'Waiting on 3P',
  'Waiting on Subro',
  'Waiting on Attorney',
  'Escalated',
  'Complete',
  'Closed',
] as const;

export const PRIORITIES = ['Low', 'Normal', 'High', 'Critical'] as const;

export const YES_NO = ['Yes', 'No', 'Pending', 'N/A'] as const;

export const STATES = [
  'TX', 'CA', 'FL', 'GA', 'VA', 'MD', 'DC', 'CO', 'AZ', 'AL', 'AR', 'OK',
  'LA', 'NC', 'SC', 'TN', 'Other',
] as const;

export const PROVIDER_TYPES = [
  'Chiropractor',
  'Physical Therapy',
  'Orthopedic',
  'Pain Management',
  'Imaging/MRI',
  'Surgery Consult',
  'Other',
] as const;

export const ROLES = [
  'SUPER_ADMIN',
  'EXECUTIVE',
  'FIRM_ADMIN',
  'ATTORNEY',
  'CASE_MANAGER',
  'STAFF',
  'ACCOUNTING',
  'CLIENT_VIEWER',
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  EXECUTIVE: 'Executive',
  FIRM_ADMIN: 'Firm Admin',
  ATTORNEY: 'Attorney',
  CASE_MANAGER: 'Case Manager',
  STAFF: 'Staff',
  ACCOUNTING: 'Accounting',
  CLIENT_VIEWER: 'Client Viewer',
};

export type ChecklistCategory =
  | 'INTAKE'
  | 'INVESTIGATION'
  | 'INSURANCE'
  | 'MEDICAL'
  | 'LIENS'
  | 'DEMAND';

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  INTAKE: 'Client Intake',
  INVESTIGATION: 'Investigation',
  INSURANCE: 'Insurance',
  MEDICAL: 'Medical Records',
  LIENS: 'Liens / Subro',
  DEMAND: 'Demand',
};

export interface ChecklistTemplateItem {
  key: string;
  label: string;
  category: ChecklistCategory;
  critical: boolean;
}

// Mirrors the spreadsheet's tracker columns. `critical` items feed the
// "Missing Critical Items" counters and alerts.
export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  // Intake Tracker
  { key: 'intake_packet', label: 'Intake Packet Completed', category: 'INTAKE', critical: true },
  { key: 'welcome_call', label: 'Welcome Call Completed', category: 'INTAKE', critical: true },
  { key: 'meeting_photo', label: 'Meeting / Photo of Client', category: 'INTAKE', critical: false },
  { key: 'drivers_license', label: "Driver's License Received", category: 'INTAKE', critical: false },
  { key: 'health_insurance_card', label: 'Health Insurance Card Received', category: 'INTAKE', critical: false },
  { key: 'photos_received', label: 'Photos Received', category: 'INTAKE', critical: false },
  { key: 'lost_wages', label: 'Lost Wages Documentation', category: 'INTAKE', critical: false },
  // Investigation Tracker
  { key: 'police_report', label: 'Police Report', category: 'INVESTIGATION', critical: true },
  { key: 'witness_statements', label: 'Witness Statements', category: 'INVESTIGATION', critical: false },
  { key: 'citation_info', label: 'Citation / Traffic Info', category: 'INVESTIGATION', critical: false },
  { key: 'facebook_searches', label: 'Facebook Searches', category: 'INVESTIGATION', critical: false },
  { key: 'google_earth', label: 'Google Earth Images', category: 'INVESTIGATION', critical: false },
  { key: 'calls_911', label: '911 Calls', category: 'INVESTIGATION', critical: false },
  { key: 'cad_report', label: 'CAD Report', category: 'INVESTIGATION', critical: false },
  { key: 'dash_cam', label: 'Dash Cam', category: 'INVESTIGATION', critical: false },
  { key: 'bwc', label: 'Body Worn Camera (BWC)', category: 'INVESTIGATION', critical: false },
  { key: 'video_surveillance', label: 'Video Surveillance', category: 'INVESTIGATION', critical: false },
  { key: 'halo', label: 'HALO Footage', category: 'INVESTIGATION', critical: false },
  { key: 'driver_history', label: 'Driver History Report', category: 'INVESTIGATION', critical: false },
  // Insurance Tracker
  { key: 'lor_1p', label: 'Letter of Representation to 1P', category: 'INSURANCE', critical: true },
  { key: 'ack_1p', label: 'Acknowledgment of LOR Received (1P)', category: 'INSURANCE', critical: false },
  { key: 'dec_page_1p', label: 'Dec Page 1P', category: 'INSURANCE', critical: true },
  { key: 'lor_3p', label: 'Letter of Representation to 3P', category: 'INSURANCE', critical: true },
  { key: 'ack_3p', label: 'Acknowledgment of LOR Received (3P)', category: 'INSURANCE', critical: false },
  { key: 'dec_page_3p', label: 'Dec Page 3P', category: 'INSURANCE', critical: true },
  // Medical Tracker
  { key: 'ems_record', label: 'EMS Record', category: 'MEDICAL', critical: false },
  { key: 'ems_bill', label: 'EMS Bill', category: 'MEDICAL', critical: false },
  { key: 'urgent_care_record', label: 'Urgent Care Record', category: 'MEDICAL', critical: false },
  { key: 'urgent_care_bill', label: 'Urgent Care Bill', category: 'MEDICAL', critical: false },
  { key: 'er_record', label: 'ER Record', category: 'MEDICAL', critical: true },
  { key: 'er_bill', label: 'ER Bill', category: 'MEDICAL', critical: true },
  { key: 'er_physician_bill', label: 'ER Physician Bill', category: 'MEDICAL', critical: false },
  { key: 'er_radiology_bill', label: 'ER Radiology Bill', category: 'MEDICAL', critical: false },
  // Liens Tracker
  { key: 'subro_letter_sent', label: 'Subrogation Letter Sent Out', category: 'LIENS', critical: true },
  { key: 'subro_ack_received', label: 'Acknowledgment Letter Received', category: 'LIENS', critical: false },
  { key: 'lien_ledger_received', label: 'Lien Ledger Received', category: 'LIENS', critical: true },
  // Demand Tracker
  { key: 'demand_sent', label: 'Demand Sent', category: 'DEMAND', critical: true },
  { key: 'receipt_3p', label: '3P Confirmed Receipt of Demand', category: 'DEMAND', critical: true },
  { key: 'receipt_1p', label: '1P Confirmed Receipt of Demand', category: 'DEMAND', critical: true },
  { key: 'medpay_pip', label: 'Medpay / PIP Demand', category: 'DEMAND', critical: false },
];

// Statute of limitations for personal injury, in years, by state (general
// guidance only - confirm with counsel; used to suggest a SOL date).
export const SOL_YEARS_BY_STATE: Record<string, number> = {
  TX: 2, CA: 2, FL: 2, GA: 2, VA: 2, MD: 3, DC: 3, CO: 2, AZ: 2, AL: 2,
  AR: 3, OK: 2, LA: 2, NC: 3, SC: 3, TN: 1, Other: 2,
};
